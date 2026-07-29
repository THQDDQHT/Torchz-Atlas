import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root, Text } from "mdast";
import { SUMMARY_LENGTH } from "./config";

export interface NoteMeta {
  title: string | null;
  tags: string[];
  wikilinks: string[];
  plainText: string;
  summary: string;
}

export type WikilinkResolution =
  | { kind: "found"; href: string }
  | { kind: "missing" }
  | { kind: "ambiguous" };

const WIKILINK_RE = /\[\[([^[\]\n]+)\]\]/g;
const HASHTAG_RE = /#([\p{L}\p{N}_-]+)/gu;
const TAG_LINE_RE = /^\s*(?:-\s*)?标签\s*[:：]\s*(.+)$/;
const TAG_SEPARATORS = /[、,，;；]/;

function parse(raw: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(raw) as Root;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function parseNoteMeta(raw: string): NoteMeta {
  const tree = parse(raw);
  let title: string | null = null;
  const tags: string[] = [];
  const wikilinks: string[] = [];

  visit(tree, (node) => {
    if (node.type === "heading" && node.depth === 1 && title === null) {
      const text = mdastToString(node).trim();
      if (text) title = text;
      return;
    }

    if (node.type !== "text") return;
    const value = (node as Text).value;

    for (const line of value.split("\n")) {
      const tagLine = TAG_LINE_RE.exec(line);
      if (!tagLine) continue;
      for (const part of tagLine[1].split(TAG_SEPARATORS)) {
        const tag = part.trim();
        if (tag) tags.push(tag);
      }
    }

    for (const match of value.matchAll(HASHTAG_RE)) {
      const tag = match[1].trim();
      if (tag) tags.push(tag);
    }

    for (const match of value.matchAll(WIKILINK_RE)) {
      const target = match[1].trim();
      if (target) wikilinks.push(target);
    }
  });

  const body = {
    ...tree,
    children: tree.children.filter((child, index) => !(index === 0 && child.type === "heading")),
  } as Root;

  return {
    title,
    tags: dedupe(tags),
    wikilinks: dedupe(wikilinks),
    plainText: collapseWhitespace(mdastToString(tree)),
    summary: truncate(collapseWhitespace(mdastToString(body)), SUMMARY_LENGTH),
  };
}
