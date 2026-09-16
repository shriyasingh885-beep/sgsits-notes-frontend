import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { subjectVisual, TINT_STYLE } from "@/lib/subject-visuals";

type Props = {
  id: string;
  name: string;
  code?: string | null;
  notes: number;
  pyqs?: number;
  layout?: "grid" | "list";
  className?: string;
};

/**
 * A subject looks the same wherever it appears: tinted icon square, name,
 * code, and separate notes/PYQ counts. `layout="list"` is the same card laid
 * on its side for the /subjects list toggle — deliberately not a different
 * component, so the two views can never drift apart.
 */
export function SubjectCard({ id, name, code, notes, pyqs = 0, layout = "grid", className }: Props) {
  const { Icon, tint } = subjectVisual(name);

  const lift =
    "transition duration-calm ease-calm hover:-translate-y-1 hover:border-sage-300 hover:shadow-md";

  if (layout === "list") {
    const meta = [`${notes} ${notes === 1 ? "Note" : "Notes"}`, pyqs > 0 && `${pyqs} PYQs`].filter(Boolean).join(" · ");
    return (
      <Link
        href={`/subjects/${id}`}
        className={cn(
          "group flex items-center gap-3.5 rounded-md border border-border bg-surface px-4 py-3.5 shadow-sm",
          lift,
          className
        )}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input"
          style={TINT_STYLE[tint]}
        >
          <Icon size={19} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-card-title font-semibold text-ink">{name}</span>
          <span className="mt-0.5 block text-meta text-muted">
            {code ? `${code} · ${meta}` : meta}
          </span>
        </span>
        <ChevronRight
          size={17}
          strokeWidth={1.8}
          className="shrink-0 text-muted transition duration-calm ease-calm group-hover:translate-x-0.5 group-hover:text-sage-600"
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/subjects/${id}`}
      className={cn(
        "group relative flex h-[196px] flex-col justify-between rounded-md border border-border bg-surface p-4.5 shadow-sm",
        lift,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className="flex h-[46px] w-[46px] items-center justify-center rounded-input"
          style={TINT_STYLE[tint]}
        >
          <Icon size={22} strokeWidth={1.8} />
        </span>
        <ChevronRight
          size={16}
          strokeWidth={2}
          className="mt-1.5 shrink-0 text-text-faint transition duration-calm ease-calm group-hover:translate-x-0.5 group-hover:text-sage-600"
        />
      </div>
      <div className="block">
        <span className="line-clamp-2 block text-card-title font-semibold leading-snug text-ink">{name}</span>
        {code && <span className="mt-1 block text-micro text-muted">{code}</span>}
        <div className="mt-2.5 flex items-center gap-3 text-meta text-secondary">
          <span>{notes} {notes === 1 ? "Note" : "Notes"}</span>
          {pyqs > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
              <span>{pyqs} PYQ{pyqs === 1 ? "" : "s"}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default SubjectCard;
