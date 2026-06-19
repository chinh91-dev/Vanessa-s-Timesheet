// ============================================================================
// LeaveHorizonTile — approved leave overlapping the next 14 days
// ----------------------------------------------------------------------------
// Spec §8.7 — "leave on the horizon — next 14 days".
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";
import { CalendarRange } from "lucide-react";
import { useLeaveHorizon } from "@/hooks/capacity-platform/useLeaveHorizon";

const LeaveHorizonTile = () => {
  const q = useLeaveHorizon(new Date(), 14);

  if (q.isLoading) {
    return <Skeleton className="h-32 w-full rounded-md" />;
  }
  if (q.error) {
    return (
      <div className="rounded-md border p-4 text-xs text-destructive">
        Failed to load leave horizon: {(q.error as Error).message}
      </div>
    );
  }
  const rows = q.data ?? [];

  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Leave on the horizon (14 d)</h3>
        <CalendarRange className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          No approved leave in the next 14 days.
        </div>
      ) : (
        <ul className="space-y-1 max-h-56 overflow-y-auto">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between text-sm gap-2"
            >
              <div className="truncate">
                <div className="font-medium truncate">
                  {r.user_full_name ?? r.user_id.slice(0, 8)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.leave_type_name ?? "Leave"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums shrink-0 text-right">
                <div>
                  {r.start_date} → {r.end_date}
                </div>
                <div>{r.business_days_count}d</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LeaveHorizonTile;
