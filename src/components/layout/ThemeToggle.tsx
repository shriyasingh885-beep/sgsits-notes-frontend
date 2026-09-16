'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme';

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    setThemeState(getStoredTheme());
    const onChange = (e: Event) => setThemeState((e as CustomEvent).detail.theme);
    window.addEventListener('nh:theme-change', onChange);
    return () => window.removeEventListener('nh:theme-change', onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
      className={className ?? 'flex h-9 w-9 items-center justify-center rounded-button border border-border bg-surface text-secondary transition duration-calm ease-calm hover:border-sage-300 hover:text-ink'}
    >
      {theme === 'dark' ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
    </button>
  );
}
