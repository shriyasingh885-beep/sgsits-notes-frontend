import { SkeletonCard, SkeletonText, SkeletonRect } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div className="space-y-2">
        <SkeletonRect className="h-8 w-1/3" />
        <SkeletonText className="w-1/4" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
