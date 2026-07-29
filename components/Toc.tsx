import type { TocEntry } from "@/lib/markdown";

function Caret() {
  return (
    <svg
      className="tree-caret"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4.5 2.5 4 3.5-4 3.5" />
    </svg>
  );
}

/** 大纲：默认折叠，标题多的长文才需要展开 */
export function Toc({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <nav aria-label="大纲" className="rounded border border-border bg-bg-sidebar">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs text-text-muted hover:text-text">
          <Caret />
          大纲（{entries.length}）
        </summary>
        <ol className="space-y-0.5 px-3 pb-2.5 pl-6">
          {entries.map((e, i) => (
            <li key={`${e.id}-${i}`} className={e.depth === 3 ? "pl-3" : ""}>
              <a
                href={`#${e.id}`}
                className="block truncate py-0.5 text-[0.8125rem] text-text-muted hover:text-accent"
              >
                {e.text}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
