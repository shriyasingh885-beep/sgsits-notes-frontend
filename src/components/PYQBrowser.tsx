'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, ChevronRight } from 'lucide-react';
import { parseExamYear } from '@/lib/format';
import { TypeBadge } from '@/components/ui/Badge';
import BookmarkButton from '@/components/ui/BookmarkButton';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';

export default function PYQBrowser({ pyqs }: { pyqs: any[] }) {
  const subjects = Array.from(new Set(pyqs.map((p) => p.subject.name))).sort();
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  const toggleSubject = (s: string) => {
    const next = new Set(selectedSubjects);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelectedSubjects(next);
  };

  const filtered = selectedSubjects.size > 0 ? pyqs.filter((p) => selectedSubjects.has(p.subject.name)) : pyqs;

  const byYear: Record<string, any[]> = filtered.reduce((acc: Record<string, any[]>, p: any) => {
    const year = p.academicYear ? String(p.academicYear) : parseExamYear(p.title, p.tags) || 'Compilations & undated';
    if (!acc[year]) acc[year] = [];
    acc[year].push(p);
    return acc;
  }, {});

  const years = Object.keys(byYear).sort().reverse();

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="w-full shrink-0 space-y-3 md:w-64">
        <h3 className="text-meta font-semibold uppercase tracking-[0.06em] text-text-faint">Filter by subject</h3>
        <div className="rounded-md border border-border bg-surface p-2 shadow-sm">
          <div className="flex flex-wrap gap-1.5 md:flex-col md:gap-1">
            {subjects.map((s) => {
              const isActive = selectedSubjects.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={cn(
                    'rounded-button px-3 py-2 text-left text-body font-medium transition duration-calm ease-calm',
                    isActive ? 'bg-sage-600 text-white shadow-sm' : 'text-secondary hover:bg-primary-soft hover:text-primary-strong',
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-8">
        {years.length === 0 && <EmptyState title="No previous year papers yet" />}
        {years.map((year) => (
          <div key={year} className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading text-section text-ink">{year}</h2>
              <span className="h-px flex-1 bg-border-soft" aria-hidden />
              <span className="text-meta text-muted">{byYear[year].length} paper{byYear[year].length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {byYear[year].map((p) => (
                <div
                  key={p.id}
                  className="group relative flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-sm transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
                      <FileText size={16} strokeWidth={1.8} />
                    </span>
                    <BookmarkButton resourceId={p.id} />
                  </div>
                  <Link href={`/notes/${p.id}`} className="flex-1">
                    <p className="text-meta font-semibold text-sage-700">{p.subject.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-body-lg font-semibold text-ink">{p.title}</p>
                  </Link>
                  <div className="flex items-center justify-between pt-1">
                    <TypeBadge type={p.type} />
                    <Link
                      href={`/notes/${p.id}`}
                      className="flex items-center gap-0.5 text-meta font-semibold text-sage-700 transition group-hover:gap-1.5"
                    >
                      View <ChevronRight size={13} strokeWidth={2.2} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
