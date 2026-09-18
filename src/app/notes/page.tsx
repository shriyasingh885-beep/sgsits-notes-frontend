import PageHeader from '@/components/ui/PageHeader';
import { prisma } from '@/lib/prisma';
import { getBookmarkedIds } from '@/lib/bookmarks';
import NoteListTable from '@/components/ui/NoteListTable';
import EmptyState from '@/components/ui/EmptyState';
import NotesFilters from '@/components/NotesFilters';
import { searchWhere, contentSnippet } from '@/lib/search';
import type { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

const fetchNotesFromDb = async (q: string | undefined, type: string | undefined, year: string | undefined, sort: string | undefined) => {
    const where: Prisma.ResourceWhereInput = { status: 'APPROVED', ...searchWhere(q ?? '') };
    if (type && type !== 'all') where.type = type;
    if (year && year !== 'all') where.academicYear = parseInt(year, 10);

    const [notes, yearRows] = await Promise.all([
      prisma.resource.findMany({
        where,
        select: {
          id: true, title: true, type: true, fileType: true, updatedAt: true,
          subject: { select: { id: true, name: true } },
          unit: { select: { number: true, title: true } },
          uploadedBy: { select: { name: true } },
          contentText: !!q,
        },
        orderBy: sort === 'popular' ? { views: 'desc' } : { createdAt: 'desc' },
      }),
      prisma.resource.findMany({
        where: { academicYear: { not: null } },
        distinct: ['academicYear'],
        select: { academicYear: true },
        orderBy: { academicYear: 'desc' },
      }),
    ]);
    return { notes, years: yearRows.map((r) => r.academicYear!).filter(Boolean) };
};

const getNotesForParams = (q?: string, type?: string, year?: string, sort?: string) => {
  return unstable_cache(
    () => fetchNotesFromDb(q, type, year, sort),
    ['notes-query', q || '', type || '', year || '', sort || ''],
    { revalidate: 60 }
  )();
};


export default async function NotesPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; year?: string; sort?: string };
}) {
  const { q, type, year, sort } = searchParams;

  const [cached, bookmarkedIds] = await Promise.all([
    getNotesForParams(q, type, year, sort),
    getBookmarkedIds()
  ]);
  const { notes, years } = cached;

  // Where the match came from inside the document, so a hit on a file called
  // "camscanner-1905084940.pdf" still shows why it matched.
  const snippets: Record<string, string> = {};
  if (q) {
    for (const n of notes as { id: string; contentText?: string | null }[]) {
      const s = contentSnippet(n.contentText ?? null, q);
      if (s) snippets[n.id] = s;
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader title={q ? `Results for "${q}"` : 'All Notes'} subtitle={`${notes.length} resource${notes.length === 1 ? '' : 's'} in the library`} />
      <div className="rounded-md border border-border bg-surface p-3.5 shadow-sm">
        <NotesFilters currentQ={q} currentType={type} currentYear={year} currentSort={sort} years={years} />
      </div>

      {notes.length > 0 ? (
        <NoteListTable notes={notes as any[]} bookmarkedIds={bookmarkedIds} snippets={snippets} />
      ) : (
        <EmptyState title="No notes found" body="Try adjusting your search or filters." />
      )}
    </div>
  );
}
