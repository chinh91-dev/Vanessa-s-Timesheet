// ============================================================================
// Capacity Platform — profiles wrappers (capacity-relevant columns)
// ----------------------------------------------------------------------------
// We don't own public.profiles — it's the existing platform users table — but
// Phase 1 of the capacity-platform migrations added 4 columns to it:
//
//   weekly_hours          numeric(5,2)
//   backup_for_id         uuid (FK → profiles.id)
//   on_call_capable       boolean
//   can_lead_onboarding   boolean
//
// These wrappers expose just the capacity-relevant slice and keep edits
// scoped to the new columns. Identity fields (full_name, email, role) stay
// editable on the existing /timesheet/team page.
//
// employment_status enum (per HANDOFF) is:
//   'full-time' | 'part-time' | 'temporary' | 'casual' | 'contractor'
// (Note: types.ts is stale and doesn't include 'contractor'.)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export type EmploymentStatus =
  | "full-time"
  | "part-time"
  | "temporary"
  | "casual"
  | "contractor";

export interface CapacityProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  employment_type: EmploymentStatus | null;
  is_active: boolean;
  weekly_hours: number | null;
  backup_for_id: string | null;
  on_call_capable: boolean | null;
  can_lead_onboarding: boolean | null;
  created_at: string;
  updated_at: string;
}

const SELECT_FIELDS = [
  "id",
  "full_name",
  "email",
  "employment_type",
  "is_active",
  "weekly_hours",
  "backup_for_id",
  "on_call_capable",
  "can_lead_onboarding",
  "created_at",
  "updated_at",
].join(", ");

/** All profiles with capacity platform access (any non-customer role), ordered by full_name. Active first. */
export const listCapacityProfiles = async (
  options: { activeOnly?: boolean } = {}
): Promise<CapacityProfileRow[]> => {
  const { activeOnly = false } = options;

  // Customers are redirected out of the capacity platform — exclude them here too.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roleRows } = await (supabase as any)
    .from("user_roles")
    .select("user_id")
    .not("role", "eq", "customer");
  const allowedIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...new Set<string>((roleRows ?? []).map((r: any) => r.user_id as string)),
  ];
  if (allowedIds.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from("profiles").select(SELECT_FIELDS).in("id", allowedIds);
  if (activeOnly) q = q.eq("is_active", true);
  q = q
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });
  const { data, error } = await q;
  if (error) {
    throw new Error(
      `[capacity-platform] listCapacityProfiles failed: ${error.message}`
    );
  }
  return (data ?? []) as CapacityProfileRow[];
};

/**
 * Updateable subset — only the 4 capacity-platform fields are exposed here.
 * For changing identity fields use the existing Team page.
 */
export interface CapacityProfilePatch {
  weekly_hours?: number | null;
  backup_for_id?: string | null;
  on_call_capable?: boolean | null;
  can_lead_onboarding?: boolean | null;
}

export const updateCapacityProfile = async (
  id: string,
  patch: CapacityProfilePatch
): Promise<CapacityProfileRow> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = supabase;
  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();
  if (error) {
    throw new Error(
      `[capacity-platform] updateCapacityProfile(${id}) failed: ${error.message}`
    );
  }
  return data as CapacityProfileRow;
};

/**
 * Detect a backup-chain cycle introduced by setting `personId.backup_for_id =
 * proposedBackupId`. The DB has a trigger as backstop, but this client-side
 * check gives a clearer error before the round-trip.
 *
 * Returns null if there's no cycle, or the cycle path (ids in order) if so.
 */
export const detectBackupCycle = (
  personId: string,
  proposedBackupId: string,
  profiles: CapacityProfileRow[]
): string[] | null => {
  if (!proposedBackupId) return null;
  if (proposedBackupId === personId) return [personId, personId];

  const byId = new Map(profiles.map((p) => [p.id, p] as const));
  // Walk up the backup chain from proposedBackupId. If we land back on personId, it's a cycle.
  const visited = new Set<string>();
  const path: string[] = [personId, proposedBackupId];
  let cursor: string | null | undefined = proposedBackupId;
  let safety = 0;
  while (cursor && safety < 100) {
    if (visited.has(cursor)) {
      // Pre-existing cycle in data, not introduced by us.
      return null;
    }
    visited.add(cursor);
    const node = byId.get(cursor);
    const next = node?.backup_for_id ?? null;
    if (!next) return null; // chain ends without looping back
    if (next === personId) {
      path.push(next);
      return path;
    }
    path.push(next);
    cursor = next;
    safety++;
  }
  return null;
};
