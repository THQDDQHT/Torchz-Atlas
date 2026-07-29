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
    <div>
      <header className="border-b border-border pb-4">
        <h1 className="flex items-center gap-2 text-[1.375rem] font-semibold text-text">
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] shrink-0 rounded-[1px]"
            style={{ background: `var(--cat-${category.slug})` }}
          />
          {category.name}
        </h1>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">{description}</p>
      </header>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-text-faint">{notes.length} 篇</span>

        {notes.length > 1 && (
          <nav aria-label="排序方式" className="flex items-center gap-1 text-xs">
            <Link
              href={`/category/${category.slug}`}
              aria-current={!sortByTitle ? "true" : undefined}
              className={
                "flex h-8 items-center rounded px-2 " +
                (!sortByTitle
                  ? "bg-bg-active text-text"
                  : "text-text-muted hover:bg-bg-hover hover:text-text")
              }
            >
              最近修改
            </Link>
            <Link
              href={`/category/${category.slug}?sort=title`}
              aria-current={sortByTitle ? "true" : undefined}
              className={
                "flex h-8 items-center rounded px-2 " +
                (sortByTitle
                  ? "bg-bg-active text-text"
                  : "text-text-muted hover:bg-bg-hover hover:text-text")
              }
            >
              标题
            </Link>
          </nav>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">{category.emptyText}</p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} showCategory={false} />
          ))}
        </ul>
      )}
    </div>
  );
}
