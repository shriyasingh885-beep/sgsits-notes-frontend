import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SubjectCard from '@/components/ui/SubjectCard';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function SemesterSubjectsPage({ params }: { params: { collegeSlug: string, year: string, semNum: string } }) {
  const college = await prisma.college.findUnique({ where: { slug: params.collegeSlug } });
  
  if (!college) return <div>Not found</div>;

  const subjects = await prisma.subject.findMany({
    where: { semester: { number: parseInt(params.semNum) } },
    include: { _count: { select: { resources: { where: { status: 'APPROVED' } } } } }
  });

  return (
    <div className="space-y-8">
      <PageHeader title={`Semester ${params.semNum} Subjects`} />
      <Breadcrumb items={[{ label: 'Colleges', href: '/browse' }, { label: college.name, href: `/browse/${college.slug}` }, { label: `Semester ${params.semNum}` }]} />
      
      {subjects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map(s => (
            <SubjectCard key={s.id} id={s.id} name={s.name} notes={s._count.resources} layout="grid" />
          ))}
        </div>
      ) : (
        <EmptyState title="No subjects found" />
      )}
    </div>
  );
}
