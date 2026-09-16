// Per-document reading position, remembered locally so re-opening a note drops
// the reader back where it was (section 22). Nothing sensitive is stored — just
// page / zoom / rotation / fit mode, keyed by resource id.

export type FitMode = 'width' | 'page' | 'custom';

export type ReaderPosition = {
  page: number;
  zoom: number;
  rotation: number;
  fitMode: FitMode;
};

const key = (id: string) => `reader:pos:${id}`;

export function loadPosition(id: string): Partial<ReaderPosition> | null {
  try {
    const raw = window.localStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as ReaderPosition) : null;
  } catch {
    return null;
  }
}

export function savePosition(id: string, pos: ReaderPosition): void {
  try {
    window.localStorage.setItem(key(id), JSON.stringify(pos));
  } catch {
    /* private mode / quota — position memory is best-effort */
  }
}
