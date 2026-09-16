'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadDropzone from '@/components/ui/UploadDropzone';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';

// Kept deliberately narrow to what students actually upload — matches the
// site's own Notes / Class Slides / PYQ (MST & End-Semester) tabs exactly,
// so nothing anyone submits can land somewhere confusing. MST and
// End-Semester both save as the same PYQ type (that's all the schema
// needs) — the option just seeds the title so it auto-sorts into the right
// PYQ sub-section like every other paper on the site.
const TYPE_OPTIONS = [
  { value: 'NOTES', label: 'Notes' },
  { value: 'SLIDES', label: 'Class Slides' },
  { value: 'PYQ_MST', label: 'PYQ — MST', dbType: 'PYQ', titleHint: 'MST' },
  { value: 'PYQ_ENDSEM', label: 'PYQ — End-Semester', dbType: 'PYQ', titleHint: 'End-Semester' },
];
const PYQ_LIKE_TYPES = new Set(['PYQ_MST', 'PYQ_ENDSEM']);

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear + 1 - i);

export default function UploadForm({ subjects }: { subjects: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [type, setType] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [title, setTitle] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const yearRequired = PYQ_LIKE_TYPES.has(type);
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const units: any[] = selectedSubject?.units ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) return setError('Choose a file to upload.');
    if (!subjectId) return setError('Select a subject.');
    if (!type) return setError('Select a resource type.');
    if (!title.trim()) return setError('Enter a title.');
    if (yearRequired && !academicYear) {
      return setError('Enter the exam year — required for PYQs / question banks so search-by-year works.');
    }

    const typeOption = TYPE_OPTIONS.find((t) => t.value === type);
    const dbType = typeOption?.dbType ?? type;
    // If the title doesn't already say MST/End-Semester, seed it — that's
    // the exact signal SubjectTabs uses to sort a PYQ into the right
    // sub-section, so this keeps every upload consistent automatically.
    let finalTitle = title.trim();
    if (typeOption?.titleHint && !/\bmst\b|end[\s-]?sem/i.test(finalTitle)) {
      finalTitle = `${finalTitle} — ${typeOption.titleHint}`;
    }

    const formData = new FormData();
    formData.set('file', file);
    formData.set('title', finalTitle);
    formData.set('subjectId', subjectId);
    formData.set('type', dbType);
    if (academicYear) formData.set('academicYear', academicYear);
    if (unitNumber) formData.set('unitNumber', unitNumber);
    formData.set('uploaderName', uploaderName.trim() || 'Anonymous');

    setSubmitting(true);
    try {
      const res = await fetch('/api/resources', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Upload failed — please try again.');
        return;
      }
      toast('Uploaded — live on the site now', 'success');
      setFile(null);
      setSubjectId('');
      setUnitNumber('');
      setType('');
      setAcademicYear('');
      setTitle('');
      router.push('/uploads');
      router.refresh();
    } catch {
      setError('Upload failed — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto border-border">
      <form onSubmit={handleSubmit} className="space-y-6">
        <UploadDropzone file={file} onChange={setFile} />

        <div>
          <label className="block text-meta font-medium mb-1">Your name</label>
          <input
            type="text"
            name="uploaderName"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="e.g. Viral Sharma"
            className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none"
          />
          <p className="mt-1.5 text-micro text-muted">
            SGSITS NotesVault has no accounts — the name you enter here is shown publicly as the
            uploader on anything you submit.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-meta font-medium mb-1">
              Subject <span className="text-danger">*</span>
            </label>
            <Select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setUnitNumber('');
              }}
              required
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-meta font-medium mb-1">
              Type <span className="text-danger">*</span>
            </label>
            <Select value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="">Select type</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {units.length > 0 && (
          <div>
            <label className="block text-meta font-medium mb-1">Unit / Chapter</label>
            <Select value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)}>
              <option value="">Not sure / covers multiple units</option>
              {units.map((u: any) => (
                <option key={u.number} value={u.number}>
                  Unit {u.number} — {u.title}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-micro text-muted">
              Optional, but picking the right chapter means students find this instantly instead of digging through "Other".
            </p>
          </div>
        )}

        {yearRequired && (
          <div>
            <label className="block text-meta font-medium mb-1">
              Exam year <span className="text-danger">*</span>
            </label>
            <Select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required>
              <option value="">Select year</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-micro text-muted">
              Required for PYQs and question banks — without it, students searching by year won't find this paper.
            </p>
          </div>
        )}

        <div>
          <label className="block text-meta font-medium mb-1">
            Title <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Applied Physics — MST 2 Question Paper"
            className="w-full h-10 px-3 rounded-input border border-border bg-surface text-body focus:ring-2 focus:ring-sage-500 outline-none"
            required
          />
        </div>

        {error && <p className="text-meta text-danger">{error}</p>}

        <Button variant="primary" size="lg" className="w-full justify-center" disabled={submitting}>
          {submitting ? 'Uploading…' : 'Submit Upload'}
        </Button>
      </form>
    </Card>
  );
}
