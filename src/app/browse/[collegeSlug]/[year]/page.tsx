import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function BrowseYearBranchesPage({ params }: { params: { collegeSlug: string, year: string } }) {
  const college = await prisma.college.findUnique({
    where: { slug: params.collegeSlug }
  });

  if (!college) {
    return <div>College not found</div>;
  }

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  
  // Also offer common first year subjects directly
  const commonSemesters = [1, 2].map(n => n + (parseInt(params.year) - 1) * 2);

  return (
    <div className="space-y-8">
      <PageHeader 
        title={`Year ${params.year}`} 
        subtitle="Step 3 of 3 — choose your branch or common semester." 
      />
      <div className="mb-6">
        <Breadcrumb items={[
          { label: 'Colleges', href: '/browse' },
          { label: college.name, href: `/browse/${college.slug}` },
          { label: `Year ${params.year}` }
        ]} />
      </div>

      <div className="space-y-4">
        <h2 className="text-card-title font-semibold text-ink">Common Subjects</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {commonSemesters.map(s => (
            <Link key={s} href={`/browse/${college.slug}/${params.year}/${s}`}>
              <Card hover className="p-5 flex items-center justify-between">
                <span className="font-semibold text-ink">Semester {s}</span>
                <span className="text-sage-600">→</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-card-title font-semibold text-ink">Branches</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {branches.map(b => (
            <Link key={b.id} href={`/browse/${college.slug}/${params.year}/branch/${b.slug}`}>
              <Card hover className="p-5 flex items-center justify-between">
                <span className="font-semibold text-ink">{b.name}</span>
                <span className="text-sage-600">→</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
