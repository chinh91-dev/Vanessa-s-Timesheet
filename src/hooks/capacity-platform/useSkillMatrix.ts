// ============================================================================
// useSkillMatrix — TanStack hook for public.get_skill_matrix
// ----------------------------------------------------------------------------
// Reference data; refresh-on-mount-only is fine. 5-minute stale time.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getSkillMatrix } from "@/lib/capacity-platform/skills";
import { capacityKeys } from "./queryKeys";

export const useSkillMatrix = (staleTime = 5 * 60_000) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: capacityKeys.skillMatrix(),
    queryFn: getSkillMatrix,
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};
