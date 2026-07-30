# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

主要用户是 Torchz 自己，在桌面与手机浏览器中阅读个人 Markdown 知识库。笔记由本地写作和微信采集流程写入磁盘，网页只负责阅读与检索。

## Product Purpose

Torchz Atlas 把服务器上的 Markdown 笔记变成一个只读、私有、手机友好的知识库。成功意味着新增或修改笔记后无需人工发布操作即可很快看到，并能依靠目录、搜索、标签、wikilink 和反链继续探索。

## Positioning

Markdown 文件始终是唯一事实来源；Atlas 不引入数据库、不编辑原文，而是在构建阶段补出导航和关系索引。

## Operating Context

- 知识库固定分为「灵感想法」「项目」「踩坑记录」「好东西」四类。
- 内容通过只读卷挂载到服务中。
- 公网入口经过 Cloudflare Tunnel，应用自身负责密码认证；需要时也可切换为 Cloudflare Access JWT。
- 原始笔记由用户本人编写，可作为可信 VitePress 源文件直接编译。

## Capabilities and Constraints

- 支持全文搜索、标签聚合、三态 wikilink、同目录优先消歧和反向链接。
- 生产内容更新通过文件监听触发静态站重建；失败时继续提供上一个成功版本。
- 密码模式从服务器环境变量读取密码，并用安全 Cookie 保持登录会话。
- 可选 Cloudflare Access JWT 模式；任何生产鉴权配置缺失时都必须拒绝访问。
- 应用只读知识库，不创建、编辑或删除笔记。

## Brand Commitments

- 产品名为 Torchz Atlas，界面与文案使用简洁中文。
- 阅读体验采用 VitePress 默认主题作为长期视觉和交互基线。

## Evidence on Hand

- `tests/fixtures/knowledge/` 提供覆盖分类、标签、重名 wikilink、反链、表格和代码块的测试知识库。
- 现有索引与测试定义了 wikilink、标签和扫描边界的业务规则。

## Product Principles

- 内容优先于装饰，导航和大纲必须始终清楚。
- 自动化优先于需要记住的人工发布步骤。
- 构建失败不得影响上一版内容可用性。
- 私有保护失败时关门，不以可用性为理由静默放行。
