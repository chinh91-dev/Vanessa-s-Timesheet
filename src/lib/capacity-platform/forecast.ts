// ============================================================================
// Capacity Platform — quarterly_forecast CRUD
// ----------------------------------------------------------------------------
// One row per calendar month with qualitative gap commentary + RAG flag.
// SQL CHECK constraints:
//   - month must be the 1st of a month (extract(day from month) = 1)
//   - rag = 'Red' requires non-empty mitigation_plan
// Both are also re-checked client-side for fast feedback.
// ============================================================================

import { capacitySupabase } from "./client";
import type {
  QuarterlyForecastInsert,
  QuarterlyForecastRow,
  QuarterlyForecastUpdate,
} from "./types";

const assertFirstOfMonth = (iso: string): void => {
  // iso is yyyy-mm-dd; the day part lives at chars 8..10.
  const day = iso.slice(8, 10);
  if (day !== "01") {
    throw new Error(
      `[capacity-platform] quarterly_forecast.month must be the 1st of a month (got ${iso}).`
    );
  }
};

const assertRedHasMitigation = (
  rag: QuarterlyForecastInsert["rag"] | undefined,
  mitigation: string | null | undefined
): void => {
  if (rag === "Red" && (!mitigation || mitigation.trim().length === 0)) {
    throw new Error(
      "[capacity-platform] quarterly_forecast.rag='Red' requires a non-empty mitigation_plan."
    );
  }
};

export interface ListForecastFilter {
  /** Inclusive lower bound (yyyy-mm-01). */
  monthFrom?: string;
  /** Inclusive upper bound (yyyy-mm-01). */
  monthTo?: string;
}

export const listQuarterlyForecasts = async (
  filter: ListForecastFilter = {}
): Promise<QuarterlyForecastRow[]> => {
  let q = capacitySupabase
    .from("quarterly_forecast")
    .select("*")
    .order("month", { ascending: true });

  if (filter.monthFrom) q = q.gte("month", filter.monthFrom);
  if (filter.monthTo) q = q.lte("month", filter.monthTo);

  const { data, error } = await q;
  if (error) {
    throw new Error(
      `[capacity-platform] listQuarterlyForecasts failed: ${error.message}`
    );
  }
  return (data ?? []) as QuarterlyForecastRow[];
};

export const getQuarterlyForecastByMonth = async (
  month: string
): Promise<QuarterlyForecastRow | null> => {
  assertFirstOfMonth(month);

  const { data, error } = await capacitySupabase
    .from("quarterly_forecast")
    .select("*")
    .eq("month", month)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[capacity-platform] getQuarterlyForecastByMonth(${month}) failed: ${error.message}`
    );
  }
  return (data ?? null) as QuarterlyForecastRow | null;
};

export const upsertQuarterlyForecast = async (
  input: QuarterlyForecastInsert
): Promise<QuarterlyForecastRow> => {
  assertFirstOfMonth(input.month);
  assertRedHasMitigation(input.rag, input.mitigation_plan);

  const { data, error } = await capacitySupabase
    .from("quarterly_forecast")
    .upsert(input, { onConflict: "month" })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `[capacity-platform] upsertQuarterlyForecast(${input.month}) failed: ${error.message}`
    );
  }
  return data as QuarterlyForecastRow;
};

export const updateQuarterlyForecast = async (
  id: string,
  patch: QuarterlyForecastUpdate
): Promise<QuarterlyForecastRow> => {
  if (patch.month) assertFirstOfMonth(patch.month);
  // We can only validate Red+mitigation if both are in the patch; otherwise
  // we let the DB CHECK fire on persist.
  if (patch.rag !== undefined && patch.mitigation_plan !== undefined) {
    assertRedHasMitigation(patch.rag, patch.mitigation_plan);
  }

  const { data, error } = await capacitySupabase
    .from("quarterly_forecast")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `[capacity-platform] updateQuarterlyForecast(${id}) failed: ${error.message}`
    );
  }
  return data as QuarterlyForecastRow;
};

export const deleteQuarterlyForecast = async (id: string): Promise<void> => {
  const { error } = await capacitySupabase
    .from("quarterly_forecast")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `[capacity-platform] deleteQuarterlyForecast(${id}) failed: ${error.message}`
    );
  }
};
