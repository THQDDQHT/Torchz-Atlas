/**
 * 搜索框：一个普通的 GET 表单。
 *
 * 没有受控 state、没有 onChange、没有 fetch —— 提交后浏览器直接导航到 /search?q=...，
 * 于是"查询留在 URL 里，刷新和复制链接都能得到同一结果"（需求 FR-04 第 5 条）
 * 是天然成立的，而不是需要额外用 history API 维护的东西。
 */

export function SearchBox({
  compact = false,
  defaultValue = "",
  autoFocus = false,
}: {
  compact?: boolean;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action="/search" method="get" role="search" className="w-full">
      <label htmlFor={compact ? "q-compact" : "q-main"} className="sr-only">
        搜索笔记
      </label>
      <input
        id={compact ? "q-compact" : "q-main"}
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder={compact ? "搜索" : "搜索标题、正文与标签"}
        autoComplete="off"
        className={
          "w-full rounded-md border border-line bg-paper-raised text-ink placeholder:text-ink-faint " +
          (compact ? "min-h-11 px-3 text-sm" : "min-h-12 px-4 text-base")
        }
      />
    </form>
  );
}
