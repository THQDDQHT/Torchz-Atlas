/**
 * 页面切换时的进度条。
 *
 * 每个页面都是 force-dynamic + 服务端读文件，在手机弱网下点开一篇笔记到 HTML
 * 到达之间原本是完全无反馈的白屏。一条 2px 的线不解决速度，但它回答了
 * "我刚才那一下点到了没有"。
 *
 * 纯 CSS 动画，不引入客户端 JavaScript；动画偏好由 globals.css 的
 * prefers-reduced-motion 统一接管。
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="正在加载"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent"
    >
      <div className="h-full w-1/3 animate-[loading-slide_1.1s_ease-in-out_infinite] bg-accent" />
    </div>
  );
}
