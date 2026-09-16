import os

base_dir = r"C:\Users\HP\notes-hub\src"

files = {
    r"app\pyq\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import PYQBrowser from '@/components/PYQBrowser';

export const dynamic = 'force-dynamic';

export default async function PYQPage() {
  const pyqs = await prisma.resource.findMany({
    where: { status: 'APPROVED', type: 'PYQ' },
    include: { subject: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Previous Year Questions" subtitle="Past exam papers organized by year" />
      <PYQBrowser pyqs={pyqs as any[]} />
    </div>
  );
}
""",
    r"components\PYQBrowser.tsx": """'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { parseExamYear } from '@/lib/format';
import Link from 'next/link';

export default function PYQBrowser({ pyqs }: { pyqs: any[] }) {
  const subjects = Array.from(new Set(pyqs.map(p => p.subject.name))).sort();
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  const toggleSubject = (s: string) => {
    const next = new Set(selectedSubjects);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelectedSubjects(next);
  };

  const filtered = selectedSubjects.size > 0 ? pyqs.filter(p => selectedSubjects.has(p.subject.name)) : pyqs;

  const byYear = filtered.reduce((acc, p) => {
    const year = parseExamYear(p.title, p.tags) || 'Compilations & undated';
    if (!acc[year]) acc[year] = [];
    acc[year].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  const years = Object.keys(byYear).sort().reverse();

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-64 shrink-0 space-y-4">
        <h3 className="font-semibold text-card-title text-ink">Filter by Subject</h3>
        <div className="flex flex-wrap md:flex-col gap-2">
          {subjects.map(s => (
            <button key={s} onClick={() => toggleSubject(s)} className={`text-left px-3 py-1.5 rounded-button text-body transition-colors ${selectedSubjects.has(s) ? 'bg-sage-600 text-white' : 'bg-surface border border-border text-secondary hover:text-ink'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {years.map(year => (
          <div key={year} className="space-y-4">
            <h2 className="text-xl font-heading text-ink">{year}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byYear[year].map(p => (
                <Link key={p.id} href={`/notes/${p.id}`}>
                  <Card hover className="p-4 h-full flex flex-col justify-center">
                    <p className="text-meta text-sage-600 font-semibold mb-1">{p.subject.name}</p>
                    <p className="text-card-title font-medium text-ink">{p.title}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
""",
    r"app\schedule\page.tsx": """import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import ScheduleView from '@/components/ScheduleView';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  
  const events = await prisma.studyEvent.findMany({
    where: { OR: [{ userId: null }, { userId: session?.user?.id ?? '' }] },
    orderBy: { date: 'asc' }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" subtitle="Your academic calendar" />
      <ScheduleView events={events as any[]} isLoggedIn={!!session?.user} />
    </div>
  );
}
""",
    r"components\ScheduleView.tsx": """'use client';

import { useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { formatEventDate } from '@/lib/format';

export default function ScheduleView({ events, isLoggedIn }: { events: any[], isLoggedIn: boolean }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const monthEvents = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between bg-surface p-4 rounded-panel border border-border">
        <IconButton icon={ChevronLeft} onClick={prevMonth} aria-label="Previous month" />
        <h2 className="text-card-title font-semibold text-ink">
          {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
        </h2>
        <IconButton icon={ChevronRight} onClick={nextMonth} aria-label="Next month" />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-meta font-semibold text-muted py-2">{d}</div>
        ))}
        {blanks.map(b => <div key={`blank-${b}`} />)}
        {days.map(d => {
          const hasEvent = monthEvents.some(e => new Date(e.date).getDate() === d);
          return (
            <div key={d} className={`aspect-square flex items-center justify-center rounded-button text-body ${hasEvent ? 'bg-sage-100 text-sage-900 font-bold' : 'text-secondary bg-surface border border-border-light'}`}>
              {d}
            </div>
          );
        })}
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-card-title font-semibold text-ink">Events this month</h3>
          {isLoggedIn && <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add Reminder</Button>}
        </div>
        
        {monthEvents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {monthEvents.map(e => (
              <div key={e.id} className={`p-4 rounded-card border flex items-center justify-between ${e.kind === 'EXAM' ? 'bg-sage-50 border-sage-100' : e.kind === 'ASSIGNMENT' ? 'bg-ochre-50 border-ochre-100' : 'bg-lavender-50 border-lavender-100'}`}>
                <div>
                  <p className="font-semibold text-ink">{e.title}</p>
                  <p className="text-meta text-secondary">{formatEventDate(e.date)}</p>
                </div>
                <div className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded bg-white/50">{e.kind}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted flex flex-col items-center gap-2">
            <CalendarDays size={24} />
            <p>No events scheduled for this month.</p>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Reminder">
        <div className="p-4 space-y-4">
          <input type="text" placeholder="Event title" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body" />
          <input type="date" className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body" />
          <select className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body">
            <option value="REMINDER">Reminder</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="EXAM">Exam</option>
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setAddOpen(false)}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
""",
    r"app\settings\page.tsx": """import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import SettingsPanel from '@/components/SettingsPanel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [colleges, branches, semesters] = await Promise.all([
    prisma.college.findMany(),
    prisma.branch.findMany(),
    prisma.semester.findMany()
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <SettingsPanel user={session.user as any} colleges={colleges} branches={branches} semesters={semesters} />
    </div>
  );
}
""",
    r"components\SettingsPanel.tsx": """'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import Select from '@/components/ui/Select';

export default function SettingsPanel({ user, colleges, branches, semesters }: any) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('account');
  const [density, setDensity] = useState('comfortable');

  const tabs = [
    { key: 'account', label: 'Account' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'data', label: 'Data' },
  ];

  const handleSave = () => toast('Settings saved successfully', 'success');

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      
      {activeTab === 'account' && (
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-meta font-medium mb-1">Name</label>
            <input type="text" defaultValue={user.name} className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body" />
          </div>
          <div>
            <label className="block text-meta font-medium mb-1">College</label>
            <Select><option>Select College</option>{colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </div>
          <div>
            <label className="block text-meta font-medium mb-1">Branch</label>
            <Select><option>Select Branch</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
          </div>
          <div>
            <label className="block text-meta font-medium mb-1">Semester</label>
            <Select><option>Select Semester</option>{semesters.map((s: any) => <option key={s.id} value={s.id}>Semester {s.number}</option>)}</Select>
          </div>
          <Button variant="primary" onClick={handleSave}>Save changes</Button>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="max-w-md space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-card">
            <div>
              <p className="font-medium text-ink">Density</p>
              <p className="text-meta text-secondary">Adjust the spacing of UI elements</p>
            </div>
            <Select value={density} onChange={e => setDensity(e.target.value)}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </Select>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-card">
            <div>
              <p className="font-medium text-ink">Reduced Motion</p>
              <p className="text-meta text-secondary">Disable non-essential animations</p>
            </div>
            <input type="checkbox" className="w-5 h-5 rounded text-sage-600" />
          </div>
        </div>
      )}

      {['notifications', 'privacy', 'data'].includes(activeTab) && (
        <div className="p-8 text-center border border-border rounded-card bg-surface opacity-50 cursor-not-allowed">
          <p className="text-body font-medium text-ink">These features are coming soon.</p>
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

print("Batch 3 created.")
