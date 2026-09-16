import { cn } from "@/lib/cn";
import NoteListItem, { type NoteRowData } from "./NoteListItem";
import EmptyState from "./EmptyState";

/**
 * The library table: a hairline-separated list on the standard card surface.
 * Column widths live in NoteListItem so the header can never fall out of
 * step with the rows. Pass `bookmarkedIds` to turn on live bookmark toggles.
 */
export function NoteListTable({
  notes,
  bookmarkedIds,
  snippets,
  emptyTitle = "No notes here yet",
  emptyBody,
  className,
  hideType,
}: {
  notes: NoteRowData[];
  bookmarkedIds?: Set<string>;
  /** resourceId -> matched text excerpt, shown under the title on search */
  snippets?: Record<string, string>;
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
  /** Drop the Type column — for a list that's already scoped to one type
   *  (e.g. inside a subject's PYQs tab), repeating it on every row is noise. */
  hideType?: boolean;
}) {
  if (notes.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} className={className} />;
  }

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-surface shadow-sm", className)}>
      <div className="flex items-center gap-3.5 border-b border-border-soft bg-surface-soft px-4 py-3 text-micro font-semibold uppercase tracking-[0.07em] text-text-faint">
        <span className="w-10 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">Title</span>
        {!hideType && <span className="hidden w-[112px] shrink-0 sm:block">Type</span>}
        <span className="hidden w-[150px] shrink-0 lg:block">Uploaded by</span>
        {bookmarkedIds && <span className="w-8 shrink-0" aria-hidden />}
      </div>
      <ul className="divide-y divide-border-soft">
        {notes.map((note) => (
          <li key={note.id}>
            <NoteListItem
              note={note}
              variant="table"
              bookmarked={bookmarkedIds ? bookmarkedIds.has(note.id) : undefined}
              snippet={snippets?.[note.id]}
              hideType={hideType}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NoteListTable;
