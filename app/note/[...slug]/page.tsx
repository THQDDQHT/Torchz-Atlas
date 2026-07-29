import fs from "node:fs/promises";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIndex, createWikilinkResolver } from "@/lib/indexer";
import { hrefSegmentsToNoteId, resolveNotePath } from "@/lib/paths";
import { renderNote } from "@/lib/markdown";
import { CATEGORY_BY_SLUG } from "@/lib/config";
import { formatDateTime, toISO } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryBadge";
import { TagList } from "@/components/TagList";
import { Toc } from "@/components/Toc";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const dynamic = "force-dynamic";

type Params = { slug: string[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const id = hrefSegmentsToNoteId(slug);
  if (!id) return { title: "未找到笔记" };

  const index = await getIndex();
  const note = index.byId.get(id);
  return { title: note ? note.title : "未找到笔记" };
}

export default async function NotePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  // 第一道：URL 片段必须通过路径白名单（分类目录开头、无 ..、无隐藏文件、.md 结尾）
  const id = hrefSegmentsToNoteId(slug);
  if (!id) notFound();

  const index = await getIndex();

  // 第二道：必须是索引里真实存在的一篇笔记。绕过索引直接拼路径读文件的口子就此关闭。
  const note = index.byId.get(id);
  if (!note) notFound();

  const absPath = resolveNotePath(id);
  if (!absPath) notFound();

  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf8");
  } catch {
    notFound();
  }

  const resolver = createWikilinkResolver(index, note.dir);
  const { html, toc } = await renderNote(raw, resolver);

  const category = CATEGORY_BY_SLUG.get(note.category);

  return (
    <div className="mx-auto max-w-[720px]">
      <nav aria-label="返回" className="mb-4 text-sm">
        <Link href={`/category/${note.category}`} className="text-ink-muted hover:text-accent">
          ← 返回{category?.name ?? "分类"}
        </Link>
      </nav>

      <article>
        <header className="border-b border-line pb-4">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{note.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <CategoryBadge slug={note.category} name={note.categoryName} />
            {note.modifiedAt > 0 && (
              <time dateTime={toISO(note.modifiedAt)} className="text-xs text-ink-faint">
                更新于 {formatDateTime(note.modifiedAt)}
              </time>
            )}
          </div>

          {note.tags.length > 0 && <TagList tags={note.tags} className="mt-3" />}
        </header>

        {toc.length > 0 && (
          <div className="my-6">
            <Toc entries={toc} />
          </div>
        )}

        {/*
          html 来自 rehype-sanitize 的白名单净化输出，是这个应用里唯一使用
          dangerouslySetInnerHTML 的地方；净化管线见 lib/markdown.ts。
        */}
        <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <Link
          href={`/category/${note.category}`}
          className="flex min-h-11 items-center rounded px-2.5 text-sm text-ink-muted hover:text-accent"
        >
          ← 返回{category?.name ?? "分类"}
        </Link>
        <CopyLinkButton />
      </footer>
    </div>
  );
}
