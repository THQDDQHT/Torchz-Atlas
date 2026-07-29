import Link from "next/link";
import type { Note } from "@/lib/indexer";
import { noteIdToHref } from "@/lib/paths";
import { formatRelative, toISO } from "@/lib/format";
import { CategoryBadge } from "./CategoryBadge";

/** 列表条目：标题、两行摘要、一行元信息。整块可点。 */
export function NoteCard({ note, showCategory = true }: { note: Note; showCategory?: boolean }) {
  return (
    <li>
      <Link
        href={noteIdToHref(note.id)}
        className="-mx-3 block rounded px-3 py-3 hover:bg-bg-hover"
      >
        <h3 className="text-[0.9375rem] font-medium leading-snug text-text">{note.title}</h3>

        {note.summary && (
          <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-text-muted">
            {note.summary}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint">
          {showCategory && (
            <CategoryBadge slug={note.category} name={note.categoryName} linked={false} />
          )}
          <time dateTime={toISO(note.modifiedAt)}>{formatRelative(note.modifiedAt)}</time>
          {note.tags.length > 0 && (
            <span className="truncate">
              {note.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
