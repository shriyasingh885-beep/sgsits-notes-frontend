'use client';

/**
 * Bookmarks, stored in the visitor's own browser.
 *
 * Notes Hub has no accounts, so there is no server-side "your" anything to
 * hang a bookmark off. Rather than fake personalisation (or force a login
 * just to save a note), the list of saved resource ids lives in
 * localStorage: it is genuinely per-person, survives reloads, and needs no
 * identity at all. It does not follow the reader to another device, which is
 * the honest trade for having no accounts.
 */

import { useCallback, useEffect, useState } from 'react';

const KEY = 'notes-hub:bookmarks';
/** Same-tab notification — the native `storage` event only fires cross-tab. */
const CHANGE_EVENT = 'nh:bookmarks-changed';

export function readBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // Private mode, blocked site data, or corrupt JSON — behave as "none saved".
    return [];
  }
}

function writeBookmarks(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable — the toggle still works for this page view */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Subscribe to the saved list. `ready` guards against hydration mismatch. */
export function useBookmarks() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read after mount: the server rendered "nothing saved" and localStorage
    // does not exist there, so reading during render would mismatch.
    setIds(readBookmarks());
    setReady(true);

    const sync = () => setIds(readBookmarks());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = readBookmarks();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
    writeBookmarks(next);
    return next.includes(id);
  }, []);

  const remove = useCallback((id: string) => {
    writeBookmarks(readBookmarks().filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => writeBookmarks([]), []);

  return { ids, ready, toggle, remove, clear, has: (id: string) => ids.includes(id) };
}
