import Link from "next/link";
import type { Metadata } from "next";
import { getIndex } from "@/lib/indexer";
import { NoteCard } from "@/components/NoteCard";

export const dynamic = "force-dynamic";

type Params = { tag: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `标签：${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);

  const index = await getIndex();
  // 索引已按修改时间倒序建立，同一标签下的顺序天然继承
  const notes = index.tags.get(tag) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-ink-faint">标签</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tag}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{notes.length} 篇笔记</p>
      </header>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center">
          <p className="text-sm text-ink-muted">没有笔记使用「{tag}」这个标签。</p>
          <p className="mt-2 text-sm">
            <Link href="/" className="text-accent hover:underline">
              回到首页
            </Link>
          </p>
        </div>
      ) : (
        <div className="border-t border-line">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
