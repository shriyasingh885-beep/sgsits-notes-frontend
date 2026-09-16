import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import AdminPanel from '@/components/AdminPanel';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/');

  const [
    totalUsers,
    totalResources,
    pendingCount,
    reportsCount,
    pending,
    reports,
    colleges,
    aggregateStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.resource.count({ where: { status: 'APPROVED' } }),
    prisma.resource.count({ where: { status: 'PENDING' } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.resource.findMany({
      where: { status: 'PENDING' },
      include: { uploadedBy: true, subject: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.report.findMany({
      where: { status: 'OPEN' },
      include: { resource: true, user: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.college.findMany({
      include: {
        semesters: {
          include: {
            branch: true,
            subjects: true,
          },
        },
      },
    }),
    prisma.resource.aggregate({
      _sum: { downloads: true, views: true },
    }),
  ]);

  const stats = {
    totalUsers,
    totalResources,
    totalDownloads: aggregateStats._sum.downloads ?? 0,
    totalViews: aggregateStats._sum.views ?? 0,
    pendingCount,
    reportsCount,
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Admin Dashboard" subtitle="Manage submissions, reports, and platform health." />
      <AdminPanel
        stats={stats}
        pending={pending as any[]}
        reports={reports as any[]}
        colleges={colleges as any[]}
      />
    </div>
  );
}
