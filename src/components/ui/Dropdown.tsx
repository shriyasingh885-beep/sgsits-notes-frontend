'use client';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Dropdown({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-1.5 rounded-input border border-border bg-surface px-3 text-body text-secondary transition duration-calm ease-calm hover:border-sage-300 hover:text-ink"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown size={14} strokeWidth={1.8} className={cn('transition duration-calm', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-30 min-w-[180px] rounded-panel border border-border bg-surface shadow-pop py-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center px-3.5 py-2 text-body text-secondary transition duration-calm ease-calm hover:bg-row-hover hover:text-ink',
        active && 'bg-row-hover font-semibold text-ink'
      )}
    >
      {children}
    </button>
  );
}

export default Dropdown;

