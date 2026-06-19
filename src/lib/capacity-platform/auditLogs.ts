// ============================================================================
// Capacity Platform — audit_logs reader
// ----------------------------------------------------------------------------
// All capacity-platform mutations write rows with action LIKE 'capacity.%'
// (Phase 3.4 trigger). This wrapper reads those rows back, optionally
// filtered to a single user_id and/or a date range.
// ============================================================================

import { capacitySupabase } from "./client";

export interface CapacityAuditRow {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity_name: string | null;
  description: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  created_at: string;
}

export interface ListAuditLogsFilter {
  /** Filter to entries whose audited subject matches this user_id (e.g.
   *  details->>'person_id' or user_id). */
  subjectUserId?: string;
  /** Inclusive lower bound on created_at (yyyy-mm-dd). */
  fromDate?: string;
  /** Inclusive upper bound on created_at (yyyy-mm-dd). */
  toDate?: string;
  /** Hard cap on rows returned (default 200). */
  limit?: number;
}

export const listCapacityAuditLogs = async (
  filter: ListAuditLogsFilter = {}
): Promise<CapacityAuditRow[]> => {
  let q = capacitySupabase
    .from("audit_logs")
    .select("*")
    .like("action", "capacity.%")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 200);

  if (filter.fromDate) q = q.gte("created_at", filter.fromDate);
  if (filter.toDate) q = q.lte("created_at", `${filter.toDate}T23:59:59Z`);

  if (filter.subjectUserId) {
    // The audit row's user_id is the actor, not the subject. We expect the
    // capacity trigger to record subject identifiers under details — most
    // commonly `person_id` or `user_id`. Filter via PostgREST's `or` so the
    // query is one round-trip.
    q = q.or(
      [
        `user_id.eq.${filter.subjectUserId}`,
        `details->>person_id.eq.${filter.subjectUserId}`,
        `details->>user_id.eq.${filter.subjectUserId}`,
      ].join(",")
    );
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(
      `[capacity-platform] listCapacityAuditLogs failed: ${error.message}`
    );
  }
  return (data ?? []) as CapacityAuditRow[];
};
