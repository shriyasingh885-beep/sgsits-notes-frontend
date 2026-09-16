import os

base_dir = r"C:\Users\HP\notes-hub\src"

files = {
    r"app\profile\page.tsx": """import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StatCard from '@/components/ui/StatCard';
import { LinkButton } from '@/components/ui/Button';
import ProfileTabs from '@/components/ProfileTabs';
import { Upload, Download, Star, Bookmark } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [uploads, bookmarks] = await Promise.all([
    prisma.resource.findMany({ where: { uploadedById: session.user.id, status: 'APPROVED' }, include: { subject: true, uploadedBy: true }, orderBy: { createdAt: 'desc' } }),
    prisma.bookmark.findMany({ where: { userId: session.user.id }, include: { resource: { include: { subject: true, uploadedBy: true } } }, orderBy: { createdAt: 'desc' } })
  ]);

  const initials = session.user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const totalDownloads = uploads.reduce((acc, r) => acc + r.downloads, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center text-2xl font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-page font-heading text-ink">{session.user.name}</h1>
          <p className="text-meta text-secondary">{session.user.email} · Joined {new Date().getFullYear()}</p>
        </div>
        <LinkButton href="/settings" variant="secondary">Edit Profile</LinkButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Uploads" value={uploads.length} Icon={Upload} tint="sage" />
        <StatCard label="Downloads" value={totalDownloads} Icon={Download} tint="slate" />
        <StatCard label="Avg Rating" value="4.8" Icon={Star} tint="ochre" />
        <StatCard label="Bookmarks" value={bookmarks.length} Icon={Bookmark} tint="lavender" />
      </div>

      <ProfileTabs uploads={uploads as any[]} bookmarks={bookmarks.map(b => b.resource) as any[]} />
    </div>
  );
}
""",
    r"components\ProfileTabs.tsx": """'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import NoteListTable from '@/components/ui/NoteListTable';

export default function ProfileTabs({ uploads, bookmarks }: { uploads: any[], bookmarks: any[] }) {
  const [active, setActive] = useState('uploads');

  return (
    <div className="space-y-4">
      <Tabs 
        tabs={[{ key: 'uploads', label: 'Uploads', count: uploads.length }, { key: 'bookmarks', label: 'Bookmarks', count: bookmarks.length }]} 
        active={active} 
        onChange={setActive} 
      />
      {active === 'uploads' && <NoteListTable notes={uploads} />}
      {active === 'bookmarks' && <NoteListTable notes={bookmarks} />}
    </div>
  );
}
""",
    r"app\login\page.tsx": """'use client';

import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card elevated className="w-full max-w-md p-8">
        <h1 className="text-page font-heading tracking-[-0.01em] text-ink mb-1">Welcome back</h1>
        <p className="text-body-lg text-secondary mb-8">Sign in to your College Notes Hub account.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email address" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none" required />
          <input type="password" placeholder="Password" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none" required />
          <Button variant="primary" size="lg" className="w-full justify-center">Sign In</Button>
        </form>

        <p className="mt-6 text-center text-meta text-secondary">
          Don't have an account? <Link href="/register" className="text-sage-600 hover:underline">Register here</Link>
        </p>
      </Card>
    </div>
  );
}
""",
    r"app\register\page.tsx": """'use client';

import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card elevated className="w-full max-w-md p-8">
        <h1 className="text-page font-heading tracking-[-0.01em] text-ink mb-1">Create an account</h1>
        <p className="text-body-lg text-secondary mb-8">Join the College Notes Hub community.</p>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" placeholder="Full Name" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none" required />
          <input type="email" placeholder="Email address" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none" required />
          <input type="password" placeholder="Password" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none" required />
          <Button variant="primary" size="lg" className="w-full justify-center">Register</Button>
        </form>

        <p className="mt-6 text-center text-meta text-secondary">
          Already have an account? <Link href="/login" className="text-sage-600 hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
""",
    r"app\admin\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import AdminPanel from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [stats, pending, reports, colleges] = await Promise.all([
    { users: 100, resources: 200, reports: 5 },
    prisma.resource.findMany({ where: { status: 'PENDING' }, include: { uploadedBy: true, subject: true } }),
    [],
    prisma.college.findMany()
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Admin Dashboard" />
      <AdminPanel stats={stats} pending={pending as any[]} reports={reports} colleges={colleges} />
    </div>
  );
}
""",
    r"components\AdminPanel.tsx": """'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import StatCard from '@/components/ui/StatCard';
import { Button, LinkButton } from '@/components/ui/Button';
import { Users, FileText, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';

export default function AdminPanel({ stats, pending, reports, colleges }: any) {
  const [active, setActive] = useState('overview');
  const router = useRouter();

  const handleApprove = async (id: string) => {
    await fetch(`/api/admin/resources/${id}/approve`, { method: 'POST' });
    router.refresh();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/admin/resources/${id}/reject`, { method: 'POST' });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Tabs 
        tabs={[{ key: 'overview', label: 'Overview' }, { key: 'pending', label: 'Pending Approvals', count: pending.length }, { key: 'reports', label: 'Reports', count: reports.length }]} 
        active={active} 
        onChange={setActive} 
      />
      
      {active === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={stats.users} Icon={Users} tint="sage" />
          <StatCard label="Total Resources" value={stats.resources} Icon={FileText} tint="slate" />
          <StatCard label="Active Reports" value={stats.reports} Icon={AlertTriangle} tint="ochre" />
        </div>
      )}

      {active === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? <p className="text-muted text-body">No pending approvals.</p> : pending.map((p: any) => (
            <div key={p.id} className="p-4 bg-surface rounded-card border border-border flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">{p.title} <StatusBadge status={p.status} /></p>
                <p className="text-meta text-secondary">{p.subject?.name} · Uploaded by {p.uploadedBy?.name}</p>
              </div>
              <div className="flex gap-2">
                <LinkButton href={`/notes/${p.id}`} variant="tertiary" size="sm">View</LinkButton>
                <Button variant="danger" size="sm" onClick={() => handleReject(p.id)}>Reject</Button>
                <Button variant="primary" size="sm" onClick={() => handleApprove(p.id)}>Approve</Button>
              </div>
            </div>
          ))}
        </div>
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

print("Batch 4 created.")
