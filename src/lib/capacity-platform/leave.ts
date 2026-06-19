// ============================================================================
// Capacity Platform — Leave roster integration
// ----------------------------------------------------------------------------
// Read-only wrapper over the existing public.leave_applications table.
// Phase 9: pulls approved leave overlapping the requested week (Mon..Fri),
// expands per-day, and exposes a Map<userId, Map<isoDate, hours>> shape for
// the allocation grid overlay.
//
// Locked behaviour (Phase 9 defaults):
//   - Only status='approved' consumes capacity. Pending/rejected/cancelled
//     are ignored for the grid overlay.
//   - Per-day hours = profile.weekly_hours / 5, fall back to 8h if null.
//   - Sat/Sun never count (capacity grid is Mon-Fri).
//   - No public-holiday subtraction (deferred).
// ============================================================================

import { capacitySupabase } from "./client";
import { mondayOf, toMondayIso } from "./monday";
import { addDays, format } from "date-fns";

export interface ApprovedLeaveRow {
  id: string;
  user_id: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  business_days_count: number;
  status: "approved";
  leave_type_id: string;
  leave_type_name: string | null;
}

export interface LeaveDayCell {
  user_id: string;
  iso_date: string; // yyyy-mm-dd
  hours: number;
  leave_type_name: string | null;
}

// Spec §7.1 / §8.3 — fallback for hours-per-day when weekly_hours is null.
// Workbook used 7.6 h/day (i.e. 38 h / 5).
const STANDARD_WEEKLY_HOURS_FALLBACK = 38;

/**
 * Fetch all approved leave applications that overlap the requested
 * Mon..Fri window. Overlap is `start_date <= friday` AND `end_date >= monday`.
 */
export const getApprovedLeaveForWeek = async (
  weekStart: Date | string
): Promise<ApprovedLeaveRow[]> => {
  const monday =
    typeof weekStart === "string"
      ? new Date(`${weekStart}T00:00:00`)
      : mondayOf(weekStart);
  const mondayIso = toMondayIso(monday);
  const fridayIso = format(addDays(monday, 4), "yyyy-MM-dd");

  const { data, error } = await capacitySupabase
    .from("leave_applications")
    .select(
      `
        id,
        user_id,
        start_date,
        end_date,
        business_days_count,
        status,
        leave_type_id,
        leave_type:leave_types ( name )
      `
    )
    .eq("status", "approved")
    .lte("start_date", fridayIso)
    .gte("end_date", mondayIso);

  if (error) {
    throw new Error(
      `[capacity-platform] getApprovedLeaveForWeek failed: ${error.message}`
    );
  }

  return (data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any): ApprovedLeaveRow => ({
      id: row.id,
      user_id: row.user_id,
      start_date: row.start_date,
      end_date: row.end_date,
      business_days_count: row.business_days_count ?? 0,
      status: "approved",
      leave_type_id: row.leave_type_id,
      leave_type_name: row.leave_type?.name ?? null,
    })
  );
};

/**
 * Per-person daily standard-hours lookup.
 * Pass the active profiles slice from `useCapacityProfiles` (or any list with
 * { id, weekly_hours }). Falls back to 8h/day when weekly_hours is null/0.
 */
export const buildStandardDayHoursMap = (
  profiles: Array<{ id: string; weekly_hours?: number | null }>
): Map<string, number> => {
  const out = new Map<string, number>();
  for (const p of profiles) {
    const wh =
      p.weekly_hours && p.weekly_hours > 0
        ? Number(p.weekly_hours)
        : STANDARD_WEEKLY_HOURS_FALLBACK;
    out.set(p.id, wh / 5);
  }
  return out;
};

/**
 * Expand approved-leave rows into per-(user, iso_date) cells, clipped to the
 * requested Mon..Fri window. Sat/Sun are always excluded.
 */
export const explodeLeaveToDayCells = (
  rows: ApprovedLeaveRow[],
  weekStart: Date | string,
  dayHoursByUser: Map<string, number>
): LeaveDayCell[] => {
  const monday =
    typeof weekStart === "string"
      ? new Date(`${weekStart}T00:00:00`)
      : mondayOf(weekStart);
  const weekDays: string[] = [];
  for (let i = 0; i < 5; i++) {
    weekDays.push(format(addDays(monday, i), "yyyy-MM-dd"));
  }

  const cells: LeaveDayCell[] = [];
  for (const row of rows) {
    const start = row.start_date;
    const end = row.end_date;
    for (const iso of weekDays) {
      if (iso < start || iso > end) continue;
      const hours = dayHoursByUser.get(row.user_id) ?? 7.6;
      cells.push({
        user_id: row.user_id,
        iso_date: iso,
        hours,
        leave_type_name: row.leave_type_name,
      });
    }
  }
  return cells;
};

/**
 * Convenience aggregator: nested map keyed by user_id → iso_date → total hours.
 * Multiple overlapping leave rows on the same day sum (rare but defensive).
 */
export const aggregateLeaveByPersonDay = (
  cells: LeaveDayCell[]
): Map<string, Map<string, number>> => {
  const out = new Map<string, Map<string, number>>();
  for (const c of cells) {
    let inner = out.get(c.user_id);
    if (!inner) {
      inner = new Map<string, number>();
      out.set(c.user_id, inner);
    }
    inner.set(c.iso_date, (inner.get(c.iso_date) ?? 0) + c.hours);
  }
  return out;
};
