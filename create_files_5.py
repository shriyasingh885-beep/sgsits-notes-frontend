import os

base_dir = r"C:\Users\HP\notes-hub\src"

files = {
    r"components\SubjectTabs.tsx": """'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import NoteListTable from '@/components/ui/NoteListTable';
import EmptyState from '@/components/ui/EmptyState';

export default function SubjectTabs({ subject, resources }: { subject: any, resources: any[] }) {
  const [active, setActive] = useState('units');

  const TABS = [
    { key: 'units', label: 'Units', count: resources.length },
    { key: 'pyq', label: 'PYQs', count: resources.filter(r => r.type === 'PYQ').length },
    { key: 'assignments', label: 'Assignments', count: resources.filter(r => r.type === 'ASSIGNMENT').length }
  ];

  return (
    <div className="space-y-6">
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      
      {active === 'units' && (
        <div className="space-y-8">
          {subject.units.map((u: any) => {
            const unitResources = resources.filter(r => r.unitId === u.id);
            if (unitResources.length === 0) return null;
            return (
              <section key={u.id} className="space-y-3">
                <h3 className="text-card-title font-semibold text-ink">Unit {u.number}: {u.title}</h3>
                <NoteListTable notes={unitResources} />
              </section>
            );
          })}
          {resources.filter(r => !r.unitId).length > 0 && (
            <section className="space-y-3">
              <h3 className="text-card-title font-semibold text-ink">Other Materials</h3>
              <NoteListTable notes={resources.filter(r => !r.unitId)} />
            </section>
          )}
          {resources.length === 0 && <EmptyState title="No resources yet" body="Be the first to upload." />}
        </div>
      )}

      {active === 'pyq' && (
        <NoteListTable notes={resources.filter(r => r.type === 'PYQ')} emptyTitle="No PYQs" />
      )}

      {active === 'assignments' && (
        <NoteListTable notes={resources.filter(r => r.type === 'ASSIGNMENT')} emptyTitle="No assignments" />
      )}
    </div>
  );
}
""",
    r"components\UploadForm.tsx": """'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadDropzone from '@/components/ui/UploadDropzone';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';

export default function UploadForm({ subjects }: { subjects: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    toast('Upload successful', 'success');
    router.push('/uploads');
    router.refresh();
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto border-border">
      <form onSubmit={handleSubmit} className="space-y-6">
        <UploadDropzone file={file} onChange={setFile} />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-meta font-medium mb-1">Subject</label>
            <Select>
              <option>Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-meta font-medium mb-1">Type</label>
            <Select>
              <option value="NOTES">Notes</option>
              <option value="PYQ">PYQ</option>
              <option value="ASSIGNMENT">Assignment</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-meta font-medium mb-1">Title</label>
          <input type="text" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none" required />
        </div>

        <Button variant="primary" size="lg" className="w-full justify-center">Submit Upload</Button>
      </form>
    </Card>
  );
}
""",
    r"components\SearchFilters.tsx": """'use client';

import { useRouter } from 'next/navigation';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';

export default function SearchFilters({ update }: { update: (params: any) => void }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value; update({ q: v }); }} className="flex gap-2">
      <SearchInput value="" onChange={() => {}} placeholder="Search..." name="q" />
      <Select>
        <option value="all">All</option>
      </Select>
    </form>
  );
}
""",
    r"app\browse\[collegeSlug]\[year]\[semNum]\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SubjectCard from '@/components/ui/SubjectCard';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function SemesterSubjectsPage({ params }: { params: { collegeSlug: string, year: string, semNum: string } }) {
  const college = await prisma.college.findUnique({ where: { slug: params.collegeSlug } });
  
  if (!college) return <div>Not found</div>;

  const subjects = await prisma.subject.findMany({
    where: { semester: { number: parseInt(params.semNum) } },
    include: { _count: { select: { resources: { where: { status: 'APPROVED' } } } } }
  });

  return (
    <div className="space-y-8">
      <PageHeader title={`Semester ${params.semNum} Subjects`} />
      <Breadcrumb items={[{ label: 'Colleges', href: '/browse' }, { label: college.name, href: `/browse/${college.slug}` }, { label: `Semester ${params.semNum}` }]} />
      
      {subjects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map(s => (
            <SubjectCard key={s.id} id={s.id} name={s.name} notes={s._count.resources} layout="grid" />
          ))}
        </div>
      ) : (
        <EmptyState title="No subjects found" />
      )}
    </div>
  );
}
""",
    r"app\browse\[collegeSlug]\[year]\branch\[branchSlug]\page.tsx": """import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function BranchYearPage({ params }: { params: { collegeSlug: string, year: string, branchSlug: string } }) {
  const [college, branch] = await Promise.all([
    prisma.college.findUnique({ where: { slug: params.collegeSlug } }),
    prisma.branch.findUnique({ where: { slug: params.branchSlug } })
  ]);

  if (!college || !branch) return <div>Not found</div>;

  const semesters = [1, 2].map(n => n + (parseInt(params.year) - 1) * 2);

  return (
    <div className="space-y-8">
      <PageHeader title={`${branch.name} - Year ${params.year}`} />
      <Breadcrumb items={[{ label: 'Colleges', href: '/browse' }, { label: college.name, href: `/browse/${college.slug}` }, { label: branch.name }]} />
      
      <div className="grid sm:grid-cols-2 gap-4">
        {semesters.map(s => (
          <Link key={s} href={`/browse/${college.slug}/${params.year}/branch/${branch.slug}/${s}`}>
            <Card hover className="p-5">
              <p className="font-semibold text-card-title text-ink">Semester {s}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
""",
    r"app\browse\[collegeSlug]\[year]\branch\[branchSlug]\[semNum]\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SubjectCard from '@/components/ui/SubjectCard';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function BranchSemesterSubjectsPage({ params }: { params: { collegeSlug: string, year: string, branchSlug: string, semNum: string } }) {
  const [college, branch] = await Promise.all([
    prisma.college.findUnique({ where: { slug: params.collegeSlug } }),
    prisma.branch.findUnique({ where: { slug: params.branchSlug } })
  ]);
  
  if (!college || !branch) return <div>Not found</div>;

  const subjects = await prisma.subject.findMany({
    where: { semester: { number: parseInt(params.semNum) } },
    include: { _count: { select: { resources: { where: { status: 'APPROVED' } } } } }
  });

  return (
    <div className="space-y-8">
      <PageHeader title={`${branch.name} - Semester ${params.semNum}`} />
      <Breadcrumb items={[{ label: 'Colleges', href: '/browse' }, { label: college.name, href: `/browse/${college.slug}` }, { label: branch.name }, { label: `Sem ${params.semNum}` }]} />
      
      {subjects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map(s => (
            <SubjectCard key={s.id} id={s.id} name={s.name} notes={s._count.resources} layout="grid" />
          ))}
        </div>
      ) : (
        <EmptyState title="No subjects found" />
      )}
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

print("Batch 5 created.")
