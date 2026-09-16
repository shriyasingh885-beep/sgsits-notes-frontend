import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import StatCard from '@/components/ui/StatCard';
import QuickAction from '@/components/ui/QuickAction';
import SubjectCard from '@/components/ui/SubjectCard';
import NoteListTable from '@/components/ui/NoteListTable';
import { getBookmarkedIds } from '@/lib/bookmarks';
import {
  LibraryBig, FileText, ScrollText, Layers, BookOpen,
  Building2, Clock, Flame, ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * The public dashboard. Notes Hub has no accounts, so there is no personal
 * state to greet anybody with and nothing here is derived from who is looking
 * — every number and list below is a real, site-wide fact about the library.
 */
export default async function HomePage() {
  let subjectCount, noteCount, pyqCount, pageSum, recentNotes, topNotes, topSubjects;
  try {
    [subjectCount, noteCount, pyqCount, pageSum, recentNotes, topNotes, topSubjects] =
    await Promise.all([
      prisma.subject.count(),
      prisma.resource.count({ where: { status: 'APPROVED' } }),
      prisma.resource.count({ where: { status: 'APPROVED', type: 'PYQ' } }),
      prisma.resource.aggregate({ where: { status: 'APPROVED' }, _sum: { pageCount: true } }),
      prisma.resource.findMany({
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { subject: true, uploadedBy: true },
      }),
      prisma.resource.findMany({
        where: { status: 'APPROVED' },
        orderBy: { views: 'desc' },
        take: 6,
        include: { subject: true, uploadedBy: true },
      }),
      prisma.subject.findMany({
        take: 8,
        orderBy: { resources: { _count: 'desc' } },
        include: { _count: { select: { resources: true } } },
      }),
    ]);
  } catch (err) {
    // A transient DB hiccup (e.g. a cold-start connection blip on Prisma
    // Postgres) shouldn't take the whole homepage down with a raw 500 —
    // log it server-side and degrade to the quick-actions grid instead.
    console.error('Homepage stats query failed:', err);
    return (
      <div className="space-y-10">
        <section className="rounded-lg border border-border bg-surface px-6 py-8 shadow-sm sm:px-9 sm:py-10">
          <p className="text-micro font-semibold uppercase tracking-[0.16em] text-text-faint">
            SGSITS NotesVault
          </p>
          <h1 className="mt-2.5 text-[clamp(1.9rem,4vw,2.6rem)] font-heading leading-[1.12] tracking-[-0.02em] text-ink">
            Welcome
          </h1>
          <p className="mt-3 max-w-md text-body-lg leading-relaxed text-secondary">
            Unit-wise notes, slides and previous year papers for every first-year subject at
            SGSITS — open to everyone, no account needed.
          </p>
        </section>
        <p className="text-center text-meta text-muted">
          Having trouble loading the dashboard — try refreshing, or jump straight in below.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/notes" label="Browse Notes" hint="Every note in the library" Icon={FileText} emphasis="solid" />
          <QuickAction href="/subjects" label="Subjects" hint="Browse by subject" Icon={BookOpen} />
          <QuickAction href="/pyq" label="Explore PYQs" hint="Previous year papers" Icon={ScrollText} />
          <QuickAction href="/browse" label="Browse by College" hint="Year and semester" Icon={Building2} />
        </div>
      </div>
    );
  }

  const bookmarkedIds = getBookmarkedIds();
  const pages = pageSum._sum.pageCount ?? 0;

  const stats = [
    { label: 'Subjects', value: subjectCount, Icon: LibraryBig, tint: 'sage' as const, href: '/subjects' },
    { label: 'Notes', value: noteCount, Icon: FileText, tint: 'slate' as const, href: '/notes' },
    { label: 'PYQ Papers', value: pyqCount, Icon: ScrollText, tint: 'ochre' as const, href: '/pyq' },
    {
      label: 'Pages of material',
      value: pages.toLocaleString('en-IN'),
      hint: 'Pages',
      Icon: Layers,
      tint: 'lavender' as const,
    },
  ];

  return (
    <div className="space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-surface px-6 py-8 shadow-sm sm:px-9 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] md:block"
        >
          <svg viewBox="0 0 460 300" fill="none" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
            <ellipse cx="330" cy="86" rx="150" ry="104" fill="var(--sage-200)" opacity="0.4" />
            <ellipse cx="418" cy="232" rx="128" ry="92" fill="var(--accent-cream)" opacity="0.45" />
            {/* stacked books */}
            <rect x="228" y="196" width="188" height="26" rx="7" fill="var(--sage-300)" opacity="0.85" />
            <rect x="242" y="166" width="160" height="26" rx="7" fill="var(--sage-500)" opacity="0.8" />
            <rect x="256" y="136" width="132" height="26" rx="7" fill="var(--accent-cream)" />
            {/* a page resting on top */}
            <rect x="278" y="58" width="92" height="74" rx="6" fill="var(--white)" opacity="0.92" />
            <rect x="290" y="74" width="62" height="4" rx="2" fill="var(--sage-300)" />
            <rect x="290" y="88" width="52" height="4" rx="2" fill="var(--sage-300)" />
            <rect x="290" y="102" width="66" height="4" rx="2" fill="var(--sage-300)" />
            {/* leaves */}
            <path d="M212 150 C238 168 238 200 212 220 C186 200 186 168 212 150 Z" fill="var(--sage-400)" opacity="0.55" />
            <path d="M424 138 C446 154 446 182 424 198 C402 182 402 154 424 138 Z" fill="var(--sage-300)" opacity="0.6" />
          </svg>
        </div>

        <div className="relative max-w-xl">
          <p className="text-micro font-semibold uppercase tracking-[0.16em] text-text-faint">
            SGSITS NotesVault
          </p>
          <h1 className="mt-2.5 text-[clamp(1.9rem,4vw,2.6rem)] font-heading leading-[1.12] tracking-[-0.02em] text-ink">
            Welcome
          </h1>
          <p className="mt-3 max-w-md text-body-lg leading-relaxed text-secondary">
            Unit-wise notes, slides and previous year papers for every first-year subject at
            SGSITS — open to everyone, no account needed.
          </p>
        </div>
      </section>

      {/* ── Library at a glance ──────────────────────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Library at a glance
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} layout="row" {...s} />
          ))}
        </div>
      </section>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="sr-only">
          Jump to
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/notes"
            label="Browse Notes"
            hint="Every note in the library"
            Icon={FileText}
            emphasis="solid"
          />
          <QuickAction href="/subjects" label="Subjects" hint="Browse by subject" Icon={BookOpen} />
          <QuickAction href="/pyq" label="Explore PYQs" hint="Previous year papers" Icon={ScrollText} />
          <QuickAction href="/browse" label="Browse by College" hint="Year and semester" Icon={Building2} />
        </div>
      </section>

      {/* ── Recently added + a quiet note about the project ──────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-labelledby="recent-heading">
        <div className="min-w-0 space-y-3.5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="recent-heading" className="flex items-center gap-2 text-card-title font-semibold text-ink">
              <Clock size={16} strokeWidth={1.9} className="text-sage-600" />
              Recently added
            </h2>
            <Link
              href="/notes"
              className="text-meta font-semibold text-sage-600 transition hover:text-sage-800"
            >
              View all
            </Link>
          </div>
          <NoteListTable
            notes={recentNotes as any[]}
            bookmarkedIds={bookmarkedIds}
            emptyTitle="Nothing added yet"
          />
        </div>

        <aside className="relative flex min-w-0 flex-col overflow-hidden rounded-md border border-sage-100 bg-primary-soft p-7 sm:p-9">
          <svg
            viewBox="0 0 200 240"
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-8 h-56 w-56"
          >
            {/* smaller leaf tucked behind, lower-left */}
            <path
              d="M72 232 C34 206 30 146 62 104 C94 146 100 194 72 232 Z"
              fill="var(--sage-300)"
              opacity="0.32"
            />
            {/* main upright leaf */}
            <path
              d="M138 6 C178 74 178 162 138 230 C98 162 98 74 138 6 Z"
              fill="var(--sage-300)"
              opacity="0.45"
            />
            <path d="M138 16 L138 220" stroke="var(--sage-500)" strokeWidth="2" opacity="0.45" />
          </svg>

          <p className="relative font-heading text-[2.75rem] font-bold leading-[0.7] text-sage-500" aria-hidden>
            &ldquo;
          </p>
          <p className="relative mt-5 text-[clamp(1.35rem,2vw,1.9rem)] font-heading font-bold leading-[1.15] tracking-[-0.02em] text-primary-strong">
            A little progress every day adds up to big results.
          </p>
          <p className="relative mt-4 max-w-[30ch] text-body leading-relaxed text-sage-700">
            SGSITS NotesVault is built and maintained by students, for students.
          </p>
          <Link
            href="/about"
            className="relative mt-7 inline-flex items-center gap-2 self-start rounded-button bg-surface px-4 py-2.5 text-meta font-semibold text-primary-strong shadow-sm transition duration-calm ease-calm hover:shadow-md"
          >
            About the project
            <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
        </aside>
      </section>

      {/* ── Popular subjects ─────────────────────────────────────────────── */}
      <section className="space-y-3.5" aria-labelledby="subjects-heading">
        <div className="flex items-center justify-between">
          <h2 id="subjects-heading" className="text-card-title font-semibold text-ink">
            Popular subjects
          </h2>
          <Link
            href="/subjects"
            className="text-meta font-semibold text-sage-600 transition hover:text-sage-800"
          >
            All subjects
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {topSubjects.map((s) => (
            <SubjectCard
              key={s.id}
              id={s.id}
              name={s.name}
              code={s.code || undefined}
              notes={s._count.resources}
              layout="grid"
            />
          ))}
        </div>
      </section>

      {/* ── Most viewed ──────────────────────────────────────────────────── */}
      <section className="space-y-3.5" aria-labelledby="popular-heading">
        <h2 id="popular-heading" className="flex items-center gap-2 text-card-title font-semibold text-ink">
          <Flame size={16} strokeWidth={1.9} className="text-sage-600" />
          Most viewed
        </h2>
        <NoteListTable
          notes={topNotes as any[]}
          bookmarkedIds={bookmarkedIds}
          emptyTitle="Nothing viewed yet"
        />
      </section>

      <p className="border-t border-border-soft pt-6 text-center text-micro text-text-faint">
        A student-driven resource for B.Tech 1st Year · Unofficial · not an official SGSITS portal
      </p>
    </div>
  );
}
