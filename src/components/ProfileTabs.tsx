'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import NoteListTable from '@/components/ui/NoteListTable';

export default function ProfileTabs({ uploads, bookmarks }: { uploads: any[], bookmarks: any[] }) {
  const [active, setActive] = useState('uploads');

  return (
    <div className="space-y-4">
      <Tabs 
        tabs={[{ key: 'uploads', label: 'Uploads', count: uploads.length }, { key: 'bookmarks', label: 'Bookmarks', count: bookmarks.length }]} 
        active={active} 
        onChange={setActive} 
      />
      {active === 'uploads' && <NoteListTable notes={uploads} />}
      {active === 'bookmarks' && <NoteListTable notes={bookmarks} />}
    </div>
  );
}
