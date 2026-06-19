// ============================================================================
// useFteLossSummary — TanStack hook for public.get_fte_loss_summary
// ----------------------------------------------------------------------------
// Periods are passed through to the RPC as jsonb. Pass `undefined` to use
// the SQL function's default rolling windows.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getFteLossSummary } from "@/lib/capacity-platform/capacity";
import type { PeriodInput } from "@/lib/capacity-platform/types";
import { capacityKeys } from "./queryKeys";

export const useFteLossSummary = (
  periods?: PeriodInput[],
  staleTime = 5 * 60_000
) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: capacityKeys.fteLoss(periods),
    queryFn: () => getFteLossSummary(periods),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};
