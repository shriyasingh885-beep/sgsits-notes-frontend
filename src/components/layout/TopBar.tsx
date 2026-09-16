'use client';

import { useSession } from 'next-auth/react';
import { Search, Menu } from 'lucide-react';
import { useEffect } from 'react';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';
import { useShell } from './ShellContext';

export default function TopBar() {
  const { data: session } = useSession();
  const { toggleSidebar, toggleMobileDrawer } = useShell();

  function handleMenuClick() {
    if (window.matchMedia('(min-width: 768px)').matches) toggleSidebar();
    else toggleMobileDrawer();
  }

  // Expose global opener for Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-palette'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] backdrop-blur-sm px-6 md:px-9">
      <button
        type="button"
        onClick={handleMenuClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border bg-surface text-secondary transition duration-calm ease-calm hover:border-sage-300 hover:text-ink"
        aria-label="Toggle menu"
      >
        <Menu size={17} strokeWidth={1.8} />
      </button>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('open-palette'))}
        className="flex w-full max-w-[380px] items-center gap-2.5 rounded-full border border-border bg-background px-4 py-2.5 text-body text-muted shadow-sm transition duration-calm ease-calm hover:border-sage-300 hover:shadow-md"
        aria-label="Search notes (Ctrl+K)"
      >
        <Search size={15} strokeWidth={1.8} className="shrink-0" />
        <span className="flex-1 text-left">Search notes…</span>
        <kbd className="hidden rounded-tiny border border-border bg-surface px-1.5 py-0.5 text-micro sm:inline">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu session={session} />
      </div>
    </header>
  );
}
