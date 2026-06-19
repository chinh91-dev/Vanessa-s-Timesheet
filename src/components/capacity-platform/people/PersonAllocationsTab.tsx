// ============================================================================
// PersonAllocationsTab — capacity_allocations for one person, this week +
// next 4 weeks. Read-only (editing happens on the Allocation page).
// ============================================================================

import { useMemo } from "react";
import { addDays, format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCapacityAllocations } from "@/hooks/capacity-platform";
import { mondayOf } from "@/lib/capacity-platform/monday";

export interface PersonAllocationsTabProps {
  personId: string;
}

const PersonAllocationsTab = ({ personId }: PersonAllocationsTabProps) => {
  const monday = mondayOf(new Date());
  const fromIso = format(monday, "yyyy-MM-dd");
  const toIso = format(addDays(monday, 7 * 4), "yyyy-MM-dd");

  const q = useCapacityAllocations({
    personId,
    weekStartFrom: fromIso,
    weekStartTo: toIso,
  });

  const rows = useMemo(() => {
    return [...(q.data ?? [])].sort((a, b) => {
      if (a.week_start_date === b.week_start_date) {
        return (a.customer ?? "").localeCompare(b.customer ?? "");
      }
      return a.week_start_date.localeCompare(b.week_start_date);
    });
  }, [q.data]);

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="text-xs text-destructive">
        Failed to load allocations: {(q.error as Error).message}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-base font-semibold">
          Allocations — this week + next 4
        </h3>
        <span className="text-xs text-muted-foreground">
          Edit on the Allocation page.
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-6 text-center">
          No allocations recorded for this window.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Mon</TableHead>
                <TableHead className="text-right">Tue</TableHead>
                <TableHead className="text-right">Wed</TableHead>
                <TableHead className="text-right">Thu</TableHead>
                <TableHead className="text-right">Fri</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    {r.week_start_date}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.customer || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {r.work_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.mon_hours}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.tue_hours}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.wed_hours}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.thu_hours}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.fri_hours}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {r.total_hours}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PersonAllocationsTab;
