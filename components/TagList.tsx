import Link from "next/link";

export function TagList({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <ul className={"flex flex-wrap items-center gap-1.5 " + className}>
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={`/tag/${encodeURIComponent(tag)}`}
            className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted hover:border-accent hover:text-accent"
          >
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
