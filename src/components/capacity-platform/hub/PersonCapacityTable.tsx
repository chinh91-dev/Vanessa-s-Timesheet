// ============================================================================
// PersonCapacityTable — per-person table on the Hub
// ----------------------------------------------------------------------------
// Spec §8.7 — "Per-person table — Name | Base | Leave | Adj | Alloc | Status
// (clickable rows)". Click navigates to the Allocation page filtered to
// this person's row (Phase 16 may add a per-person detail page).
// ============================================================================

import { useNavigate } from "react-router-dom";
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
import type { CapacityLiveRow, RagStatus } from "@/lib/capacity-platform/types";

const RAG: Record<RagStatus, string> = {
  Red: "bg-red-600 text-white border-red-700",
  Amber: "bg-amber-500 text-white border-amber-600",
  Green: "bg-green-600 text-white border-green-700",
};

export interface PersonCapacityTableProps {
  rows: CapacityLiveRow[] | undefined;
  isLoading?: boolean;
}

const fmtPct = (n: number | null): string =>
  n === null || n === undefined ? "—" : `${(Number(n) * 100).toFixed(0)}%`;

const PersonCapacityTable = ({ rows, isLoading }: PersonCapacityTableProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4 text-center border rounded-md">
        No active people for this week.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">Leave</TableHead>
            <TableHead className="text-right">Adj</TableHead>
            <TableHead className="text-right">Alloc</TableHead>
            <TableHead className="text-right">Util</TableHead>
            <TableHead>RAG</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.person_id}
              className="cursor-pointer hover:bg-muted/40"
              onClick={() =>
                navigate("/capacity-platform/allocation")
              }
            >
              <TableCell className="font-medium">
                <div>{r.full_name}</div>
                {r.email && (
                  <div className="text-xs text-muted-foreground">
                    {r.email}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.base_weekly_capacity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.leave_hours_this_week}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.adjusted_capacity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.allocated_hours}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtPct(r.allocation_pct)}
              </TableCell>
              <TableCell>
                {r.rag_status ? (
                  <Badge className={RAG[r.rag_status]}>{r.rag_status}</Badge>
                ) : (
                  <Badge variant="outline">—</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PersonCapacityTable;
