// ============================================================================
// useForwardCapacity — top-N over-allocated people across the next N weeks
// ----------------------------------------------------------------------------
// Spec §8.7 — "top-3 over-allocated people for the next 4 weeks (forward
// look)". Fires N parallel get_capacity_live calls, sums each person's
// over-allocation hours (max(0, allocated − adjusted) per week), and
// returns top-N by total over-allocation.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { getCapacityLive } from "@/lib/capacity-platform/capacity";
import { mondayOf } from "@/lib/capacity-platform/monday";

export interface ForwardOverallocatedPerson {
  person_id: string;
  full_name: string;
  email: string | null;
  total_overallocation_hours: number;
  red_weeks: number;
  weeks_inspected: number;
}

export const useForwardCapacity = (
  startWeek: Date,
  weeks = 4,
  topN = 3
): ReturnType<typeof useQuery<ForwardOverallocatedPerson[]>> => {
  const { session } = useAuth();
  const startMonday = mondayOf(startWeek);
  const startIso = format(startMonday, "yyyy-MM-dd");

  return useQuery<ForwardOverallocatedPerson[]>({
    queryKey: [
      "capacity",
      "forward-overallocated",
      startIso,
      weeks,
      topN,
    ] as const,
    queryFn: async () => {
      const mondays: Date[] = [];
      for (let i = 0; i < weeks; i++) {
        mondays.push(addDays(startMonday, 7 * i));
      }
      const results = await Promise.all(
        mondays.map((m) => getCapacityLive(m).catch(() => []))
      );
      const acc = new Map<string, ForwardOverallocatedPerson>();
      for (const rows of results) {
        for (const r of rows) {
          const allocated = Number(r.allocated_hours ?? 0);
          const adj = Number(r.adjusted_capacity ?? 0);
          const over = Math.max(0, allocated - adj);
          const cur = acc.get(r.person_id) ?? {
            person_id: r.person_id,
            full_name: r.full_name,
            email: r.email,
            total_overallocation_hours: 0,
            red_weeks: 0,
            weeks_inspected: weeks,
          };
          cur.total_overallocation_hours += over;
          if (r.rag_status === "Red") cur.red_weeks += 1;
          acc.set(r.person_id, cur);
        }
      }
      return Array.from(acc.values())
        .filter((p) => p.total_overallocation_hours > 0 || p.red_weeks > 0)
        .sort(
          (a, b) =>
            b.total_overallocation_hours - a.total_overallocation_hours ||
            b.red_weeks - a.red_weeks
        )
        .slice(0, topN);
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
  });
};
