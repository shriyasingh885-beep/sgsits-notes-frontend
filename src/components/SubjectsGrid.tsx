'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import SubjectCard from '@/components/ui/SubjectCard';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import { IconButton } from '@/components/ui/IconButton';
import EmptyState from '@/components/ui/EmptyState';
import { LayoutGrid, List } from 'lucide-react';

export default function SubjectsGrid({ subjects }: { subjects: any[] }) {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('all');

  const filtered = subjects.filter((s) => {
    if (semester !== 'all' && String(s.semester?.number) !== semester) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Subjects"
        subtitle="Browse all subjects and course material"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="all">All semesters</option>
              <option value="1">Semester I</option>
              <option value="2">Semester II</option>
            </Select>
            <SearchInput value={search} onChange={setSearch} placeholder="Search subjects…" />
            <div className="flex gap-1 rounded-button border border-border bg-surface p-1">
              <IconButton onClick={() => setLayout('grid')} icon={<LayoutGrid size={16} />} label="Grid view" tone={layout === 'grid' ? 'sage' : 'quiet'} />
              <IconButton onClick={() => setLayout('list')} icon={<List size={16} />} label="List view" tone={layout === 'list' ? 'sage' : 'quiet'} />
            </div>
          </div>
        }
      />
      {filtered.length > 0 ? (
        <div className={layout === 'grid' ? 'grid grid-cols-2 gap-4 lg:grid-cols-4' : 'flex flex-col gap-2'}>
          {filtered.map((s) => (
            <SubjectCard key={s.id} id={s.id} name={s.name} code={s.code} notes={s._count.resources} pyqs={s.pyqsCount} layout={layout} />
          ))}
        </div>
      ) : (
        <EmptyState title="No subjects match" body="Try a different search or semester." />
      )}
    </div>
  );
}
