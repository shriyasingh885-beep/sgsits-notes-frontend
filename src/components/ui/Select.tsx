import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Select({
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 rounded-input border border-border bg-surface px-3 text-body text-ink',
        'transition duration-calm ease-calm',
        'focus-visible:outline-none focus-visible:border-sage-400 focus-visible:shadow-focus',
        className
      )}
      {...rest}
    />
  );
}

export default Select;

