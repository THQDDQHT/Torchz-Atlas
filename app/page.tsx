import Link from "next/link";
import { CATEGORIES, RECENT_LIMIT, getSiteDescription } from "@/lib/config";
import { getIndex } from "@/lib/indexer";
import { SearchBox } from "@/components/SearchBox";
import { NoteCard } from "@/components/NoteCard";
import { SectionHeading } from "@/components/SectionHeading";
import { formatDate } from "@/lib/format";

// 知识库是运行时读取的外部目录，页面不能被预渲染成静态产物
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const index = await getIndex();

  return (
    <div className="space-y-14">
      {/* 报头下方的引言与检索：整页唯一的大字号区域 */}
      <section>
        <p className="max-w-[34ch] text-[1.375rem] leading-relaxed text-ink sm:text-[1.5rem]">
          {getSiteDescription()}
        </p>
        <div className="mt-7 max-w-xl">
          <SearchBox />
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-1">
        <SectionHeading id="recent-heading">最近更新</SectionHeading>

        {index.notes.length === 0 ? (
          <p className="py-10 text-[0.9375rem] text-ink-muted">知识库里还没有笔记。</p>
        ) : (
          <div>
            {index.notes.slice(0, RECENT_LIMIT).map((note, i) => (
              <NoteCard key={note.id} note={note} index={i + 1} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="categories-heading" className="space-y-1">
        <SectionHeading id="categories-heading">分类</SectionHeading>

        <ul className="grid grid-cols-1 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const notes = index.byCategory.get(c.slug) ?? [];
            const description = index.categoryDescriptions.get(c.slug) ?? c.fallbackDescription;

            return (
              <li key={c.slug} className="border-b border-line">
                <Link
                  href={`/category/${c.slug}`}
                  className="group flex h-full items-baseline gap-3 py-5 pr-4"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 h-[5px] w-[5px] shrink-0 self-start"
                    style={{ background: `var(--cat-${c.slug})` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-ink group-hover:text-accent">
                        {c.name}
                      </span>
                      <span className="ui-text shrink-0 text-xs tabular-nums text-ink-faint">
                        {notes.length}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[0.875rem] leading-relaxed text-ink-muted">
                      {description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="overview-heading" className="space-y-4">
        <SectionHeading id="overview-heading">概览</SectionHeading>

        <dl className="ui-text flex flex-wrap items-baseline gap-x-8 gap-y-4 pt-1">
          <div>
            <dt className="text-xs text-ink-faint">笔记</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums text-ink">
              {index.notes.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">标签</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums text-ink">{index.tags.size}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">最近更新</dt>
            <dd className="mt-1 font-serif text-2xl text-ink">
              {index.lastModified ? formatDate(index.lastModified) : "—"}
            </dd>
          </div>
        </dl>

        {index.errors.length > 0 && (
          <p className="ui-text text-xs text-ink-faint">
            有 {index.errors.length} 个文件解析失败，已跳过。
          </p>
        )}
      </section>
    </div>
  );
}
