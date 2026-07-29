import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORY_BY_SLUG } from "@/lib/config";
import { getIndex } from "@/lib/indexer";
import { NoteCard } from "@/components/NoteCard";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { sort?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = CATEGORY_BY_SLUG.get(slug);
  return { title: category ? category.name : "未找到分类" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { sort } = await searchParams;

  const category = CATEGORY_BY_SLUG.get(slug);
  if (!category) notFound();

  const index = await getIndex();
  const notes = [...(index.byCategory.get(category.slug) ?? [])];

  // 默认按最近修改；标题排序用 zh-CN collator，否则中文会按码点乱排
  const sortByTitle = sort === "title";
  if (sortByTitle) {
    const collator = new Intl.Collator("zh-CN");
    notes.sort((a, b) => collator.compare(a.title, b.title));
  }

  const description = index.categoryDescriptions.get(category.slug) ?? category.fallbackDescription;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <p className="text-sm text-ink-faint">{notes.length} 篇笔记</p>
        <nav aria-label="排序方式" className="flex items-center gap-1 text-sm">
          <Link
            href={`/category/${category.slug}`}
            aria-current={!sortByTitle ? "true" : undefined}
            className={
              "flex min-h-11 items-center rounded px-2.5 " +
              (!sortByTitle ? "font-semibold text-accent" : "text-ink-muted hover:text-accent")
            }
          >
            最新修改
          </Link>
          <Link
            href={`/category/${category.slug}?sort=title`}
            aria-current={sortByTitle ? "true" : undefined}
            className={
              "flex min-h-11 items-center rounded px-2.5 " +
              (sortByTitle ? "font-semibold text-accent" : "text-ink-muted hover:text-accent")
            }
          >
            标题 A–Z
          </Link>
        </nav>
      </div>

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
          {category.emptyText}
        </p>
      ) : (
        <div>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} showCategory={false} />
          ))}
        </div>
      )}
    </div>
  );
}
