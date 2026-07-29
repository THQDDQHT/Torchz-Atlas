import { NextResponse } from "next/server";
import { getIndex } from "@/lib/indexer";

export const dynamic = "force-dynamic";

/**
 * 健康检查。免鉴权（部署探针没有身份），所以它只回服务是否活着，
 * 不回笔记数量、路径或任何知识库内容 —— 一个未认证端点不该泄露知识库的规模。
 */
export async function GET() {
  try {
    await getIndex();
    return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json(
      { status: "error" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
