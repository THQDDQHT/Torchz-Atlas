import type { TocEntry } from "@/lib/markdown";

function TocList({ entries }: { entries: TocEntry[] }) {
  return (
    <ol className="ui-text mt-3 space-y-0.5 text-[0.8125rem]">
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
    <nav aria-label="文章目录" className="border-l border-line pl-5">
      <details className="md:hidden">
        <summary className="overline cursor-pointer list-none marker:content-none">
          目录（{entries.length}）
        </summary>
        <TocList entries={entries} />
      </details>

      <details open className="hidden md:block">
        <summary className="overline cursor-pointer list-none marker:content-none">目录</summary>
        <TocList entries={entries} />
      </details>
    </nav>
  );
}
