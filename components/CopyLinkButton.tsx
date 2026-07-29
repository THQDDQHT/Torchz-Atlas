"use client";

import { useState } from "react";

/**
 * 全站唯一的客户端组件。
 *
 * 复制链接没有无 JS 的做法，而在手机上把笔记链接发给自己是真实需求（需求 FR-03 第 7 条）。
 * 用 location.href 而不是从服务端传入 URL：服务端不知道用户实际访问的域名，
 * 也就不需要为了这个按钮去配置站点绝对地址。
 */
export function CopyLinkButton() {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="-mr-2 flex h-9 cursor-pointer items-center rounded px-2 text-xs text-text-muted hover:bg-bg-hover hover:text-text"
    >
      {state === "done" ? "已复制" : state === "failed" ? "复制失败" : "复制链接"}
    </button>
  );
}
