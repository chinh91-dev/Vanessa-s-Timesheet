// ============================================================================
// FteLossPanel — read-only summary of get_fte_loss_summary
// ----------------------------------------------------------------------------
// Used on both the Forecast page (compact card) and Reports page (full
// table). Default windows passed by RPC: server picks "this week", "next 4
// weeks", and "this quarter" when periods is null.
// ============================================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useFteLossSummary } from "@/hooks/capacity-platform";

export interface FteLossPanelProps {
  variant?: "card" | "full";
}

const FteLossPanel = ({ variant = "card" }: FteLossPanelProps) => {
  const q = useFteLossSummary();

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
        Failed to load FTE loss: {(q.error as Error).message}
      </div>
    );
  }
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        No leave forecast in the default windows.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            {variant === "full" && <TableHead>Range</TableHead>}
            <TableHead className="text-right">Leave (h)</TableHead>
            <TableHead className="text-right">FTE lost</TableHead>
            <TableHead className="text-right">Headcount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.period_label}>
              <TableCell className="font-medium">{r.period_label}</TableCell>
              {variant === "full" && (
                <TableCell className="text-xs text-muted-foreground">
                  {r.period_start} → {r.period_end}
                </TableCell>
              )}
              <TableCell className="text-right tabular-nums">
                {r.total_leave_hours}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.fte_lost.toFixed(2)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.headcount_on_leave}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FteLossPanel;
