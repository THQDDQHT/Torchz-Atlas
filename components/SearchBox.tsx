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
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m13.5 13.5-3.2-3.2" />
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
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
        <input
          id={id}
          type="search"
          name="q"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="搜索笔记"
          autoComplete="off"
          /*
            字号必须 ≥16px：iOS Safari 对更小的输入框会在聚焦时放大整个页面，
            用户得双指缩回来。这是手机上最容易被直接关掉的一处。
            也不要用 focus:outline-none —— 它的特异度会盖过全局的 :focus-visible，
            让这个输入框成为全站唯一没有焦点环的控件。
          */
          className={
            "w-full rounded border border-border bg-bg pl-8 pr-2.5 text-[16px] text-text " +
            "placeholder:text-text-faint focus:border-accent " +
            (compact ? "h-11 lg:h-9 lg:text-sm" : "h-12")
          }
        />
      </div>
    </form>
  );
}
