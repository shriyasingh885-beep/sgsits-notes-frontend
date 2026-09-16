import os

base_dir = r"C:\Users\HP\notes-hub\src"

files = {
    r"app\subjects\[id]\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import SubjectTabs from '@/components/SubjectTabs';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SubjectDetailPage({ params }: { params: { id: string } }) {
  const subject = await prisma.subject.findUnique({
    where: { id: params.id },
    include: {
      units: { orderBy: { number: 'asc' } },
      resources: { where: { status: 'APPROVED' }, include: { uploadedBy: true }, orderBy: { createdAt: 'desc' } }
    }
  });

  if (!subject) notFound();

  return (
    <div className="space-y-6">
      <PageHeader 
        title={subject.name} 
        subtitle={subject.units.slice(0, 3).map(u => u.title).join(' · ')} 
        crumbs={[{ label: 'Subjects', href: '/subjects' }, { label: subject.name }]} 
      />
      <SubjectTabs subject={subject as any} resources={subject.resources as any[]} />
    </div>
  );
}
""",
    r"app\notes\[id]\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { formatSize } from '@/lib/format';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ResourceActionsPanel from '@/components/ResourceActionsPanel';
import NoteListItem from '@/components/ui/NoteListItem';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function NoteDetailPage({ params }: { params: { id: string } }) {
  const resource = await prisma.resource.findUnique({
    where: { id: params.id },
    include: { subject: { include: { units: true } }, unit: true, uploadedBy: true }
  });

  if (!resource) notFound();

  await prisma.resource.update({ where: { id: resource.id }, data: { views: { increment: 1 } } });

  const related = await prisma.resource.findMany({
    where: { subjectId: resource.subjectId, status: 'APPROVED', NOT: { id: resource.id } },
    take: 4,
    orderBy: { downloads: 'desc' }
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto">
      <div className="hidden md:block w-[230px] shrink-0 space-y-4 sticky top-6 h-fit">
        <h3 className="text-card-title font-semibold text-ink">Contents</h3>
        <div className="flex flex-col gap-1">
          {resource.subject.units.map(u => (
            <div key={u.id} className={`px-3 py-2 rounded-tiny text-body ${u.id === resource.unitId ? 'bg-sage-50 text-sage-800 font-medium' : 'text-secondary'}`}>
              Unit {u.number}: {u.title}
            </div>
          ))}
        </div>
        <Link href={`/subjects/${resource.subjectId}`} className="text-meta text-muted hover:text-ink flex items-center gap-1 mt-4">
          <ArrowLeft size={14} /> Back to {resource.subject.name}
        </Link>
      </div>

      <div className="flex-1 max-w-[800px] space-y-4">
        <PageHeader 
          title={resource.title} 
          subtitle={`${resource.subject.name} · ${resource.type} · ${formatSize(resource.fileSize)}`} 
          crumbs={[{ label: 'Subjects', href: '/subjects' }, { label: resource.subject.name, href: `/subjects/${resource.subjectId}` }, { label: resource.title }]}
          actions={<Link href={`/subjects/${resource.subjectId}`}><IconButton icon={ArrowLeft} aria-label="Back" /></Link>}
        />
        <div className="bg-surface rounded-panel border border-border overflow-hidden h-[70vh]">
          {resource.fileUrl.endsWith('.pdf') ? (
            <iframe src={`${resource.fileUrl}#toolbar=0`} className="w-full h-full border-0 bg-elevated" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-body">
              Preview not available for this file type. Please download to view.
            </div>
          )}
        </div>
      </div>

      <div className="w-full md:w-[208px] shrink-0 space-y-6">
        <ResourceActionsPanel resourceId={resource.id} fileUrl={resource.fileUrl} fileName={resource.title} />
        
        <div className="space-y-3">
          <h3 className="text-meta font-semibold text-secondary uppercase tracking-wider">Related Notes</h3>
          <div className="flex flex-col gap-2">
            {related.map(r => (
              <NoteListItem key={r.id} note={r as any} variant="row" />
            ))}
          </div>
        </div>

        <Card className="bg-sage-50 border-sage-100 p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="text-sage-600 mt-1" size={18} />
            <div>
              <p className="text-body font-semibold text-sage-900">Ask Doubt</p>
              <p className="text-meta text-sage-700 mt-1">Found a mistake? Let us know.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
""",
    r"components\ResourceActionsPanel.tsx": """'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Bookmark, Download, Share, Flag, Star } from 'lucide-react';

export default function ResourceActionsPanel({ resourceId, fileUrl, fileName }: any) {
  const { toast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);

  const download = async () => {
    toast('Download started', 'success');
    window.open(fileUrl, '_blank');
    await fetch(`/api/resources/${resourceId}/download`, { method: 'POST' });
  };

  const bookmark = async () => {
    await fetch(`/api/resources/${resourceId}/bookmark`, { method: 'POST' });
    toast('Added to bookmarks', 'success');
  };

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast('Link copied to clipboard', 'success');
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" onClick={download} className="w-full justify-center gap-2">
        <Download size={18} /> Download
      </Button>
      <Button variant="secondary" onClick={bookmark} className="w-full justify-center gap-2">
        <Bookmark size={18} /> Save Note
      </Button>
      <div className="flex gap-2">
        <Button variant="tertiary" onClick={share} className="flex-1 justify-center">
          <Share size={18} />
        </Button>
        <Button variant="tertiary" onClick={() => setReportOpen(true)} className="flex-1 justify-center text-danger">
          <Flag size={18} />
        </Button>
      </div>
      
      <div className="mt-2 pt-2 border-t border-border flex justify-center gap-1">
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={20} className="text-muted hover:text-ochre-500 cursor-pointer transition-colors" />
        ))}
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report Note">
        <div className="p-4 space-y-4">
          <p className="text-body text-secondary">What is wrong with this note?</p>
          <textarea className="w-full border border-border rounded-input p-3 min-h-[100px] text-body" placeholder="Describe the issue..."></textarea>
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setReportOpen(false); toast('Report submitted', 'success'); }}>Submit Report</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
""",
    r"app\bookmarks\page.tsx": """import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import BookmarksList from '@/components/BookmarksList';

export const dynamic = 'force-dynamic';

export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    include: { resource: { include: { subject: true, uploadedBy: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Bookmarks" subtitle="Your saved notes" />
      <BookmarksList bookmarks={bookmarks as any[]} />
    </div>
  );
}
""",
    r"components\BookmarksList.tsx": """'use client';

import { useState } from 'react';
import NoteListItem from '@/components/ui/NoteListItem';
import SearchInput from '@/components/ui/SearchInput';
import { IconButton } from '@/components/ui/IconButton';
import { LayoutGrid, List, BookmarkCheck } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export default function BookmarksList({ bookmarks }: { bookmarks: any[] }) {
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<'row'|'table'>('row');

  const filtered = bookmarks.filter(b => b.resource.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search bookmarks..." />
        <div className="flex gap-1 border border-border rounded-button p-0.5 bg-surface">
          <IconButton onClick={() => setLayout('row')} icon={List} aria-label="List view" className={layout === 'row' ? 'bg-elevated' : ''} />
          <IconButton onClick={() => setLayout('table')} icon={LayoutGrid} aria-label="Table view" className={layout === 'table' ? 'bg-elevated' : ''} />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map(b => (
            <NoteListItem key={b.id} note={b.resource as any} variant={layout} right={<BookmarkCheck className="text-sage-600 fill-sage-600" size={18} />} />
          ))}
        </div>
      ) : (
        <EmptyState title="No bookmarks found" />
      )}
    </div>
  );
}
""",
    r"app\uploads\page.tsx": """import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import UploadForm from '@/components/UploadForm';
import NoteListItem from '@/components/ui/NoteListItem';
import { StatusBadge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function UploadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [subjects, uploads] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: 'asc' }, include: { units: true } }),
    prisma.resource.findMany({
      where: { uploadedById: session.user.id },
      include: { subject: true, unit: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="My Uploads" subtitle="Manage your contributions" />
      <UploadForm subjects={subjects} />
      
      <div className="space-y-4">
        <h2 className="text-card-title font-semibold text-ink">Your Uploads</h2>
        <div className="flex flex-col gap-2">
          {uploads.map(u => (
            <NoteListItem key={u.id} note={u as any} variant="row" right={<StatusBadge status={u.status} />} />
          ))}
        </div>
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

print("Batch 2 created.")
