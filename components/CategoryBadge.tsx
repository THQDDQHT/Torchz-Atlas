import Link from "next/link";
import type { CategorySlug } from "@/lib/config";

/** 分类用文字加一个小方块区分，不用 emoji 或图标（需求第 9 节） */
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
        className="inline-block h-[5px] w-[5px] shrink-0"
        style={{ background: DOT_COLOR[slug] }}
      />
      {name}
    </>
  );

  const className = "ui-text inline-flex items-center gap-1.5 text-xs tracking-[0.03em]";

  if (!linked) {
    return <span className={className + " text-ink-muted"}>{content}</span>;
  }

  return (
    <Link href={`/category/${slug}`} className={className + " text-ink-muted hover:text-accent"}>
      {content}
    </Link>
  );
}
