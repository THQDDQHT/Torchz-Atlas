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
    <div className="space-y-9">
      <section>
        <p className="text-sm text-text-muted">{getSiteDescription()}</p>
        <div className="mt-3 max-w-md">
          <SearchBox />
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <SectionHeading id="recent-heading">最近更新</SectionHeading>

        {index.notes.length === 0 ? (
          <p className="py-8 text-sm text-text-muted">知识库里还没有笔记。</p>
        ) : (
          <ul className="divide-y divide-border">
            {index.notes.slice(0, RECENT_LIMIT).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="categories-heading">
        <SectionHeading id="categories-heading">分类</SectionHeading>

        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const notes = index.byCategory.get(c.slug) ?? [];
            const description = index.categoryDescriptions.get(c.slug) ?? c.fallbackDescription;

            return (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="-mx-3 block rounded px-3 py-2.5 hover:bg-bg-hover"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-[6px] w-[6px] shrink-0 rounded-[1px]"
                      style={{ background: `var(--cat-${c.slug})` }}
                    />
                    <span className="text-[0.875rem] font-medium text-text">{c.name}</span>
                    <span className="text-xs tabular-nums text-text-faint">{notes.length}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 block pl-[14px] text-xs text-text-muted">
                    {description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="overview-heading">
        <SectionHeading id="overview-heading">概览</SectionHeading>
        <p className="text-xs text-text-muted">
          {index.notes.length} 篇笔记 · {index.tags.size} 个标签
          {index.lastModified > 0 && ` · 最近更新 ${formatDate(index.lastModified)}`}
          {index.errors.length > 0 && ` · ${index.errors.length} 个文件解析失败已跳过`}
        </p>
      </section>
    </div>
  );
}
