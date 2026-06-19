// ============================================================================
// useAllUserSkills — bulk fetch every user_skills row (heat-map source)
// ----------------------------------------------------------------------------
// One round-trip; returned rows are pivoted client-side into a
// (skill_id, user_id) → proficiency map by the heat-map component.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { capacitySupabase } from "@/lib/capacity-platform/client";

export interface AllUserSkillRow {
  id: string;
  user_id: string;
  skill_id: string | null;
  skill_category_id: string;
  skill_name: string;
  proficiency_level: number;
  is_primary: boolean | null;
}

export const useAllUserSkills = () => {
  const { session } = useAuth();
  return useQuery<AllUserSkillRow[]>({
    queryKey: ["capacity", "user-skills", "all"] as const,
    queryFn: async () => {
      const { data, error } = await capacitySupabase
        .from("user_skills")
        .select(
          "id, user_id, skill_id, skill_category_id, skill_name, proficiency_level, is_primary"
        );
      if (error) {
        throw new Error(`useAllUserSkills failed: ${error.message}`);
      }
      return (data ?? []) as AllUserSkillRow[];
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
  });
};
