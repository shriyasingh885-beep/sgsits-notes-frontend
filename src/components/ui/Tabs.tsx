'use client';
import { cn } from '@/lib/cn';

export type TabDef = { key: string; label: string; count?: number };

/**
 * The one tab bar: a soft-eucalyptus filled pill for the active tab (not an
 * underline) with a small dot indicator, quiet neutral pills for the rest.
 */
export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('flex flex-wrap items-center gap-1.5 rounded-md bg-surface-soft p-1.5', className)}
    >
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap rounded-button px-3.5 py-2 text-body-lg font-semibold transition duration-calm ease-calm',
              isActive
                ? 'bg-primary-soft text-primary-strong shadow-sm'
                : 'text-secondary hover:bg-surface hover:text-ink',
            )}
          >
            {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-600" aria-hidden />}
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-micro',
                  isActive ? 'bg-sage-600 text-white' : 'bg-elevated text-muted',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
