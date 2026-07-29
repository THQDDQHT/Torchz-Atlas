import Link from "next/link";

/** 标签：保留笔记里原本的 #写法，配一层很淡的底色 */
export function TagList({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <ul className={"flex flex-wrap items-center gap-1.5 " + className}>
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={`/tag/${encodeURIComponent(tag)}`}
            className="inline-flex min-h-8 items-center rounded bg-bg-code px-2 text-xs text-text-muted hover:text-accent lg:min-h-6"
          >
            <span aria-hidden="true" className="opacity-50">
              #
            </span>
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
