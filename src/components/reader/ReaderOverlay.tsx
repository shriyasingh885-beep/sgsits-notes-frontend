'use client';

// Bridges a route (intercepted overlay or the full /notes/[id] page) to the
// right reader for the file's kind. Owns "close" = go back to wherever the
// user was, and locks body scroll while reading mode is up so the hub behind
// doesn't move (return to exactly the previous state).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
// Server Components (the route files rendering this) must import
// readerKindFor from './reader-kind' directly, not from here — a named
// export of a "use client" module becomes a client reference, not a plain
// callable function, once it reaches server code.
import type { ReaderKind } from './reader-kind';

const PdfReader = dynamic(() => import('./PdfReader'), { ssr: false });
const PptxReader = dynamic(() => import('./PptxReader'), { ssr: false });

type Props = {
  fileUrl: string;
  resourceId: string;
  title: string;
  subtitle?: string;
  kind: ReaderKind;
  initiallyBookmarked?: boolean;
  /** where to go on close when there's no history to pop (direct load) */
  fallbackHref?: string;
};

export default function ReaderOverlay({
  fileUrl,
  resourceId,
  title,
  subtitle,
  kind,
  initiallyBookmarked = false,
  fallbackHref = '/notes',
}: Props) {
  const router = useRouter();

  const close = () => {
    // Prefer popping history so the previous page (with its scroll / filters /
    // search) is restored untouched; fall back to a hard destination.
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  // PdfReader/PptxReader own their own Esc handling (help panels, fullscreen,
  // ...); only the plain image/unsupported views need one wired here.
  const needsOwnEscHandler = kind === 'image' || kind === 'unsupported';
  useEffect(() => {
    if (!needsOwnEscHandler) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsOwnEscHandler]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Tell the site-wide gesture-navigation layer to stand down — the reader
    // owns right-click/keyboard/swipe while it's open. A window event rather
    // than context because this overlay can mount outside AppShell's tree
    // (the intercepting @modal route is a sibling, not a child, of AppShell).
    window.dispatchEvent(new CustomEvent('nh:reader-lock', { detail: { locked: true } }));
    return () => {
      document.body.style.overflow = prev;
      window.dispatchEvent(new CustomEvent('nh:reader-lock', { detail: { locked: false } }));
    };
  }, []);

  if (kind === 'unsupported') {
    const isLegacyPpt = fileUrl.toLowerCase().endsWith('.ppt');
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={close}>
        <div
          className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-card-title font-semibold text-ink">Preview not available</h2>
          <p className="mt-2 text-body text-secondary">
            {isLegacyPpt
              ? 'This is an older .ppt file — only the newer .pptx format can be previewed in the browser.'
              : "This file type can't be shown in the reader."}
          </p>
          <button
            onClick={close}
            className="mt-4 inline-flex items-center gap-1.5 rounded-button border border-border px-4 py-2 text-body font-semibold text-ink hover:bg-sage-50"
          >
            <X size={15} /> Close
          </button>
        </div>
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <div
        className="reader fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
        onClick={close}
        onContextMenu={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
          <div className="rounded-full bg-[var(--reader-chrome)] px-4 py-2 text-[13px] font-medium text-[var(--reader-chrome-ink)] shadow-lg backdrop-blur-md">
            <span className="block max-w-[60vw] truncate">{title}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close (Esc, or right-click the image)"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--reader-chrome)] text-[var(--reader-chrome-ink)] shadow-lg backdrop-blur-md transition hover:bg-[var(--reader-chrome-hover)]"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={title}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88vh] max-w-full rounded shadow-2xl"
        />
      </div>
    );
  }

  if (kind === 'pptx') {
    return (
      <PptxReader
        fileUrl={fileUrl}
        resourceId={resourceId}
        title={title}
        subtitle={subtitle}
        initiallyBookmarked={initiallyBookmarked}
        onClose={close}
      />
    );
  }

  return (
    <PdfReader
      fileUrl={fileUrl}
      resourceId={resourceId}
      title={title}
      subtitle={subtitle}
      initiallyBookmarked={initiallyBookmarked}
      onClose={close}
    />
  );
}
