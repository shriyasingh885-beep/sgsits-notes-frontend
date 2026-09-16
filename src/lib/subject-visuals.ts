import {
  Atom,
  Binary,
  BookOpen,
  Code2,
  Cog,
  Compass,
  Cpu,
  Database,
  DraftingCompass,
  FlaskConical,
  Folder,
  Languages,
  Lightbulb,
  Microscope,
  Monitor,
  Network,
  Ruler,
  ScrollText,
  Sigma,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type SubjectTint = "sage" | "lavender" | "terracotta" | "ochre" | "slate";

export type SubjectVisual = { Icon: LucideIcon; tint: SubjectTint };

/**
 * A subject must look identical on the dashboard, the subjects grid, the notes
 * table and the reader — so its icon and tint are derived here, once, from the
 * subject name. First match wins, so put specific patterns above general ones.
 * Tints are deliberately weighted toward sage: most cards should stay quiet.
 */
const RULES: [RegExp, LucideIcon, SubjectTint][] = [
  [/data structure|algorithm/i, Binary, "slate"],
  [/dbms|database/i, Database, "ochre"],
  [/operating system/i, Monitor, "slate"],
  [/network/i, Network, "slate"],
  [/programming|software|coding/i, Code2, "slate"],
  [/artificial intelligence|\bit\b|information tech|computer/i, Cpu, "slate"],
  [/math|calculus|algebra|statistic/i, Sigma, "lavender"],
  [/physic/i, Atom, "sage"],
  [/chemis/i, FlaskConical, "terracotta"],
  [/bio|life science/i, Microscope, "sage"],
  [/electric|electronic|circuit/i, Zap, "ochre"],
  [/civil|structural|applied mechanic/i, Ruler, "terracotta"],
  [/graphic|drawing|drafting/i, DraftingCompass, "sage"],
  [/mechanical|manufactur|workshop|machine/i, Cog, "sage"],
  [/design thinking|innovat/i, Lightbulb, "ochre"],
  [/language|english|communicat/i, Languages, "lavender"],
  [/bharat|humanit|history|constitution|ethic/i, ScrollText, "ochre"],
  [/survey|geodes/i, Compass, "sage"],
  [/miscellaneous|general/i, Folder, "sage"],
];

export function subjectVisual(name: string): SubjectVisual {
  for (const [pattern, Icon, tint] of RULES) {
    if (pattern.test(name)) return { Icon, tint };
  }
  return { Icon: BookOpen, tint: "sage" };
}

/** Inline styles rather than utilities, because the tints live outside the ramp. */
export const TINT_STYLE: Record<SubjectTint, { background: string; color: string }> = {
  sage: { background: "var(--tint-sage)", color: "var(--tint-sage-ink)" },
  lavender: { background: "var(--tint-lavender)", color: "var(--tint-lavender-ink)" },
  terracotta: { background: "var(--tint-terracotta)", color: "var(--tint-terracotta-ink)" },
  ochre: { background: "var(--tint-ochre)", color: "var(--tint-ochre-ink)" },
  slate: { background: "var(--tint-slate)", color: "var(--tint-slate-ink)" },
};
