/**
 * Markdown 解析与安全渲染。
 *
 * 分成两条独立管线，因为它们的调用频率差了一个数量级：
 *   - parseNoteMeta：每次建索引时对每篇笔记跑一次，只要元数据，不生成 HTML。
 *   - renderNote：只在打开某篇笔记详情时跑一次，生成净化过的 HTML 与目录。
 *
 * 净化策略是白名单（rehype-sanitize 的 GitHub schema），不是"过滤危险标签"的黑名单。
 * 顺序上 sanitize 跑在 slug 与外链处理之前 —— 净化会剥掉不认识的属性，
 * 所以我们自己要加的 id / target / rel 必须等它跑完再补，否则会被自己人清掉。
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";
import { toString as hastToString } from "hast-util-to-string";
import type { Root as MdastRoot, Text as MdastText, Parent } from "mdast";
import type { Root as HastRoot, Element as HastElement } from "hast";
import { SUMMARY_LENGTH } from "./config";

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface NoteMeta {
  /** 首个一级标题；没有则由调用方回退到文件名 */
  title: string | null;
  tags: string[];
  /** 正文中出现的 [[目标]] 原始文本 */
  wikilinks: string[];
  /** 去 Markdown 语法后的纯文本，供搜索与摘要使用 */
  plainText: string;
  summary: string;
}

/** wikilink 解析结果：命中一篇 / 找不到 / 存在多篇同名 */
export type WikilinkResolution =
  | { kind: "found"; href: string }
  | { kind: "missing" }
  | { kind: "ambiguous" };

export type WikilinkResolver = (target: string) => WikilinkResolution;

const WIKILINK_RE = /\[\[([^[\]\n]+)\]\]/g;

/**
 * Hashtag：`#知识库搭建`。
 * 只在 mdast 的文本节点上匹配，所以 Markdown 标题的 `# ` 天然不会误伤 ——
 * 那个井号在解析阶段已经变成 heading 节点的结构信息，不再存在于文本里。
 */
const HASHTAG_RE = /#([\p{L}\p{N}_-]+)/gu;

/** 元信息行：`- 标签：自媒体、游戏开发` 或 `标签: a, b` */
const TAG_LINE_RE = /^\s*标签\s*[:：]\s*(.+)$/;
const TAG_SEPARATORS = /[、,，;；]/;

function parseMdast(raw: string): MdastRoot {
  return unified().use(remarkParse).use(remarkGfm).parse(raw) as MdastRoot;
}

/** 代码内容不参与标签、wikilink 与标题提取：代码里的 # 是注释，不是标签 */
function isCodeNode(type: string): boolean {
  return type === "code" || type === "inlineCode";
}

function normalizeTag(tag: string): string {
  // 需求 FR-05：去首尾空格，保留中文与原始大小写，不做同义词合并
  return tag.trim();
}

export function parseNoteMeta(raw: string): NoteMeta {
  const tree = parseMdast(raw);

  let title: string | null = null;
  const tags: string[] = [];
  const wikilinks: string[] = [];

  visit(tree, (node) => {
    if (node.type === "heading" && (node as { depth: number }).depth === 1 && title === null) {
      const text = mdastToString(node).trim();
      if (text) title = text;
      return;
    }

    if (node.type !== "text") return;
    const value = (node as MdastText).value;

    for (const line of value.split("\n")) {
      const tagLine = TAG_LINE_RE.exec(line);
      if (tagLine) {
        for (const part of tagLine[1].split(TAG_SEPARATORS)) {
          const t = normalizeTag(part);
          if (t) tags.push(t);
        }
      }
    }

    for (const m of value.matchAll(HASHTAG_RE)) {
      const t = normalizeTag(m[1]);
      if (t) tags.push(t);
    }

    for (const m of value.matchAll(WIKILINK_RE)) {
      const target = m[1].trim();
      if (target) wikilinks.push(target);
    }
  });

  // 纯文本用于搜索与摘要。标题行不算摘要正文，否则每条摘要都以标题开头。
  const bodyNodes = { ...tree, children: tree.children.filter((c, i) => !(i === 0 && c.type === "heading")) };
  const plainText = collapseWhitespace(mdastToString(tree));
  const bodyText = collapseWhitespace(mdastToString(bodyNodes as MdastRoot));

  return {
    title,
    tags: dedupe(tags),
    wikilinks: dedupe(wikilinks),
    plainText,
    summary: truncate(bodyText, SUMMARY_LENGTH),
  };
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}

export function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len).trimEnd() + "…";
}

/**
 * 把 [[目标]] 换成站内链接。
 *
 * 用 data.hName / data.hProperties 直接指定目标 hast 元素，这样未解析的链接
 * 也能带上一个可识别的 class 做低调降级，而不必往 Markdown 里塞裸 HTML。
 */
function remarkWikilink(resolver: WikilinkResolver) {
  return () => (tree: MdastRoot) => {
    visit(tree, "text", (node: MdastText, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (isCodeNode(parent.type)) return;

      const value = node.value;
      WIKILINK_RE.lastIndex = 0;
      if (!WIKILINK_RE.test(value)) return;
      WIKILINK_RE.lastIndex = 0;

      const replacement: Parent["children"] = [];
      let cursor = 0;

      for (const m of value.matchAll(WIKILINK_RE)) {
        const start = m.index ?? 0;
        if (start > cursor) {
          replacement.push({ type: "text", value: value.slice(cursor, start) } as MdastText);
        }

        const raw = m[0];
        const target = m[1].trim();
        const resolution = resolver(target);

        if (resolution.kind === "found") {
          replacement.push({
            type: "link",
            url: resolution.href,
            children: [{ type: "text", value: target }],
            data: { hProperties: { className: ["wikilink"] } },
          } as never);
        } else {
          // 需求 FR-03/第 8 节：找不到或同名多篇时保留可读文本，不跳转、不报错
          const className =
            resolution.kind === "ambiguous" ? "wikilink-ambiguous" : "wikilink-missing";
          replacement.push({
            type: "text",
            value: raw,
            data: {
              hName: "span",
              hProperties: { className: [className] },
              hChildren: [{ type: "text", value: raw }],
            },
          } as never);
        }

        cursor = start + raw.length;
      }

      if (cursor < value.length) {
        replacement.push({ type: "text", value: value.slice(cursor) } as MdastText);
      }

      parent.children.splice(index, 1, ...replacement);
      return index + replacement.length;
    });
  };
}

type AttrRule = string | [string, ...(string | RegExp)[]];

/**
 * 往某个标签的 className 允许值里追加取值。
 *
 * 必须合并进已有的那条规则而不是再追加一条：schema 里同一属性出现多条规则时只有
 * 第一条生效，而 GitHub schema 已经给 <a> 的 className 限定过 data-footnote-backref，
 * 直接 push 一条新规则会被静默吃掉，class 变成空字符串。
 */
function allowClassNames(existing: AttrRule[] = [], ...values: string[]): AttrRule[] {
  const isClassRule = (r: AttrRule) =>
    r === "className" || (Array.isArray(r) && r[0] === "className");

  const previous = existing
    .filter((r): r is [string, ...(string | RegExp)[]] => Array.isArray(r) && r[0] === "className")
    .flatMap((r) => r.slice(1));

  return [
    ...existing.filter((r) => !isClassRule(r)),
    ["className", ...previous, ...values] as AttrRule,
  ];
}

/**
 * 移除正文开头的一级标题。
 *
 * 笔记的第一行 `# 标题` 已经由详情页头部单独渲染（还要挂分类、时间、标签），
 * 正文里再来一次就是同一句话印两遍。剥掉它之后首段成为正文第一个元素，
 * 首字下沉才有地方落。
 */
function remarkStripLeadingH1() {
  return (tree: MdastRoot) => {
    const first = tree.children[0];
    if (first && first.type === "heading" && (first as { depth: number }).depth === 1) {
      tree.children.shift();
    }
  };
}

/**
 * 净化白名单：在 GitHub schema 基础上，只额外放行我们自己生成的 wikilink class。
 * 属性值用枚举而不是放开 className，避免笔记正文里的任意 class 注入到页面样式中。
 */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "span"],
  attributes: {
    ...defaultSchema.attributes,
    span: allowClassNames(
      defaultSchema.attributes?.span as AttrRule[] | undefined,
      "wikilink-missing",
      "wikilink-ambiguous",
    ),
    a: allowClassNames(defaultSchema.attributes?.a as AttrRule[] | undefined, "wikilink"),
  },
};

/** 外链一律新窗口打开并切断 opener 引用（需求 FR-03 第 5 条） */
function rehypeExternalLinks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: HastElement) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string") return;
      if (!/^https?:\/\//i.test(href)) return;

      node.properties = {
        ...node.properties,
        target: "_blank",
        // hast 里 rel 是空格分隔的多值属性，序列化时会拼成 rel="noopener noreferrer"
        rel: ["noopener", "noreferrer"],
      };
    });
  };
}

/**
 * 给表格套一层可横向滚动的容器（需求第 9 节：宽表格可横向滚动，页面本身不横向滚动）。
 * 跑在净化之后，所以这个 div 和它的 class 是我们自己加的，不经过白名单。
 */
function rehypeWrapTables() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: HastElement, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) return;
      if ((parent as HastElement).tagName === "div") return;

      const wrapper: HastElement = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"] },
        children: [node],
      };

      (parent as HastElement).children.splice(index, 1, wrapper);
      return index + 1;
    });
  };
}

/** 收集二三级标题做文章目录。跑在 slug 之后，才拿得到 id。 */
function rehypeCollectToc(sink: TocEntry[]) {
  return () => (tree: HastRoot) => {
    visit(tree, "element", (node: HastElement) => {
      const depth = node.tagName === "h2" ? 2 : node.tagName === "h3" ? 3 : null;
      if (depth === null) return;

      const id = typeof node.properties?.id === "string" ? node.properties.id : null;
      if (!id) return;

      const text = hastToString(node).trim();
      if (text) sink.push({ id, text, depth });
    });
  };
}

export interface RenderedNote {
  html: string;
  toc: TocEntry[];
}

export async function renderNote(
  raw: string,
  resolver: WikilinkResolver,
  options: { stripLeadingH1?: boolean } = {},
): Promise<RenderedNote> {
  const toc: TocEntry[] = [];

  const pipeline = unified().use(remarkParse).use(remarkGfm);

  if (options.stripLeadingH1) pipeline.use(remarkStripLeadingH1);

  const file = await pipeline
    .use(remarkWikilink(resolver))
    // allowDangerousHtml 保持关闭：笔记里的裸 HTML 不进入 hast，从源头掐断注入
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeSlug)
    .use(rehypeExternalLinks)
    .use(rehypeWrapTables)
    .use(rehypeCollectToc(toc))
    .use(rehypeStringify)
    .process(raw);

  return { html: String(file), toc };
}
