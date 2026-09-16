import { cn } from '@/lib/cn';

export function SkeletonRect({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-tiny', className)} />;
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn('skeleton h-[13px] rounded-tiny', i === lines - 1 && lines > 1 && 'w-3/4')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-4 shadow-card', className)}>
      <div className="flex items-center gap-3 mb-3">
        <SkeletonRect className="h-9 w-9 rounded-button" />
        <SkeletonText className="flex-1" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
