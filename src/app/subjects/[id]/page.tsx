import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import SubjectTabs from '@/components/SubjectTabs';
import { getBookmarkedIds } from '@/lib/bookmarks';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SubjectDetailPage({ params }: { params: { id: string } }) {
  const [subject, bookmarkedIds] = await Promise.all([
    prisma.subject.findUnique({
      where: { id: params.id },
      include: {
        units: { orderBy: { number: 'asc' } },
        resources: { where: { status: 'APPROVED' }, include: { uploadedBy: true }, orderBy: { createdAt: 'desc' } },
      },
    }),
    getBookmarkedIds(),
  ]);

  if (!subject) notFound();

  return (
    <div className="space-y-7">
      <PageHeader
        title={subject.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {subject.code && (
              <span className="rounded-tiny bg-primary-soft px-2 py-0.5 text-micro font-semibold text-primary-strong">
                {subject.code}
              </span>
            )}
            <span>{subject.units.slice(0, 3).map((u) => u.title).join(' · ')}</span>
          </span>
        }
        crumbs={[{ label: 'Subjects', href: '/subjects' }, { label: subject.name }]}
      />
      <SubjectTabs subject={subject as any} resources={subject.resources as any[]} bookmarkedIds={bookmarkedIds} />
    </div>
  );
}
