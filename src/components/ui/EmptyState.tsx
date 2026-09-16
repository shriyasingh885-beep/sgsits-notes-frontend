import { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * §49: a quiet icon, a plain sentence, one action. No oversized illustration
 * and no apologetic paragraph — an empty list is a normal state.
 */
export function EmptyState({
  title,
  body,
  Icon = Inbox,
  action,
  className,
}: {
  title: string;
  body?: string;
  Icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-border bg-surface px-6 py-12 text-center shadow-card",
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-50 text-sage-600">
        <Icon size={20} strokeWidth={1.7} />
      </span>
      <p className="mt-3.5 text-card-title font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-body text-secondary">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;

