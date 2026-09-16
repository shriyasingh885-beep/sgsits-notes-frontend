import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * A dashboard shortcut: icon chip, label, one line of explanation, chevron.
 * `emphasis="solid"` is the single filled green card that leads the row —
 * use it once per row, or the emphasis stops meaning anything.
 */
export function QuickAction({
  href,
  label,
  hint,
  Icon,
  emphasis = 'quiet',
}: {
  href: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
  emphasis?: 'quiet' | 'solid';
}) {
  const solid = emphasis === 'solid';
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3.5 rounded-md border px-4 py-3.5 shadow-sm',
        'transition duration-calm ease-calm hover:-translate-y-0.5 hover:shadow-md',
        solid
          ? 'border-transparent bg-eucalyptus-fade text-white'
          : 'border-border bg-surface hover:border-sage-300'
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-input',
          solid
            ? 'bg-[color-mix(in_srgb,var(--white)_22%,transparent)] text-white'
            : 'bg-primary-soft text-primary-strong'
        )}
      >
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-body-lg font-semibold', solid ? 'text-white' : 'text-ink')}>
          {label}
        </span>
        <span
          className={cn(
            'mt-0.5 block truncate text-meta',
            solid ? 'text-[color-mix(in_srgb,var(--white)_82%,transparent)]' : 'text-muted'
          )}
        >
          {hint}
        </span>
      </span>
      <ChevronRight
        size={17}
        strokeWidth={1.9}
        aria-hidden
        className={cn(
          'shrink-0 transition-transform duration-calm ease-calm group-hover:translate-x-0.5',
          solid ? 'text-[color-mix(in_srgb,var(--white)_80%,transparent)]' : 'text-text-faint'
        )}
      />
    </Link>
  );
}

export default QuickAction;
