/**
 * 分节标题：一条 overline 标签配一条延伸到右边的细线。
 *
 * 这是全站唯一的分节装置。页面因此不需要卡片边框或背景块来划分区域 ——
 * 一条线加一个小标签就够了，安静，而且长文页面不会被切成一堆盒子。
 */
export function SectionHeading({
  children,
  id,
  aside,
}: {
  children: React.ReactNode;
  id?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 id={id} className="overline shrink-0">
        {children}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      {aside && <span className="ui-text shrink-0 text-xs text-ink-faint">{aside}</span>}
    </div>
  );
}
