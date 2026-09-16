// Plain utility, no "use client" — importable from Server Components.
// (A named export from a "use client" module becomes a client reference when
// imported into a Server Component, so this can't live in ReaderOverlay.tsx.)

export type ReaderKind = 'pdf' | 'pptx' | 'image' | 'unsupported';

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export function readerKindFor(fileUrl: string): ReaderKind {
  const lower = fileUrl.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  // .pptx is a zip/OOXML container the client-side viewer can open; legacy
  // binary .ppt is a different format entirely and isn't supported.
  if (lower.endsWith('.pptx')) return 'pptx';
  if (IMAGE_EXT.some((ext) => lower.endsWith(ext))) return 'image';
  return 'unsupported';
}
