import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DefaultTheme, PageData } from "vitepress";
import {
  CATEGORIES,
  RECENT_LIMIT,
  getKnowledgeDir,
  getSiteDescription,
  getSiteName,
} from "./config";
import { clearIndexCache, getIndex, type KnowledgeIndex, type Note } from "./indexer";
import { noteHref, tagHref, tagPageName } from "./routes";

export interface PreparedSite {
  index: KnowledgeIndex;
  sidebar: DefaultTheme.SidebarItem[];
}

function assertManagedDirectory(directory: string): void {
  const resolved = path.resolve(directory);
  const localGenerated = path.resolve(import.meta.dirname, "..", ".vitepress", "generated");
  const temporaryRoots = new Set([path.resolve(os.tmpdir()), path.resolve("/tmp")]);
  const isManagedTemporaryDirectory = [...temporaryRoots].some(
    (root) =>
      resolved.startsWith(`${root}${path.sep}`) &&
      path.basename(resolved).startsWith("torchz-atlas"),
  );

  if (resolved !== localGenerated && !isManagedTemporaryDirectory) {
    throw new Error(`拒绝清理未登记的生成目录：${resolved}`);
  }
}

function markdownText(value: string): string {
  return value.replace(/([\\`*_[\]<>])/g, "\\$1");
}

function frontmatter(title: string, extra: string[] = []): string {
  return [
    "---",
    `title: ${JSON.stringify(title)}`,
    "editLink: false",
    "prev: false",
    "next: false",
    ...extra,
    "---",
    "",
  ].join("\n");
}

function noteLine(note: Note): string {
  return `- [${markdownText(note.title)}](${noteHref(note.id)}) — ${markdownText(note.summary)}`;
}

function buildHome(index: KnowledgeIndex): string {
  const recent =
    index.notes.length > 0
      ? index.notes.slice(0, RECENT_LIMIT).map(noteLine).join("\n")
      : "知识库里还没有笔记。";

  const categories = CATEGORIES.map((category) => {
    const count = index.byCategory.get(category.slug)?.length ?? 0;
    const description =
      index.categoryDescriptions.get(category.slug) ?? category.fallbackDescription;
    return `- [${category.name}](/category/${category.slug}) · ${count} 篇\n  ${markdownText(description)}`;
  }).join("\n");

  const tags =
    index.tags.size > 0
      ? [...index.tags.entries()]
          .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
          .map(([tag, notes]) => `[${markdownText(tag)}](${tagHref(tag)}) · ${notes.length}`)
          .join("　")
      : "还没有标签。";

  return [
    frontmatter(getSiteName(), ["aside: false"]),
    `# ${markdownText(getSiteName())}`,
    "",
    getSiteDescription(),
    "",
    "## 最近更新",
    "",
    recent,
    "",
    "## 分类",
    "",
    categories,
    "",
    "## 标签",
    "",
    tags,
    "",
    "---",
    "",
    `${index.notes.length} 篇笔记 · ${index.tags.size} 个标签`,
    "",
  ].join("\n");
}

function buildCategory(index: KnowledgeIndex, category: (typeof CATEGORIES)[number]): string {
  const notes = index.byCategory.get(category.slug) ?? [];
  const description =
    index.categoryDescriptions.get(category.slug) ?? category.fallbackDescription;
  const list = notes.length > 0 ? notes.map(noteLine).join("\n") : category.emptyText;

  return [
    frontmatter(category.name, ["aside: false"]),
    `# ${category.name}`,
    "",
    markdownText(description),
    "",
    `${notes.length} 篇笔记`,
    "",
    list,
    "",
  ].join("\n");
}

function buildTag(tag: string, notes: Note[]): string {
  return [
    frontmatter(`#${tag}`, ["aside: false"]),
    `# #${markdownText(tag)}`,
    "",
    `${notes.length} 篇笔记`,
    "",
    notes.map(noteLine).join("\n"),
    "",
  ].join("\n");
}

function buildSidebar(index: KnowledgeIndex): DefaultTheme.SidebarItem[] {
  return [
    { text: "首页", link: "/" },
    ...CATEGORIES.map((category) => ({
      text: category.name,
      link: `/category/${category.slug}`,
      collapsed: false,
      items: (index.byCategory.get(category.slug) ?? []).map((note) => ({
        text: note.title,
        link: noteHref(note.id),
      })),
    })),
  ];
}

export async function prepareSiteSource(sourceDirectory: string): Promise<PreparedSite> {
  const sourceDir = path.resolve(sourceDirectory);
  assertManagedDirectory(sourceDir);

  clearIndexCache();
  const index = await getIndex();
  const knowledgeRoot = path.resolve(getKnowledgeDir());

  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.mkdir(sourceDir, { recursive: true });

  for (const note of index.notes) {
    const source = path.resolve(knowledgeRoot, note.id);
    if (!source.startsWith(`${knowledgeRoot}${path.sep}`)) {
      throw new Error(`笔记路径越过知识库根目录：${note.id}`);
    }

    const destination = path.join(sourceDir, "note", note.id);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }

  await fs.writeFile(path.join(sourceDir, "index.md"), buildHome(index), "utf8");

  for (const category of CATEGORIES) {
    const destination = path.join(sourceDir, "category", `${category.slug}.md`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, buildCategory(index, category), "utf8");
  }

  for (const [tag, notes] of index.tags) {
    const destination = path.join(sourceDir, "tag", `${tagPageName(tag)}.md`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, buildTag(tag, notes), "utf8");
  }

  return { index, sidebar: buildSidebar(index) };
}

export function notePageData(index: KnowledgeIndex, page: PageData): Partial<PageData> | undefined {
  if (!page.relativePath.startsWith("note/")) return undefined;
  const id = page.relativePath.slice("note/".length);
  const note = index.byId.get(id);
  if (!note) return undefined;

  const siblings = index.byCategory.get(note.category) ?? [];
  const position = siblings.findIndex((candidate) => candidate.id === note.id);
  const newer = position > 0 ? siblings[position - 1] : null;
  const older = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : null;

  return {
    lastUpdated: note.modifiedAt,
    frontmatter: {
      ...page.frontmatter,
      prev: newer ? { text: newer.title, link: noteHref(newer.id) } : false,
      next: older ? { text: older.title, link: noteHref(older.id) } : false,
      atlas: {
        category: {
          name: note.categoryName,
          href: `/category/${note.category}`,
        },
        tags: note.tags.map((tag) => ({ name: tag, href: tagHref(tag) })),
        backlinks: (index.backlinks.get(note.id) ?? []).map((backlink) => ({
          title: backlink.title,
          href: noteHref(backlink.id),
        })),
      },
    },
  };
}
