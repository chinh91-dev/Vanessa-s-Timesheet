// ============================================================================
// Capacity Platform — user_skills wrappers (per-person ratings)
// ----------------------------------------------------------------------------
// public.user_skills rates one user's proficiency in one skill (1=Aware →
// 4=Trainer). Phase 1.5 added a `skill_id` FK to public.skills so ratings
// can be looked up by skill_id; the legacy `skill_name` and
// `skill_category_id` columns remain populated for back-compat.
//
// Phase 8 always writes via skill_id (resolved from public.skills) and
// reads back skill_id for joins. The unique constraint is the legacy
// (user_id, skill_category_id, skill_name); we don't fight it — just supply
// all three on insert.
//
// proficiency_level CHECK is 1..4 (HANDOFF locked). The schema dump shows
// 1..5 — that's pre-Phase 1.5. Trust the live constraint.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { SkillRow } from "./types";

export interface UserSkillRow {
  id: string;
  user_id: string;
  skill_id: string | null;
  skill_category_id: string;
  skill_name: string;
  proficiency_level: number; // 1..4
  years_experience: number | null;
  is_primary: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

const SELECT_FIELDS = [
  "id",
  "user_id",
  "skill_id",
  "skill_category_id",
  "skill_name",
  "proficiency_level",
  "years_experience",
  "is_primary",
  "created_at",
  "updated_at",
].join(", ");

const PROFICIENCY_MIN = 1;
const PROFICIENCY_MAX = 4;

const assertProficiency = (level: number): void => {
  if (
    !Number.isFinite(level) ||
    level < PROFICIENCY_MIN ||
    level > PROFICIENCY_MAX ||
    !Number.isInteger(level)
  ) {
    throw new Error(
      `[capacity-platform] proficiency_level must be an integer ${PROFICIENCY_MIN}..${PROFICIENCY_MAX} (got ${level}).`
    );
  }
};

export const PROFICIENCY_LABELS: Record<number, string> = {
  1: "Aware",
  2: "Capable",
  3: "Expert",
  4: "Trainer",
};

/** All ratings for one skill, ordered by user. */
export const listUserSkillsBySkill = async (
  skillId: string
): Promise<UserSkillRow[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = supabase;
  const { data, error } = await client
    .from("user_skills")
    .select(SELECT_FIELDS)
    .eq("skill_id", skillId)
    .order("proficiency_level", { ascending: false });
  if (error) {
    throw new Error(
      `[capacity-platform] listUserSkillsBySkill(${skillId}) failed: ${error.message}`
    );
  }
  return (data ?? []) as UserSkillRow[];
};

/** All ratings for one user, ordered by skill_name. */
export const listUserSkillsByUser = async (
  userId: string
): Promise<UserSkillRow[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = supabase;
  const { data, error } = await client
    .from("user_skills")
    .select(SELECT_FIELDS)
    .eq("user_id", userId)
    .order("skill_name", { ascending: true });
  if (error) {
    throw new Error(
      `[capacity-platform] listUserSkillsByUser(${userId}) failed: ${error.message}`
    );
  }
  return (data ?? []) as UserSkillRow[];
};

/**
 * Upsert a rating. The unique constraint is on
 * (user_id, skill_category_id, skill_name) so we always pass all three.
 * If the row exists, proficiency_level / years_experience / is_primary are
 * updated; otherwise a new row is inserted.
 */
export interface UpsertUserSkillInput {
  userId: string;
  skill: Pick<SkillRow, "id" | "name" | "category_id">;
  proficiencyLevel: number; // 1..4
  yearsExperience?: number;
  isPrimary?: boolean;
}

export const upsertUserSkill = async (
  input: UpsertUserSkillInput
): Promise<UserSkillRow> => {
  assertProficiency(input.proficiencyLevel);
  if (!input.skill.category_id) {
    throw new Error(
      `[capacity-platform] upsertUserSkill: skill ${input.skill.id} has no category_id.`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = supabase;
  const payload = {
    user_id: input.userId,
    skill_id: input.skill.id,
    skill_category_id: input.skill.category_id,
    skill_name: input.skill.name,
    proficiency_level: input.proficiencyLevel,
    years_experience: input.yearsExperience ?? 0,
    is_primary: input.isPrimary ?? false,
  };

  const { data, error } = await client
    .from("user_skills")
    .upsert(payload, {
      onConflict: "user_id,skill_category_id,skill_name",
    })
    .select(SELECT_FIELDS)
    .single();
  if (error) {
    throw new Error(
      `[capacity-platform] upsertUserSkill(${input.userId}/${input.skill.id}) failed: ${error.message}`
    );
  }
  return data as UserSkillRow;
};

/**
 * Remove a rating entirely. Use when the user no longer has the skill.
 * The unique constraint key is the legacy triple — caller passes the
 * row's id directly.
 */
export const deleteUserSkill = async (id: string): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = supabase;
  const { error } = await client.from("user_skills").delete().eq("id", id);
  if (error) {
    throw new Error(
      `[capacity-platform] deleteUserSkill(${id}) failed: ${error.message}`
    );
  }
};
