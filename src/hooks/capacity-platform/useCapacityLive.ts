// ============================================================================
// useCapacityLive — TanStack hook for public.get_capacity_live
// ----------------------------------------------------------------------------
// Returns one row per active person for the given Monday.
// Pattern matches src/hooks/useDashboardData.tsx (object-form useQuery,
// gates on session, refetchOnWindowFocus: false, retry: 1).
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getCapacityLive } from "@/lib/capacity-platform/capacity";
import { mondayOf } from "@/lib/capacity-platform/monday";
import { capacityKeys } from "./queryKeys";
import { format } from "date-fns";

export interface UseCapacityLiveOptions {
  /** Override the default 60s stale time. */
  staleTime?: number;
}

export const useCapacityLive = (
  weekStart: Date,
  options: UseCapacityLiveOptions = {}
) => {
  const { session } = useAuth();
  const monday = mondayOf(weekStart);
  const mondayIso = format(monday, "yyyy-MM-dd");

  return useQuery({
    queryKey: capacityKeys.live(mondayIso),
    queryFn: () => getCapacityLive(monday),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: options.staleTime ?? 60_000,
  });
};
