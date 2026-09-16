'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, MousePointerClick, Hand, Keyboard, X, Home } from 'lucide-react';
import { useNav } from './NavContext';
import { cn } from '@/lib/cn';

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  return touch;
}

// ── Floating Back / Context / Forward pill ─────────────────────────────────
export function NavPill() {
  const nav = useNav();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);
  if (!nav || nav.locked) return null;

  return (
    <div
      className={cn(
        'fixed bottom-[82px] md:bottom-6 left-1/2 -translate-x-1/2 z-40',
        'transition-all duration-300 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
    >
      <div className="flex items-center gap-0.5 rounded-full border border-border bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] backdrop-blur-md px-1.5 py-1.5 shadow-pop">
        <button
          type="button"
          onClick={nav.back}
          disabled={!nav.canGoBack}
          aria-label="Go back"
          className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition duration-calm ease-calm hover:bg-sage-50 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={17} strokeWidth={2} />
        </button>
        <span className="px-2.5 text-meta font-semibold text-ink whitespace-nowrap max-w-[160px] truncate">
          {nav.label}
        </span>
        <button
          type="button"
          onClick={nav.forward}
          disabled={!nav.canGoForward}
          aria-label="Go forward"
          className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition duration-calm ease-calm hover:bg-sage-50 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ── Transient "it worked" feedback ──────────────────────────────────────────
export function NavFeedback() {
  const nav = useNav();
  if (!nav || !nav.feedback || nav.locked) return null;
  const { dir } = nav.feedback;
  const Icon = dir === 'back' ? ChevronLeft : dir === 'forward' ? ChevronRight : Home;
  const text = dir === 'back' ? 'Back' : dir === 'forward' ? 'Forward' : 'Home';
  return (
    <div
      key={nav.feedback.key}
      className="pointer-events-none fixed bottom-[136px] md:bottom-[76px] left-1/2 z-40 -translate-x-1/2 nav-feedback-pop"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--sage-800)] px-3 py-1.5 text-micro font-semibold text-white shadow-pop">
        <Icon size={13} strokeWidth={2.4} />
        {text}
      </div>
    </div>
  );
}

// ── Keyboard shortcut help panel (?) ────────────────────────────────────────
export function NavHelpPanel() {
  const nav = useNav();
  if (!nav || !nav.helpOpen) return null;
  const rows: [React.ReactNode, string][] = [
    ['Right-click', 'Back'],
    [<ChevronLeft key="l" size={14} strokeWidth={2.4} />, 'Back'],
    [<ChevronRight key="r" size={14} strokeWidth={2.4} />, 'Forward'],
    ['H', 'Home'],
    ['Swipe right', 'Back (touch)'],
    ['Swipe left', 'Forward (touch)'],
    ['Mouse side buttons', 'Back / Forward'],
    ['Esc', 'Close this panel'],
  ];
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
      onClick={() => nav.setHelpOpen(false)}
    >
      <div
        className="w-full max-w-xs rounded-panel border border-border bg-surface p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Navigation shortcuts"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-card-title font-semibold text-ink">
            <Keyboard size={16} strokeWidth={1.8} /> Navigation
          </h2>
          <button
            onClick={() => nav.setHelpOpen(false)}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-tiny text-muted hover:bg-sage-50 hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>
        <dl className="space-y-1.5">
          {rows.map(([k, v], i) => (
            <div key={i} className="flex items-center justify-between gap-4 text-meta">
              <dt className="flex items-center font-mono text-secondary">{k}</dt>
              <dd className="text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ── Persistent, quiet reminder (home page only, after intro is dismissed) ──
export function NavReminder() {
  const nav = useNav();
  const isTouch = useIsTouch();
  const pathname = usePathname();
  const [faded, setFaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    setFaded(false);
    const t1 = setTimeout(() => setVisible(true), 400);
    const t2 = setTimeout(() => setFaded(true), 5200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  // Home only — the reference behaviour this preserves.
  if (pathname !== '/') return null;
  if (!nav || !nav.introSeen || nav.locked) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed right-4 top-[64px] md:top-[72px] z-30',
        'transition-all duration-500 ease-out',
        visible ? (faded ? 'opacity-55' : 'opacity-100') : 'opacity-0 -translate-y-1',
      )}
    >
      <div className="flex items-center gap-1.5 rounded-full border border-sage-200 bg-[color-mix(in_srgb,var(--sage-50)_90%,transparent)] backdrop-blur-sm px-3 py-1.5 text-micro font-medium text-sage-800 shadow-card">
        {isTouch ? <Hand size={12} strokeWidth={2} /> : <MousePointerClick size={12} strokeWidth={2} />}
        {isTouch ? 'Swipe to navigate' : 'Right-click to go back'}
      </div>
    </div>
  );
}

// ── One-time intro ───────────────────────────────────────────────────────
export function NavIntro() {
  const nav = useNav();
  const isTouch = useIsTouch();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!nav || nav.introSeen) return;
    const timers = [1, 2, 3, 4, 5, 6].map((s, i) => setTimeout(() => setStage(s), 150 + i * 260));
    return () => timers.forEach(clearTimeout);
  }, [nav?.introSeen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!nav || nav.introSeen) return null;

  const step = (n: number) => (stage >= n ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2');

  const tryItNow = (e: React.MouseEvent) => {
    e.preventDefault();
    nav.dismissIntro();
    if (nav.canGoBack) nav.back();
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--sage-800)_35%,transparent)] backdrop-blur-[6px] p-5',
        'transition-opacity duration-400',
        stage >= 1 ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="w-full max-w-[380px] rounded-shell border border-sage-100 bg-surface p-7 text-center shadow-pop">
        <div className={cn('transition-all duration-300', step(1))}>
          <h2 className="font-heading text-[19px] tracking-[-0.01em] text-ink">
            {isTouch ? 'Navigate with Swipes' : 'Navigate with Your Mouse'}
          </h2>
          <p className="mt-1 text-meta text-muted">
            {isTouch ? 'One swipe. Two directions.' : 'One click. Zero friction.'}
          </p>
        </div>

        <div className={cn('mx-auto my-6 flex justify-center transition-all duration-400', step(2))}>
          {isTouch ? <SwipeGlyph active={stage >= 3} /> : <MouseGlyph active={stage >= 3} />}
        </div>

        <div className={cn('transition-all duration-300', step(4))}>
          <p className="text-body-lg font-semibold text-ink">
            {isTouch ? 'Swipe right to go back' : 'Right-click to go back'}
          </p>
        </div>
        <div className={cn('mt-1 transition-all duration-300', step(5))}>
          <p className="text-meta text-secondary">
            {isTouch
              ? 'Swipe left to go forward again.'
              : "It works almost anywhere on the page — no back button to hunt for."}
          </p>
        </div>

        <div className={cn('mt-5 flex items-center justify-center gap-2 transition-all duration-300', step(5))}>
          {!isTouch && (
            <>
              <Chip>
                <ChevronLeft size={12} strokeWidth={2.6} /> Back
              </Chip>
              <Chip>
                <ChevronRight size={12} strokeWidth={2.6} /> Forward
              </Chip>
              <Chip>H Home</Chip>
            </>
          )}
        </div>

        <div className={cn('mt-6 transition-all duration-300', step(6))}>
          {!isTouch ? (
            <button
              onClick={tryItNow}
              onContextMenu={tryItNow}
              className="w-full rounded-button bg-sage-600 px-4 py-2.5 text-body-lg font-semibold text-white transition duration-calm ease-calm hover:bg-sage-700 nav-try-pulse"
            >
              Try it now — right-click me
            </button>
          ) : (
            <button
              onClick={nav.dismissIntro}
              className="w-full rounded-button bg-sage-600 px-4 py-2.5 text-body-lg font-semibold text-white transition duration-calm ease-calm hover:bg-sage-700"
            >
              Got it
            </button>
          )}
          <button
            onClick={nav.dismissIntro}
            className="mt-3 text-micro font-medium text-muted transition hover:text-secondary"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-micro font-semibold text-secondary">
      {children}
    </span>
  );
}

function MouseGlyph({ active }: { active: boolean }) {
  return (
    <div className="relative">
      <svg width="72" height="96" viewBox="0 0 72 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="64" height="88" rx="32" stroke="var(--sage-300)" strokeWidth="3" />
        <line x1="36" y1="4" x2="36" y2="40" stroke="var(--sage-200)" strokeWidth="2" />
        <path
          d="M36 6 L68 6 A32 32 0 0 1 68 40 L36 40 Z"
          fill={active ? 'var(--sage-500)' : 'var(--sage-100)'}
          className="transition-colors duration-500"
        />
        <circle cx="36" cy="20" r="3" fill="var(--white)" className={cn('transition-opacity duration-300', active ? 'opacity-100' : 'opacity-0')} />
      </svg>
      <div
        className={cn(
          'absolute -right-9 top-3 text-sage-600 transition-all duration-500',
          active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1',
        )}
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="nav-glyph-arrow">
          <path d="M17 7 L7 17 M7 17 L7 9 M7 17 L15 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function SwipeGlyph({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-24 w-40 items-center justify-center rounded-panel border border-sage-100 bg-sage-50">
      <div className={cn('nav-glyph-swipe text-sage-600', active ? 'opacity-100' : 'opacity-0')} aria-hidden>
        <Hand size={26} strokeWidth={1.8} />
      </div>
      <svg
        className={cn('absolute left-6 transition-opacity duration-300', active ? 'opacity-100' : 'opacity-0')}
        width="20"
        height="16"
        viewBox="0 0 24 16"
        fill="none"
      >
        <path d="M2 8h18M14 2l6 6-6 6" stroke="var(--sage-400)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
