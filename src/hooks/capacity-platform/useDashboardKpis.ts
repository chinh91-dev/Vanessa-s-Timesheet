// ============================================================================
// useDashboardKpis — TanStack hook for public.get_dashboard_kpis
// ----------------------------------------------------------------------------
// Returns the KPI strip row for the given Monday. The wrapper unwraps
// the SETOF so this hook resolves to `DashboardKpisRow | null`.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getDashboardKpis } from "@/lib/capacity-platform/capacity";
import { mondayOf } from "@/lib/capacity-platform/monday";
import { capacityKeys } from "./queryKeys";
import { format } from "date-fns";

export const useDashboardKpis = (weekStart: Date, staleTime = 60_000) => {
  const { session } = useAuth();
  const monday = mondayOf(weekStart);
  const mondayIso = format(monday, "yyyy-MM-dd");

  return useQuery({
    queryKey: capacityKeys.kpis(mondayIso),
    queryFn: () => getDashboardKpis(monday),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};
