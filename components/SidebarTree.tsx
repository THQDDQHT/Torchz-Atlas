"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TreeNote {
  id: string;
  title: string;
  href: string;
}

export interface TreeCategory {
  slug: string;
  name: string;
  href: string;
  notes: TreeNote[];
}

function Caret() {
  return (
    <svg
      className="tree-caret"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4.5 2.5 4 3.5-4 3.5" />
    </svg>
  );
}

/** pathname 可能是编码形态，两边都解码后再比，中文路径才对得上 */
function samePath(a: string, b: string): boolean {
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  return decode(a) === decode(b);
}

/**
 * 文件树。
 *
 * 是客户端组件，只为了一件事：知道当前打开的是哪一篇，好把它高亮、
 * 并把它所在的分类默认展开。这是文件树最基本的作用 —— 让你随时知道自己在哪，
 * 也是服务端渲染拿不到的信息。树的数据仍由服务端算好后传进来。
 */
export function SidebarTree({ categories }: { categories: TreeCategory[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="知识库目录" className="space-y-0.5">
      {categories.map((c) => {
        const isCategoryActive = samePath(pathname, c.href);
        const hasActiveNote = c.notes.some((n) => samePath(pathname, n.href));

        return (
          <details key={c.slug} open={hasActiveNote || isCategoryActive || c.notes.length > 0}>
            <summary className="tree-row cursor-pointer list-none">
              <Caret />
              <span
                aria-hidden="true"
                className="h-[6px] w-[6px] shrink-0 rounded-[1px]"
                style={{ background: `var(--cat-${c.slug})` }}
              />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-text-faint">
                {c.notes.length}
              </span>
            </summary>

            <div className="mt-0.5 space-y-0.5 pl-[1.1rem]">
              <Link
                href={c.href}
                aria-current={isCategoryActive ? "page" : undefined}
                className="tree-row"
              >
                <span className="truncate text-text-faint">全部</span>
              </Link>

              {c.notes.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  aria-current={samePath(pathname, n.href) ? "page" : undefined}
                  className="tree-row"
                  title={n.title}
                >
                  <span className="truncate">{n.title}</span>
                </Link>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
