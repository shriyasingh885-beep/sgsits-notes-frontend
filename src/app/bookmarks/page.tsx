import PageHeader from '@/components/ui/PageHeader';
import LocalBookmarks from '@/components/LocalBookmarks';

export const metadata = {
  title: 'Saved notes',
  description: 'Notes you have saved in this browser.',
};

export default function BookmarksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Saved" subtitle="Notes you've saved in this browser" />
      <LocalBookmarks />
    </div>
  );
}
