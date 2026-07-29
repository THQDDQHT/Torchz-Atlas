/**
 * 路径安全：把不可信的 URL 片段翻译成磁盘路径的唯一入口。
 *
 * 威胁模型是"URL 参数造成目录穿越"。这里不做"过滤掉危险字符"这种黑名单，
 * 而是走白名单：路径必须由合法的分类目录开头、每一段都不是可疑段、
 * 最终解析结果必须仍在知识库根内。任何一条不满足就返回 null，调用方渲染 404。
 */

import path from "node:path";
import { CATEGORY_BY_DIR, getKnowledgeDir } from "./config";

/** 笔记 id 就是相对知识库根的 POSIX 相对路径，例如 "00 灵感想法/想法收件箱.md" */
export type NoteId = string;

/**
 * 校验并规范化一个相对路径。返回规范化后的相对路径，非法则返回 null。
 *
 * 拒绝：绝对路径、含 .. 的路径、隐藏文件或隐藏目录（.git/、.PAT、.env）、
 * 非 .md 文件、不在四个分类目录下的路径、含 NUL 或反斜杠的路径。
 */
export function safeRelativePath(input: string): NoteId | null {
  if (!input) return null;

  // NUL 截断与 Windows 分隔符：两者都是绕过后续字符串检查的经典手法
  if (input.includes("\0") || input.includes("\\")) return null;

  // URL 里可能残留编码，调用方通常已解码；这里再挡一次编码过的分隔符与点号
  if (/%2e|%2f|%5c/i.test(input)) return null;

  if (path.posix.isAbsolute(input)) return null;

  const segments = input.split("/");
  for (const seg of segments) {
    if (seg === "" || seg === "." || seg === "..") return null;
    // 隐藏文件一律不服务：.git/、.PAT、.gitignore、.env 都落在这一条
    if (seg.startsWith(".")) return null;
  }

  // 只服务 Markdown
  if (!input.toLowerCase().endsWith(".md")) return null;

  // 至少要有 "分类目录/文件.md" 两段，且首段必须是已登记的分类目录
  if (segments.length < 2) return null;
  if (!CATEGORY_BY_DIR.has(segments[0])) return null;

  const normalized = path.posix.normalize(input);
  // normalize 之后仍与原串一致，才能确认没有被 ./ 或重复斜杠掩盖过什么
  if (normalized !== input) return null;

  return normalized;
}

/**
 * 把相对路径解析成绝对磁盘路径。非法路径返回 null。
 *
 * 即使 safeRelativePath 已经过关，这里仍然复核解析结果是否落在知识库根内 ——
 * 双重校验的成本是一次字符串比较，而漏掉它的成本是整台服务器的文件。
 */
export function resolveNotePath(relativePath: string): string | null {
  const safe = safeRelativePath(relativePath);
  if (!safe) return null;

  const root = path.resolve(getKnowledgeDir());
  const full = path.resolve(root, safe);

  if (full !== root && !full.startsWith(root + path.sep)) return null;

  return full;
}

/** 笔记 id → URL 路径片段（去掉 .md 后缀，逐段编码） */
export function noteIdToHref(id: NoteId): string {
  const withoutExt = id.replace(/\.md$/i, "");
  const encoded = withoutExt.split("/").map(encodeURIComponent).join("/");
  return `/note/${encoded}`;
}

/**
 * URL catch-all 片段 → 笔记 id。
 *
 * catch-all 路由拿到的片段是**未解码**的（单段动态路由则已解码），所以这里必须自己解码。
 * 顺序是先解码再校验，不能反过来：`%2e%2e%2f` 只有解码成 `../` 之后才会被
 * safeRelativePath 的分段检查抓住，先校验后解码等于把穿越放进门再关门。
 */
export function hrefSegmentsToNoteId(segments: string[]): NoteId | null {
  if (!segments || segments.length === 0) return null;

  const decoded: string[] = [];
  for (const seg of segments) {
    try {
      decoded.push(decodeURIComponent(seg));
    } catch {
      // 畸形百分号编码：与其猜测意图，不如当作非法路径
      return null;
    }
  }

  return safeRelativePath(decoded.join("/") + ".md");
}
