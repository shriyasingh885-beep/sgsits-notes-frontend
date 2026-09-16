export type Theme = 'light' | 'dark';
const KEY = 'notes-hub:theme';

export function getStoredTheme(): Theme {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('nh:theme-change', { detail: { theme } }));
}

/** Inline, blocking (no "use client") — inject via dangerouslySetInnerHTML in
 *  the document head so dark mode / reduced motion apply before first paint,
 *  no flash. */
export const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('${KEY}');
  if (t === 'dark') document.documentElement.dataset.theme = 'dark';
  if (localStorage.getItem('notes-hub:reduced-motion') === '1') {
    document.documentElement.classList.add('force-reduced-motion');
  }
} catch (e) {}
`;
