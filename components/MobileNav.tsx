import { getSiteName } from "@/lib/config";
import { SidebarContent } from "./Sidebar";

function MenuIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

/**
 * 移动端顶栏：把同一棵文件树收进 <details> 里。
 *
 * 用 <details> 而不是自己写抽屉，是因为它开合不需要一行 JavaScript，
 * 也天然带键盘操作和无障碍语义。站点名在这里是纯文本 —— 放个链接进 summary
 * 会让一次点击同时触发导航和展开，两个意图打架。首页入口在树里。
 */
export function MobileNav() {
  return (
    <details className="group sticky top-0 z-20 border-b border-border bg-bg-sidebar lg:hidden">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-3 px-4">
        <span className="text-text-muted group-open:text-accent">
          <MenuIcon />
        </span>
        <span className="text-[0.9375rem] font-semibold text-text">{getSiteName()}</span>
      </summary>

      <div className="max-h-[70vh] overflow-y-auto border-t border-border pt-3">
        <SidebarContent />
      </div>
    </details>
  );
}
