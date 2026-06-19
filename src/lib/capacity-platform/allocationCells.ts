// ============================================================================
// Capacity Platform — pure helpers for the editable allocation grid (Phase 10)
// ----------------------------------------------------------------------------
// Cell-level RAG, headroom calc, and clamp/round utilities used by
// AllocationGrid + AllocationCell. Pure (no React, no Supabase). Trivially
// unit-testable.
// ============================================================================

import type { CapacityAllocationRow, RagStatus } from "./types";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_HOURS_FIELD: Record<DayKey, keyof CapacityAllocationRow> = {
  mon: "mon_hours",
  tue: "tue_hours",
  wed: "wed_hours",
  thu: "thu_hours",
  fri: "fri_hours",
};

export const STANDARD_WEEKLY_HOURS_FALLBACK = 40;
export const HOURS_STEP = 0.25;
export const HOURS_MIN = 0;
export const HOURS_MAX = 24;

/** Clamp + round to step. */
export const clampCellHours = (raw: number): number => {
  if (!Number.isFinite(raw)) return 0;
  const c = Math.min(HOURS_MAX, Math.max(HOURS_MIN, raw));
  // Round to HOURS_STEP without float drift.
  const stepped = Math.round(c / HOURS_STEP) * HOURS_STEP;
  return Math.round(stepped * 100) / 100;
};

export interface DailyHeadroomInput {
  /** Person's standard daily capacity hours (weekly_hours / 5). */
  dailyCapacity: number;
  /** Approved-leave hours that consume capacity on this day. */
  leaveHours: number;
  /** Sum of all allocation hours for this person on this day. */
  allocatedHours: number;
}

export const dailyHeadroom = ({
  dailyCapacity,
  leaveHours,
  allocatedHours,
}: DailyHeadroomInput): number =>
  dailyCapacity - leaveHours - allocatedHours;

/**
 * Phase 10 RAG thresholds (locked default):
 *   headroom >= 1   → Green
 *   0 <= headroom <1→ Amber
 *   headroom < 0    → Red
 *
 * `dailyCapacity` of 0 (e.g. inactive profile) returns null — not rated.
 */
export const ragForCell = (input: DailyHeadroomInput): RagStatus | null => {
  if (input.dailyCapacity <= 0) return null;
  const h = dailyHeadroom(input);
  if (h < 0) return "Red";
  if (h < 1) return "Amber";
  return "Green";
};

/** Derive standard daily capacity from a profile's weekly_hours. */
export const dailyCapacityForProfile = (
  weeklyHours: number | null | undefined
): number => {
  const wh = weeklyHours && weeklyHours > 0 ? Number(weeklyHours) : STANDARD_WEEKLY_HOURS_FALLBACK;
  return wh / 5;
};

/**
 * Sum allocation hours by (person_id, day-index) across all allocation rows.
 * Returned shape: Map<person_id, [mon, tue, wed, thu, fri]>.
 */
export const sumAllocationHoursByPersonDay = (
  rows: CapacityAllocationRow[]
): Map<string, [number, number, number, number, number]> => {
  const m = new Map<string, [number, number, number, number, number]>();
  for (const a of rows) {
    const cur = m.get(a.person_id) ?? [0, 0, 0, 0, 0];
    DAY_KEYS.forEach((dk, i) => {
      const v = a[DAY_HOURS_FIELD[dk]] as number | null | undefined;
      cur[i] += Number(v ?? 0);
    });
    m.set(a.person_id, cur);
  }
  return m;
};

/**
 * Sum allocation hours by (customer, person, day) for the customer drilldown.
 * Returned shape: Map<customer, Map<person_id, [mon..fri]>>.
 */
export const sumAllocationHoursByCustomerPersonDay = (
  rows: CapacityAllocationRow[]
): Map<string, Map<string, [number, number, number, number, number]>> => {
  const m = new Map<
    string,
    Map<string, [number, number, number, number, number]>
  >();
  for (const a of rows) {
    const ck = a.customer ?? "(unspecified)";
    let inner = m.get(ck);
    if (!inner) {
      inner = new Map<string, [number, number, number, number, number]>();
      m.set(ck, inner);
    }
    const cur = inner.get(a.person_id) ?? [0, 0, 0, 0, 0];
    DAY_KEYS.forEach((dk, i) => {
      const v = a[DAY_HOURS_FIELD[dk]] as number | null | undefined;
      cur[i] += Number(v ?? 0);
    });
    inner.set(a.person_id, cur);
  }
  return m;
};
