/** 分节小标题：一行文字，右侧可挂一个计数。不加线、不加字距。 */
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
    <div className="mb-1 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-xs font-medium text-text-muted">
        {children}
      </h2>
      {aside && <span className="shrink-0 text-xs text-text-faint">{aside}</span>}
    </div>
  );
}
