import os

base_dir = r"C:\Users\HP\notes-hub\src"

files = {
    r"app\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import SubjectCard from '@/components/ui/SubjectCard';
import NoteListItem from '@/components/ui/NoteListItem';
import NoteListTable from '@/components/ui/NoteListTable';
import EmptyState from '@/components/ui/EmptyState';
import { Button, LinkButton } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LibraryBig, FileText, Bookmark, Upload, CalendarDays, Search } from 'lucide-react';
import { daysUntil } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const [subjectCount, noteCount, bookmarkCount, uploadCount, recentBookmarks, upcomingEvents] = await Promise.all([
      prisma.subject.count(),
      prisma.resource.count({ where: { status: 'APPROVED' } }),
      prisma.bookmark.count({ where: { userId: session.user.id } }),
      prisma.resource.count({ where: { uploadedById: session.user.id } }),
      prisma.bookmark.findMany({
        where: { userId: session.user.id },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { resource: { include: { subject: true, unit: true } } },
      }),
      prisma.studyEvent.findMany({
        where: {
          date: { gte: new Date() },
          OR: [{ userId: null }, { userId: session.user.id }],
        },
        orderBy: { date: 'asc' },
        take: 5,
      }),
    ]);

    const firstName = session.user.name?.split(' ')[0] || 'User';

    return (
      <div className="space-y-8">
        <PageHeader title={`Welcome back, ${firstName}`} subtitle="Here's what's happening with your notes." />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Subjects" value={subjectCount} Icon={LibraryBig} tint="sage" href="/subjects" />
          <StatCard label="Notes" value={noteCount} Icon={FileText} tint="slate" href="/notes" />
          <StatCard label="Bookmarks" value={bookmarkCount} Icon={Bookmark} tint="lavender" href="/bookmarks" />
          <StatCard label="My Uploads" value={uploadCount} Icon={Upload} tint="ochre" href="/uploads" />
        </div>

        <div className="flex gap-4">
          <LinkButton variant="primary" href="/uploads" size="md">Upload Notes</LinkButton>
          <LinkButton variant="secondary" href="/notes" size="md">Search Notes</LinkButton>
          <LinkButton variant="secondary" href="/pyq" size="md">Explore PYQs</LinkButton>
          <LinkButton variant="secondary" href="/browse" size="md">Browse by College</LinkButton>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-card-title font-semibold text-ink">Continue where you left off</h2>
            {recentBookmarks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {recentBookmarks.map(b => (
                  <NoteListItem key={b.id} note={b.resource as any} variant="row" right={<Bookmark className="text-sage-600 fill-sage-600" size={18} />} />
                ))}
              </div>
            ) : (
              <EmptyState title="No bookmarks yet" body="Save notes to quickly access them here." Icon={Bookmark} action={<LinkButton href="/notes">Find Notes</LinkButton>} />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-card-title font-semibold text-ink">Upcoming</h2>
              <LinkButton href="/schedule" variant="tertiary" size="sm">+ Add reminder</LinkButton>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="flex flex-col gap-2">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-surface rounded-card border border-border">
                    <div className="flex items-center gap-3">
                      <CalendarDays size={18} className="text-muted" />
                      <span className="text-body font-medium text-ink">{e.title}</span>
                    </div>
                    <span className="text-meta font-semibold text-warning" style={{ color: 'var(--warning)' }}>{daysUntil(e.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No upcoming events" Icon={CalendarDays} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Signed out
  const [topSubjects, topNotes] = await Promise.all([
    prisma.subject.findMany({ take: 8, orderBy: { resources: { _count: 'desc' } }, include: { _count: { select: { resources: true } } } }),
    prisma.resource.findMany({ take: 6, orderBy: { downloads: 'desc' }, where: { status: 'APPROVED' }, include: { subject: true } })
  ]);

  return (
    <div className="space-y-12">
      <div className="text-center max-w-2xl mx-auto mt-12 space-y-6">
        <PageHeader title="B.Tech First Year Notes & Syllabus Hub" subtitle="The best place to find, share, and organize your college study materials." />
        
        <form action="/notes" className="relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
          <input type="text" name="q" placeholder="Search notes, PYQs, subjects..." className="w-full pl-10 pr-4 h-12 rounded-input border border-border bg-surface text-body text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </form>

        <div className="flex justify-center gap-4">
          <LinkButton href="/browse" variant="primary" size="lg">Find My Notes</LinkButton>
          <LinkButton href="/uploads" variant="secondary" size="lg">Upload Notes</LinkButton>
        </div>

        <div className="flex justify-center gap-3 flex-wrap pt-4">
          <Badge tone="neutral">NAAC Grade A</Badge>
          <Badge tone="neutral">RGPV Affiliated</Badge>
          <Badge tone="neutral">Autonomous</Badge>
          <Badge tone="neutral">Estd. 1952</Badge>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-card-title font-semibold text-ink">Popular Subjects</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {topSubjects.map(s => <SubjectCard key={s.id} id={s.id} name={s.name} code={s.code || undefined} notes={s._count.resources} layout="grid" />)}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-card-title font-semibold text-ink">Trending Notes</h2>
        <NoteListTable notes={topNotes as any[]} />
      </div>
    </div>
  );
}
""",
    r"app\subjects\page.tsx": """import PageHeader from '@/components/ui/PageHeader';
import { prisma } from '@/lib/prisma';
import SubjectsGrid from '@/components/SubjectsGrid';

export const dynamic = 'force-dynamic';

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({ 
    include: { 
      _count: { select: { resources: { where: { status: 'APPROVED' } } } }, 
      semester: true,
      resources: { where: { status: 'APPROVED', type: 'PYQ' }, select: { id: true } }
    } 
  });

  const formattedSubjects = subjects.map(s => ({
    ...s,
    pyqsCount: s.resources.length
  }));

  return (
    <div className="space-y-8">
      <SubjectsGrid subjects={formattedSubjects as any} />
    </div>
  );
}
""",
    r"components\SubjectsGrid.tsx": """'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import SubjectCard from '@/components/ui/SubjectCard';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import { IconButton } from '@/components/ui/IconButton';
import { LayoutGrid, List } from 'lucide-react';

export default function SubjectsGrid({ subjects }: { subjects: any[] }) {
  const [layout, setLayout] = useState<'grid'|'list'>('grid');
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('all');

  const filtered = subjects.filter(s => {
    if (semester !== 'all' && s.semester?.id !== semester) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Subjects" 
        subtitle="Browse all subjects and course material"
        actions={
          <div className="flex items-center gap-3">
            <Select value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="all">All Semesters</option>
              <option value="sem1">Semester 1</option>
              <option value="sem2">Semester 2</option>
            </Select>
            <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
            <div className="flex gap-1 border border-border rounded-button p-0.5 bg-surface">
              <IconButton onClick={() => setLayout('grid')} icon={LayoutGrid} aria-label="Grid view" className={layout === 'grid' ? 'bg-elevated' : ''} />
              <IconButton onClick={() => setLayout('list')} icon={List} aria-label="List view" className={layout === 'list' ? 'bg-elevated' : ''} />
            </div>
          </div>
        }
      />
      <div className={layout === 'grid' ? 'grid grid-cols-2 lg:grid-cols-4 gap-4' : 'flex flex-col gap-2'}>
        {filtered.map(s => (
          <SubjectCard key={s.id} id={s.id} name={s.name} code={s.code} notes={s._count.resources} pyqs={s.pyqsCount} layout={layout} />
        ))}
      </div>
    </div>
  );
}
""",
    r"app\notes\page.tsx": """import PageHeader from '@/components/ui/PageHeader';
import { prisma } from '@/lib/prisma';
import NoteListTable from '@/components/ui/NoteListTable';
import EmptyState from '@/components/ui/EmptyState';
import NotesFilters from '@/components/NotesFilters';

export const dynamic = 'force-dynamic';

export default async function NotesPage({ searchParams }: { searchParams: { q?: string, type?: string, year?: string, sort?: string } }) {
  const { q, type, year, sort } = searchParams;
  
  const where: any = { status: 'APPROVED' };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { tags: { hasSome: [q] } },
      { subject: { name: { contains: q, mode: 'insensitive' } } }
    ];
  }
  if (type && type !== 'all') where.type = type;

  const notes = await prisma.resource.findMany({
    where,
    include: { subject: true, uploadedBy: true },
    orderBy: sort === 'popular' ? { downloads: 'desc' } : { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <PageHeader title={q ? `Results for "${q}"` : 'All Notes'} subtitle={`${notes.length} results`} />
      <NotesFilters currentQ={q} currentType={type} currentYear={year} currentSort={sort} />
      
      {notes.length > 0 ? (
        <NoteListTable notes={notes as any[]} />
      ) : (
        <EmptyState title="No notes found" body="Try adjusting your search or filters." />
      )}
    </div>
  );
}
""",
    r"components\NotesFilters.tsx": """'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

export default function NotesFilters({ currentQ, currentType, currentYear, currentSort }: any) {
  const router = useRouter();
  
  const update = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    router.push(`/notes?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="w-full sm:w-72">
        <SearchInput value={currentQ || ''} onChange={v => update('q', v)} placeholder="Search notes..." />
      </div>
      <div className="flex gap-2">
        <Select value={currentType || 'all'} onChange={e => update('type', e.target.value)}>
          <option value="all">All Types</option>
          <option value="NOTES">Notes</option>
          <option value="PYQ">PYQs</option>
          <option value="ASSIGNMENT">Assignments</option>
        </Select>
        <Select value={currentSort || 'new'} onChange={e => update('sort', e.target.value)}>
          <option value="new">Newest</option>
          <option value="popular">Most Popular</option>
        </Select>
      </div>
    </div>
  );
}
"""
}

for rel_path, content in files.items():
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Files created successfully.")
