'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Bookmark, Share, Flag, Star } from 'lucide-react';

export default function ResourceActionsPanel({
  resourceId,
}: {
  resourceId: string;
  fileUrl?: string;
  fileName?: string;
}) {
  const { toast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);

  const bookmark = async () => {
    await fetch(`/api/resources/${resourceId}/bookmark`, { method: 'POST' });
    toast('Added to bookmarks', 'success');
  };

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast('Link copied to clipboard', 'success');
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" onClick={bookmark} className="w-full justify-center gap-2">
        <Bookmark size={18} /> Save Note
      </Button>
      <div className="flex gap-2">
        <Button variant="tertiary" onClick={share} className="flex-1 justify-center">
          <Share size={18} />
        </Button>
        <Button variant="tertiary" onClick={() => setReportOpen(true)} className="flex-1 justify-center text-danger">
          <Flag size={18} />
        </Button>
      </div>

      <div className="mt-2 pt-2 border-t border-border flex justify-center gap-1">
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={20} className="text-muted hover:text-ochre-500 cursor-pointer transition-colors" />
        ))}
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report Note">
        <div className="p-4 space-y-4">
          <p className="text-body text-secondary">What is wrong with this note?</p>
          <textarea className="w-full border border-border rounded-input p-3 min-h-[100px] text-body" placeholder="Describe the issue..."></textarea>
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setReportOpen(false); toast('Report submitted', 'success'); }}>Submit Report</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
