import type { TocEntry } from "@/lib/markdown";

function TocList({ entries }: { entries: TocEntry[] }) {
  return (
    <ol className="mt-2 space-y-1 text-sm">
      {entries.map((e, i) => (
        <li key={`${e.id}-${i}`} className={e.depth === 3 ? "pl-4" : ""}>
          <a
            href={`#${e.id}`}
            className="block py-1 leading-snug text-ink-muted hover:text-accent"
          >
            {e.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * 目录在手机上默认折叠、桌面默认展开。
 *
 * <details open> 的展开状态没法用纯 CSS 按断点切换，所以这里渲染两份并用断点显隐。
 * 目录条目通常只有十几条，重复一份 DOM 的代价远低于为它引入一个客户端组件。
 */
export function Toc({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <>
      <details className="rounded-lg border border-line px-4 py-3 md:hidden">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink-muted">
          目录（{entries.length}）
        </summary>
        <TocList entries={entries} />
      </details>

      <details open className="hidden rounded-lg border border-line px-4 py-3 md:block">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink-muted">
          目录
        </summary>
        <TocList entries={entries} />
      </details>
    </>
  );
}
