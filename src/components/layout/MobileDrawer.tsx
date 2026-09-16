'use client';
// The sidebar's mobile counterpart: a slide-in drawer, not a squeezed
// desktop layout. Opened from the header hamburger or BottomNav's "More".

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShieldCheck, X, LogOut, ListChecks } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useShell } from './ShellContext';
import { NAV_ITEMS, NAV_SECONDARY, NAV_ACCOUNT } from './nav-items';

export default function MobileDrawer() {
  const { mobileDrawerOpen, closeMobileDrawer } = useShell();
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileDrawer();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileDrawerOpen, closeMobileDrawer]);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    // /admin has a child nav entry (/admin/review) — match it exactly so both
    // rows don't light up at once.
    if (href === '/admin') return pathname === '/admin';
    return pathname?.startsWith(href) ?? false;
  }

  const item = (href: string, Icon: React.ElementType, label: string) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={closeMobileDrawer}
        className={cn(
          'flex h-12 items-center gap-3 rounded-button px-3 text-body-lg transition duration-calm ease-calm',
          active ? 'bg-primary-soft font-semibold text-primary-strong' : 'text-secondary hover:bg-surface-soft'
        )}
      >
        <Icon size={18} strokeWidth={1.9} className="shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[80] md:hidden',
        mobileDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!mobileDrawerOpen}
    >
      <div
        onClick={closeMobileDrawer}
        className={cn(
          'absolute inset-0 bg-[color-mix(in_srgb,var(--sage-800)_45%,transparent)] backdrop-blur-sm transition-opacity duration-300',
          mobileDrawerOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-label="Navigation menu"
        className={cn(
          'absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col bg-surface shadow-lg transition-transform duration-300 ease-out',
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/" onClick={closeMobileDrawer} className="flex items-center gap-3">
            <img src="/sgsits-logo.webp" alt="SGSITS crest" className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm" />
            <span className="leading-tight">
              <span className="block text-micro font-semibold uppercase tracking-[0.16em] text-text-faint">SGSITS</span>
              <span className="block text-[15px] font-heading text-ink">NotesVault</span>
            </span>
          </Link>
          <button
            onClick={closeMobileDrawer}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-button text-secondary hover:bg-surface-soft hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-0.5">{NAV_ITEMS.map(({ href, icon, label }) => item(href, icon, label))}</div>
          <div className="my-3 border-t border-border-soft" />
          <div className="space-y-0.5">
            {NAV_SECONDARY.map(({ href, icon, label }) => item(href, icon, label))}
            {session?.user && NAV_ACCOUNT.map(({ href, icon, label }) => item(href, icon, label))}
            {session?.user?.role === 'ADMIN' && item('/admin/review', ListChecks, 'Review queue')}
            {session?.user?.role === 'ADMIN' && item('/admin', ShieldCheck, 'Admin')}
          </div>
        </nav>

        {/* No sign-in prompt: the site is open to everyone. Contributors who
            do have a session get a way back out. */}
        {session?.user && (
          <div className="border-t border-border-soft px-3 py-4">
            <button
              onClick={() => signOut()}
              className="flex h-11 w-full items-center gap-3 rounded-button px-3 text-body-lg text-secondary hover:bg-surface-soft"
            >
              <LogOut size={18} strokeWidth={1.9} /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
