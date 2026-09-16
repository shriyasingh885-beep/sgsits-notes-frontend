import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Breadcrumb from '@/components/ui/Breadcrumb';

export const dynamic = 'force-dynamic';

const YEARS = [
  { id: '1', label: 'First Year', desc: 'Semesters 1 & 2' },
  { id: '2', label: 'Second Year', desc: 'Semesters 3 & 4' },
  { id: '3', label: 'Third Year', desc: 'Semesters 5 & 6' },
  { id: '4', label: 'Fourth Year', desc: 'Semesters 7 & 8' },
];

export default async function BrowseYearPage({ params }: { params: { collegeSlug: string } }) {
  const college = await prisma.college.findUnique({
    where: { slug: params.collegeSlug }
  });

  if (!college) {
    return <div>College not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title={`Browse ${college.name}`} 
        subtitle="Step 2 of 3 — choose your academic year." 
      />
      <div className="mb-6">
        <Breadcrumb items={[
          { label: 'Colleges', href: '/browse' },
          { label: college.name }
        ]} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {YEARS.map((y) => (
          <Link key={y.id} href={`/browse/${college.slug}/${y.id}`}>
            <Card hover className="p-5 h-full">
              <p className="font-semibold text-card-title text-ink">{y.label}</p>
              <p className="text-meta text-muted">{y.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
