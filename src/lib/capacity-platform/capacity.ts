// ============================================================================
// Capacity Platform — Engine RPC wrappers
// ----------------------------------------------------------------------------
// Thin wrappers around the 4 capacity-platform RPCs. Each:
//   - validates input (Monday alignment) before round-tripping
//   - throws on PostgREST error so React Query's `error` channel works
//   - returns row-typed arrays / objects for downstream type safety
//
// Authorisation is enforced inside the RPCs (SECURITY DEFINER + role check).
// Customer-role users will receive a 42501 / "Access denied" error which
// these wrappers surface unmodified.
// ============================================================================

import { capacitySupabase } from "./client";
import { normaliseMondayInput } from "./monday";
import type {
  CapacityLiveRow,
  DashboardKpisRow,
  FteLossRow,
  PeriodInput,
} from "./types";

/**
 * Per-person weekly capacity row for a given Monday.
 * Wraps `public.get_capacity_live(p_week_start date)`.
 */
export const getCapacityLive = async (
  weekStart: Date | string
): Promise<CapacityLiveRow[]> => {
  const p_week_start = normaliseMondayInput(weekStart);

  const { data, error } = await capacitySupabase.rpc("get_capacity_live", {
    p_week_start,
  });

  if (error) {
    throw new Error(
      `[capacity-platform] get_capacity_live(${p_week_start}) failed: ${error.message}`
    );
  }
  return (data ?? []) as CapacityLiveRow[];
};

/**
 * KPI strip for the management hub / dashboard.
 * Wraps `public.get_dashboard_kpis(p_week_start date)`.
 *
 * Note: the SQL function returns a SETOF row — we lift the single row
 * out for the caller's convenience. Returns `null` if (somehow) empty.
 */
export const getDashboardKpis = async (
  weekStart: Date | string
): Promise<DashboardKpisRow | null> => {
  const p_week_start = normaliseMondayInput(weekStart);

  const { data, error } = await capacitySupabase.rpc("get_dashboard_kpis", {
    p_week_start,
  });

  if (error) {
    throw new Error(
      `[capacity-platform] get_dashboard_kpis(${p_week_start}) failed: ${error.message}`
    );
  }
  const rows = (data ?? []) as DashboardKpisRow[];
  return rows[0] ?? null;
};

/**
 * Per-period FTE loss summary.
 * Wraps `public.get_fte_loss_summary(p_periods jsonb default null)`.
 *
 * Pass `undefined` to use the SQL function's default rolling windows
 * (this-week / next-4-weeks / current-quarter — see migration 0013).
 */
export const getFteLossSummary = async (
  periods?: PeriodInput[]
): Promise<FteLossRow[]> => {
  const args = periods === undefined ? {} : { p_periods: periods };

  const { data, error } = await capacitySupabase.rpc(
    "get_fte_loss_summary",
    args as { p_periods?: unknown }
  );

  if (error) {
    throw new Error(
      `[capacity-platform] get_fte_loss_summary failed: ${error.message}`
    );
  }
  return (data ?? []) as FteLossRow[];
};
