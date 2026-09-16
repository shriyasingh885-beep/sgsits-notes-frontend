/** Shared formatting helpers. Kept in one place so every surface reads alike. */

export function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "2d ago" / "1w ago" — the compact form the notes table uses. */
export function relativeTime(date: Date | string) {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** NOTES → "Notes", HANDWRITTEN_NOTES → "Handwritten Notes". */
export function prettyType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const SHORT_TYPE: Record<string, string> = {
  NOTES: "Notes",
  HANDWRITTEN_NOTES: "Handwritten",
  PYQ: "PYQ",
  QUESTION_BANK: "Q. Bank",
  ASSIGNMENT: "Assignment",
  PRACTICAL: "Practical",
  LAB_MANUAL: "Lab Manual",
  REFERENCE_MATERIAL: "Reference",
  IMPORTANT_QUESTIONS: "Important Qs",
  CHEAT_SHEET: "Cheat Sheet",
  SYLLABUS: "Syllabus",
  SLIDES: "Slides",
};

export function shortType(type: string) {
  return SHORT_TYPE[type] ?? prettyType(type);
}

/**
 * Exam year pulled out of a paper's title or tags — "Physics Endsem 1 2025"
 * yields 2025. Multi-year compilations ("End-Semester PYQs 2015-2019") and
 * undated files return null so the PYQ page can bucket them honestly instead
 * of guessing a year.
 */
export function parseExamYear(title: string, tags?: string | null): number | null {
  const haystack = `${title} ${tags ?? ""}`;
  const regex = /\b(19[89]\d|20[0-4]\d)\b/g;
  const years: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(haystack)) !== null) {
    years.push(Number(match[1]));
  }
  if (years.length !== 1) return null;
  const year = years[0];
  if (year < 1990 || year > new Date().getFullYear() + 1) return null;
  return year;
}

/** Days until a date, floored at 0. Used by the Upcoming card and Schedule. */
export function daysUntil(date: Date | string) {
  const target = typeof date === "string" ? new Date(date) : date;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(target);
  startOfTarget.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000));
}

export function formatEventDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
