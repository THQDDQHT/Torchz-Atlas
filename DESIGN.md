---
name: Torchz Atlas
description: 基于 VitePress 默认主题的私有知识库阅读界面
colors:
  accent: "#3451b2"
  background: "#ffffff"
  background-dark: "#1b1b1f"
  text: "#3c3c43"
  text-dark: "#dfdfd6"
  divider: "#e2e2e3"
rounded:
  sm: "4px"
  md: "8px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
---

# Design System: Torchz Atlas

## Overview

**Creative North Star: "VitePress 原生文档工作台"**

界面直接采用 VitePress 默认主题的布局、交互和状态语言，不维护一套相似但分叉的自定义文档主题。个性只出现在中文内容、分类、标签、wikilink 和反链这些知识库语义上。

**Key Characteristics:**

- 左侧目录、右侧滚动大纲与顶部搜索形成稳定的三段式阅读框架
- 桌面与移动端都使用 VitePress 原生导航行为
- 明暗模式完整继承默认主题
- 自定义样式仅补充知识库语义，不改写主题骨架

## Colors

使用 VitePress 的中性明暗底色和单一蓝色强调色；标签、链接与焦点共享同一强调语义。

## Typography

正文、标题、代码与界面标签全部继承 VitePress 默认主题字阶和字体回退。中文由系统无衬线字体承接，代码由主题的等宽字体与 Shiki 配色承接。

## Layout

桌面端保留顶部导航、左侧目录、中央正文和右侧大纲；中等屏幕隐藏右侧大纲；移动端目录进入抽屉。正文宽度、断点和留白由默认主题控制。

## Elevation & Depth

整体保持默认主题的扁平层级，以边界、背景层和固定导航表达深度，不增加装饰性阴影。

## Shapes

沿用默认主题的小圆角和清晰边框。标签使用紧凑胶囊形，缺失或歧义 wikilink 使用下划线状态，不引入卡片堆叠。

## Components

### Navigation

目录折叠、当前项高亮、移动端抽屉、搜索模态框和外观切换全部使用 VitePress 默认实现。

### Knowledge Metadata

分类与标签位于文章末尾、翻页导航之前；反链以普通链接列表呈现，与正文阅读层级保持一致。分类胶囊使用实心品牌色底，标签胶囊使用描边，区分主导航与次要语义。

### Generated Lists

首页"最近更新"、分类页与标签页的笔记列表使用行式列表:整行是点击目标,圆角 hover 背景表达可点,摘要降级为次要文字并截断两行。首页标签以胶囊排列并带篇数计数。行式列表沿用主题的扁平层级,不使用卡片边框与阴影。

## Do's and Don'ts

### Do:

- **Do** 优先使用默认主题配置和插槽扩展。
- **Do** 让自定义组件继续使用 `--vp-*` 主题变量。
- **Do** 同时验证桌面、移动端和深色模式。

### Don't:

- **Don't** 复制默认主题组件后自行维护分叉版本。
- **Don't** 用自定义固定布局覆盖默认响应式行为。
- **Don't** 为标签、反链或首页重新引入一套卡片视觉系统。
