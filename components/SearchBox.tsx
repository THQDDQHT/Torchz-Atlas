/**
 * 搜索框：一个普通的 GET 表单。
 *
 * 没有受控 state、没有 onChange、没有 fetch —— 提交后浏览器直接导航到 /search?q=...，
 * 于是"查询留在 URL 里，刷新和复制链接都能得到同一结果"（需求 FR-04 第 5 条）
 * 是天然成立的，而不是需要额外用 history API 维护的东西。
 */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SearchBox({
  compact = false,
  defaultValue = "",
  autoFocus = false,
}: {
  compact?: boolean;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const id = compact ? "q-compact" : "q-main";

  return (
    <form action="/search" method="get" role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        搜索笔记
      </label>
      <div className="relative">
        <SearchIcon
          className={
            "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-ink-faint " +
            (compact ? "h-4 w-4" : "h-[1.15rem] w-[1.15rem]")
          }
        />
        <input
          id={id}
          type="search"
          name="q"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder={compact ? "搜索" : "搜索标题、正文与标签"}
          autoComplete="off"
          className={
            "ui-text w-full border-0 border-b border-line bg-transparent text-ink " +
            "placeholder:text-ink-faint focus:border-accent focus:outline-none " +
            (compact
              ? "min-h-11 pl-6 pr-1 text-[0.8125rem]"
              : "min-h-12 pl-8 pr-1 text-base")
          }
        />
      </div>
    </form>
  );
}
