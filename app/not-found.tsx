import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold text-text">没有找到这个页面</h1>
      <p className="mx-auto mt-2 max-w-[38ch] text-sm leading-relaxed text-text-muted">
        链接可能已经失效，或者这篇笔记已经改名、移动。
      </p>
      <p className="mt-4 text-sm">
        <Link href="/" className="text-accent hover:text-accent-hover">
          回到首页
        </Link>
      </p>
    </div>
  );
}
