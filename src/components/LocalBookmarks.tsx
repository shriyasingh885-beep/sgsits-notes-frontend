'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import NoteListTable from '@/components/ui/NoteListTable';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonRect } from '@/components/ui/Skeleton';
import { LinkButton, Button } from '@/components/ui/Button';
import { useBookmarks } from '@/lib/use-bookmarks';
import type { NoteRowData } from '@/components/ui/NoteListItem';

/**
 * The saved-notes page. Ids come from this browser (no account), titles come
 * from /api/resources/lookup — which returns only approved resources, so a
 * note that was archived since it was saved simply drops out of the list.
 */
export default function LocalBookmarks() {
  const { ids, ready, clear } = useBookmarks();
  const [notes, setNotes] = useState<NoteRowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (ids.length === 0) {
      setNotes([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/resources/lookup?ids=${encodeURIComponent(ids.join(','))}`)
      .then((r) => (r.ok ? r.json() : { resources: [] }))
      .then((d) => {
        if (!cancelled) setNotes(d.resources ?? []);
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids, ready]);

  if (!ready || loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <SkeletonRect key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Tap the bookmark icon on any note to keep it here. Saved notes live in this browser — no account needed."
        Icon={Bookmark}
        action={<LinkButton href="/notes">Browse notes</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <NoteListTable notes={notes} bookmarkedIds={new Set(ids)} />
      <div className="flex justify-end">
        <Button variant="tertiary" size="sm" onClick={clear}>
          <Trash2 size={14} /> Clear all saved
        </Button>
      </div>
    </div>
  );
}
