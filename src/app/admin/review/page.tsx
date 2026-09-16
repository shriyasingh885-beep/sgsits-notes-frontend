import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import ReviewQueue from '@/components/ReviewQueue';

export const dynamic = 'force-dynamic';

/**
 * The human half of the classification pipeline: everything the classifier
 * refused to guess at ends up here rather than being silently mis-filed.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/');

  const status = searchParams.status ?? 'REVIEW_REQUIRED';

  const [items, counts, subjects] = await Promise.all([
    prisma.resource.findMany({
      where: { classificationStatus: status },
      orderBy: [{ classificationConfidence: 'desc' }, { title: 'asc' }],
      take: 60,
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileType: true,
        suggestedTitle: true,
        originalFilename: true,
        documentType: true,
        academicArea: true,
        academicYear: true,
        examType: true,
        courseCode: true,
        pageCount: true,
        classificationConfidence: true,
        classificationReason: true,
        possibleDuplicate: true,
        subject: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.resource.groupBy({ by: ['classificationStatus'], _count: true }),
    prisma.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.classificationStatus === s)?._count ?? 0;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Review queue"
        subtitle="Documents the classifier wasn't confident enough to file on its own"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Review' }]}
      />
      <ReviewQueue
        items={items}
        subjects={subjects}
        activeStatus={status}
        counts={{
          REVIEW_REQUIRED: countFor('REVIEW_REQUIRED'),
          AUTO_CLASSIFIED: countFor('AUTO_CLASSIFIED'),
          UNCLASSIFIED: countFor('UNCLASSIFIED'),
          VERIFIED: countFor('VERIFIED'),
        }}
      />
    </div>
  );
}
