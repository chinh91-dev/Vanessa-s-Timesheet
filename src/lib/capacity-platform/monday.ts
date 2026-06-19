// ============================================================================
// Capacity Platform — Monday helpers
// ----------------------------------------------------------------------------
// Mirrors `getWeekStart` from `src/lib/date-utils.ts` (ISO Monday) plus:
//   - assertMonday(d)        — fail fast client-side if d isn't a Monday
//   - toMondayIso(d)         — yyyy-MM-dd string Postgres expects
//   - normaliseMondayInput   — accepts Date or string
//
// Uses date-fns directly so this module isn't coupled to date-utils.ts.
// All capacity-platform read RPCs require an ISO Monday for p_week_start.
// ============================================================================

import { format, startOfWeek } from "date-fns";

export const mondayOf = (d: Date): Date =>
  startOfWeek(d, { weekStartsOn: 1 });

export const assertMonday = (d: Date): void => {
  if (d.getDay() !== 1) {
    throw new Error(
      `[capacity-platform] week_start_date must be a Monday; got ${d
        .toISOString()
        .slice(0, 10)} (DOW=${d.getDay()}).`
    );
  }
};

export const toMondayIso = (d: Date): string => {
  assertMonday(d);
  return format(d, "yyyy-MM-dd");
};

export const normaliseMondayInput = (d: Date | string): string => {
  if (typeof d === "string") return d;
  return toMondayIso(d);
};
