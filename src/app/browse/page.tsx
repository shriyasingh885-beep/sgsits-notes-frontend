import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { MapPin } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function BrowseCollegesPage() {
  const colleges = await prisma.college.findMany({ orderBy: { name: 'asc' } });
  
  return (
    <div className="space-y-8">
      <PageHeader title="Browse by College" subtitle="Step 1 of 3 — choose where you study." />
      <div className="grid sm:grid-cols-2 gap-4">
        {colleges.map((c) => (
          <Link key={c.id} href={`/browse/${c.slug}`}>
            <Card hover className="p-5 flex items-start gap-3">
              <MapPin size={20} className="text-sage-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-card-title text-ink">{c.name}</p>
                <p className="text-meta text-muted">{c.city}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
