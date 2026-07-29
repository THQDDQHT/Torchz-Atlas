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
      {segments.map((seg, i) =>
        seg.hit ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>,
      )}
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
    <div>
      <header className="border-b border-border pb-4">
        <h1 className="mb-3 text-[1.375rem] font-semibold text-text">搜索</h1>
        <div className="max-w-md">
          <SearchBox defaultValue={query} autoFocus={!query} />
        </div>
      </header>

      {!query ? (
        <p className="mt-6 text-[0.8125rem] leading-relaxed text-text-muted">
          搜索标题、正文与标签。多个关键词用空格分隔，需要全部命中。
        </p>
      ) : hits.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-text-muted">
            没有找到包含「<span className="text-text">{query}</span>」的笔记。
          </p>
          {terms.length > 1 && (
            <p className="mt-2 text-xs text-text-faint">
              多个关键词需要全部命中，试试只用其中一个词。
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-text-faint">{hits.length} 篇</p>

          <ul className="mt-1 divide-y divide-border">
            {hits.map((hit) => (
              <li key={hit.note.id}>
                <Link
                  href={noteIdToHref(hit.note.id)}
                  className="-mx-3 block rounded px-3 py-3 hover:bg-bg-hover"
                >
                  <h2 className="text-[0.9375rem] font-medium leading-snug text-text">
                    <Highlighted segments={hit.titleSegments} />
                  </h2>

                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-text-muted">
                    <Highlighted segments={hit.excerpt} />
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint">
                    <CategoryBadge
                      slug={hit.note.category}
                      name={hit.note.categoryName}
                      linked={false}
                    />
                    <time dateTime={toISO(hit.note.modifiedAt)}>
                      {formatRelative(hit.note.modifiedAt)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
