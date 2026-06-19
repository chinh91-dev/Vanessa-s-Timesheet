import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LayoutSkeletonProps {
  variant?: "default" | "crm" | "hub";
}

/**
 * Layout skeleton component that shows app structure while loading
 * Provides instant visual feedback without layout shift
 */
export const LayoutSkeleton: React.FC<LayoutSkeletonProps> = ({
  variant = "default"
}) => {
  const showSidebar = variant === "default" || variant === "crm";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-gray-50/50 dark:from-background dark:via-background dark:to-background">
      {/* Header skeleton */}
      <header className="h-14 sm:h-[60px] border-b bg-background/80 backdrop-blur-sm flex items-center px-4 gap-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-24" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>

      <div className="flex w-full h-[calc(100vh-56px)] sm:h-[calc(100vh-60px)]">
        {/* Sidebar skeleton */}
        {showSidebar && (
          <aside className="hidden md:flex w-16 lg:w-60 border-r bg-background/50 flex-col p-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-20 hidden lg:block" />
              </div>
            ))}
          </aside>
        )}

        {/* Main content skeleton */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Page header skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* Content area skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>

            {/* Table/list skeleton */}
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LayoutSkeleton;
