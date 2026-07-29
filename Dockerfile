# syntax=docker/dockerfile:1

# 依赖层：单独一层，只在 package.json / lockfile 变化时才重跑
FROM node:22-alpine AS deps
WORKDIR /app

# 构建机在国内时传 https://registry.npmmirror.com，官方源实测慢两个数量级
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry "$NPM_REGISTRY"

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# standalone 产物自带精简后的 node_modules，不需要再装一次依赖
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 运行用户由 compose 的 user: 指定（必须能读知识库的文件），
# 所以缓存目录用 sticky 全权限，让任意 uid 都能写自己的临时产物
RUN mkdir -p .next/cache && chmod 1777 .next/cache

EXPOSE 3000

# 镜像里没有 curl，用 Node 自带的 fetch 做健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
