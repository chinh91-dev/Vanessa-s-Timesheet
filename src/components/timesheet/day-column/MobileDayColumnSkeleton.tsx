import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const MobileDayColumnSkeleton = () => {
  return (
    <Card className="h-full shadow-sm">
      <CardContent className="p-0">
        {/* Header skeleton */}
        <div className="p-3">
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Add button skeleton */}
        <div className="px-3 pb-3">
          <Skeleton className="h-12 w-full" />
        </div>

        {/* Entry skeletons */}
        <div className="px-3 pb-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
