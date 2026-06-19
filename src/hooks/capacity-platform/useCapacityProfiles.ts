// ============================================================================
// useCapacityProfiles — list + update wrappers around capacity-relevant
// columns of public.profiles
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  listCapacityProfiles,
  updateCapacityProfile,
  type CapacityProfilePatch,
  type CapacityProfileRow,
} from "@/lib/capacity-platform/profiles";

const PROFILES_KEY = ["capacity", "profiles"] as const;

export const useCapacityProfiles = (
  options: { activeOnly?: boolean; staleTime?: number } = {}
) => {
  const { activeOnly = false, staleTime = 60_000 } = options;
  const { session } = useAuth();
  return useQuery({
    queryKey: [...PROFILES_KEY, "list", activeOnly] as const,
    queryFn: () => listCapacityProfiles({ activeOnly }),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};

export const useUpdateCapacityProfile = () => {
  const qc = useQueryClient();
  return useMutation<
    CapacityProfileRow,
    Error,
    { id: string; patch: CapacityProfilePatch }
  >({
    mutationFn: ({ id, patch }) => updateCapacityProfile(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILES_KEY });
      // weekly_hours / on_call_capable feed get_capacity_live + dashboard kpis.
      qc.invalidateQueries({ queryKey: ["capacity", "live"] });
      qc.invalidateQueries({ queryKey: ["capacity", "kpis"] });
      qc.invalidateQueries({ queryKey: ["capacity", "fte-loss"] });
    },
  });
};
