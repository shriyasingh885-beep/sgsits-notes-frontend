'use client';
import { InputHTMLAttributes, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SearchInput({
  value,
  onChange,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={15} strokeWidth={1.8} className="absolute left-3 shrink-0 text-muted" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-input border border-border bg-surface pl-9 pr-9 text-body text-ink placeholder:text-muted transition duration-calm ease-calm focus-visible:outline-none focus-visible:border-sage-400 focus-visible:shadow-focus"
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-3 text-muted transition duration-calm ease-calm hover:text-ink"
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

export default SearchInput;

