'use client';
// Mint Eucalyptus sidebar: leaf wordmark, grouped nav with a filled pill +
// icon-chip active state, and a soft "contribute" card at the bottom.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShieldCheck, ChevronRight, Sparkles, ListChecks } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useShell } from './ShellContext';
import { NAV_ITEMS, NAV_SECONDARY, NAV_ACCOUNT } from './nav-items';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen } = useShell();

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
        className={cn(
          'group flex h-nav items-center gap-2.5 rounded-button pl-2 pr-3 text-body-lg transition duration-calm ease-calm',
          active
            ? 'bg-primary-soft font-semibold text-primary-strong'
            : 'text-secondary hover:bg-surface-soft hover:text-ink'
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-tiny transition duration-calm ease-calm',
            active ? 'bg-surface text-sage-700 shadow-sm' : 'text-muted group-hover:text-sage-600'
          )}
        >
          <Icon size={16} strokeWidth={1.9} className="shrink-0" />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 w-sidebar flex-col bg-surface border-r border-border thin-scroll overflow-y-auto',
        'transition-transform duration-calm ease-calm',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-3 px-5 py-6 shrink-0">
        <img src="/sgsits-logo.webp" alt="SGSITS crest" className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm" />
        <span className="leading-tight">
          <span className="block text-micro font-semibold uppercase tracking-[0.16em] text-text-faint">SGSITS</span>
          <span className="block text-[16px] font-heading tracking-tight text-ink">NotesVault</span>
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 px-3">
        <p className="px-2.5 pb-1.5 pt-1 text-micro font-semibold uppercase tracking-[0.12em] text-text-faint">Menu</p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => item(href, Icon, label))}
        </div>

        <div className="my-4 border-t border-border-soft" />

        <p className="px-2.5 pb-1.5 pt-1 text-micro font-semibold uppercase tracking-[0.12em] text-text-faint">More</p>
        <div className="space-y-0.5">
          {NAV_SECONDARY.map(({ href, icon: Icon, label }) => item(href, Icon, label))}
          {session?.user && NAV_ACCOUNT.map(({ href, icon: Icon, label }) => item(href, Icon, label))}
          {session?.user?.role === 'ADMIN' && item('/admin/review', ListChecks, 'Review queue')}
          {session?.user?.role === 'ADMIN' && item('/admin', ShieldCheck, 'Admin')}
        </div>
      </nav>

      {/* Bottom card: contribute + disclaimer */}
      <div className="mx-3 mb-4 mt-2">
        <div className="relative overflow-hidden rounded-panel border border-sage-100 bg-primary-soft p-4">
          <span className="absolute -right-3 -top-3 flex h-14 w-14 items-center justify-center rounded-full bg-cream text-cream-ink opacity-70">
            <Sparkles size={20} strokeWidth={1.6} />
          </span>
          <p className="relative text-body font-semibold text-primary-strong mb-1">Contribute notes</p>
          <p className="relative text-micro text-sage-700 mb-3 leading-relaxed max-w-[85%]">
            Share your notes and help fellow students.
          </p>
          <Link
            href="/uploads"
            className="relative inline-flex items-center gap-1 rounded-button bg-surface px-3 py-1.5 text-micro font-semibold text-sage-700 shadow-sm transition duration-calm ease-calm hover:text-sage-800"
          >
            Upload notes <ChevronRight size={12} />
          </Link>
        </div>
        <p className="mt-3 px-1 text-micro text-text-faint leading-relaxed">
          Unofficial student resource · not an official SGSITS portal
        </p>
      </div>
    </aside>
  );
}
