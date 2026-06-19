// ============================================================================
// useUserSkills — TanStack hooks around user_skills CRUD
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  deleteUserSkill,
  listUserSkillsBySkill,
  listUserSkillsByUser,
  upsertUserSkill,
  type UpsertUserSkillInput,
  type UserSkillRow,
} from "@/lib/capacity-platform/userSkills";

const USER_SKILLS_KEY = ["capacity", "user-skills"] as const;

export const useUserSkillsBySkill = (skillId: string | undefined) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: skillId
      ? ([...USER_SKILLS_KEY, "by-skill", skillId] as const)
      : (["capacity", "user-skills", "by-skill", "noop"] as const),
    queryFn: () =>
      skillId ? listUserSkillsBySkill(skillId) : Promise.resolve([]),
    enabled: !!session?.user?.id && !!skillId,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
  });
};

export const useUserSkillsByUser = (userId: string | undefined) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: userId
      ? ([...USER_SKILLS_KEY, "by-user", userId] as const)
      : (["capacity", "user-skills", "by-user", "noop"] as const),
    queryFn: () =>
      userId ? listUserSkillsByUser(userId) : Promise.resolve([]),
    enabled: !!session?.user?.id && !!userId,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
  });
};

export const useUpsertUserSkill = () => {
  const qc = useQueryClient();
  return useMutation<UserSkillRow, Error, UpsertUserSkillInput>({
    mutationFn: upsertUserSkill,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: USER_SKILLS_KEY });
      qc.invalidateQueries({
        queryKey: [...USER_SKILLS_KEY, "by-skill", vars.skill.id],
      });
      qc.invalidateQueries({
        queryKey: [...USER_SKILLS_KEY, "by-user", vars.userId],
      });
      // get_skill_matrix aggregates user_skills, so refresh it.
      qc.invalidateQueries({ queryKey: ["capacity", "skill-matrix"] });
    },
  });
};

export const useDeleteUserSkill = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteUserSkill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_SKILLS_KEY });
      qc.invalidateQueries({ queryKey: ["capacity", "skill-matrix"] });
    },
  });
};
