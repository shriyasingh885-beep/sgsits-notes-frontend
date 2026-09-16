import { cn } from "@/lib/cn";

/**
 * 6px sage track (§13). `value`/`max` are counts, not percentages, because every
 * caller has real numerators — coverage per unit, papers per year — and none has
 * a reading-position field.
 */
export function ProgressBar({
  value,
  max,
  label,
  showValue = false,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-micro text-muted">
          {label && <span className="truncate">{label}</span>}
          {showValue && (
            <span className="shrink-0 tabular-nums">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-sage-50"
      >
        <div
          className="h-full rounded-full bg-sage-500 transition-[width] duration-calm ease-calm"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;

