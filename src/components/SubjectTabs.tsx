'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import NoteListTable from '@/components/ui/NoteListTable';
import EmptyState from '@/components/ui/EmptyState';

// Resource types grouped into the four boxes students actually think in
// terms of (mirrors how the source material itself was organized on Drive:
// Books / Notes / Class Slides / PYQs, with PYQs split into MST & End-Sem).
const BOOK_TYPES = new Set(['REFERENCE_MATERIAL', 'CHEAT_SHEET']);
const NOTES_TYPES = new Set(['NOTES', 'HANDWRITTEN_NOTES']);
const SLIDES_TYPES = new Set(['SLIDES']);
const PYQ_TYPES = new Set(['PYQ', 'QUESTION_BANK', 'IMPORTANT_QUESTIONS']);
// Everything else (assignments, practicals, lab manuals, syllabus) still
// needs a home so nothing silently disappears from the subject page.
const OTHER_TYPES = new Set(['ASSIGNMENT', 'PRACTICAL', 'LAB_MANUAL', 'SYLLABUS']);

function isMst(title: string) {
  return /\bmst\b|mid[\s-]?sem(ester)?|\bmid[\s-]?term\b/i.test(title);
}
function isEndSem(title: string) {
  return /end[\s-]?sem|end[\s-]?of[\s-]?semester/i.test(title);
}

// A handful of imports carry a `type` that doesn't match what the title says
// (a Drive import script guessed wrong). The title is the more reliable
// signal, so a strong one here overrides the stored type for display —
// this doesn't touch the DB, it only fixes which tab a resource lands in.
const SLIDES_TITLE_RE = /\bslides?\b|\bppt\b/i;
const PYQ_TITLE_RE = /\bmst\b|end[\s-]?sem|question paper|previous year|\bpyq\b|sample paper|model paper/i;
const NOTES_TITLE_RE = /\bnotes?\b/i;

function bucketOf(r: { type: string; title: string }): 'books' | 'notes' | 'slides' | 'pyq' | 'other' {
  const title = r.title || '';
  if (SLIDES_TITLE_RE.test(title)) return 'slides';
  if (PYQ_TITLE_RE.test(title)) return 'pyq';
  if (BOOK_TYPES.has(r.type)) return 'books';
  if (NOTES_TYPES.has(r.type) || NOTES_TITLE_RE.test(title)) return 'notes';
  if (SLIDES_TYPES.has(r.type)) return 'slides';
  if (PYQ_TYPES.has(r.type)) return 'pyq';
  return 'other';
}

// ── Chapter-wise grouping for Notes / Class Slides ──────────────────────────
// Uses the subject's real syllabus units (Subject.units, seeded verbatim from
// the official SGSITS syllabus) instead of a generic "Other Materials" dump.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'for', 'on', 'with', 'is', 'are', 'by', 'from',
  'as', 'at', 'into', 'notes', 'note', 'unit', 'class', 'slides', 'slide', 'additional', 'set',
  'engineering', 'engineers', 'fundamentals', 'fundamental', 'introduction', 'overview', 'basic',
  'basics', 'applied', 'general', 'first', 'year',
]);
const COMPLETE_RE = /\bcomplete\b|\bfull notes\b|\ball units\b|\bentire\b|\bwhole syllabus\b/i;
const UNIT_NUMBER_RE = /\bunit\s*-?\s*([1-9])\b/i;

function words(s: string): string[] {
  return (s.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOPWORDS.has(w));
}
// Loose stem so "laser"/"lasers", "computing"/"computation" etc still line up.
function stem(w: string): string {
  const s = w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w;
  return s.length > 6 ? s.slice(0, 6) : s;
}

function groupByChapter(items: any[], units: { id: string; number: number; title: string }[]) {
  const complete = items.filter((r) => COMPLETE_RE.test(r.title));
  const rest = items.filter((r) => !COMPLETE_RE.test(r.title));

  const unitStems = units.map((u) => ({ ...u, stems: new Set(words(u.title).map(stem)) }));
  const chapters: { number: number; title: string; items: any[] }[] = unitStems.map((u) => ({
    number: u.number,
    title: u.title,
    items: [],
  }));
  const leftover: any[] = [];

  for (const r of rest) {
    // A real Unit assignment on the resource itself (verified against the
    // file's actual content — see scripts/assign-units-from-content.ts) is
    // ground truth, so it wins over any title guess.
    const dbIdx = r.unitId ? unitStems.findIndex((u) => u.id === r.unitId) : -1;
    if (dbIdx >= 0) {
      chapters[dbIdx].items.push(r);
      continue;
    }

    // An explicit "Unit N" in the title is a much stronger signal than fuzzy
    // keyword overlap — trust it directly when this subject has that many units.
    const unitMatch = r.title.match(UNIT_NUMBER_RE);
    const explicitIdx = unitMatch ? unitStems.findIndex((u) => u.number === Number(unitMatch[1])) : -1;
    if (explicitIdx >= 0) {
      chapters[explicitIdx].items.push(r);
      continue;
    }

    const rStems = words(r.title).map(stem);
    let best = -1;
    let bestScore = 0;
    unitStems.forEach((u, i) => {
      const score = rStems.filter((s) => u.stems.has(s)).length;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0 && bestScore > 0) chapters[best].items.push(r);
    else leftover.push(r);
  }

  return { chapters: chapters.filter((c) => c.items.length > 0), leftover, complete };
}

function ChapterSections({
  items,
  units,
  bookmarkedIds,
  emptyTitle,
}: {
  items: any[];
  units: { id: string; number: number; title: string }[];
  bookmarkedIds?: Set<string>;
  emptyTitle: string;
}) {
  if (items.length === 0) return <EmptyState title={emptyTitle} body="Be the first to upload." />;

  let chapters, leftover, complete;
  try {
    ({ chapters, leftover, complete } = groupByChapter(items, units));
  } catch (err) {
    // Chapter grouping is a display nicety, never worth a blank page over —
    // fall back to the flat list if it ever throws on some odd title/data shape.
    console.error('Chapter grouping failed:', err);
    return <NoteListTable notes={items} bookmarkedIds={bookmarkedIds} hideType />;
  }

  // No syllabus units for this subject, or nothing matched any chapter —
  // just show the flat list rather than a pile of empty sub-headers.
  if (chapters.length === 0 && complete.length === 0) {
    return <NoteListTable notes={items} bookmarkedIds={bookmarkedIds} hideType />;
  }

  return (
    <div className="space-y-8">
      {chapters.map((c) => (
        <section key={c.number} className="space-y-3">
          <h3 className="flex items-center gap-2 text-card-title font-semibold text-ink">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-tiny bg-primary-soft text-micro font-bold text-primary-strong">
              {c.number}
            </span>
            {c.title}
          </h3>
          <NoteListTable notes={c.items} bookmarkedIds={bookmarkedIds} hideType />
        </section>
      ))}
      {leftover.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-card-title font-semibold text-ink">Other</h3>
          <NoteListTable notes={leftover} bookmarkedIds={bookmarkedIds} hideType />
        </section>
      )}
      {complete.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-card-title font-semibold text-ink">Complete Notes</h3>
          <NoteListTable notes={complete} bookmarkedIds={bookmarkedIds} hideType />
        </section>
      )}
    </div>
  );
}

export default function SubjectTabs({
  subject,
  resources,
  bookmarkedIds,
}: {
  subject: any;
  resources: any[];
  bookmarkedIds?: Set<string>;
}) {
  const [active, setActive] = useState('books');

  let units: { id: string; number: number; title: string }[] = [];
  let books: any[] = [], notes: any[] = [], slides: any[] = [], pyqs: any[] = [], other: any[] = [];
  let bucketingFailed = false;
  try {
    units = (subject.units || []).map((u: any) => ({ id: u.id, number: u.number, title: u.title }));
    const buckets = { books: [] as any[], notes: [] as any[], slides: [] as any[], pyq: [] as any[], other: [] as any[] };
    for (const r of resources) buckets[bucketOf(r)].push(r);
    ({ books, notes, slides, pyq: pyqs, other } = buckets);
  } catch (err) {
    console.error('Resource bucketing failed:', err);
    bucketingFailed = true;
  }

  if (bucketingFailed) {
    return <NoteListTable notes={resources} bookmarkedIds={bookmarkedIds} emptyTitle="No resources yet" />;
  }

  const mstPyqs = pyqs.filter((r) => isMst(r.title));
  const endSemPyqs = pyqs.filter((r) => isEndSem(r.title) && !isMst(r.title));
  const otherPyqs = pyqs.filter((r) => !isMst(r.title) && !isEndSem(r.title));

  const TABS = [
    { key: 'books', label: 'Books', count: books.length },
    { key: 'notes', label: 'Notes', count: notes.length },
    { key: 'slides', label: 'Class Slides', count: slides.length },
    { key: 'pyq', label: 'PYQs', count: pyqs.length },
    { key: 'other', label: 'Other', count: other.length },
  ].filter((t) => t.key === 'pyq' || t.count > 0 || resources.length === 0);

  const activeKey = TABS.some((t) => t.key === active) ? active : TABS[0]?.key ?? 'books';

  return (
    <div className="space-y-6">
      <Tabs tabs={TABS} active={activeKey} onChange={setActive} />

      {activeKey === 'books' && (
        <NoteListTable notes={books} bookmarkedIds={bookmarkedIds} emptyTitle="No books yet" hideType />
      )}

      {activeKey === 'notes' && (
        <ChapterSections items={notes} units={units} bookmarkedIds={bookmarkedIds} emptyTitle="No notes yet" />
      )}

      {activeKey === 'slides' && (
        <ChapterSections items={slides} units={units} bookmarkedIds={bookmarkedIds} emptyTitle="No class slides yet" />
      )}

      {activeKey === 'pyq' && (
        <div className="space-y-8">
          {pyqs.length === 0 && <EmptyState title="No PYQs yet" body="Be the first to upload." />}
          {mstPyqs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-card-title font-semibold text-ink">MST</h3>
              <NoteListTable notes={mstPyqs} bookmarkedIds={bookmarkedIds} hideType />
            </section>
          )}
          {endSemPyqs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-card-title font-semibold text-ink">End-Semester</h3>
              <NoteListTable notes={endSemPyqs} bookmarkedIds={bookmarkedIds} hideType />
            </section>
          )}
          {otherPyqs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-card-title font-semibold text-ink">Sample &amp; Other Papers</h3>
              <NoteListTable notes={otherPyqs} bookmarkedIds={bookmarkedIds} hideType />
            </section>
          )}
        </div>
      )}

      {activeKey === 'other' && (
        <NoteListTable notes={other} bookmarkedIds={bookmarkedIds} emptyTitle="Nothing else here" hideType />
      )}
    </div>
  );
}
