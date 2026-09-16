'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/** Delete control for a row in My Uploads. Confirms first — deleting an
 *  upload also removes everyone's bookmarks of it, so it isn't undoable. */
export default function UploadRowActions({ resourceId, title }: { resourceId: string; title: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast('Upload deleted', 'success');
      setOpen(false);
      router.refresh();
    } catch {
      toast('Could not delete this upload', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Delete ${title}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-faint transition duration-calm ease-calm hover:bg-[color:var(--tint-terracotta)] hover:text-danger"
      >
        <Trash2 size={15} strokeWidth={1.9} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete upload?">
        <div className="space-y-4 p-4">
          <p className="text-body text-secondary">
            <span className="font-semibold text-ink">{title}</span> will be removed from the library,
            along with any bookmarks or ratings other students have on it. This can&rsquo;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={remove} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
