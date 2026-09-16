'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Tabs from '@/components/ui/Tabs';
import StatCard from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Users, FileStack, Download, Eye, Clock, Flag } from 'lucide-react';

type Pending = {
  id: string;
  title: string;
  type: string;
  subject: { name: string };
  uploadedBy: { name: string };
};

type ReportItem = {
  id: string;
  reason: string;
  details: string | null;
  resource: { id: string; title: string };
  user: { name: string };
};

type CollegeTree = {
  id: string;
  name: string;
  city: string;
  semesters: {
    id: string;
    year: number;
    number: number;
    branch: { name: string } | null;
    subjects: { id: string; name: string; code: string }[];
  }[];
};

const YEAR_LABELS: Record<number, string> = { 1: 'First Year', 2: 'Second Year', 3: 'Third Year', 4: 'Fourth Year' };

const ADMIN_TABS = [
  { key: 'Overview', label: 'Overview' },
  { key: 'Pending Approvals', label: 'Pending Approvals' },
  { key: 'Reports', label: 'Reports' },
  { key: 'Colleges', label: 'Colleges' },
] as const;

export default function AdminPanel({
  stats,
  pending,
  reports,
  colleges,
}: {
  stats: {
    totalUsers: number;
    totalResources: number;
    totalDownloads: number;
    totalViews: number;
    pendingCount: number;
    reportsCount: number;
  };
  pending: Pending[];
  reports: ReportItem[];
  colleges: CollegeTree[];
}) {
  const [tab, setTab] = useState<string>('Overview');
  const router = useRouter();

  async function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    await fetch(`/api/admin/resources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function resolve(id: string) {
    await fetch(`/api/admin/reports/${id}`, { method: 'PATCH' });
    router.refresh();
  }

  const tabs = ADMIN_TABS.map((t) => ({
    key: t.key,
    label: t.label,
    count:
      t.key === 'Pending Approvals' && stats.pendingCount > 0
        ? stats.pendingCount
        : t.key === 'Reports' && stats.reportsCount > 0
        ? stats.reportsCount
        : undefined,
  }));

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} Icon={Users} tint="sage" />
          <StatCard label="Total Resources" value={stats.totalResources} Icon={FileStack} tint="slate" />
          <StatCard label="Total Downloads" value={stats.totalDownloads} Icon={Download} tint="ochre" />
          <StatCard label="Total Views" value={stats.totalViews} Icon={Eye} tint="lavender" />
          <StatCard label="Pending Approvals" value={stats.pendingCount} Icon={Clock} tint="ochre" />
          <StatCard label="Open Reports" value={stats.reportsCount} Icon={Flag} tint="terracotta" />
        </div>
      )}

      {tab === 'Pending Approvals' && (
        <div className="space-y-3">
          {pending.length === 0 && <p className="text-body text-muted">No resources awaiting review.</p>}
          {pending.map((r) => (
            <div key={r.id} className="rounded-card border border-border bg-surface p-4 shadow-card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link href={`/notes/${r.id}`} className="font-semibold text-body-lg text-ink hover:underline">
                  {r.title}
                </Link>
                <p className="text-meta text-muted mt-0.5">
                  {r.subject.name} · {r.type.replace(/_/g, ' ')} · by {r.uploadedBy.name}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="primary" onClick={() => decide(r.id, 'APPROVED')}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => decide(r.id, 'REJECTED')}>Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Reports' && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-body text-muted">No open reports.</p>}
          {reports.map((r) => (
            <div key={r.id} className="rounded-card border border-border bg-surface p-4 shadow-card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link href={`/notes/${r.resource.id}`} className="font-semibold text-body-lg text-ink hover:underline">
                  {r.resource.title}
                </Link>
                <p className="text-meta text-muted mt-0.5">
                  {r.reason} · reported by {r.user.name}
                  {r.details ? ` — ${r.details}` : ''}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => resolve(r.id)}>Mark Resolved</Button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Colleges' && (
        <div className="space-y-6">
          <p className="text-meta text-muted">Read-only view of the college/year/semester/subject hierarchy.</p>
          {colleges.map((c) => (
            <div key={c.id} className="rounded-card border border-border bg-surface p-4 shadow-card">
              <p className="font-semibold text-body-lg text-ink mb-2">
                {c.name} <span className="text-muted font-normal">· {c.city}</span>
              </p>
              {c.semesters.map((s) => (
                <p key={s.id} className="ml-4 text-meta text-muted">
                  {YEAR_LABELS[s.year]} · {s.branch ? s.branch.name : 'Common to All Branches'} · Sem {s.number}:{' '}
                  {s.subjects.map((sub) => sub.code).join(', ') || 'no subjects'}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
