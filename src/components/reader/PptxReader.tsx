'use client';

/**
 * PowerPoint (.pptx) reading mode — same full-viewport workspace and chrome
 * language as PdfReader (shares the `.reader` tokens), driven by the
 * pure-client `pptx-preview` library instead of pdf.js. Legacy binary .ppt
 * files are NOT supported here (they aren't a zip/OOXML container the
 * library can open) — ReaderOverlay routes those to the "can't preview"
 * fallback instead of this component.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Bookmark, BookmarkCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useBookmarks } from '@/lib/use-bookmarks';

type Props = {
  fileUrl: string;
  title: string;
  subtitle?: string;
  resourceId: string;
  initiallyBookmarked?: boolean;
  onClose: () => void;
};

const IDLE_MS = 2600;

export default function PptxReader({ fileUrl, title, subtitle, resourceId, initiallyBookmarked = false, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideBoxRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<ReturnType<typeof import('pptx-preview').init> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveringChrome = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [current, setCurrent] = useState(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { ids: bookmarkIds, ready: bookmarksReady, toggle: toggleLocalBookmark } = useBookmarks();
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [gotoOpen, setGotoOpen] = useState(false);
  const [gotoVal, setGotoVal] = useState('');

  // ── load + render ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setSlideCount(0);
    setCurrent(1);

    // The stage can report a transient, too-small size for a frame or two
    // right after mount (mid-layout, before the reader's inset/media-query
    // sizing has settled) — a single ">100px" reading isn't trustworthy.
    // Require the same width twice in a row before accepting it.
    // setTimeout, not requestAnimationFrame: rAF doesn't reliably fire while
    // this pane is backgrounded/unfocused, which would hang this forever.
    const waitForStageSize = (): Promise<{ width: number; height: number }> =>
      new Promise((resolve) => {
        let tries = 0;
        let lastWidth = -1;
        const check = () => {
          const box = stageRef.current?.getBoundingClientRect();
          const w = box?.width ?? 0;
          const h = box?.height ?? 0;
          const stable = w > 200 && h > 150 && Math.abs(w - lastWidth) < 2;
          if (stable || tries > 30) {
            resolve({ width: w > 200 ? w : 960, height: h > 150 ? h : 720 });
          } else {
            lastWidth = w;
            tries++;
            setTimeout(check, 80);
          }
        };
        check();
      });

    (async () => {
      try {
        const [{ init }, buf, box] = await Promise.all([
          import('pptx-preview'),
          fetch(fileUrl).then((r) => {
            if (!r.ok) throw new Error('fetch failed');
            return r.arrayBuffer();
          }),
          waitForStageSize(),
        ]);
        if (cancelled || !slideBoxRef.current) return;
        slideBoxRef.current.innerHTML = '';
        const previewer = init(slideBoxRef.current, {
          width: Math.max(320, Math.floor(box.width) - 64),
          height: Math.max(240, Math.floor(box.height) - 64),
          mode: 'slide',
        });
        previewerRef.current = previewer;
        await previewer.preview(buf);
        if (cancelled) return;
        setSlideCount(previewer.slideCount || 1);
        setCurrent((previewer.currentIndex ?? 0) + 1);
        setLoading(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[PptxReader] failed to render', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      previewerRef.current?.destroy?.();
      previewerRef.current = null;
    };
  }, [fileUrl, reloadKey]);

  // ── navigation ──────────────────────────────────────────────────────
  const goTo = useCallback(
    (n: number) => {
      const p = previewerRef.current;
      if (!p || !slideCount) return;
      const clamped = Math.min(Math.max(1, Math.round(n)), slideCount);
      p.renderSingleSlide(clamped - 1);
      setCurrent(clamped);
    },
    [slideCount],
  );
  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const prev = useCallback(() => goTo(current - 1), [goTo, current]);

  // ── bookmark (saved in this browser — no account, see lib/use-bookmarks) ──
  useEffect(() => {
    if (bookmarksReady) setBookmarked(bookmarkIds.includes(resourceId));
  }, [bookmarksReady, bookmarkIds, resourceId]);

  const toggleBookmark = useCallback(() => {
    setBookmarked(toggleLocalBookmark(resourceId));
  }, [toggleLocalBookmark, resourceId]);

  // ── fullscreen ──────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── chrome auto-hide ────────────────────────────────────────────────
  const wake = useCallback(() => {
    setChromeVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!hoveringChrome.current && !gotoOpen) setChromeVisible(false);
    }, IDLE_MS);
  }, [gotoOpen]);
  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [wake]);

  // ── keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === 'Escape') {
        e.preventDefault();
        if (gotoOpen) return setGotoOpen(false);
        return onClose();
      }
      if (typing) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'Home':
          e.preventDefault();
          goTo(1);
          break;
        case 'End':
          e.preventDefault();
          goTo(slideCount);
          break;
      }
      wake();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, goTo, slideCount, onClose, gotoOpen, wake]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  return (
    <div className="reader fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        ref={rootRef}
        role="document"
        aria-label={`Viewing: ${title}`}
        tabIndex={-1}
        className={cn(
          'absolute inset-0 flex flex-col overflow-hidden bg-[var(--reader-bg)] outline-none',
          'md:inset-[2.5vh_2.5vw] md:rounded-[18px] md:shadow-2xl',
        )}
        onMouseMove={wake}
        onContextMenu={onContextMenu}
      >
        {/* top bar */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 transition-opacity duration-300',
            chromeVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="pointer-events-auto max-w-[62%] rounded-full bg-[var(--reader-chrome)] px-4 py-2 text-[13px] font-medium text-[var(--reader-chrome-ink)] shadow-lg backdrop-blur-md">
            <span className="block truncate">{title}</span>
            {subtitle && (
              <span className="block truncate text-[11px] font-normal text-[var(--reader-chrome-dim)]">{subtitle}</span>
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleBookmark}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition',
                bookmarked
                  ? 'bg-[var(--reader-accent)] text-white'
                  : 'bg-[var(--reader-chrome)] text-[var(--reader-chrome-ink)] hover:bg-[var(--reader-chrome-hover)]',
              )}
            >
              {bookmarked ? <BookmarkCheck size={16} strokeWidth={2} /> : <Bookmark size={16} strokeWidth={2} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reader (Esc, or right-click the slide)"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--reader-chrome)] text-[var(--reader-chrome-ink)] shadow-lg backdrop-blur-md transition hover:bg-[var(--reader-chrome-hover)]"
            >
              <X size={17} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* stage */}
        <div ref={stageRef} className="reader-scroll flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
          {loading && (
            <div className="flex flex-col items-center gap-4 text-[var(--reader-chrome-dim)]">
              <div className="text-[13px] font-medium">Preparing your slides…</div>
              <div className="h-1.5 w-56 overflow-hidden rounded-full bg-[var(--reader-hairline)]">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--reader-accent)]" />
              </div>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <div className="text-[15px] font-semibold text-[var(--reader-chrome-ink)]">Couldn&rsquo;t open this presentation</div>
              <p className="max-w-xs text-[13px] text-[var(--reader-chrome-dim)]">
                The file could not be rendered. It may still be uploading, or the file may be damaged.
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="rounded-full bg-[var(--reader-accent)] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                >
                  Try again
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full border border-[var(--reader-hairline)] px-4 py-2 text-[13px] font-semibold text-[var(--reader-chrome-ink)] transition hover:bg-[var(--reader-chrome-hover)]"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          <div
            ref={slideBoxRef}
            onDoubleClick={next}
            className={cn(
              'overflow-hidden rounded bg-white shadow-[0_2px_18px_rgba(0,0,0,0.35)]',
              (loading || error) && 'hidden',
            )}
          />
        </div>

        {/* bottom-center floating controls */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-4 transition-all duration-300',
            chromeVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
          )}
        >
          <div
            className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--reader-hairline)] bg-[var(--reader-chrome)] px-2 py-1.5 text-[var(--reader-chrome-ink)] shadow-xl backdrop-blur-md"
            onMouseEnter={() => (hoveringChrome.current = true)}
            onMouseLeave={() => {
              hoveringChrome.current = false;
              wake();
            }}
          >
            <button
              type="button"
              onClick={prev}
              disabled={current <= 1}
              aria-label="Previous slide"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--reader-chrome-hover)] disabled:opacity-30"
            >
              <ChevronLeft size={17} strokeWidth={2} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setGotoVal(String(current));
                  setGotoOpen((v) => !v);
                }}
                className="mx-1 rounded-full px-3 py-1 text-[12px] font-semibold tabular-nums hover:bg-[var(--reader-chrome-hover)]"
              >
                {slideCount ? `${current} / ${slideCount}` : '—'}
              </button>
              {gotoOpen && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = parseInt(gotoVal, 10);
                    if (!Number.isNaN(n)) goTo(n);
                    setGotoOpen(false);
                  }}
                  className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 rounded-xl border border-[var(--reader-hairline)] bg-[var(--reader-chrome)] p-2 shadow-xl backdrop-blur-md"
                >
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={gotoVal}
                    onChange={(e) => setGotoVal(e.target.value.replace(/[^\d]/g, ''))}
                    onBlur={() => setGotoOpen(false)}
                    className="w-24 rounded-lg bg-[var(--reader-input)] px-2 py-1.5 text-center text-[13px] text-[var(--reader-chrome-ink)] outline-none"
                    placeholder={`1–${slideCount}`}
                    aria-label="Slide number"
                  />
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={next}
              disabled={current >= slideCount}
              aria-label="Next slide"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--reader-chrome-hover)] disabled:opacity-30"
            >
              <ChevronRight size={17} strokeWidth={2} />
            </button>

            <span className="mx-1 h-5 w-px bg-[var(--reader-hairline)]" />
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--reader-chrome-hover)]"
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
