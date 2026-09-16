'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, FileDown } from 'lucide-react';
import { formatEventDate } from '@/lib/format';
import { cn } from '@/lib/cn';

const KIND_STYLE: Record<string, string> = {
  EXAM: 'bg-[color:var(--tint-terracotta)] border-transparent text-[color:var(--tint-terracotta-ink)]',
  ASSIGNMENT: 'bg-cream border-transparent text-cream-ink',
  REMINDER: 'bg-[color:var(--tint-lavender)] border-transparent text-[color:var(--tint-lavender-ink)]',
};

const CALENDAR_PDF_URL = 'https://fr0cg5ys41r4psru.public.blob.vercel-storage.com/schedule/academic-calendar-2026-27-semA.pdf';

export default function ScheduleView({ events, isLoggedIn }: { events: any[]; isLoggedIn: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', kind: 'REMINDER' });

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const monthEvents = events.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  // Side panel — matches the reference calendar's "DAYS" / "HOLIDAYS" info block.
  const holidaysThisMonth = monthEvents
    .filter((e) => e.title.startsWith('Holiday'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nonHolidayOffDays = days.filter((d) => {
    const dow = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).getDay();
    return dow === 0 || dow === 6;
  }).length;
  const classDays = daysInMonth - nonHolidayOffDays - holidaysThisMonth.length;

  async function handleAdd() {
    if (!form.title.trim() || !form.date) {
      toast('Title and date are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast('Reminder added', 'success');
      setAddOpen(false);
      setForm({ title: '', date: '', kind: 'REMINDER' });
      router.refresh();
    } catch {
      toast('Could not add reminder', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast('Removed', 'success');
      router.refresh();
    } catch {
      toast('Could not remove this event', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <a
        href={CALENDAR_PDF_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 rounded-md border border-sage-100 bg-primary-soft p-4 shadow-sm transition duration-calm ease-calm hover:border-sage-300"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-surface text-sage-700 shadow-sm">
            <FileDown size={17} strokeWidth={1.9} />
          </span>
          <div>
            <p className="text-body font-semibold text-primary-strong">Official Academic Calendar</p>
            <p className="text-meta text-sage-700">Semester A (July–Dec 2026) — SGSITS, PDF</p>
          </div>
        </div>
        <span className="text-meta font-semibold text-sage-700">Download</span>
      </a>

      <div className="flex items-center justify-between rounded-md border border-border bg-surface p-4 shadow-sm">
        <IconButton icon={<ChevronLeft size={16} />} onClick={prevMonth} label="Previous month" />
        <div className="flex items-center gap-2.5">
          <h2 className="text-card-title font-semibold text-ink">
            {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
          </h2>
        </div>
        <IconButton icon={<ChevronRight size={16} />} onClick={nextMonth} label="Next month" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-meta text-secondary">
        <span className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', 'bg-[color:var(--tint-terracotta)]')} /> Exam
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cream" /> Assignment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--tint-lavender)]" /> Holiday / Reminder
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
        <div className="overflow-hidden rounded-md border border-border shadow-sm">
          <div className="grid grid-cols-7 border-b border-border bg-surface-soft">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                <span className="sm:hidden">{d.slice(0, 3)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 [&>div]:border-r [&>div]:border-b [&>div:nth-child(7n)]:border-r-0 border-border">
            {blanks.map((b) => (
              <div key={`blank-${b}`} className="min-h-[64px] bg-surface-soft/40 sm:min-h-[92px]" />
            ))}
            {days.map((d) => {
              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
              const dow = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
              const dayEvents = monthEvents.filter((e) => new Date(e.date).getDate() === d);
              const primary = dayEvents[0];
              const isWeekend = dow === 0 || dow === 6;
              const weekendLabel = dow === 0 ? 'Sunday' : dow === 6 ? 'Saturday' : null;

              const tint = primary ? KIND_STYLE[primary.kind] ?? KIND_STYLE.REMINDER : isWeekend ? 'bg-surface-soft text-text-faint' : 'bg-surface';

              return (
                <div key={d} className={cn('min-h-[64px] p-1.5 sm:min-h-[92px] sm:p-2', tint)}>
                  <div className="text-right text-[11px] font-semibold sm:text-body">{d}</div>
                  {(primary || weekendLabel) && (
                    <div className="mt-1 truncate text-left text-[10px] font-medium leading-tight sm:text-meta" title={primary?.title ?? weekendLabel ?? undefined}>
                      {primary ? primary.title : weekendLabel}
                    </div>
                  )}
                  {dayEvents.length > 1 && (
                    <div className="text-left text-[10px] text-text-faint">+{dayEvents.length - 1} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side info panel — Days / Holidays, matching the reference calendar */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-md border border-border shadow-sm">
            <div className="bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
              Days
            </div>
            <div className="p-3 text-body font-semibold text-ink">
              Class — {Math.max(classDays, 0)} Days
            </div>
          </div>
          <div className="overflow-hidden rounded-md border border-border shadow-sm">
            <div className="bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
              Holidays
            </div>
            <div className="space-y-1.5 p-3">
              {holidaysThisMonth.length > 0 ? (
                holidaysThisMonth.map((h) => (
                  <div key={h.id} className="text-meta text-secondary">
                    {new Date(h.date).getDate()} — {h.title.replace(/^Holiday\s*—?\s*/, '') || 'Holiday'}
                  </div>
                ))
              ) : (
                <div className="text-meta text-text-faint">None</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-card-title font-semibold text-ink">Events this month</h3>
          {isLoggedIn && (
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add reminder
            </Button>
          )}
        </div>

        {monthEvents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {monthEvents.map((e) => (
              <div
                key={e.id}
                className={cn('flex items-center justify-between rounded-md border p-4 shadow-sm', KIND_STYLE[e.kind] ?? KIND_STYLE.REMINDER)}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{e.title}</p>
                  <p className="text-meta text-secondary">{formatEventDate(e.date)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--white)_60%,transparent)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                    {e.kind}
                  </span>
                  {isLoggedIn && e.userId && (
                    <button
                      onClick={() => handleDelete(e.id)}
                      aria-label="Delete event"
                      className="rounded-tiny p-1.5 text-secondary transition hover:bg-[color-mix(in_srgb,var(--white)_60%,transparent)] hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-10 text-center text-muted">
            <CalendarDays size={22} />
            <p>No events scheduled for this month.</p>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add reminder">
        <div className="space-y-4 p-4">
          <input
            type="text"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="h-10 w-full rounded-input border border-border bg-surface px-3 text-body"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="h-10 w-full rounded-input border border-border bg-surface px-3 text-body"
          />
          <select
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            className="h-10 w-full rounded-input border border-border bg-surface px-3 text-body"
          >
            <option value="REMINDER">Reminder</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="EXAM">Exam</option>
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
