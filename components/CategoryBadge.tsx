import Link from "next/link";
import type { CategorySlug } from "@/lib/config";

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
        className="inline-block h-[6px] w-[6px] shrink-0 rounded-[1px]"
        style={{ background: `var(--cat-${slug})` }}
      />
      {name}
    </>
  );

  const className = "inline-flex items-center gap-1.5 text-xs";

  if (!linked) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link href={`/category/${slug}`} className={className + " hover:text-accent"}>
      {content}
    </Link>
  );
}
