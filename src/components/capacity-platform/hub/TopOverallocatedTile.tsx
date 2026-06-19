// ============================================================================
// TopOverallocatedTile — top-3 over-allocated people across the next 4 weeks
// ----------------------------------------------------------------------------
// Spec §8.7 — "top-3 over-allocated people for the next 4 weeks (forward
// look)".
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { addDays } from "date-fns";
import { useForwardCapacity } from "@/hooks/capacity-platform/useForwardCapacity";

export interface TopOverallocatedTileProps {
  /** Defaults to next-week's Monday so we don't double-count this week. */
  startWeek?: Date;
}

const TopOverallocatedTile = ({ startWeek }: TopOverallocatedTileProps) => {
  const start = startWeek ?? addDays(new Date(), 7);
  const q = useForwardCapacity(start, 4, 3);

  if (q.isLoading) {
    return <Skeleton className="h-32 w-full rounded-md" />;
  }
  if (q.error) {
    return (
      <div className="rounded-md border p-4 text-xs text-destructive">
        Failed to compute forward capacity: {(q.error as Error).message}
      </div>
    );
  }
  const rows = q.data ?? [];

  return (
    <div className="rounded-md border p-4 space-y-2">
      <h3 className="text-sm font-semibold">Top over-allocated (next 4 wk)</h3>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          No over-allocations forecast in the next 4 weeks.
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map((p) => (
            <li key={p.person_id} className="flex items-center justify-between text-sm">
              <div className="truncate">
                <div className="font-medium truncate">{p.full_name}</div>
                {p.email && (
                  <div className="text-xs text-muted-foreground truncate">
                    {p.email}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="destructive" className="tabular-nums">
                  +{p.total_overallocation_hours.toFixed(1)}h
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {p.red_weeks}/{p.weeks_inspected} wk Red
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopOverallocatedTile;
