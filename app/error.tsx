"use client";

/**
 * 兜底错误页。
 *
 * 最可能的真实成因是知识库目录没挂上（容器重启、挂载点改名、权限变化），
 * 此时 Next 的默认错误页只会说 "Application error"，对着自己的服务器毫无用处。
 * 这里说清可能的原因和下一步，但不回显异常细节 —— 那可能含服务器路径。
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold text-text">加载失败</h1>
      <p className="mx-auto mt-2 max-w-[40ch] text-sm leading-relaxed text-text-muted">
        没能读取知识库。通常是挂载目录暂时不可用，或某个文件的权限发生了变化。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded border border-border px-4 text-sm text-text hover:bg-bg-hover"
      >
        重试
      </button>
    </div>
  );
}
