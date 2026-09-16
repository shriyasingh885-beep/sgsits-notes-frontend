'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Upload, LogOut } from 'lucide-react';
import type { Session } from 'next-auth';

export default function UserMenu({ session }: { session: Session | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Notes Hub is public — a visitor with no session is the normal case, not a
  // state to prompt out of, so there is nothing to render here for them.
  if (!session) return null;

  const initials = (session.user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-body-lg font-semibold text-sage-800 transition duration-calm ease-calm hover:bg-sage-200"
        aria-label="Open user menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 rounded-panel border border-border bg-surface shadow-pop">
          <div className="border-b border-border-light px-4 py-3">
            <p className="truncate text-body-lg font-semibold text-ink">{session.user?.name}</p>
            <p className="truncate text-micro text-muted">{session.user?.email}</p>
          </div>
          <nav className="p-1.5 space-y-0.5">
            {([
              { href: '/uploads', icon: Upload, label: 'My Uploads' },
            ] as const).map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-button px-3 py-2 text-body text-secondary transition duration-calm ease-calm hover:bg-row-hover hover:text-ink"
              >
                <Icon size={15} strokeWidth={1.8} className="shrink-0" />
                {label}
              </Link>
            ))}
            <div className="my-1 border-t border-border-light" />
            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
              className="flex w-full items-center gap-2.5 rounded-button px-3 py-2 text-body text-secondary transition duration-calm ease-calm hover:bg-row-hover hover:text-ink"
            >
              <LogOut size={15} strokeWidth={1.8} className="shrink-0" />
              Log out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}