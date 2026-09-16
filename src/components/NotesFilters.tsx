'use client';

import { useRouter } from 'next/navigation';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import { cn } from '@/lib/cn';

const TYPES: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'NOTES', label: 'Notes' },
  { value: 'HANDWRITTEN_NOTES', label: 'Handwritten' },
  { value: 'PYQ', label: 'PYQ' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'QUESTION_BANK', label: 'Question Bank' },
  { value: 'SYLLABUS', label: 'Syllabus' },
];

export default function NotesFilters({
  currentQ,
  currentType,
  currentYear,
  currentSort,
  years = [],
}: {
  currentQ?: string;
  currentType?: string;
  currentYear?: string;
  currentSort?: string;
  years?: number[];
}) {
  const router = useRouter();
  const activeType = currentType || 'all';

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    router.push(`/notes?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <SearchInput value={currentQ || ''} onChange={(v) => update('q', v)} placeholder="Search notes..." />
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {years.length > 0 && (
            <Select value={currentYear || 'all'} onChange={(e) => update('year', e.target.value)} aria-label="Year">
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          )}
          <Select value={currentSort || 'new'} onChange={(e) => update('sort', e.target.value)} aria-label="Sort">
            <option value="new">Newest</option>
            <option value="popular">Most viewed</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => update('type', t.value)}
            className={cn(
              'rounded-button px-3 py-1.5 text-meta font-semibold transition duration-calm ease-calm',
              activeType === t.value
                ? 'bg-sage-600 text-white shadow-sm'
                : 'bg-surface-soft text-secondary hover:bg-primary-soft hover:text-primary-strong',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
