/** Tiny class-name joiner — drops falsy values, no dependency needed. */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
