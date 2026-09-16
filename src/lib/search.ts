import type { Prisma } from '@prisma/client';

/**
 * The one search predicate, shared by /notes and the command palette API so
 * the two can never disagree about what "search" means.
 *
 * `contentText` is the extracted / OCR'd body text written by the
 * classification backfill (scripts/backfill_content.py) — searching it is
 * what lets "binary tree" find a file named `camscanner-1905084940.pdf`.
 *
 * Note: SQLite's LIKE is already case-insensitive for ASCII, so no
 * `mode: 'insensitive'` here (that's Postgres-only and throws on SQLite).
 */
export function searchWhere(q: string): Prisma.ResourceWhereInput {
  const term = q.trim();
  if (!term) return {};
  return {
    OR: [
      { title: { contains: term } },
      { tags: { contains: term } },
      { subject: { name: { contains: term } } },
      { suggestedTitle: { contains: term } },
      { courseCode: { contains: term } },
      { contentText: { contains: term } },
    ],
  };
}

/** A short excerpt of body text around the match, for search result context. */
export function contentSnippet(contentText: string | null, q: string, radius = 90): string | null {
  if (!contentText || !q.trim()) return null;
  const idx = contentText.toLowerCase().indexOf(q.trim().toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(contentText.length, idx + q.length + radius);
  const cleaned = contentText.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${cleaned}${end < contentText.length ? '…' : ''}`;
}
