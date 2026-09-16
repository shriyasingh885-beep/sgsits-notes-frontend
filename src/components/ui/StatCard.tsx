import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { TINT_STYLE, type SubjectTint } from "@/lib/subject-visuals";

/**
 * The dashboard's metric tiles. `layout="stack"` puts the tinted icon chip
 * above the value; `layout="row"` sets the chip beside it with a chevron on
 * the far side when the card navigates somewhere.
 *
 * No sparklines and no percentage deltas — there is no historical data behind
 * these numbers and inventing one would be a lie.
 */
export function StatCard({
  label,
  value,
  Icon,
  tint = "sage",
  href,
  hint,
  layout = "stack",
}: {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  tint?: SubjectTint;
  href?: string;
  hint?: string;
  layout?: "stack" | "row";
}) {
  const chip = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-input",
        layout === "row" ? "h-11 w-11" : "h-10 w-10"
      )}
      style={TINT_STYLE[tint]}
    >
      <Icon size={19} strokeWidth={1.8} />
    </span>
  );

  const body =
    layout === "row" ? (
      <>
        {chip}
        <span className="min-w-0 flex-1">
          <span className="block text-[26px] font-heading leading-none tracking-[-0.015em] text-ink">
            {value}
          </span>
          <span className="mt-1.5 block truncate text-meta text-muted">{hint ?? label}</span>
        </span>
        {href && (
          <ChevronRight size={17} strokeWidth={1.9} className="shrink-0 text-text-faint" aria-hidden />
        )}
      </>
    ) : (
      <>
        {chip}
        <span className="mt-3 block text-[28px] font-heading leading-none tracking-[-0.015em] text-ink">
          {value}
        </span>
        <span className="mt-1.5 block truncate text-meta text-muted">{hint ?? label}</span>
      </>
    );

  const shell = cn(
    "rounded-md border border-border bg-surface shadow-sm",
    layout === "row"
      ? "flex items-center gap-3.5 px-4 py-3.5"
      : "flex min-h-[116px] flex-col justify-center px-4.5 py-4",
    href && "transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-md"
  );

  if (href) {
    return (
      <Link href={href} className={shell} aria-label={`${label}: ${value}`}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

export default StatCard;
