import Link from "next/link";
import type { Note } from "@/lib/indexer";
import { noteIdToHref } from "@/lib/paths";

/**
 * 读完之后往哪去。
 *
 * 上一版这里只有"返回分类"和"复制链接"，于是读完八千字的奖励是一个死胡同。
 * 峰终定律里"终"的权重和"峰"一样大，而这三组数据全都已经在索引里。
 */
export function NoteFooterLinks({
  backlinks,
  prev,
  next,
}: {
  backlinks: Note[];
  prev: Note | null;
  next: Note | null;
}) {
  if (backlinks.length === 0 && !prev && !next) return null;

  return (
    <div className="mt-12 space-y-6">
      {backlinks.length > 0 && (
        <section aria-labelledby="backlinks-heading">
          <h2 id="backlinks-heading" className="text-xs font-medium text-text-muted">
            被这些笔记引用
          </h2>
          <ul className="mt-1.5 space-y-0.5">
            {backlinks.map((n) => (
              <li key={n.id}>
                <Link
                  href={noteIdToHref(n.id)}
                  className="-mx-2 flex min-h-9 items-center rounded px-2 text-sm text-accent hover:bg-bg-hover"
                >
                  {n.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(prev || next) && (
        <nav aria-label="同分类的相邻笔记" className="grid gap-2 sm:grid-cols-2">
          {prev ? (
            <Link
              href={noteIdToHref(prev.id)}
              className="rounded border border-border px-3 py-2.5 hover:bg-bg-hover"
            >
              <span className="block text-xs text-text-faint">← 更近一篇</span>
              <span className="mt-0.5 block truncate text-sm text-text">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}

          {next && (
            <Link
              href={noteIdToHref(next.id)}
              className="rounded border border-border px-3 py-2.5 hover:bg-bg-hover sm:text-right"
            >
              <span className="block text-xs text-text-faint">更早一篇 →</span>
              <span className="mt-0.5 block truncate text-sm text-text">{next.title}</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
