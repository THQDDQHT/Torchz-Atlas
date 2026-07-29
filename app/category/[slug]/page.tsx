import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORY_BY_SLUG, getSiteName } from "@/lib/config";
import { getIndex } from "@/lib/indexer";
import { NoteCard } from "@/components/NoteCard";
import { SectionHeading } from "@/components/SectionHeading";

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
      <nav aria-label="面包屑" className="ui-text mb-8 text-xs">
        <Link href="/" className="text-ink-faint hover:text-accent">
          {getSiteName()}
        </Link>
      </nav>

      <header>
        <div className="ui-text overline mb-3 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-[5px] w-[5px]"
            style={{ background: `var(--cat-${category.slug})` }}
          />
          分类
        </div>
        <h1 className="text-[1.875rem] font-semibold leading-tight tracking-[-0.015em]">
          {category.name}
        </h1>
        <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          {description}
        </p>
      </header>

      <div className="mt-10 space-y-1">
        <SectionHeading aside={`${notes.length} 篇`}>
          <span className="sr-only">笔记列表</span>
          <span aria-hidden="true">笔记</span>
        </SectionHeading>

        {notes.length > 1 && (
          <nav aria-label="排序方式" className="ui-text -ml-2 flex items-center pt-1 text-xs">
            <Link
              href={`/category/${category.slug}`}
              aria-current={!sortByTitle ? "true" : undefined}
              className={
                "flex min-h-11 items-center px-2 " +
                (!sortByTitle ? "text-accent" : "text-ink-faint hover:text-accent")
              }
            >
              最新修改
            </Link>
            <span aria-hidden="true" className="text-ink-faint/40">
              ·
            </span>
            <Link
              href={`/category/${category.slug}?sort=title`}
              aria-current={sortByTitle ? "true" : undefined}
              className={
                "flex min-h-11 items-center px-2 " +
                (sortByTitle ? "text-accent" : "text-ink-faint hover:text-accent")
              }
            >
              标题 A–Z
            </Link>
          </nav>
        )}

        {notes.length === 0 ? (
          <p className="py-14 text-center text-[0.9375rem] text-ink-muted">{category.emptyText}</p>
        ) : (
          <div>
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} showCategory={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
