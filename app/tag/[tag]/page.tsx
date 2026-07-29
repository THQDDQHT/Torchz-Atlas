import Link from "next/link";
import type { Metadata } from "next";
import { getIndex } from "@/lib/indexer";
import { getSiteName } from "@/lib/config";
import { NoteCard } from "@/components/NoteCard";
import { SectionHeading } from "@/components/SectionHeading";

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
    <div>
      <nav aria-label="面包屑" className="ui-text mb-8 text-xs">
        <Link href="/" className="text-ink-faint hover:text-accent">
          {getSiteName()}
        </Link>
      </nav>

      <header>
        <div className="overline mb-3">标签</div>
        <h1 className="text-[1.875rem] font-semibold leading-tight tracking-[-0.015em]">
          <span aria-hidden="true" className="text-ink-faint">
            #
          </span>
          {tag}
        </h1>
      </header>

      <div className="mt-10 space-y-1">
        <SectionHeading aside={`${notes.length} 篇`}>
          <span aria-hidden="true">笔记</span>
          <span className="sr-only">使用该标签的笔记</span>
        </SectionHeading>

        {notes.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[0.9375rem] text-ink-muted">没有笔记使用「{tag}」这个标签。</p>
            <p className="ui-text mt-3 text-sm">
              <Link href="/" className="text-accent hover:text-accent-hover">
                回到首页
              </Link>
            </p>
          </div>
        ) : (
          <div>
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
