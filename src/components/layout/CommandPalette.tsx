'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, FileText, BookOpen, Clock } from 'lucide-react';
import { shortType } from '@/lib/format';

const POPULAR = ['Physics', 'Mathematics', 'Chemistry', 'IT & AI', 'PYQ', 'Syllabus', 'Mechanics'];
const LS_KEY = 'cnh-recent-searches';

type Hit = {
  id: string;
  title: string;
  type: string;
  subject?: { name: string } | null;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for global open event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-palette', handler);
    return () => window.removeEventListener('open-palette', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHits([]);
      setTimeout(() => inputRef.current?.focus(), 50);
      try { setRecent(JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')); } catch { setRecent([]); }
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&take=8`);
        const data = await res.json();
        setHits(data.results ?? data ?? []);
      } catch { /* ignore */ }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const submit = useCallback((q: string) => {
    if (!q.trim()) return;
    setOpen(false);
    // persist to recent
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
      const next = [q, ...prev.filter((r) => r !== q)].slice(0, 6);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
    router.push(`/notes?q=${encodeURIComponent(q)}`);
  }, [router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-panel border border-border bg-surface shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={17} strokeWidth={1.8} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(query); if (e.key === 'Escape') setOpen(false); }}
            placeholder="Search notes, subjects, PYQs…"
            className="flex-1 bg-transparent text-body-lg text-ink placeholder:text-muted outline-none"
          />
          <button onClick={() => setOpen(false)} aria-label="Close search">
            <X size={16} strokeWidth={1.8} className="text-muted hover:text-ink" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto thin-scroll py-1.5">
          {hits.length > 0 ? (
            hits.map((h) => (
              <button
                key={h.id}
                onClick={() => { setOpen(false); router.push(`/notes/${h.id}`); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition duration-calm ease-calm hover:bg-row-hover"
              >
                <FileText size={15} strokeWidth={1.8} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-lg font-semibold text-ink">{h.title}</span>
                  {h.subject && <span className="block truncate text-micro text-muted">{h.subject.name}</span>}
                </span>
                <span className="shrink-0 rounded-tiny bg-sage-50 px-2 py-0.5 text-micro text-sage-700">
                  {shortType(h.type)}
                </span>
              </button>
            ))
          ) : query ? (
            <p className="px-4 py-6 text-center text-body text-muted">No results</p>
          ) : (
            <div className="px-4 py-3 space-y-4">
              {recent.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-muted">
                    <Clock size={12} /> Recent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} onClick={() => submit(r)}
                        className="rounded-tiny border border-border px-2.5 py-1 text-micro text-secondary hover:border-sage-300 hover:text-ink transition duration-calm ease-calm"
                      >{r}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-muted">
                  <BookOpen size={12} /> Popular
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((p) => (
                    <button key={p} onClick={() => submit(p)}
                      className="rounded-tiny border border-border px-2.5 py-1 text-micro text-secondary hover:border-sage-300 hover:text-ink transition duration-calm ease-calm"
                    >{p}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}