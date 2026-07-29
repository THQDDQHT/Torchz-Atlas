import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 容器化部署：产出自带 node_modules 的最小运行时目录
  output: "standalone",

  // 知识库是运行时读取的外部只读目录，任何页面都不应被静态化后长期缓存
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },

  poweredByHeader: false,

  // CSP 不在这里设置：它需要逐请求生成 nonce，见 middleware.ts
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
