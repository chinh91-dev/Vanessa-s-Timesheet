// ============================================================================
// useUtilisationHistory — 8-week trailing utilisation sparkline
// ----------------------------------------------------------------------------
// Spec §8.7 — "trend sparkline of avg utilisation over last 8 weeks".
// Fires 8 parallel get_capacity_live calls (one per past Monday) and
// reduces each result set to its avg `allocation_pct`. TanStack caches the
// outer query for 5 minutes — past weeks rarely change.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { getCapacityLive } from "@/lib/capacity-platform/capacity";
import { mondayOf } from "@/lib/capacity-platform/monday";

export interface UtilisationHistoryPoint {
  weekStart: string; // yyyy-mm-dd
  avgUtilisationPct: number; // 0..1
  redCount: number;
}

const aggregateWeek = (
  rows: Array<{ allocation_pct: number | null; rag_status: string | null }>
): { avgUtilisationPct: number; redCount: number } => {
  if (rows.length === 0) return { avgUtilisationPct: 0, redCount: 0 };
  let sum = 0;
  let n = 0;
  let red = 0;
  for (const r of rows) {
    if (r.rag_status === "Red") red++;
    if (r.allocation_pct != null && Number.isFinite(Number(r.allocation_pct))) {
      sum += Number(r.allocation_pct);
      n++;
    }
  }
  return {
    avgUtilisationPct: n > 0 ? sum / n : 0,
    redCount: red,
  };
};

export const useUtilisationHistory = (
  endWeekStart: Date,
  weeks = 8
): ReturnType<typeof useQuery<UtilisationHistoryPoint[]>> => {
  const { session } = useAuth();
  const endMonday = mondayOf(endWeekStart);
  const endIso = format(endMonday, "yyyy-MM-dd");

  return useQuery<UtilisationHistoryPoint[]>({
    queryKey: ["capacity", "utilisation-history", endIso, weeks] as const,
    queryFn: async () => {
      const mondays: Date[] = [];
      for (let i = weeks - 1; i >= 0; i--) {
        mondays.push(addDays(endMonday, -7 * i));
      }
      const results = await Promise.all(
        mondays.map((m) => getCapacityLive(m).catch(() => []))
      );
      return mondays.map((m, i) => {
        const agg = aggregateWeek(results[i]);
        return {
          weekStart: format(m, "yyyy-MM-dd"),
          avgUtilisationPct: agg.avgUtilisationPct,
          redCount: agg.redCount,
        };
      });
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60_000,
  });
};
