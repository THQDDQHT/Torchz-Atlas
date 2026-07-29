import fs from "node:fs/promises";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIndex, createWikilinkResolver } from "@/lib/indexer";
import { hrefSegmentsToNoteId, resolveNotePath } from "@/lib/paths";
import { renderNote } from "@/lib/markdown";
import { renderNoteCached } from "@/lib/render-cache";
import { CATEGORY_BY_SLUG } from "@/lib/config";
import { formatDateTime, toISO } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryBadge";
import { TagList } from "@/components/TagList";
import { Toc } from "@/components/Toc";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { NoteFooterLinks } from "@/components/NoteFooterLinks";

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
  // 标题由下面的页头单独渲染，正文里那行 # 标题要剥掉，否则同一句话印两遍
  const { html, toc } = await renderNoteCached(note.id, note.modifiedAt, () =>
    renderNote(raw, resolver, { stripLeadingH1: true }),
  );

  const category = CATEGORY_BY_SLUG.get(note.category);

  // 同分类里按修改时间相邻的两篇。列表已排好序，取前后一位即可。
  const siblings = index.byCategory.get(note.category) ?? [];
  const pos = siblings.findIndex((n) => n.id === note.id);
  const prev = pos > 0 ? siblings[pos - 1] : null;
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : null;

  return (
    <article>
      <header className="border-b border-border pb-4">
        {/* 正文里 h2 已经是 24px，标题要再高一档才镇得住页面 */}
        <h1 className="text-[1.75rem] font-bold leading-tight text-text">{note.title}</h1>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-faint">
          <CategoryBadge slug={note.category} name={note.categoryName} />
          {note.modifiedAt > 0 && (
            <time dateTime={toISO(note.modifiedAt)}>{formatDateTime(note.modifiedAt)}</time>
          )}
        </div>

        {note.tags.length > 0 && <TagList tags={note.tags} className="mt-2.5" />}
      </header>

      {toc.length > 0 && (
        <div className="mt-5">
          <Toc entries={toc} />
        </div>
      )}

      {/*
        html 来自 rehype-sanitize 的白名单净化输出，是这个应用里唯一使用
        dangerouslySetInnerHTML 的地方；净化管线见 lib/markdown.ts。
      */}
      <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />

      <NoteFooterLinks
        backlinks={index.backlinks.get(note.id) ?? []}
        prev={prev}
        next={next}
      />

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Link
          href={`/category/${note.category}`}
          className="-ml-2 flex h-9 items-center rounded px-2 text-xs text-text-muted hover:bg-bg-hover hover:text-text"
        >
          ← {category?.name ?? "分类"}
        </Link>
        <CopyLinkButton />
      </footer>
    </article>
  );
}
