import Link from "next/link";
import type { Note } from "@/lib/indexer";
import { noteIdToHref } from "@/lib/paths";
import { formatRelative, toISO } from "@/lib/format";
import { CategoryBadge } from "./CategoryBadge";
import { TagList } from "./TagList";

export function NoteCard({
  note,
  showCategory = true,
}: {
  note: Note;
  showCategory?: boolean;
}) {
  return (
    <article className="border-b border-line py-5 first:pt-0 last:border-b-0">
      <h3 className="text-base font-semibold leading-snug">
        <Link href={noteIdToHref(note.id)} className="hover:text-accent">
          {note.title}
        </Link>
      </h3>

      {note.summary && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-muted">
          {note.summary}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        {showCategory && <CategoryBadge slug={note.category} name={note.categoryName} />}
        <time dateTime={toISO(note.modifiedAt)} className="text-xs text-ink-faint">
          {formatRelative(note.modifiedAt)}
        </time>
        <TagList tags={note.tags.slice(0, 4)} />
      </div>
    </article>
  );
}
