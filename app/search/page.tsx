import Link from "next/link";
import type { Metadata } from "next";
import { getIndex } from "@/lib/indexer";
import { search, type HighlightSegment } from "@/lib/search";
import { noteIdToHref } from "@/lib/paths";
import { formatRelative, toISO } from "@/lib/format";
import { SearchBox } from "@/components/SearchBox";
import { CategoryBadge } from "@/components/CategoryBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "搜索" };

/** 高亮片段交给 React 渲染文本节点，查询词永远不会被当作 HTML 解释 */
function Highlighted({ segments }: { segments: HighlightSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => (seg.hit ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>))}
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const index = await getIndex();
  const hits = query ? search(index.notes, query) : [];
  const terms = query.split(/\s+/).filter(Boolean);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">搜索</h1>
        <div className="mt-4">
          <SearchBox defaultValue={query} autoFocus={!query} />
        </div>
      </header>

      {!query ? (
        <p className="text-sm text-ink-muted">输入关键词，搜索标题、正文与标签。</p>
      ) : hits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center">
          <p className="text-sm text-ink-muted">
            没有找到包含「{query}」的笔记。
          </p>
          {terms.length > 1 && (
            <p className="mt-2 text-sm text-ink-faint">
              多个关键词需要全部命中，试试只用其中一个词。
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="border-b border-line pb-3 text-sm text-ink-faint">
            找到 {hits.length} 篇
          </p>
          <div>
            {hits.map((hit) => (
              <article key={hit.note.id} className="border-b border-line py-5 last:border-b-0">
                <h2 className="text-base font-semibold leading-snug">
                  <Link href={noteIdToHref(hit.note.id)} className="hover:text-accent">
                    <Highlighted segments={hit.titleSegments} />
                  </Link>
                </h2>

                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  <Highlighted segments={hit.excerpt} />
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <CategoryBadge slug={hit.note.category} name={hit.note.categoryName} />
                  <time dateTime={toISO(hit.note.modifiedAt)} className="text-xs text-ink-faint">
                    {formatRelative(hit.note.modifiedAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
