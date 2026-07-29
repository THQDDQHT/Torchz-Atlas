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
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);

  const index = await getIndex();
  // 索引已按修改时间倒序建立，同一标签下的顺序天然继承
  const notes = index.tags.get(tag) ?? [];

  return (
    <div>
      <header className="border-b border-border pb-4">
        <h1 className="text-[1.375rem] font-semibold text-text">
          <span aria-hidden="true" className="text-text-faint">
            #
          </span>
          {tag}
        </h1>
        <p className="mt-1.5 text-xs text-text-faint">{notes.length} 篇笔记</p>
      </header>

      {notes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-text-muted">没有笔记使用「{tag}」这个标签。</p>
          <p className="mt-2 text-sm">
            <Link href="/" className="text-accent hover:text-accent-hover">
              回到首页
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </ul>
      )}
    </div>
  );
}
