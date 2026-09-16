'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, X, Pencil, ExternalLink, Copy, AlertTriangle } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { documentTypeOptions, documentTypeLabel, academicAreaLabel, EXAM_TYPES } from '@/lib/taxonomy';
import { cn } from '@/lib/cn';

type Item = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string | null;
  suggestedTitle: string | null;
  originalFilename: string | null;
  documentType: string | null;
  academicArea: string | null;
  academicYear: number | null;
  examType: string | null;
  courseCode: string | null;
  pageCount: number | null;
  classificationConfidence: number | null;
  classificationReason: string | null;
  possibleDuplicate: boolean;
  subject: { id: string; name: string; code: string } | null;
};

type Subject = { id: string; name: string; code: string };

type Draft = {
  subjectId?: string | null;
  documentType?: string | null;
  academicYear?: number | null;
  examType?: string | null;
};

const STATUSES = [
  { key: 'REVIEW_REQUIRED', label: 'Needs review' },
  { key: 'AUTO_CLASSIFIED', label: 'Auto-classified' },
  { key: 'UNCLASSIFIED', label: 'Unclassified' },
  { key: 'VERIFIED', label: 'Verified' },
];

function confidenceTone(c: number | null) {
  if (c == null) return { label: '—', cls: 'bg-surface-soft text-muted' };
  const pct = Math.round(c * 100);
  if (c >= 0.72) return { label: `${pct}%`, cls: 'bg-primary-soft text-primary-strong' };
  if (c >= 0.45) return { label: `${pct}%`, cls: 'bg-cream text-cream-ink' };
  return {
    label: `${pct}%`,
    cls: 'bg-[color:var(--tint-terracotta)] text-[color:var(--tint-terracotta-ink)]',
  };
}

export default function ReviewQueue({
  items,
  subjects,
  counts,
  activeStatus,
}: {
  items: Item[];
  subjects: Subject[];
  counts: Record<string, number>;
  activeStatus: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  function setField(id: string, patch: Draft) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function decide(item: Item, action: 'VERIFY' | 'UNCLASSIFY' | 'EDIT') {
    setBusy(item.id);
    const d = drafts[item.id] ?? {};
    const payload: Record<string, unknown> = { action };
    if (action === 'EDIT') {
      payload.subjectId = d.subjectId !== undefined ? d.subjectId : item.subject?.id ?? null;
      payload.documentType = d.documentType !== undefined ? d.documentType : item.documentType;
      payload.academicYear = d.academicYear !== undefined ? d.academicYear : item.academicYear;
      payload.examType = d.examType !== undefined ? d.examType : item.examType;
    }
    try {
      const res = await fetch(`/api/resources/${item.id}/classification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast(
        action === 'UNCLASSIFY'
          ? 'Left unclassified'
          : action === 'EDIT'
            ? 'Correction saved'
            : 'Confirmed',
        'success',
      );
      setEditing(null);
      router.refresh();
    } catch {
      toast('Could not save that decision', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs
        tabs={STATUSES.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] ?? 0 }))}
        active={activeStatus}
        onChange={(k) => router.push(`/admin/review?status=${k}`)}
      />

      {items.length === 0 ? (
        <EmptyState title="Nothing here" body="No documents are in this state." Icon={Check} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const conf = confidenceTone(item.classificationConfidence);
            const isEditing = editing === item.id;
            const d = drafts[item.id] ?? {};
            return (
              <div key={item.id} className="rounded-md border border-border bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-1 text-micro font-semibold', conf.cls)}>
                        {conf.label}
                      </span>
                      {item.possibleDuplicate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-micro font-semibold text-cream-ink">
                          <Copy size={11} /> possible duplicate
                        </span>
                      )}
                      {item.pageCount ? (
                        <span className="text-micro text-text-faint">{item.pageCount} pages</span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-body-lg font-semibold text-ink">{item.title}</p>
                    {item.originalFilename && (
                      <p className="mt-0.5 font-mono text-micro text-text-faint">{item.originalFilename}</p>
                    )}
                    {item.suggestedTitle && item.suggestedTitle !== item.title && (
                      <p className="mt-1 text-meta text-secondary">
                        suggested: <span className="font-medium text-ink">{item.suggestedTitle}</span>
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-secondary">
                      <span>{item.subject ? `${item.subject.name} (${item.subject.code})` : 'no subject'}</span>
                      <span aria-hidden className="text-border">·</span>
                      <span>{documentTypeLabel(item.documentType)}</span>
                      {item.academicArea && (
                        <>
                          <span aria-hidden className="text-border">·</span>
                          <span>{academicAreaLabel(item.academicArea)}</span>
                        </>
                      )}
                      {item.academicYear && (
                        <>
                          <span aria-hidden className="text-border">·</span>
                          <span>{item.academicYear}</span>
                        </>
                      )}
                      {item.courseCode && (
                        <>
                          <span aria-hidden className="text-border">·</span>
                          <span className="font-mono">{item.courseCode}</span>
                        </>
                      )}
                    </div>

                    {item.classificationReason && (
                      <p className="mt-2 flex items-start gap-1.5 text-meta text-muted">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        {item.classificationReason}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/notes/${item.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-button border border-border px-3 py-2 text-meta font-semibold text-secondary transition hover:border-sage-300 hover:text-ink"
                  >
                    <ExternalLink size={14} /> Open
                  </Link>
                </div>

                {isEditing && (
                  <div className="mt-4 grid gap-3 rounded-md bg-surface-soft p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-micro font-semibold text-text-faint">Subject</span>
                      <Select
                        className="w-full"
                        value={d.subjectId !== undefined ? d.subjectId ?? '' : item.subject?.id ?? ''}
                        onChange={(e) => setField(item.id, { subjectId: e.target.value || null })}
                      >
                        <option value="">— none —</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-micro font-semibold text-text-faint">Document type</span>
                      <Select
                        className="w-full"
                        value={d.documentType !== undefined ? d.documentType ?? '' : item.documentType ?? ''}
                        onChange={(e) => setField(item.id, { documentType: e.target.value || null })}
                      >
                        <option value="">— none —</option>
                        {documentTypeOptions().map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-micro font-semibold text-text-faint">Exam type</span>
                      <Select
                        className="w-full"
                        value={d.examType !== undefined ? d.examType ?? '' : item.examType ?? ''}
                        onChange={(e) => setField(item.id, { examType: e.target.value || null })}
                      >
                        <option value="">— none —</option>
                        {Object.entries(EXAM_TYPES).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-micro font-semibold text-text-faint">Year</span>
                      <input
                        type="number"
                        placeholder="e.g. 2024"
                        value={d.academicYear !== undefined ? d.academicYear ?? '' : item.academicYear ?? ''}
                        onChange={(e) =>
                          setField(item.id, { academicYear: e.target.value ? Number(e.target.value) : null })
                        }
                        className="h-10 w-full rounded-input border border-border bg-surface px-3 text-body"
                      />
                    </label>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy === item.id}
                        onClick={() => decide(item, 'EDIT')}
                      >
                        <Check size={15} /> Save correction
                      </Button>
                      <Button variant="tertiary" size="sm" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy === item.id}
                        onClick={() => decide(item, 'VERIFY')}
                      >
                        <Check size={15} /> Approve
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(item.id)}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button
                        variant="tertiary"
                        size="sm"
                        disabled={busy === item.id}
                        onClick={() => decide(item, 'UNCLASSIFY')}
                      >
                        <X size={15} /> Keep unclassified
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
