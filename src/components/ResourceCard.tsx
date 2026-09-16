import Link from 'next/link';
import Card from '@/components/ui/Card';
import { TypeBadge } from '@/components/ui/Badge';
import { Eye, FileText, Star } from 'lucide-react';
import { formatSize } from '@/lib/format';

type ResourceCardData = {
  id: string;
  title: string;
  type: string;
  fileType: string;
  fileSize: number;
  downloads: number;
  views: number;
  unit?: { number: number } | null;
  topic?: { name: string } | null;
  ratings?: { stars: number }[];
};

export default function ResourceCard({ resource }: { resource: ResourceCardData }) {
  const avg =
    resource.ratings && resource.ratings.length > 0
      ? resource.ratings.reduce((sum, r) => sum + r.stars, 0) / resource.ratings.length
      : null;

  return (
    <Link href={`/notes/${resource.id}`}>
      <Card hover className="p-4 h-full flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-sage-600 shrink-0" />
            <p className="font-semibold text-body-lg text-ink truncate">{resource.title}</p>
          </div>
          <span className="text-micro text-muted shrink-0 uppercase">{resource.fileType}</span>
        </div>

        <div className="flex items-center gap-2 text-meta text-muted">
          <TypeBadge type={resource.type} />
          {resource.topic ? (
            <span>{resource.topic.name}</span>
          ) : (
            resource.unit && <span>Unit {resource.unit.number}</span>
          )}
          <span>{formatSize(resource.fileSize)}</span>
        </div>

        <div className="flex items-center justify-between text-meta text-secondary mt-auto pt-2 border-t border-border-light">
          <span className="flex items-center gap-1">
            <Eye size={13} /> {resource.views}
          </span>
          {avg !== null ? (
            <span className="flex items-center gap-1 text-sage-700">
              <Star size={13} className="fill-current text-sage-600" /> {avg.toFixed(1)}
            </span>
          ) : (
            <span className="text-muted">No ratings</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
