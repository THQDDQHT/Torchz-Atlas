import Link from "next/link";

/** 标签用前缀井号而不是胶囊边框：更接近笔记里原本的写法，也更安静 */
export function TagList({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <ul className={"ui-text flex flex-wrap items-center gap-x-2.5 gap-y-1.5 " + className}>
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={`/tag/${encodeURIComponent(tag)}`}
            className="text-xs text-ink-faint hover:text-accent"
          >
            <span aria-hidden="true" className="mr-px opacity-60">
              #
            </span>
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
