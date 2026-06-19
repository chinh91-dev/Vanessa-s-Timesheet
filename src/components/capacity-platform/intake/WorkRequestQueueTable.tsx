// ============================================================================
// WorkRequestQueueTable — table view of work_requests (queue)
// ----------------------------------------------------------------------------
// Sorted by date_received DESC then created_at DESC (server). Click a row
// to open the edit dialog.
// ============================================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_META } from "@/lib/capacity-platform/workRequestStatus";
import type { WorkRequestRow } from "@/lib/capacity-platform/types";
import type { CapacityProfileRow } from "@/lib/capacity-platform/profiles";
import WorkRequestStatusBadge from "./WorkRequestStatusBadge";

export interface WorkRequestQueueTableProps {
  rows: WorkRequestRow[];
  profilesById: Map<string, CapacityProfileRow>;
  onRowClick: (row: WorkRequestRow) => void;
}

const WorkRequestQueueTable = ({
  rows,
  profilesById,
  onRowClick,
}: WorkRequestQueueTableProps) => {
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-6 text-center border rounded-md">
        No work requests match the current filters.
      </div>
    );
  }
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono">Code</TableHead>
            <TableHead>Date received</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead className="text-right">Est (h)</TableHead>
            <TableHead>Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const pmeta = PRIORITY_META[r.priority];
            const assignee = r.assigned_to_id
              ? profilesById.get(r.assigned_to_id)
              : null;
            return (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onRowClick(r)}
              >
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="text-sm">{r.date_received}</TableCell>
                <TableCell className="font-medium">{r.customer || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.request_type ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={pmeta.badgeClass}>
                    {pmeta.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <WorkRequestStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm">
                  {assignee?.full_name ?? assignee?.email ?? (
                    <span className="text-muted-foreground italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {r.estimated_hours ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{r.due_date ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default WorkRequestQueueTable;
