import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import ScheduleView from '@/components/ScheduleView';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const session = await auth();
  
  const events = await prisma.studyEvent.findMany({
    where: { OR: [{ userId: null }, { userId: session?.user?.id ?? '' }] },
    orderBy: { date: 'asc' }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" subtitle="Your academic calendar" />
      <ScheduleView events={events as any[]} isLoggedIn={!!session?.user} />
    </div>
  );
}
