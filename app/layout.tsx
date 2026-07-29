import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, getSiteDescription, getSiteName } from "@/lib/config";
import { SearchBox } from "@/components/SearchBox";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: getSiteName(), template: `%s · ${getSiteName()}` },
    description: getSiteDescription(),
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
          className="ui-text sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:border focus:border-line focus:bg-paper-raised focus:px-4 focus:py-2 focus:text-sm"
        >
          跳到正文
        </a>

        {/*
          报头式两段结构：上段是刊名与检索，下段是栏目。
          两条细线把它框成一个整体，页面其余部分因此可以完全不用边框。
        */}
        <header className="border-b border-line">
          <div className="mx-auto w-full max-w-3xl px-5">
            <div className="flex items-center justify-between gap-4 py-4">
              <Link
                href="/"
                className="text-[1.35rem] font-semibold tracking-[0.14em] text-ink hover:text-accent"
              >
                {siteName}
              </Link>
              <div className="w-40 sm:w-56">
                <SearchBox compact />
              </div>
            </div>

            <nav aria-label="分类导航" className="-mx-2 overflow-x-auto pb-1">
              <ul className="flex items-center whitespace-nowrap">
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/category/${c.slug}`}
                      className="ui-text flex min-h-11 items-center px-2 text-[0.8125rem] tracking-[0.05em] text-ink-muted hover:text-accent"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-3xl px-5 pb-12">
          <hr className="rule" />
          <p className="ui-text mt-4 text-xs leading-relaxed text-ink-faint">
            {siteName} · Markdown 是唯一事实来源，此处只读不改。
          </p>
        </footer>
      </body>
    </html>
  );
}
