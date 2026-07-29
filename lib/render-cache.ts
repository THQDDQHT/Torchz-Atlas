/**
 * 渲染结果缓存。
 *
 * 页面是 force-dynamic，每次请求都会重新解析并渲染整篇 Markdown。加上语法高亮之后
 * 这件事变贵了：shiki 要加载语法定义并逐 token 着色，而那篇需求文档有 22KB、
 * 48 个标题、4 个代码块 —— 手机弱网下每刷新一次都重算一遍毫无意义。
 *
 * 缓存键是「笔记 id + 修改时间」，所以文件一改，键自然失效，不需要手动清理，
 * 也不会和索引的目录指纹机制冲突。上限存在是为了防止笔记涨到几百篇后无声吃内存。
 */

import type { RenderedNote } from "./markdown";

const MAX_ENTRIES = 64;

interface CacheEntry {
  key: string;
  value: RenderedNote;
}

const globalCache = globalThis as unknown as { __torchzRenderCache?: Map<string, CacheEntry> };

function store(): Map<string, CacheEntry> {
  if (!globalCache.__torchzRenderCache) globalCache.__torchzRenderCache = new Map();
  return globalCache.__torchzRenderCache;
}

export async function renderNoteCached(
  noteId: string,
  modifiedAt: number,
  render: () => Promise<RenderedNote>,
): Promise<RenderedNote> {
  const cache = store();
  const key = `${noteId}@${modifiedAt}`;

  const hit = cache.get(noteId);
  if (hit && hit.key === key) return hit.value;

  const value = await render();
  cache.set(noteId, { key, value });

  // 简单的先进先出淘汰：命中率不敏感，这里只是给内存封个顶
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }

  return value;
}

/** 仅供测试 */
export function clearRenderCache(): void {
  delete globalCache.__torchzRenderCache;
}
