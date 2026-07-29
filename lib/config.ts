/**
 * 站点与知识库的固定配置。
 *
 * 分类是硬编码常量而不是扫描出来的：知识库的四个顶层目录是有意设计的信息架构，
 * 新增目录应当是一次有意识的产品决策，而不是往服务器上 mkdir 就悄悄多出一个入口。
 */

export type CategorySlug = "ideas" | "projects" | "lessons" | "good-things";

export interface CategoryDef {
  slug: CategorySlug;
  /** 知识库中的目录名，必须与磁盘完全一致 */
  dir: string;
  name: string;
  /** 目录下没有 README.md 时的兜底说明 */
  fallbackDescription: string;
  /** 该分类一篇笔记都没有时显示的空状态文案 */
  emptyText: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "ideas",
    dir: "00 灵感想法",
    name: "灵感想法",
    fallbackDescription: "随手记录、想法、待归类的内容。",
    emptyText: "这里还没有灵感记录。",
  },
  {
    slug: "projects",
    dir: "01 项目",
    name: "项目",
    fallbackDescription: "目标、计划、过程、交付与复盘。",
    emptyText: "这里还没有项目记录。",
  },
  {
    slug: "lessons",
    dir: "02 踩坑记录",
    name: "踩坑记录",
    fallbackDescription: "问题、根因、解决方案、验证与避坑提示。",
    emptyText: "这里还没有踩坑记录。",
  },
  {
    slug: "good-things",
    dir: "03 好东西",
    name: "好东西",
    fallbackDescription: "好内容、方法论、金句、可复用的表达。",
    emptyText: "这里还没有收藏的好东西。",
  },
];

export const CATEGORY_BY_SLUG = new Map<string, CategoryDef>(
  CATEGORIES.map((c) => [c.slug, c]),
);

export const CATEGORY_BY_DIR = new Map<string, CategoryDef>(
  CATEGORIES.map((c) => [c.dir, c]),
);

/** 分类目录根层的这个文件是分类介绍，不作为普通笔记参与列表与"最近更新" */
export const CATEGORY_README = "README.md";

export function getKnowledgeDir(): string {
  return process.env.KNOWLEDGE_DIR || "/knowledge";
}

export function getSiteName(): string {
  return process.env.SITE_NAME || "Torchz";
}

export function getSiteDescription(): string {
  return process.env.SITE_DESCRIPTION || "个人知识库 · 想法、项目、踩坑与好东西";
}

/** 首页"最近更新"显示条数 */
export const RECENT_LIMIT = 8;

/** 摘要截取长度（中文字符数），需求要求 120–180 字 */
export const SUMMARY_LENGTH = 150;
