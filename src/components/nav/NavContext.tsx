'use client';

/**
 * Site-wide gesture navigation: right-click / arrow keys / mouse side
 * buttons / swipe all drive the browser's real session history (via
 * router.back()/forward()), never a fake in-memory router. A small parallel
 * stack is kept only so the UI can know whether Back/Forward are meaningful
 * and what to label the current stop — movement itself always goes through
 * the browser, which is what makes "forward survives until you branch"
 * correct for free (it's just how history works).
 *
 * Paused entirely while the PDF reader is open (see `nh:reader-lock`) — the
 * reader owns its own full keyboard/gesture set and the spec explicitly says
 * never fight a document viewer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Entry = { path: string; label: string };
type NavState = { stack: Entry[]; index: number };
type Direction = 'back' | 'forward' | null;

type Feedback = { dir: 'back' | 'forward' | 'home'; method: 'rightclick' | 'key' | 'swipe' | 'button'; key: number };

type NavContextValue = {
  canGoBack: boolean;
  canGoForward: boolean;
  label: string;
  back: () => void;
  forward: () => void;
  home: () => void;
  setLabel: (path: string, label: string) => void;
  feedback: Feedback | null;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  introSeen: boolean;
  dismissIntro: () => void;
  locked: boolean;
};

const NavCtx = createContext<NavContextValue | null>(null);
export const useNav = () => useContext(NavCtx);

const INTRO_KEY = 'notes-hub:nav-intro-seen';
const MAX_STACK = 50;

const STATIC_LABELS: Record<string, string> = {
  '/': 'Home',
  '/subjects': 'Subjects',
  '/notes': 'Notes',
  '/bookmarks': 'Bookmarks',
  '/pyq': 'PYQ Papers',
  '/schedule': 'Schedule',
  '/uploads': 'My Uploads',
  '/about': 'About',
  '/admin/review': 'Review queue',
  '/admin': 'Admin',
  '/browse': 'Browse',
};

function routeLabel(pathname: string): string {
  if (STATIC_LABELS[pathname]) return STATIC_LABELS[pathname];
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return 'Home';
  if (STATIC_LABELS['/' + segs[0]]) {
    // e.g. /subjects/abc123 -> "Subject", /notes/abc123 -> "Note"
    const base = STATIC_LABELS['/' + segs[0]];
    return base.endsWith('s') && base !== 'PYQ Papers' ? base.slice(0, -1) : base;
  }
  const last = segs[segs.length - 1];
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function reducer(state: NavState, action: { path: string; direction: Direction }): NavState {
  const { stack, index } = state;
  const cur = stack[index];
  if (cur && cur.path === action.path) return state;

  if (action.direction === 'back' && stack[index - 1]?.path === action.path) {
    return { stack, index: index - 1 };
  }
  if (action.direction === 'forward' && stack[index + 1]?.path === action.path) {
    return { stack, index: index + 1 };
  }
  // No explicit direction — either the browser's own back/forward buttons, or
  // a genuine new navigation. Adjacent stack entries win first (so native
  // back/forward stays in sync without our button having been pressed).
  if (stack[index - 1]?.path === action.path) return { stack, index: index - 1 };
  if (stack[index + 1]?.path === action.path) return { stack, index: index + 1 };

  // A real branch: drop any stale forward history, append, cap length.
  const truncated = stack.slice(0, index + 1);
  let nextStack = [...truncated, { path: action.path, label: routeLabel(action.path) }];
  if (nextStack.length > MAX_STACK) nextStack = nextStack.slice(nextStack.length - MAX_STACK);
  return { stack: nextStack, index: nextStack.length - 1 };
}

const NAV_RC_BLOCK =
  'a, button, input, textarea, select, [contenteditable], [role="button"], [role="menuitem"], .reader';
const NAV_SWIPE_BLOCK = 'input, textarea, select, [contenteditable], [data-no-swipe]';

export function NavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    stack: [{ path: pathname, label: routeLabel(pathname) }],
    index: 0,
  }));
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [introSeen, setIntroSeen] = useState(true); // default true until we've checked storage, to avoid a first-paint flash

  const pendingDirection = useRef<Direction>(null);
  const prevPathname = useRef(pathname);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // refs mirroring state so long-lived event listeners never read stale values
  const canGoBack = state.index > 0;
  const canGoForward = state.index < state.stack.length - 1;
  const canGoBackRef = useRef(canGoBack);
  const canGoForwardRef = useRef(canGoForward);
  const lockedRef = useRef(locked);
  const helpOpenRef = useRef(helpOpen);
  canGoBackRef.current = canGoBack;
  canGoForwardRef.current = canGoForward;
  lockedRef.current = locked;
  helpOpenRef.current = helpOpen;

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    const dir = pendingDirection.current;
    pendingDirection.current = null;
    dispatch({ path: pathname, direction: dir });
  }, [pathname]);

  useEffect(() => {
    try {
      setIntroSeen(window.localStorage.getItem(INTRO_KEY) === '1');
    } catch {
      setIntroSeen(true);
    }
  }, []);

  const dismissIntro = useCallback(() => {
    setIntroSeen(true);
    try {
      window.localStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const triggerFeedback = useCallback((dir: Feedback['dir'], method: Feedback['method']) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ dir, method, key: Date.now() });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 900);
  }, []);

  const back = useCallback(() => {
    if (!canGoBackRef.current) return;
    pendingDirection.current = 'back';
    router.back();
  }, [router]);

  const forward = useCallback(() => {
    if (!canGoForwardRef.current) return;
    pendingDirection.current = 'forward';
    router.forward();
  }, [router]);

  const home = useCallback(() => {
    if (pathname === '/') return;
    router.push('/');
  }, [router, pathname]);

  const setLabel = useCallback((path: string, label: string) => {
    setLabelOverrides((prev) => (prev[path] === label ? prev : { ...prev, [path]: label }));
  }, []);

  // ── reader lock (custom event so it works regardless of where in the
  // React tree the reader mounts — it's a sibling of AppShell, not a child) ──
  useEffect(() => {
    const onLock = (e: Event) => setLocked(!!(e as CustomEvent).detail?.locked);
    window.addEventListener('nh:reader-lock', onLock);
    return () => window.removeEventListener('nh:reader-lock', onLock);
  }, []);

  // ── right-click = back ──────────────────────────────────────────────
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if (lockedRef.current || helpOpenRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest(NAV_RC_BLOCK)) return;
      const sel = window.getSelection?.();
      if (sel && sel.toString().length > 0) return;
      if (!canGoBackRef.current) return;
      e.preventDefault();
      triggerFeedback('back', 'rightclick');
      back();
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [back, triggerFeedback]);

  // ── keyboard: ← → H ? Esc ────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lockedRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

      if (helpOpenRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setHelpOpen(false);
        }
        return;
      }
      if (typing) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (canGoBackRef.current) {
            e.preventDefault();
            triggerFeedback('back', 'key');
            back();
          }
          break;
        case 'ArrowRight':
          if (canGoForwardRef.current) {
            e.preventDefault();
            triggerFeedback('forward', 'key');
            forward();
          }
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          triggerFeedback('home', 'key');
          home();
          break;
        case '?':
          e.preventDefault();
          setHelpOpen(true);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [back, forward, home, triggerFeedback]);

  // ── mouse side buttons (browsers already navigate natively on these —
  // we only surface the same feedback toast) ──────────────────────────
  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      if (lockedRef.current) return;
      if (e.button === 3) triggerFeedback('back', 'button');
      else if (e.button === 4) triggerFeedback('forward', 'button');
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [triggerFeedback]);

  // ── swipe (touch) ────────────────────────────────────────────────────
  useEffect(() => {
    const touchStart = { current: null as { x: number; y: number; t: number } | null };

    const onTouchStart = (e: TouchEvent) => {
      if (lockedRef.current || e.touches.length !== 1) {
        touchStart.current = null;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest(NAV_SWIPE_BLOCK)) {
        touchStart.current = null;
        return;
      }
      let el: HTMLElement | null = target;
      let depth = 0;
      while (el && depth < 6) {
        const cs = getComputedStyle(el);
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) {
          touchStart.current = null;
          return;
        }
        el = el.parentElement;
        depth++;
      }
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || lockedRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const dt = Date.now() - start.t;
      if (dt > 700) return;
      if (Math.abs(dx) < 70) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.8) return;
      if (dx > 0) {
        if (canGoBackRef.current) {
          triggerFeedback('back', 'swipe');
          back();
        }
      } else if (canGoForwardRef.current) {
        triggerFeedback('forward', 'swipe');
        forward();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [back, forward, triggerFeedback]);

  const label = labelOverrides[pathname] ?? routeLabel(pathname);

  const value = useMemo<NavContextValue>(
    () => ({
      canGoBack,
      canGoForward,
      label,
      back,
      forward,
      home,
      setLabel,
      feedback,
      helpOpen,
      setHelpOpen,
      introSeen,
      dismissIntro,
      locked,
    }),
    [canGoBack, canGoForward, label, back, forward, home, setLabel, feedback, helpOpen, introSeen, dismissIntro, locked],
  );

  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
}
