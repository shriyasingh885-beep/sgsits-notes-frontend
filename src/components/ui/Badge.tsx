import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { shortType } from "@/lib/format";

export type BadgeTone =
  | "neutral"
  | "sage"
  | "lavender"
  | "terracotta"
  | "ochre"
  | "slate"
  | "success"
  | "warning"
  | "danger";

/**
 * Tones are backed by the tint vars, so a badge never introduces a colour of
 * its own (§20 — type labels stay subdued, they are metadata not decoration).
 */
const TONE: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: "var(--border-light)", color: "var(--text-secondary)" },
  sage: { background: "var(--tint-sage)", color: "var(--tint-sage-ink)" },
  lavender: { background: "var(--tint-lavender)", color: "var(--tint-lavender-ink)" },
  terracotta: { background: "var(--tint-terracotta)", color: "var(--tint-terracotta-ink)" },
  ochre: { background: "var(--tint-ochre)", color: "var(--tint-ochre-ink)" },
  slate: { background: "var(--tint-slate)", color: "var(--tint-slate-ink)" },
  success: { background: "var(--tint-sage)", color: "var(--success)" },
  warning: { background: "var(--tint-ochre)", color: "var(--warning)" },
  danger: { background: "var(--tint-terracotta)", color: "var(--danger)" },
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro font-semibold whitespace-nowrap",
        className
      )}
      style={TONE[tone]}
    >
      {children}
    </span>
  );
}

const TYPE_TONE: Record<string, BadgeTone> = {
  NOTES: "sage",
  HANDWRITTEN_NOTES: "sage",
  PYQ: "ochre",
  QUESTION_BANK: "ochre",
  IMPORTANT_QUESTIONS: "ochre",
  ASSIGNMENT: "lavender",
  PRACTICAL: "slate",
  LAB_MANUAL: "slate",
  REFERENCE_MATERIAL: "neutral",
  CHEAT_SHEET: "terracotta",
  SYLLABUS: "neutral",
  SLIDES: "lavender",
};

/** The resource-type label used by every note row and card. */
export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <Badge tone={TYPE_TONE[type] ?? "neutral"} className={className}>
      {shortType(type)}
    </Badge>
  );
}

const STATUS_TONE: Record<string, BadgeTone> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  OPEN: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

// Uploads go live immediately now (no manual approval step) — "Approved"
// reads as if someone reviewed it, which nothing does anymore.
const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Uploaded",
};

/** Moderation status — the only place semantic colour is allowed to show up. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} className={className}>
      {STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
