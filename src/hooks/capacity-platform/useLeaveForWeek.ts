// ============================================================================
// useLeaveForWeek — week-scoped approved-leave hook
// ----------------------------------------------------------------------------
// Returns the raw approved-leave rows that overlap the requested Mon..Fri
// window. Consumers can derive per-(user,day) cells via
// `explodeLeaveToDayCells` once profiles are also resolved.
//
// Gates on session, refetchOnWindowFocus: false, retry: 1 — same pattern as
// the rest of the capacity-platform hooks.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { mondayOf } from "@/lib/capacity-platform/monday";
import {
  getApprovedLeaveForWeek,
  type ApprovedLeaveRow,
} from "@/lib/capacity-platform/leave";

export interface UseLeaveForWeekOptions {
  staleTime?: number;
}

export const leaveQueryKey = (mondayIso: string) =>
  ["capacity", "leave", "week", mondayIso] as const;

export const useLeaveForWeek = (
  weekStart: Date,
  options: UseLeaveForWeekOptions = {}
) => {
  const { session } = useAuth();
  const monday = mondayOf(weekStart);
  const mondayIso = format(monday, "yyyy-MM-dd");

  return useQuery<ApprovedLeaveRow[]>({
    queryKey: leaveQueryKey(mondayIso),
    queryFn: () => getApprovedLeaveForWeek(monday),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: options.staleTime ?? 60_000,
  });
};
