# Torchz Atlas

一个只读、私有、手机友好的 Markdown 知识库阅读层。Markdown 文件始终是唯一事实来源，VitePress 负责把它们构建为带目录、全文搜索、深色模式和移动端抽屉的静态站。

## 功能

- VitePress 默认主题：左侧目录、右侧滚动大纲、搜索模态框、明暗切换和移动端导航
- VitePress + Shiki 代码高亮
- Obsidian 风格 `[[wikilink]]`，支持唯一命中、缺失、重名三态和同目录优先
- `#标签` 与 `标签：a、b` 两种标签写法
- 标签聚合页、反向链接、同分类上一篇/下一篇
- 文件变化后自动构建；构建失败继续提供上一个成功版本
- Cloudflare Access 外层保护与源站 JWT 校验

## 技术结构

```text
/knowledge（只读 Markdown）
        ↓
构建期索引与派生页面
        ↓
VitePress 静态站
        ↓
JWT 校验静态服务器
        ↓
Cloudflare Tunnel + Access
```

原始笔记会不改内容地复制到临时 VitePress 源目录并直接编译。首页、分类页和标签页由索引生成；wikilink 在 Markdown-It 阶段解析；标签、反链和相邻文章通过默认主题插槽显示。

## 本地开发

```bash
npm install
cp .env.example .env
npm run dev
```

把 `KNOWLEDGE_DIR` 指向知识库目录。开发脚本会监听该目录，内容变化后自动重启 VitePress 开发服务。

也可以使用仓库测试知识库：

```bash
KNOWLEDGE_DIR="$PWD/tests/fixtures/knowledge" npm run dev
```

## 验证

```bash
npm test
npm run typecheck
KNOWLEDGE_DIR="$PWD/tests/fixtures/knowledge" npm run build
```

生产产物默认生成在 `.vitepress/dist/`。本地验证静态服务器：

```bash
AUTH_MODE=none \
ALLOW_INSECURE_AUTH=true \
SITE_DIR="$PWD/.vitepress/dist" \
npm start
```

## 生产部署

```bash
cp .env.example .env
docker compose up -d --build
curl http://127.0.0.1:8088/healthz
```

容器启动时先构建一个完整版本，再启动静态服务器。之后监听 `/knowledge`：

1. 多个连续文件事件会合并。
2. 同一时间只执行一个构建。
3. 新版本构建成功后原子切换。
4. 构建失败时保留上一个成功版本。

知识库、生成源目录和站点产物彼此分离。知识库仍以只读卷挂载，容器根文件系统仍为只读；临时构建文件写入 `/tmp`，静态版本写入 `/site` 的 tmpfs。

## 鉴权

生产默认使用 `AUTH_MODE=cf-access`。静态服务器会校验：

- `Cf-Access-Jwt-Assertion` 请求头（优先）
- `CF_Authorization` Cookie（浏览器回退）
- JWT 签名、issuer 和 audience

鉴权覆盖 HTML、JavaScript、CSS、搜索索引等全部站点文件；只有不包含知识库内容的 `/healthz` 免鉴权。配置缺失或校验失败时服务会拒绝请求。

本地关闭鉴权必须同时设置：

```dotenv
AUTH_MODE=none
ALLOW_INSECURE_AUTH=true
```

## 知识库结构

```text
知识库根/
├── 00 灵感想法/
├── 01 项目/
├── 02 踩坑记录/
└── 03 好东西/
```

只扫描这四个分类中的 Markdown。隐藏文件、非 Markdown、知识库根文件和分类 `README.md` 不作为普通笔记；分类 `README.md` 用作分类说明。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `KNOWLEDGE_DIR` | 容器内知识库目录，默认 `/knowledge` |
| `AUTH_MODE` | `cf-access`（默认）或 `none` |
| `ALLOW_INSECURE_AUTH` | 使用 `AUTH_MODE=none` 时必须为 `true` |
| `CF_ACCESS_TEAM_DOMAIN` | Cloudflare Access team domain |
| `CF_ACCESS_AUD` | Access Application Audience Tag |
| `SITE_NAME` / `SITE_DESCRIPTION` | 站点标题与说明 |
| `HOST_KNOWLEDGE_DIR` | 宿主机知识库目录 |
| `RUN_AS` | 容器运行的 `uid:gid` |
| `BIND_ADDR` / `BIND_PORT` | 宿主机监听地址和端口 |
