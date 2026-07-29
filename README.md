# Torchz Atlas

一个私有的 Markdown 知识库 Web 浏览器：把服务器上的 Markdown 笔记变成手机上能读的网站，**只读，不改文件**。

Markdown 文件始终是唯一的事实来源，本应用只是它的阅读层——不编辑、不上传、不删除、不写 Git。

## 它做什么

- 按四个固定分类浏览笔记，首页显示最近更新与知识库概览
- 关键词搜索标题、正文与标签，命中处高亮，查询留在 URL 里
- 解析 Obsidian 风格的 `[[双向链接]]`，找不到目标时降级成普通文本而不是报错
- 提取两种标签写法（行内 `#标签` 与 `标签：a、b` 元信息行），按标签聚合笔记
- 自动生成文章目录，手机上可折叠
- 深色模式跟随系统

## 它不做什么

不在网页里编辑、创建、删除笔记；没有多人协作、评论、分享链接、公开博客；没有 AI 总结与向量检索；不引入数据库或全文检索集群。

## 技术栈

Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS 4 · unified/remark/rehype · Vitest

除了一个"复制链接"按钮，所有页面都是服务端渲染的，搜索用普通 GET 表单，没有客户端状态。

## 设计要点

**索引靠目录指纹自动刷新。** 每次请求先 stat 一遍知识库文件，把 路径+mtime+大小 拼成指纹与缓存比对，变了才重建。新增笔记后刷新页面即可见，不需要重启服务，也没有需要你记得去调用的 reindex 接口。

**渲染走白名单净化。** Markdown 里的裸 HTML 不进入渲染树，输出再经 `rehype-sanitize` 的 GitHub schema 过滤；标题锚点、外链的 `rel="noopener noreferrer"`、表格滚动容器都在净化之后才添加，避免被自己的净化步骤清掉。

**路径校验是白名单而非黑名单。** URL 片段先解码再校验（顺序反过来就挡不住编码过的 `../`），必须以已登记的分类目录开头、每段都不是隐藏文件、以 `.md` 结尾，解析结果还要复核仍在知识库根内。

**鉴权失败即关门。** 应用层校验 Cloudflare Access 签发的 JWT，配置缺失或校验失败一律拒绝服务，绝不"放行以免影响使用"。

## 本地开发

```bash
npm install
cp .env.example .env      # 把 KNOWLEDGE_DIR 指向任意 Markdown 目录
npm run dev
```

仓库自带一份测试用的假知识库（`tests/fixtures/knowledge/`），可以直接拿它当 `KNOWLEDGE_DIR` 跑起来。

本地开发把 `AUTH_MODE` 设为 `none`，此时必须同时设置 `ALLOW_INSECURE_AUTH=true` —— 这个二次确认是有意的，防止关掉鉴权的配置被忘在生产环境里。

```bash
npm test          # 索引、搜索、渲染净化、路径安全
npm run typecheck
```

## 部署

服务只监听回环地址，公网入口由 Cloudflare Tunnel + Cloudflare Access 提供。

```bash
cp .env.example .env      # 填写 HOST_KNOWLEDGE_DIR、RUN_AS、CF_ACCESS_* 等
docker compose up -d --build
curl http://127.0.0.1:8088/healthz
```

几个容易踩的点：

- `RUN_AS` 必须是**能读取知识库文件的 uid:gid**。如果笔记文件权限是 `600`，容器就必须以文件属主的 uid 运行，否则一篇也读不到。
- 知识库以 `:ro` 挂载，容器根文件系统也是只读的（缓存目录走 tmpfs）。
- 构建机在国内时传 `NPM_REGISTRY=https://registry.npmmirror.com`，能把装依赖的时间从几分钟压到几秒。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `KNOWLEDGE_DIR` | 容器内知识库挂载点，默认 `/knowledge` |
| `AUTH_MODE` | `cf-access`（默认）或 `none` |
| `ALLOW_INSECURE_AUTH` | `AUTH_MODE=none` 时必须显式设为 `true` |
| `CF_ACCESS_TEAM_DOMAIN` | 形如 `your-team.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | Access 应用的 Application Audience Tag |
| `SITE_NAME` / `SITE_DESCRIPTION` | 站点标题与副标题 |
| `DISPLAY_TIMEZONE` | 时间显示时区，默认 `Asia/Shanghai` |
| `HOST_KNOWLEDGE_DIR` | 宿主机知识库目录（仅 compose 使用） |
| `RUN_AS` | 容器运行的 `uid:gid`（仅 compose 使用） |
| `BIND_ADDR` / `BIND_PORT` | 宿主机监听地址与端口，默认 `127.0.0.1:8088` |

## 知识库结构约定

```
知识库根/
├── 00 灵感想法/     ideas
├── 01 项目/         projects
├── 02 踩坑记录/     lessons
└── 03 好东西/       good-things
```

分类是代码里的常量而不是扫描出来的——新增一个分类应当是一次有意识的决定。每个分类目录根层的 `README.md` 作为分类介绍显示，不作为普通笔记参与列表。仓库根的 `README.md`、`CHANGELOG.md`、隐藏文件和非 Markdown 文件都不会被服务。
