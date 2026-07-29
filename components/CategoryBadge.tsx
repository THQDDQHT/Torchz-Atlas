import Link from "next/link";
import type { CategorySlug } from "@/lib/config";

/** 分类用文字加一点颜色区分，不用 emoji 或图标（需求第 9 节） */
const DOT_COLOR: Record<CategorySlug, string> = {
  ideas: "var(--cat-ideas)",
  projects: "var(--cat-projects)",
  lessons: "var(--cat-lessons)",
  "good-things": "var(--cat-good-things)",
};

export function CategoryBadge({
  slug,
  name,
  linked = true,
}: {
  slug: CategorySlug;
  name: string;
  linked?: boolean;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: DOT_COLOR[slug] }}
      />
      {name}
    </>
  );

  if (!linked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">{content}</span>
    );
  }

  return (
    <Link
      href={`/category/${slug}`}
      className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent"
    >
      {content}
    </Link>
  );
}
