// ============================================================================
// useSkills / mutation hooks — public.skills CRUD
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  createSkill,
  deactivateSkill,
  listActiveSkills,
  listSkills,
  updateSkill,
} from "@/lib/capacity-platform/skills";
import type {
  SkillInsert,
  SkillRow,
  SkillUpdate,
} from "@/lib/capacity-platform/types";
import { capacityKeys } from "./queryKeys";

export const useSkills = (
  options: { activeOnly?: boolean; staleTime?: number } = {}
) => {
  const { activeOnly = false, staleTime = 5 * 60_000 } = options;
  const { session } = useAuth();

  return useQuery({
    queryKey: capacityKeys.skills.list(activeOnly),
    queryFn: () => (activeOnly ? listActiveSkills() : listSkills()),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};

export const useCreateSkill = () => {
  const qc = useQueryClient();
  return useMutation<SkillRow, Error, SkillInsert>({
    mutationFn: createSkill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.skills.all });
      qc.invalidateQueries({ queryKey: capacityKeys.skillMatrix() });
    },
  });
};

export const useUpdateSkill = () => {
  const qc = useQueryClient();
  return useMutation<SkillRow, Error, { id: string; patch: SkillUpdate }>({
    mutationFn: ({ id, patch }) => updateSkill(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.skills.all });
      qc.invalidateQueries({ queryKey: capacityKeys.skillMatrix() });
    },
  });
};

export const useDeactivateSkill = () => {
  const qc = useQueryClient();
  return useMutation<SkillRow, Error, string>({
    mutationFn: (id) => deactivateSkill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.skills.all });
      qc.invalidateQueries({ queryKey: capacityKeys.skillMatrix() });
    },
  });
};
