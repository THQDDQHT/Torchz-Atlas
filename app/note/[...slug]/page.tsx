import fs from "node:fs/promises";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIndex, createWikilinkResolver } from "@/lib/indexer";
import { hrefSegmentsToNoteId, resolveNotePath } from "@/lib/paths";
import { renderNote } from "@/lib/markdown";
import { CATEGORY_BY_SLUG, getSiteName } from "@/lib/config";
import { formatDateTime, toISO } from "@/lib/format";
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
  // 标题由下面的页头单独渲染，正文里那行 # 标题要剥掉，否则同一句话印两遍
  const { html, toc } = await renderNote(raw, resolver, { stripLeadingH1: true });

  const category = CATEGORY_BY_SLUG.get(note.category);

  return (
    <div>
      <nav aria-label="面包屑" className="ui-text mb-8 flex items-center gap-1.5 text-xs">
        <Link href="/" className="text-ink-faint hover:text-accent">
          {getSiteName()}
        </Link>
        <span aria-hidden="true" className="text-ink-faint/50">
          /
        </span>
        <Link href={`/category/${note.category}`} className="text-ink-faint hover:text-accent">
          {category?.name ?? "分类"}
        </Link>
      </nav>

      <article>
        <header>
          <div className="ui-text overline mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-[5px] w-[5px]"
              style={{ background: `var(--cat-${note.category})` }}
            />
            {category?.name ?? note.categoryName}
          </div>

          <h1 className="text-[1.875rem] font-semibold leading-[1.25] tracking-[-0.015em] sm:text-[2.125rem]">
            {note.title}
          </h1>

          <div className="ui-text mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
            {note.modifiedAt > 0 && (
              <time dateTime={toISO(note.modifiedAt)}>更新于 {formatDateTime(note.modifiedAt)}</time>
            )}
            {note.tags.length > 0 && <TagList tags={note.tags} />}
          </div>
        </header>

        <hr className="rule mt-7" />

        {toc.length > 0 && (
          <div className="mt-7">
            <Toc entries={toc} />
          </div>
        )}

        {/*
          html 来自 rehype-sanitize 的白名单净化输出，是这个应用里唯一使用
          dangerouslySetInnerHTML 的地方；净化管线见 lib/markdown.ts。
        */}
        <div
          className="prose prose-dropcap mt-9"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      <footer className="mt-16">
        <hr className="rule" />
        <div className="ui-text -ml-2 mt-2 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/category/${note.category}`}
            className="flex min-h-11 items-center px-2 text-xs text-ink-muted hover:text-accent"
          >
            ← 返回{category?.name ?? "分类"}
          </Link>
          <CopyLinkButton />
        </div>
      </footer>
    </div>
  );
}
