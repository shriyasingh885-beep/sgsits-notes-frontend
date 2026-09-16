import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function BranchYearPage({ params }: { params: { collegeSlug: string, year: string, branchSlug: string } }) {
  const [college, branch] = await Promise.all([
    prisma.college.findUnique({ where: { slug: params.collegeSlug } }),
    prisma.branch.findFirst({ where: { slug: params.branchSlug, college: { slug: params.collegeSlug } } })
  ]);

  if (!college || !branch) return <div>Not found</div>;

  const semesters = [1, 2].map(n => n + (parseInt(params.year) - 1) * 2);

  return (
    <div className="space-y-8">
      <PageHeader title={`${branch.name} - Year ${params.year}`} />
      <Breadcrumb items={[{ label: 'Colleges', href: '/browse' }, { label: college.name, href: `/browse/${college.slug}` }, { label: branch.name }]} />
      
      <div className="grid sm:grid-cols-2 gap-4">
        {semesters.map(s => (
          <Link key={s} href={`/browse/${college.slug}/${params.year}/branch/${branch.slug}/${s}`}>
            <Card hover className="p-5">
              <p className="font-semibold text-card-title text-ink">Semester {s}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
