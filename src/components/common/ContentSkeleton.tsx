import { Skeleton } from "@/components/ui/skeleton";

const ContentSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Content grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* Main content area */}
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
};

export default ContentSkeleton;
