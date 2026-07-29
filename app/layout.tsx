import type { Metadata } from "next";
import { getSiteDescription, getSiteName } from "@/lib/config";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
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
  return (
    <html lang="zh-CN">
      <body className="bg-bg text-text">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:border focus:border-border focus:bg-bg focus:px-4 focus:py-2 focus:text-sm"
        >
          跳到正文
        </a>

        {/* 桌面：左侧常驻文件树；移动端：收进顶栏的同一棵树 */}
        <Sidebar />
        <MobileNav />

        <div className="lg:pl-60">
          <main id="main" className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
