/**
 * 知识库索引：扫描只读挂载的 Markdown，建立内存中的笔记 / 标签 / 标题索引。
 *
 * 更新策略是"目录指纹比对"而不是启动时一次性索引：每次请求先 stat 一遍文件
 * （几十个文件，成本在微秒级），把 路径+mtime+大小 拼成指纹，与缓存的指纹比对，
 * 一致就直接复用，不一致才重新读文件重建。
 *
 * 这样通过 Git 或微信采集流程新增笔记后，刷新页面即可见，不需要重启服务，
 * 也不需要一个带鉴权的 reindex 接口 —— 那个接口最大的问题是你总会忘记调它。
 * 代价：笔记涨到数千篇后 stat 开销会显现，届时该换文件监听。
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  CATEGORIES,
  CATEGORY_README,
  type CategoryDef,
  type CategorySlug,
  getKnowledgeDir,
} from "./config";
import { parseNoteMeta, type WikilinkResolution } from "./markdown";

export interface Note {
  /** 相对知识库根的路径，同时充当稳定 id。不暴露服务器绝对路径。 */
  id: string;
  title: string;
  category: CategorySlug;
  categoryName: string;
  summary: string;
  /** 去 Markdown 后的正文，供搜索匹配 */
  plainText: string;
  tags: string[];
  wikilinks: string[];
  modifiedAt: number;
  /** 所在目录（相对路径），wikilink 的"优先同目录"规则要用 */
  dir: string;
}

export interface IndexError {
  path: string;
  message: string;
}

export interface KnowledgeIndex {
  /** 全部普通笔记，按修改时间倒序 */
  notes: Note[];
  byId: Map<string, Note>;
  byCategory: Map<CategorySlug, Note[]>;
  /** 分类介绍，取自分类目录根层的 README.md */
  categoryDescriptions: Map<CategorySlug, string>;
  /** 标签 → 笔记，标签保留原始大小写 */
  tags: Map<string, Note[]>;
  /** 标题与文件名 → 笔记，可能一对多，wikilink 解析用 */
  titleIndex: Map<string, Note[]>;
  /**
   * 反向链接：笔记 id → 引用了它的那些笔记。
   *
   * 这是这个阅读器相对本地编辑器唯一不可替代的能力 —— 打开一篇笔记时能看见
   * "谁提到过我"。数据本来就在（每篇的 wikilinks 已在解析时收集），只差反向建表。
   */
  backlinks: Map<string, Note[]>;
  lastModified: number;
  errors: IndexError[];
}

interface ScannedFile {
  /** 相对知识库根 */
  relPath: string;
  absPath: string;
  category: CategoryDef;
  mtimeMs: number;
  size: number;
  /** 分类目录根层的 README.md：作为分类介绍，不作为普通笔记 */
  isCategoryReadme: boolean;
}

/**
 * 递归收集一个分类目录下的 Markdown。
 * 隐藏文件与隐藏目录直接跳过 —— .git/、.PAT、.env 都在这一条里被挡掉。
 */
async function scanCategory(root: string, category: CategoryDef): Promise<ScannedFile[]> {
  const results: ScannedFile[] = [];
  const categoryRoot = path.join(root, category.dir);

  async function walk(dir: string, depth: number): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      // 分类目录尚未创建属于正常情况（空分类），交给上层显示空状态
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const abs = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(abs, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith(".md")) continue;

      let stat;
      try {
        stat = await fs.stat(abs);
      } catch {
        continue;
      }

      results.push({
        relPath: path.relative(root, abs).split(path.sep).join("/"),
        absPath: abs,
        category,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        isCategoryReadme: depth === 0 && entry.name === CATEGORY_README,
      });
    }
  }

  await walk(categoryRoot, 0);
  return results;
}

async function scanAll(root: string): Promise<ScannedFile[]> {
  const perCategory = await Promise.all(CATEGORIES.map((c) => scanCategory(root, c)));
  return perCategory.flat();
}

function fingerprint(files: ScannedFile[]): string {
  return files
    .map((f) => `${f.relPath}:${f.mtimeMs}:${f.size}`)
    .sort()
    .join("|");
}

function titleFromFilename(relPath: string): string {
  return path.basename(relPath).replace(/\.md$/i, "");
}

async function buildIndex(root: string, files: ScannedFile[]): Promise<KnowledgeIndex> {
  const notes: Note[] = [];
  const categoryDescriptions = new Map<CategorySlug, string>();
  const errors: IndexError[] = [];

  for (const file of files) {
    let raw: string;
    try {
      raw = await fs.readFile(file.absPath, "utf8");
    } catch (err) {
      // 单个文件读不了不能拖垮整个知识库（需求 FR-06 第 5 条）
      errors.push({ path: file.relPath, message: `读取失败: ${(err as Error).message}` });
      continue;
    }

    try {
      const meta = parseNoteMeta(raw);

      if (file.isCategoryReadme) {
        categoryDescriptions.set(file.category.slug, meta.summary || meta.plainText);
        continue;
      }

      notes.push({
        id: file.relPath,
        title: meta.title ?? titleFromFilename(file.relPath),
        category: file.category.slug,
        categoryName: file.category.name,
        summary: meta.summary,
        plainText: meta.plainText,
        tags: meta.tags,
        wikilinks: meta.wikilinks,
        modifiedAt: file.mtimeMs,
        dir: path.posix.dirname(file.relPath),
      });
    } catch (err) {
      errors.push({ path: file.relPath, message: `解析失败: ${(err as Error).message}` });
    }
  }

  notes.sort((a, b) => b.modifiedAt - a.modifiedAt);

  const byId = new Map<string, Note>();
  const byCategory = new Map<CategorySlug, Note[]>();
  const tags = new Map<string, Note[]>();
  const titleIndex = new Map<string, Note[]>();

  for (const c of CATEGORIES) byCategory.set(c.slug, []);

  for (const note of notes) {
    byId.set(note.id, note);
    byCategory.get(note.category)!.push(note);

    for (const tag of note.tags) {
      const list = tags.get(tag);
      if (list) list.push(note);
      else tags.set(tag, [note]);
    }

    // 标题与文件名都登记：Obsidian 里 [[X]] 既可能指标题也可能指文件名
    for (const key of new Set([note.title, titleFromFilename(note.id)])) {
      const list = titleIndex.get(key);
      if (list) list.push(note);
      else titleIndex.set(key, [note]);
    }
  }

  // 反向建表：对每篇笔记的每个 wikilink，按与正向解析完全相同的规则定位目标，
  // 再把来源记到目标名下。规则必须一致，否则会出现"点得过去但反链里看不见"。
  const backlinks = new Map<string, Note[]>();
  const resolveTarget = (target: string, fromDir: string): Note | null => {
    const candidates = titleIndex.get(target.trim());
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    const sameDir = candidates.filter((n) => n.dir === fromDir);
    return sameDir.length === 1 ? sameDir[0] : null;
  };

  for (const source of notes) {
    for (const target of source.wikilinks) {
      const hit = resolveTarget(target, source.dir);
      if (!hit || hit.id === source.id) continue;

      const list = backlinks.get(hit.id);
      if (!list) backlinks.set(hit.id, [source]);
      else if (!list.some((n) => n.id === source.id)) list.push(source);
    }
  }

  return {
    notes,
    byId,
    byCategory,
    categoryDescriptions,
    tags,
    titleIndex,
    backlinks,
    lastModified: notes.reduce((max, n) => Math.max(max, n.modifiedAt), 0),
    errors,
  };
}

interface Cache {
  fingerprint: string;
  index: KnowledgeIndex;
  root: string;
}

// 挂在 globalThis 上，避免 dev 模式模块热重载后缓存失效
const globalCache = globalThis as unknown as { __torchzIndexCache?: Cache };

export async function getIndex(): Promise<KnowledgeIndex> {
  const root = path.resolve(getKnowledgeDir());
  const files = await scanAll(root);
  const fp = fingerprint(files);

  const cached = globalCache.__torchzIndexCache;
  if (cached && cached.root === root && cached.fingerprint === fp) {
    return cached.index;
  }

  const index = await buildIndex(root, files);
  globalCache.__torchzIndexCache = { fingerprint: fp, index, root };
  return index;
}

/** 仅供测试：清掉进程内缓存 */
export function clearIndexCache(): void {
  delete globalCache.__torchzIndexCache;
}

/**
 * wikilink 解析（需求第 8 节）：优先同目录的同名笔记；
 * 跨目录仍有多篇同名时判为 ambiguous，由渲染层降级成提示文本，绝不随机跳转。
 */
export function createWikilinkResolver(index: KnowledgeIndex, fromDir: string) {
  return (target: string): WikilinkResolution => {
    const candidates = index.titleIndex.get(target.trim());
    if (!candidates || candidates.length === 0) return { kind: "missing" };

    if (candidates.length === 1) {
      return { kind: "found", href: noteHref(candidates[0].id) };
    }

    const sameDir = candidates.filter((n) => n.dir === fromDir);
    if (sameDir.length === 1) {
      return { kind: "found", href: noteHref(sameDir[0].id) };
    }

    return { kind: "ambiguous" };
  };
}

function noteHref(id: string): string {
  const withoutExt = id.replace(/\.md$/i, "");
  return `/note/${withoutExt.split("/").map(encodeURIComponent).join("/")}`;
}
