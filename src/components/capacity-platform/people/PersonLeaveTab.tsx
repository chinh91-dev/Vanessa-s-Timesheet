// ============================================================================
// PersonLeaveTab — read-only leave list for a single user
// ----------------------------------------------------------------------------
// Reuses the existing leave-service shape so we don't duplicate the leave
// data model. Pulls from a small inline query so this tab doesn't need to
// register a new key in queryKeys.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
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
import { useAuth } from "@/context/AuthContext";
import { capacitySupabase } from "@/lib/capacity-platform/client";

interface LeaveRow {
  id: string;
  start_date: string;
  end_date: string;
  business_days_count: number;
  status: string;
  leave_type_name: string | null;
}

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-zinc-200 text-zinc-700 border-zinc-300",
  },
};

const fetchUserLeave = async (userId: string): Promise<LeaveRow[]> => {
  const { data, error } = await capacitySupabase
    .from("leave_applications")
    .select(
      `
        id,
        start_date,
        end_date,
        business_days_count,
        status,
        leave_type:leave_types ( name )
      `
    )
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(50);
  if (error) {
    throw new Error(`fetchUserLeave failed: ${error.message}`);
  }
  return (data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any): LeaveRow => ({
      id: row.id,
      start_date: row.start_date,
      end_date: row.end_date,
      business_days_count: row.business_days_count ?? 0,
      status: row.status,
      leave_type_name: row.leave_type?.name ?? null,
    })
  );
};

export interface PersonLeaveTabProps {
  userId: string;
}

const PersonLeaveTab = ({ userId }: PersonLeaveTabProps) => {
  const { session } = useAuth();
  const q = useQuery({
    queryKey: ["capacity", "person-leave", userId] as const,
    queryFn: () => fetchUserLeave(userId),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
  });

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
        Failed to load leave: {(q.error as Error).message}
      </div>
    );
  }
  const rows = q.data ?? [];

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-base font-semibold">Leave history</h3>
        <span className="text-xs text-muted-foreground">
          {rows.length} record{rows.length === 1 ? "" : "s"} (last 50)
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-6 text-center">
          No leave on file.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const meta = STATUS_META[r.status] ?? {
                  label: r.status,
                  className: "",
                };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.leave_type_name ?? "—"}
                    </TableCell>
                    <TableCell>{r.start_date}</TableCell>
                    <TableCell>{r.end_date}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.business_days_count}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PersonLeaveTab;
