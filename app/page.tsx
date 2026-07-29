import Link from "next/link";
import { CATEGORIES, RECENT_LIMIT, getSiteDescription, getSiteName } from "@/lib/config";
import { getIndex } from "@/lib/indexer";
import { SearchBox } from "@/components/SearchBox";
import { NoteCard } from "@/components/NoteCard";
import { formatDateTime } from "@/lib/format";

// 知识库是运行时读取的外部目录，页面不能被预渲染成静态产物
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const index = await getIndex();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">{getSiteName()}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{getSiteDescription()}</p>
        <div className="mt-4">
          <SearchBox />
        </div>
      </section>

      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-3 text-sm font-semibold text-ink-muted">
          分类
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const notes = index.byCategory.get(c.slug) ?? [];
            const description = index.categoryDescriptions.get(c.slug) ?? c.fallbackDescription;

            return (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="flex h-full flex-col rounded-lg border border-line bg-paper-raised p-4 hover:border-accent"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{c.name}</span>
                    <span className="shrink-0 text-xs text-ink-faint">{notes.length} 篇</span>
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                    {description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="mb-1 text-sm font-semibold text-ink-muted">
          最近更新
        </h2>
        {index.notes.length === 0 ? (
          <p className="py-6 text-sm text-ink-muted">知识库里还没有笔记。</p>
        ) : (
          <div>
            {index.notes.slice(0, RECENT_LIMIT).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="overview-heading" className="rounded-lg border border-line p-4">
        <h2 id="overview-heading" className="text-sm font-semibold text-ink-muted">
          概览
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-faint">笔记总数</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{index.notes.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">标签数</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{index.tags.size}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">最近更新</dt>
            <dd className="mt-0.5 text-sm">
              {index.lastModified ? formatDateTime(index.lastModified) : "—"}
            </dd>
          </div>
        </dl>

        {index.errors.length > 0 && (
          <p className="mt-3 text-xs text-ink-faint">
            有 {index.errors.length} 个文件解析失败，已跳过。
          </p>
        )}
      </section>
    </div>
  );
}
