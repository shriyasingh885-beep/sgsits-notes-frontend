'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, FileText, Bookmark, Menu } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useShell } from './ShellContext';

const ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/notes', icon: FileText, label: 'Notes' },
  { href: '/bookmarks', icon: Bookmark, label: 'Saved' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { toggleMobileDrawer, mobileDrawerOpen } = useShell();

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-bottomnav items-center justify-around border-t border-border bg-surface md:hidden"
    >
      {ITEMS.map(({ href, icon: Icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-1 text-micro transition duration-calm ease-calm',
              active ? 'text-sage-700 font-semibold' : 'text-muted'
            )}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.8} />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={toggleMobileDrawer}
        aria-label="More"
        aria-expanded={mobileDrawerOpen}
        className={cn(
          'flex flex-col items-center gap-1 px-4 py-1 text-micro transition duration-calm ease-calm',
          mobileDrawerOpen ? 'text-sage-700 font-semibold' : 'text-muted'
        )}
      >
        <Menu size={20} strokeWidth={mobileDrawerOpen ? 2 : 1.8} />
        More
      </button>
    </nav>
  );
}
