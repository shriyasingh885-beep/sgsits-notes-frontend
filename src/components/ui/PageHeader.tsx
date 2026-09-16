import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import Breadcrumb, { type Crumb } from "./Breadcrumb";

/**
 * The one page-title block. Every route uses it, which is what keeps the
 * heading size, subtitle colour and top spacing identical across the app
 * (§11 sets the tone: greeting at 28px, no hero).
 */
export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} className="mb-2" />}
        <h1 className="text-page font-heading tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-body-lg text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export default PageHeader;

