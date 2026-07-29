import Link from "next/link";
import type { Metadata } from "next";
import { getIndex } from "@/lib/indexer";
import { getSiteName } from "@/lib/config";
import { search, type HighlightSegment } from "@/lib/search";
import { noteIdToHref } from "@/lib/paths";
import { formatRelative, toISO } from "@/lib/format";
import { SearchBox } from "@/components/SearchBox";
import { SectionHeading } from "@/components/SectionHeading";
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
      <nav aria-label="面包屑" className="ui-text mb-8 text-xs">
        <Link href="/" className="text-ink-faint hover:text-accent">
          {getSiteName()}
        </Link>
      </nav>

      <header>
        <div className="overline mb-3">搜索</div>
        <div className="max-w-xl">
          <SearchBox defaultValue={query} autoFocus={!query} />
        </div>
      </header>

      {!query ? (
        <p className="mt-10 text-[0.9375rem] leading-relaxed text-ink-muted">
          输入关键词，搜索标题、正文与标签。多个关键词之间用空格分隔，需要全部命中。
        </p>
      ) : hits.length === 0 ? (
        <div className="mt-14 text-center">
          <p className="text-[0.9375rem] text-ink-muted">
            没有找到包含「<span className="text-ink">{query}</span>」的笔记。
          </p>
          {terms.length > 1 && (
            <p className="ui-text mt-3 text-sm text-ink-faint">
              多个关键词需要全部命中，试试只用其中一个词。
            </p>
          )}
        </div>
      ) : (
        <div className="mt-10 space-y-1">
          <SectionHeading aside={`${hits.length} 篇`}>
            <span aria-hidden="true">结果</span>
            <span className="sr-only">搜索结果</span>
          </SectionHeading>

          <div>
            {hits.map((hit) => (
              <article key={hit.note.id} className="border-b border-line py-6 last:border-b-0">
                <h3 className="text-[1.0625rem] font-semibold leading-snug">
                  <Link
                    href={noteIdToHref(hit.note.id)}
                    className="text-ink hover:text-accent focus-visible:text-accent"
                  >
                    <Highlighted segments={hit.titleSegments} />
                  </Link>
                </h3>

                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">
                  <Highlighted segments={hit.excerpt} />
                </p>

                <div className="ui-text mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                  <CategoryBadge slug={hit.note.category} name={hit.note.categoryName} />
                  <time dateTime={toISO(hit.note.modifiedAt)} className="text-ink-faint">
                    {formatRelative(hit.note.modifiedAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
