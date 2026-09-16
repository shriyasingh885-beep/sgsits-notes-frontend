// Full-page reading mode — reached by a direct visit or refresh of
// /notes/<id> (in-app navigation is intercepted by @modal and shown as an
// overlay instead). Same <PdfReader>; closing goes back, or to /notes.

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import ReaderOverlay from '@/components/reader/ReaderOverlay';
import { readerKindFor } from '@/components/reader/reader-kind';

export const dynamic = 'force-dynamic';

export default async function NotePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const [resource, existingBookmark] = await Promise.all([
    prisma.resource.findUnique({
      where: { id: params.id },
      include: { subject: true, unit: true },
    }),
    session?.user
      ? prisma.bookmark.findUnique({
          where: { userId_resourceId: { userId: session.user.id, resourceId: params.id } },
        })
      : null,
  ]);
  if (!resource) notFound();

  await prisma.resource.update({
    where: { id: resource.id },
    data: { views: { increment: 1 } },
  });

  const subtitle = [resource.subject?.name, resource.unit ? `Unit ${resource.unit.number}` : null]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <ReaderOverlay
      fileUrl={resource.fileUrl}
      resourceId={resource.id}
      title={resource.title}
      subtitle={subtitle || undefined}
      kind={readerKindFor(resource.fileUrl)}
      initiallyBookmarked={!!existingBookmark}
      fallbackHref="/notes"
    />
  );
}
