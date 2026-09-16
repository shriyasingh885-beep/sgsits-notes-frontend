'use client';

/**
 * Notes Hub reading mode.
 *
 * A full-viewport document workspace built on react-pdf / pdf.js — not a modal
 * with a PDF in it. Continuous vertical scroll, virtualized pages, contextual
 * floating controls that fade when idle, smart initial zoom, rotation at the
 * render layer, a toggleable thumbnail rail, keyboard + mouse + touch
 * navigation, right-click / Esc to exit, and per-document position memory.
 *
 * The surrounding site keeps the sage aesthetic; this component only borrows
 * the same tokens at full scale (see the `.reader` block in globals.css).
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Document, Page, Thumbnail } from 'react-pdf';
import {
  Minus,
  Plus,
  RotateCw,
  Maximize2,
  Minimize2,
  PanelLeft,
  Keyboard,
  X,
  ScanLine,
  MoveHorizontal,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
} from 'lucide-react';
import { PDF_OPTIONS } from './pdf-setup';
import { cn } from '@/lib/cn';
import { loadPosition, savePosition, type FitMode } from './reader-state';
import { useBookmarks } from '@/lib/use-bookmarks';

const IDLE_MS = 2600;
const GUTTER = 48; // px of breathing room around a page at fit-width
const OVERSCAN_SCREENS = 1.5;
const ZOOM_STEP = 1.2;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 6;

type Props = {
  fileUrl: string;
  title: string;
  subtitle?: string;
  resourceId: string;
  initiallyBookmarked?: boolean;
  onClose: () => void;
};

type Size = { width: number; height: number };

export default function PdfReader({
  fileUrl,
  title,
  subtitle,
  resourceId,
  initiallyBookmarked = false,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<Map<number, HTMLElement>>(new Map());
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveringChrome = useRef(false);
  const restored = useRef(false);
  const programmaticScroll = useRef(false);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadPct, setLoadPct] = useState(0);

  const [page, setPage] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [zoom, setZoom] = useState(1); // multiplier vs. fit-width, used when fitMode === 'custom'

  const [pageAspect, setPageAspect] = useState<Record<number, number>>({}); // h / w at rotation 0
  const [baseWidthPt, setBaseWidthPt] = useState<number | null>(null); // page-1 width in PDF points
  const [container, setContainer] = useState<Size>({ width: 0, height: 0 });
  const [visible, setVisible] = useState<Set<number>>(() => new Set([1, 2]));

  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gotoOpen, setGotoOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { ids: bookmarkIds, ready: bookmarksReady, toggle: toggleLocalBookmark } = useBookmarks();
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);

  // The saved list only exists in the browser, so it can't be known until
  // after mount — adopt it as soon as it's read.
  useEffect(() => {
    if (bookmarksReady) setBookmarked(bookmarkIds.includes(resourceId));
  }, [bookmarksReady, bookmarkIds, resourceId]);

  const rotated90 = rotation % 180 !== 0;
  const file = useMemo(() => fileUrl, [fileUrl]);

  // ── measure the reading area ──────────────────────────────────────────
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainer({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setContainer({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, [numPages]);

  // aspect (h/w) to use for a page slot, accounting for rotation
  const aspectFor = useCallback(
    (n: number) => {
      const a = pageAspect[n] ?? pageAspect[1] ?? 1.414; // A4-ish until we know
      return rotated90 ? 1 / a : a;
    },
    [pageAspect, rotated90],
  );

  // fit-width / fit-page render widths in CSS px
  const fitWidthPx = Math.max(120, container.width - GUTTER);
  const fitPagePx = useMemo(() => {
    const a = aspectFor(page);
    const byHeight = (container.height - GUTTER) / a;
    return Math.max(120, Math.min(fitWidthPx, byHeight));
  }, [aspectFor, page, container.height, fitWidthPx]);

  const renderWidth = useMemo(() => {
    if (fitMode === 'width') return fitWidthPx;
    if (fitMode === 'page') return fitPagePx;
    return Math.min(Math.max(fitWidthPx * zoom, 120), fitWidthPx * ZOOM_MAX);
  }, [fitMode, fitWidthPx, fitPagePx, zoom]);

  // real zoom % relative to the document's native size
  const zoomPct = baseWidthPt ? Math.round((renderWidth / baseWidthPt) * 100) : null;

  // ── smart initial zoom + restore saved position ───────────────────────
  useEffect(() => {
    if (restored.current || !numPages || container.width === 0 || !pageAspect[1]) return;
    restored.current = true;

    const saved = loadPosition(resourceId);
    if (saved) {
      if (typeof saved.rotation === 'number') setRotation(saved.rotation);
      if (saved.fitMode) setFitMode(saved.fitMode);
      if (typeof saved.zoom === 'number') setZoom(saved.zoom);
      if (saved.page && saved.page > 1) {
        requestAnimationFrame(() => goToPage(saved.page!));
      }
      return;
    }

    // no memory → choose a comfortable default (section 16)
    const a = pageAspect[1];
    if (a < 1) {
      // landscape / wide (slides, scanned notebooks) → fit the whole page
      setFitMode('page');
    } else {
      // portrait → fit width but never blow past ~1.35x native
      setFitMode('custom');
      const nativePx = baseWidthPt ?? fitWidthPx;
      const cap = (nativePx * 1.35) / fitWidthPx;
      setZoom(Math.min(1, cap));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, container.width, pageAspect, resourceId]);

  // ── persist position (debounced) ─────────────────────────────────────
  useEffect(() => {
    if (!restored.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePosition(resourceId, { page, zoom, rotation, fitMode });
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [resourceId, page, zoom, rotation, fitMode]);

  // ── virtualization + current-page tracking ───────────────────────────
  const recomputeVisible = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc || !numPages) return;
    const top = sc.scrollTop;
    const vh = sc.clientHeight;
    const pad = vh * OVERSCAN_SCREENS;
    const next = new Set<number>();
    let best = page;
    let bestDist = Infinity;
    const mid = top + vh / 2;
    for (let n = 1; n <= numPages; n++) {
      const el = pageEls.current.get(n);
      if (!el) continue;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      if (elBottom > top - pad && elTop < top + vh + pad) next.add(n);
      const dist = Math.abs((elTop + elBottom) / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }
    setVisible((prev) => {
      if (prev.size === next.size) {
        let same = true;
        next.forEach((n) => {
          if (!prev.has(n)) same = false;
        });
        if (same) return prev;
      }
      return next;
    });
    if (!programmaticScroll.current) setPage(best);
  }, [numPages, page]);

  const onScroll = useCallback(() => {
    recomputeVisible();
    wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recomputeVisible]);

  useEffect(() => {
    recomputeVisible();
  }, [renderWidth, rotation, numPages, recomputeVisible]);

  // ── navigation ──────────────────────────────────────────────────────
  const scrollTo = useCallback((top: number) => {
    const sc = scrollRef.current;
    if (!sc) return;
    const max = sc.scrollHeight - sc.clientHeight;
    const target = Math.max(0, Math.min(top, max));
    // Try native smooth (nice on real browsers); guarantee the position with a
    // direct write for environments that no-op `behavior: 'smooth'`.
    try {
      sc.scrollTo({ top: target, behavior: 'smooth' });
    } catch {
      /* older API */
    }
    sc.scrollTop = target;
  }, []);

  const goToPage = useCallback(
    (n: number) => {
      if (!numPages) return;
      const clamped = Math.min(Math.max(1, Math.round(n)), numPages);
      const el = pageEls.current.get(clamped);
      if (!el) return;
      programmaticScroll.current = true;
      setPage(clamped);
      scrollTo(el.offsetTop - 12);
      window.setTimeout(() => {
        programmaticScroll.current = false;
        recomputeVisible();
      }, 80);
    },
    [numPages, recomputeVisible, scrollTo],
  );

  const scrollByFraction = useCallback(
    (frac: number) => {
      const sc = scrollRef.current;
      if (!sc) return;
      scrollTo(sc.scrollTop + sc.clientHeight * frac);
    },
    [scrollTo],
  );

  // ── zoom ────────────────────────────────────────────────────────────
  const effectiveZoom = useCallback(() => {
    if (fitMode === 'custom') return zoom;
    if (fitMode === 'width') return 1;
    return fitPagePx / fitWidthPx; // 'page'
  }, [fitMode, zoom, fitPagePx, fitWidthPx]);

  const setZoomTo = useCallback(
    (z: number) => {
      setFitMode('custom');
      setZoom(Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX));
    },
    [],
  );
  const zoomIn = useCallback(() => setZoomTo(effectiveZoom() * ZOOM_STEP), [effectiveZoom, setZoomTo]);
  const zoomOut = useCallback(() => setZoomTo(effectiveZoom() / ZOOM_STEP), [effectiveZoom, setZoomTo]);
  const fitWidth = useCallback(() => setFitMode('width'), []);
  const fitPage = useCallback(() => setFitMode('page'), []);
  const resetZoom = useCallback(() => {
    setFitMode('custom');
    setZoom(1);
    goToPage(page);
  }, [goToPage, page]);

  const rotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
    requestAnimationFrame(() => goToPage(page));
  }, [goToPage, page]);

  // ── chrome auto-hide ────────────────────────────────────────────────
  const wake = useCallback(() => {
    setChromeVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!hoveringChrome.current && !helpOpen && !thumbsOpen && !gotoOpen) {
        setChromeVisible(false);
      }
    }, IDLE_MS);
  }, [helpOpen, thumbsOpen, gotoOpen]);

  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [wake]);

  // ── bookmark (saved in this browser — no account, see lib/use-bookmarks) ──
  const toggleBookmark = useCallback(() => {
    setBookmarked(toggleLocalBookmark(resourceId));
  }, [toggleLocalBookmark, resourceId]);

  // ── fullscreen ──────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        if (helpOpen) return setHelpOpen(false);
        if (gotoOpen) return setGotoOpen(false);
        if (document.fullscreenElement) return void document.exitFullscreen().catch(() => {});
        return onClose();
      }
      if (typing) return;

      switch (e.key) {
        case 'r':
        case 'R':
          e.preventDefault();
          rotate();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setThumbsOpen((v) => !v);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          fitWidth();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          if (numPages) goToPage(numPages);
          break;
        case ' ':
          e.preventDefault();
          scrollByFraction(e.shiftKey ? -0.92 : 0.92);
          break;
        case 'ArrowDown':
          e.preventDefault();
          scrollByFraction(0.12);
          break;
        case 'ArrowUp':
          e.preventDefault();
          scrollByFraction(-0.12);
          break;
        case 'PageDown':
          e.preventDefault();
          scrollByFraction(0.9);
          break;
        case 'PageUp':
          e.preventDefault();
          scrollByFraction(-0.9);
          break;
        case '?':
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
      }
      wake();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    helpOpen,
    gotoOpen,
    numPages,
    onClose,
    rotate,
    fitWidth,
    resetZoom,
    zoomIn,
    zoomOut,
    goToPage,
    scrollByFraction,
    wake,
  ]);

  // focus the workspace so keys land here immediately
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  // ── right-click = back (scoped to the viewer only) ──────────────────
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  // ── double-click = toggle fit-width / 2x (unless selecting text) ────
  const onDoubleClick = useCallback(() => {
    const sel = window.getSelection?.();
    if (sel && sel.toString().trim().length > 0) return;
    if (fitMode === 'width') setZoomTo(2);
    else fitWidth();
  }, [fitMode, fitWidth, setZoomTo]);

  const registerPage = useCallback((n: number, el: HTMLElement | null) => {
    if (el) pageEls.current.set(n, el);
    else pageEls.current.delete(n);
  }, []);

  const onPageDims = useCallback(
    (n: number, wPt: number, hPt: number) => {
      if (!wPt || !hPt) return;
      setPageAspect((prev) => (prev[n] ? prev : { ...prev, [n]: hPt / wPt }));
      if (n === 1) setBaseWidthPt((prev) => prev ?? wPt);
    },
    [],
  );

  // ── render ─────────────────────────────────────────────────────────
  const slots = numPages ? Array.from({ length: numPages }, (_, i) => i + 1) : [];

  return (
    <div className="reader fixed inset-0 z-[120]">
      {/* dimmed hub behind (section 3) */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        ref={rootRef}
        role="document"
        aria-label={`Reading: ${title}`}
        tabIndex={-1}
        className={cn(
          'absolute inset-0 flex flex-col overflow-hidden bg-[var(--reader-bg)] outline-none',
          'md:inset-[2.5vh_2.5vw] md:rounded-[18px] md:shadow-2xl',
        )}
        onMouseMove={wake}
        onContextMenu={onContextMenu}
      >
        {/* top: title + page + close (fades with chrome) */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 transition-opacity duration-300',
            chromeVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="pointer-events-auto max-w-[62%] rounded-full bg-[var(--reader-chrome)] px-4 py-2 text-[13px] font-medium text-[var(--reader-chrome-ink)] shadow-lg backdrop-blur-md">
            <span className="block truncate">{title}</span>
            {subtitle && (
              <span className="block truncate text-[11px] font-normal text-[var(--reader-chrome-dim)]">
                {subtitle}
              </span>
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
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in your browser's own PDF viewer"
              title="Open in browser"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--reader-chrome)] text-[var(--reader-chrome-ink)] shadow-lg backdrop-blur-md transition hover:bg-[var(--reader-chrome-hover)]"
            >
              <ExternalLink size={16} strokeWidth={2} />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reader (Esc, or right-click the page)"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--reader-chrome)] text-[var(--reader-chrome-ink)] shadow-lg backdrop-blur-md transition hover:bg-[var(--reader-chrome-hover)]"
            >
              <X size={17} strokeWidth={2} />
            </button>
          </div>
        </div>

        {error ? (
          <ReaderError
            onRetry={() => {
              setError(false);
              setNumPages(null);
              setLoadPct(0);
              setReloadKey((k) => k + 1);
            }}
            onClose={onClose}
            fileUrl={fileUrl}
          />
        ) : (
          <Document
            key={reloadKey}
            file={file}
            options={PDF_OPTIONS as unknown as Record<string, unknown>}
            loading={<ReaderLoading pct={loadPct} />}
            error={null}
            noData={null}
            onLoadProgress={({ loaded, total }) =>
              setLoadPct(total ? Math.min(100, Math.round((loaded / total) * 100)) : 0)
            }
            onLoadSuccess={(pdf) => {
              setNumPages(pdf.numPages);
              setError(false);
            }}
            onLoadError={() => setError(true)}
            onSourceError={() => setError(true)}
            className="flex min-h-0 flex-1"
          >
            {/* thumbnail rail (section 11) */}
            <div
              className={cn(
                'z-10 h-full shrink-0 overflow-y-auto border-r border-[var(--reader-hairline)] bg-[var(--reader-rail)] transition-[width,opacity] duration-300',
                thumbsOpen ? 'w-[148px] opacity-100' : 'w-0 opacity-0',
              )}
              aria-hidden={!thumbsOpen}
            >
              <div className="flex flex-col gap-2 p-2">
                {thumbsOpen &&
                  slots.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    className={cn(
                      'group relative overflow-hidden rounded-md border transition',
                      n === page
                        ? 'border-[var(--reader-accent)] ring-2 ring-[var(--reader-accent)]'
                        : 'border-[var(--reader-hairline)] hover:border-[var(--reader-accent)]',
                    )}
                    aria-label={`Go to page ${n}`}
                    aria-current={n === page ? 'page' : undefined}
                  >
                    <Thumbnail
                      pageNumber={n}
                      width={128}
                      loading={<div className="skeleton aspect-[1/1.414] w-full" />}
                    />
                    <span className="absolute bottom-0 right-0 rounded-tl bg-[var(--reader-chrome)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--reader-chrome-ink)]">
                      {n}
                    </span>
                  </button>
                  ))}
              </div>
            </div>

            {/* the scroll of pages */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              onDoubleClick={onDoubleClick}
              onWheel={wake}
              className="reader-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
              style={{ paddingBlock: 24 }}
            >
              {slots.map((n) => {
                const w = renderWidth;
                const h = w * aspectFor(n);
                const isVisible = visible.has(n);
                return (
                  <div
                    key={n}
                    ref={(el) => registerPage(n, el)}
                    data-page={n}
                    className="mx-auto mb-6 last:mb-0"
                    style={{ width: w, height: h }}
                  >
                    {isVisible ? (
                      <Page
                        pageNumber={n}
                        width={w}
                        rotate={rotation}
                        renderTextLayer
                        renderAnnotationLayer={false}
                        loading={<div className="skeleton h-full w-full rounded" />}
                        onLoadSuccess={(p: { originalWidth?: number; originalHeight?: number; width: number; height: number }) => {
                          onPageDims(n, p.originalWidth ?? p.width, p.originalHeight ?? p.height);
                        }}
                        className="reader-page overflow-hidden rounded bg-white shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
                      />
                    ) : (
                      <div className="h-full w-full rounded bg-[var(--reader-page-empty)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </Document>
        )}

        {/* bottom-center floating controls (sections 5–6) */}
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
            <ChromeButton label="Thumbnails (T)" active={thumbsOpen} onClick={() => setThumbsOpen((v) => !v)}>
              <PanelLeft size={17} />
            </ChromeButton>
            <span className="mx-1 h-5 w-px bg-[var(--reader-hairline)]" />

            <ChromeButton label="Zoom out (-)" onClick={zoomOut}>
              <Minus size={17} />
            </ChromeButton>
            <button
              type="button"
              onClick={resetZoom}
              className="min-w-[52px] rounded-full px-2 py-1 text-[12px] font-semibold tabular-nums hover:bg-[var(--reader-chrome-hover)]"
              aria-label="Reset zoom (0)"
            >
              {zoomPct ? `${zoomPct}%` : '—'}
            </button>
            <ChromeButton label="Zoom in (+)" onClick={zoomIn}>
              <Plus size={17} />
            </ChromeButton>

            <ChromeButton label="Fit width (F)" active={fitMode === 'width'} onClick={fitWidth}>
              <MoveHorizontal size={17} />
            </ChromeButton>
            <ChromeButton label="Fit page" active={fitMode === 'page'} onClick={fitPage}>
              <ScanLine size={17} />
            </ChromeButton>

            <span className="mx-1 h-5 w-px bg-[var(--reader-hairline)]" />
            <ChromeButton label="Rotate 90° (R)" onClick={rotate}>
              <RotateCw size={17} />
            </ChromeButton>

            <PageIndicator
              page={page}
              numPages={numPages}
              open={gotoOpen}
              setOpen={setGotoOpen}
              onGo={(n) => {
                goToPage(n);
                setGotoOpen(false);
              }}
            />

            <span className="mx-1 h-5 w-px bg-[var(--reader-hairline)]" />
            <ChromeButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </ChromeButton>
            <ChromeButton label="Keyboard shortcuts (?)" active={helpOpen} onClick={() => setHelpOpen((v) => !v)}>
              <Keyboard size={17} />
            </ChromeButton>
          </div>
        </div>

        {helpOpen && <ShortcutSheet onClose={() => setHelpOpen(false)} />}
      </div>
    </div>
  );
}

// ── small pieces ─────────────────────────────────────────────────────────
function ChromeButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full transition',
        active
          ? 'bg-[var(--reader-accent)] text-white'
          : 'hover:bg-[var(--reader-chrome-hover)]',
      )}
    >
      {children}
    </button>
  );
}

function PageIndicator({
  page,
  numPages,
  open,
  setOpen,
  onGo,
}: {
  page: number;
  numPages: number | null;
  open: boolean;
  setOpen: (v: boolean) => void;
  onGo: (n: number) => void;
}) {
  const [val, setVal] = useState('');
  useEffect(() => {
    if (open) setVal(String(page));
  }, [open, page]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mx-1 rounded-full px-3 py-1 text-[12px] font-semibold tabular-nums hover:bg-[var(--reader-chrome-hover)]"
        aria-label="Go to page"
      >
        {numPages ? `${page} / ${numPages}` : `${page}`}
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(val, 10);
            if (!Number.isNaN(n)) onGo(n);
          }}
          className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 rounded-xl border border-[var(--reader-hairline)] bg-[var(--reader-chrome)] p-2 shadow-xl backdrop-blur-md"
        >
          <input
            autoFocus
            inputMode="numeric"
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={() => setOpen(false)}
            className="w-24 rounded-lg bg-[var(--reader-input)] px-2 py-1.5 text-center text-[13px] text-[var(--reader-chrome-ink)] outline-none"
            placeholder={numPages ? `1–${numPages}` : 'Page'}
            aria-label="Page number"
          />
        </form>
      )}
    </div>
  );
}

function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['Esc  /  right-click', 'Close reader'],
    ['Space  /  Shift+Space', 'Down / up one screen'],
    ['↑ ↓', 'Scroll'],
    ['PageUp / PageDown', 'Jump a larger distance'],
    ['Home / End', 'First / last page'],
    ['R', 'Rotate 90° clockwise'],
    ['T', 'Toggle thumbnails'],
    ['F', 'Fit to width'],
    ['0', 'Reset zoom'],
    ['+ / −', 'Zoom in / out'],
    ['Double-click', 'Toggle zoom'],
    ['?', 'This help'],
  ];
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--reader-hairline)] bg-[var(--reader-chrome)] p-5 text-[var(--reader-chrome-ink)] shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-[var(--reader-chrome-hover)]">
            <X size={16} />
          </button>
        </div>
        <dl className="space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 text-[12.5px]">
              <dt className="font-mono text-[var(--reader-chrome-dim)]">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function ReaderLoading({ pct }: { pct: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-[var(--reader-chrome-dim)]">
      <div className="text-[13px] font-medium">Preparing your notes…</div>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-[var(--reader-hairline)]">
        <div
          className="h-full rounded-full bg-[var(--reader-accent)] transition-[width] duration-300"
          style={{ width: `${Math.max(8, pct)}%` }}
        />
      </div>
    </div>
  );
}

function ReaderError({ onRetry, onClose, fileUrl }: { onRetry: () => void; onClose: () => void; fileUrl: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-[15px] font-semibold text-[var(--reader-chrome-ink)]">
        Couldn&rsquo;t open this document
      </div>
      <p className="max-w-xs text-[13px] text-[var(--reader-chrome-dim)]">
        The in-page viewer couldn&rsquo;t render this file — this can happen on some phone browsers.
        Try again, or open it directly in your browser&rsquo;s own PDF viewer instead.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <button
          onClick={onRetry}
          className="rounded-full bg-[var(--reader-accent)] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
        >
          Try again
        </button>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[var(--reader-hairline)] px-4 py-2 text-[13px] font-semibold text-[var(--reader-chrome-ink)] transition hover:bg-[var(--reader-chrome-hover)]"
        >
          Open directly
        </a>
        <button
          onClick={onClose}
          className="rounded-full border border-[var(--reader-hairline)] px-4 py-2 text-[13px] font-semibold text-[var(--reader-chrome-ink)] transition hover:bg-[var(--reader-chrome-hover)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
