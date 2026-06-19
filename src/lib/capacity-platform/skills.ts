// ============================================================================
// Capacity Platform — Skills wrappers
// ----------------------------------------------------------------------------
// CRUD over public.skills + the get_skill_matrix RPC.
//
// `public.skills` is a small reference table (27 seeded rows on prod).
// `get_skill_matrix()` aggregates user_skills ratings into per-skill
// coverage, SPOF risk, and weighted_risk_score. See migration 0012.
// ============================================================================

import { capacitySupabase } from "./client";
import type {
  SkillInsert,
  SkillMatrixRow,
  SkillRow,
  SkillUpdate,
} from "./types";

/** All skills (active + inactive), ordered by display_order then name. */
export const listSkills = async (): Promise<SkillRow[]> => {
  const { data, error } = await capacitySupabase
    .from("skills")
    .select("*")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`[capacity-platform] listSkills failed: ${error.message}`);
  }
  return (data ?? []) as SkillRow[];
};

/** Active skills only (is_active = true). */
export const listActiveSkills = async (): Promise<SkillRow[]> => {
  const { data, error } = await capacitySupabase
    .from("skills")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `[capacity-platform] listActiveSkills failed: ${error.message}`
    );
  }
  return (data ?? []) as SkillRow[];
};

/** Per-skill matrix with coverage / SPOF / weighted risk. */
export const getSkillMatrix = async (): Promise<SkillMatrixRow[]> => {
  const { data, error } = await capacitySupabase.rpc("get_skill_matrix");

  if (error) {
    throw new Error(
      `[capacity-platform] get_skill_matrix failed: ${error.message}`
    );
  }
  return (data ?? []) as SkillMatrixRow[];
};

export const createSkill = async (input: SkillInsert): Promise<SkillRow> => {
  const { data, error } = await capacitySupabase
    .from("skills")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    throw new Error(`[capacity-platform] createSkill failed: ${error.message}`);
  }
  return data as SkillRow;
};

export const updateSkill = async (
  id: string,
  patch: SkillUpdate
): Promise<SkillRow> => {
  const { data, error } = await capacitySupabase
    .from("skills")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `[capacity-platform] updateSkill(${id}) failed: ${error.message}`
    );
  }
  return data as SkillRow;
};

/**
 * Soft-delete by flipping `is_active` → false. We don't expose a hard delete
 * because skill ids are referenced by user_skills, capacity_allocations,
 * work_requests, etc.
 */
export const deactivateSkill = async (id: string): Promise<SkillRow> =>
  updateSkill(id, { is_active: false });
