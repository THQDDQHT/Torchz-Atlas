import Link from "next/link";
import { CATEGORIES, getSiteName } from "@/lib/config";
import { getIndex } from "@/lib/indexer";
import { noteIdToHref } from "@/lib/paths";
import { SearchBox } from "./SearchBox";
import { SidebarTree, type TreeCategory } from "./SidebarTree";

async function buildTree(): Promise<{ categories: TreeCategory[]; total: number; tags: number }> {
  const index = await getIndex();

  const categories: TreeCategory[] = CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    href: `/category/${c.slug}`,
    notes: (index.byCategory.get(c.slug) ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      href: noteIdToHref(n.id),
    })),
  }));

  return { categories, total: index.notes.length, tags: index.tags.size };
}

/** 侧栏内容。桌面常驻、移动端折叠，两处共用这一份。 */
export async function SidebarContent() {
  const { categories, total, tags } = await buildTree();

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-3">
        <SearchBox compact />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <Link href="/" className="tree-row mb-1">
          <span className="truncate">首页</span>
        </Link>
        <SidebarTree categories={categories} />
      </div>

      <div className="border-t border-border px-4 py-2.5 text-xs text-text-faint">
        {total} 篇笔记 · {tags} 个标签
      </div>
    </div>
  );
}

/** 桌面固定侧栏 */
export async function Sidebar() {
  return (
    <aside
      aria-label="知识库导航"
      className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-bg-sidebar lg:flex"
    >
      <div className="px-4 pb-1 pt-4">
        <Link
          href="/"
          className="text-[0.9375rem] font-semibold text-text hover:text-accent"
        >
          {getSiteName()}
        </Link>
      </div>
      <div className="min-h-0 flex-1 pt-3">
        <SidebarContent />
      </div>
    </aside>
  );
}
