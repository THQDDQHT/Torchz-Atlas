/**
 * 关键词搜索（需求 FR-04）。
 *
 * 匹配规则刻意保持朴素：不区分大小写的子串包含，多词之间取 AND。
 * 中文没有天然词边界，分词器在几十篇笔记的规模上带来的收益远低于它的复杂度和误差；
 * 真正需要语义检索时应当换索引方案，而不是在这里堆启发式规则。
 *
 * 高亮输出的是结构化片段而不是 HTML 字符串 —— 让 React 去转义文本，
 * 搜索结果页就永远不需要 dangerouslySetInnerHTML，也就没有从查询词注入的可能。
 */

import type { Note } from "./indexer";
import { truncate } from "./markdown";

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

export interface SearchHit {
  note: Note;
  /** 命中位置附近的正文片段，已切成高亮片段 */
  excerpt: HighlightSegment[];
  titleSegments: HighlightSegment[];
  /** 标题命中的结果排在前面 */
  titleMatched: boolean;
}

const EXCERPT_BEFORE = 30;
const EXCERPT_LENGTH = 140;

export function tokenize(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHighlightRe(terms: string[]): RegExp | null {
  if (terms.length === 0) return null;
  // 长词优先，避免 "知识" 抢先匹配掉 "知识库" 的高亮范围
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  return new RegExp(`(${sorted.map(escapeRegExp).join("|")})`, "gi");
}

export function highlight(text: string, terms: string[]): HighlightSegment[] {
  const re = buildHighlightRe(terms);
  if (!re) return [{ text, hit: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), hit: false });
    segments.push({ text: m[0], hit: true });
    cursor = start + m[0].length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), hit: false });
  return segments.length > 0 ? segments : [{ text, hit: false }];
}

function matchesAll(note: Note, terms: string[]): boolean {
  const haystacks = [note.title, note.plainText, note.tags.join(" ")].map((s) => s.toLowerCase());
  return terms.every((term) => {
    const t = term.toLowerCase();
    return haystacks.some((h) => h.includes(t));
  });
}

/** 取第一个命中词附近的正文片段；正文没命中（只命中标题或标签）时退回摘要 */
function buildExcerpt(note: Note, terms: string[]): HighlightSegment[] {
  const lower = note.plainText.toLowerCase();
  let hitAt = -1;

  for (const term of terms) {
    const at = lower.indexOf(term.toLowerCase());
    if (at !== -1 && (hitAt === -1 || at < hitAt)) hitAt = at;
  }

  if (hitAt === -1) {
    return highlight(note.summary, terms);
  }

  const start = Math.max(0, hitAt - EXCERPT_BEFORE);
  const raw = note.plainText.slice(start, start + EXCERPT_LENGTH);
  const prefix = start > 0 ? "…" : "";
  const suffix = start + EXCERPT_LENGTH < note.plainText.length ? "…" : "";

  return highlight(prefix + raw + suffix, terms);
}

export function search(notes: Note[], query: string): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const note of notes) {
    if (!matchesAll(note, terms)) continue;

    const titleLower = note.title.toLowerCase();
    const titleMatched = terms.some((t) => titleLower.includes(t.toLowerCase()));

    hits.push({
      note,
      titleMatched,
      titleSegments: highlight(note.title, terms),
      excerpt: buildExcerpt(note, terms),
    });
  }

  hits.sort((a, b) => {
    if (a.titleMatched !== b.titleMatched) return a.titleMatched ? -1 : 1;
    return b.note.modifiedAt - a.note.modifiedAt;
  });

  return hits;
}

export { truncate };
