import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, getSiteDescription, getSiteName } from "@/lib/config";
import { SearchBox } from "@/components/SearchBox";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: getSiteName(), template: `%s · ${getSiteName()}` },
    description: getSiteDescription(),
    // 私有知识库不该被任何爬虫收录，即使 Access 挡在前面
    robots: { index: false, follow: false, nocache: true },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const siteName = getSiteName();

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-paper-raised focus:px-4 focus:py-2 focus:shadow"
        >
          跳到正文
        </a>

        <header className="border-b border-line">
          <div className="mx-auto w-full max-w-4xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/"
                className="flex min-h-11 items-center text-lg font-semibold tracking-tight"
              >
                {siteName}
              </Link>

              <nav aria-label="分类导航" className="order-3 w-full sm:order-2 sm:w-auto">
                <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
                  {CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/category/${c.slug}`}
                        className="flex min-h-11 items-center rounded px-2 text-ink-muted hover:text-accent"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="order-2 ml-auto sm:order-3 sm:w-56">
                <SearchBox compact />
              </div>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-4xl px-4 pb-10 pt-4 text-sm text-ink-faint">
          <p>{siteName} · Markdown 是唯一事实来源，此处只读不改。</p>
        </footer>
      </body>
    </html>
  );
}
