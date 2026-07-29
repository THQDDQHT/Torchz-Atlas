import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-xl font-semibold">没有找到这个页面</h1>
      <p className="mt-2 text-sm text-ink-muted">
        链接可能已经失效，或者这篇笔记已经改名、移动。
      </p>

      <nav aria-label="分类" className="mt-6">
        <ul className="flex flex-wrap items-center justify-center gap-1 text-sm">
          <li>
            <Link href="/" className="flex min-h-11 items-center rounded px-3 text-accent hover:underline">
              首页
            </Link>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="flex min-h-11 items-center rounded px-3 text-ink-muted hover:text-accent"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
