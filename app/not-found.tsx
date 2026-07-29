import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="py-16">
      <div className="overline mb-3">404</div>
      <h1 className="text-[1.875rem] font-semibold leading-tight tracking-[-0.015em]">
        没有找到这个页面
      </h1>
      <p className="mt-3 max-w-[42ch] text-[0.9375rem] leading-relaxed text-ink-muted">
        链接可能已经失效，或者这篇笔记已经改名、移动。
      </p>

      <nav aria-label="分类" className="ui-text -ml-2 mt-8 flex flex-wrap items-center text-sm">
        <Link
          href="/"
          className="flex min-h-11 items-center px-2 text-accent hover:text-accent-hover"
        >
          首页
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="flex min-h-11 items-center px-2 text-ink-muted hover:text-accent"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
