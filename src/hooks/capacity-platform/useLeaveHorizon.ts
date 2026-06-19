// ============================================================================
// useLeaveHorizon — approved leave overlapping the next 14 days
// ----------------------------------------------------------------------------
// Spec §8.7 — "leave on the horizon — next 14 days". Read-only view.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { capacitySupabase } from "@/lib/capacity-platform/client";

export interface LeaveHorizonRow {
  id: string;
  user_id: string;
  user_full_name: string | null;
  start_date: string;
  end_date: string;
  business_days_count: number;
  leave_type_name: string | null;
}

export const useLeaveHorizon = (
  fromDate: Date = new Date(),
  days = 14
): ReturnType<typeof useQuery<LeaveHorizonRow[]>> => {
  const { session } = useAuth();
  const fromIso = format(fromDate, "yyyy-MM-dd");
  const toIso = format(addDays(fromDate, days), "yyyy-MM-dd");

  return useQuery<LeaveHorizonRow[]>({
    queryKey: ["capacity", "leave-horizon", fromIso, days] as const,
    queryFn: async () => {
      const { data, error } = await capacitySupabase
        .from("leave_applications")
        .select(
          `
            id,
            user_id,
            start_date,
            end_date,
            business_days_count,
            status,
            leave_type:leave_types ( name ),
            user:profiles!leave_applications_user_id_fkey ( full_name )
          `
        )
        .eq("status", "approved")
        .lte("start_date", toIso)
        .gte("end_date", fromIso)
        .order("start_date", { ascending: true });

      if (error) {
        throw new Error(
          `[capacity-platform] useLeaveHorizon failed: ${error.message}`
        );
      }
      return (data ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (row: any): LeaveHorizonRow => ({
          id: row.id,
          user_id: row.user_id,
          user_full_name: row.user?.full_name ?? null,
          start_date: row.start_date,
          end_date: row.end_date,
          business_days_count: row.business_days_count ?? 0,
          leave_type_name: row.leave_type?.name ?? null,
        })
      );
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60_000,
  });
};
