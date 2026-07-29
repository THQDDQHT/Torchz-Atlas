import Link from "next/link";
import type { Note } from "@/lib/indexer";
import { noteIdToHref } from "@/lib/paths";
import { formatRelative, toISO } from "@/lib/format";
import { CategoryBadge } from "./CategoryBadge";
import { TagList } from "./TagList";

/**
 * 笔记条目。
 *
 * 带序号的变体用于首页"最近更新"：编号是编辑排版里最省力的秩序感来源，
 * 它让一列标题从"若干链接"变成"一份目录"。序号用等宽数字并压低对比度，
 * 保证它是索引而不是内容。
 */
export function NoteCard({
  note,
  index,
  showCategory = true,
}: {
  note: Note;
  index?: number;
  showCategory?: boolean;
}) {
  return (
    <article className="group relative border-b border-line py-6 last:border-b-0">
      <div className="flex gap-4">
        {index !== undefined && (
          <span
            aria-hidden="true"
            className="ui-text mt-[0.35rem] w-6 shrink-0 text-xs tabular-nums text-ink-faint"
          >
            {String(index).padStart(2, "0")}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-[1.0625rem] font-semibold leading-snug">
            <Link
              href={noteIdToHref(note.id)}
              className="text-ink hover:text-accent focus-visible:text-accent"
            >
              {note.title}
            </Link>
          </h3>

          {note.summary && (
            <p className="mt-1.5 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-muted">
              {note.summary}
            </p>
          )}

          <div className="ui-text mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            {showCategory && <CategoryBadge slug={note.category} name={note.categoryName} />}
            <time dateTime={toISO(note.modifiedAt)} className="text-ink-faint">
              {formatRelative(note.modifiedAt)}
            </time>
            <TagList tags={note.tags.slice(0, 3)} />
          </div>
        </div>
      </div>
    </article>
  );
}
