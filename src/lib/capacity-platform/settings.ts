// ============================================================================
// Capacity Platform — capacity_settings get/set
// ----------------------------------------------------------------------------
// Key/jsonb tunables. Seeded keys (per migration 0007):
//   fte_hours_per_week     number   (default 38)
//   rag_red_pct            number   (default 0.95)
//   rag_amber_pct          number   (default 0.75)
//   week_start_day         string   (default "Monday")
//   default_holiday_state  string   (default "VIC")
//
// Wrappers expose typed convenience getters for the seeded keys plus a
// generic listAll / setSetting for ad-hoc keys.
// ============================================================================

import { capacitySupabase } from "./client";
import type { CapacitySettingRow } from "./types";

export type SettingKey =
  | "fte_hours_per_week"
  | "rag_red_pct"
  | "rag_amber_pct"
  | "week_start_day"
  | "default_holiday_state"
  | (string & {}); // allow ad-hoc keys without losing autocomplete on the seeded ones

export const listCapacitySettings = async (): Promise<CapacitySettingRow[]> => {
  const { data, error } = await capacitySupabase
    .from("capacity_settings")
    .select("*")
    .order("key", { ascending: true });

  if (error) {
    throw new Error(
      `[capacity-platform] listCapacitySettings failed: ${error.message}`
    );
  }
  return (data ?? []) as CapacitySettingRow[];
};

export const getCapacitySetting = async <T = unknown>(
  key: SettingKey
): Promise<T | null> => {
  const { data, error } = await capacitySupabase
    .from("capacity_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[capacity-platform] getCapacitySetting(${key}) failed: ${error.message}`
    );
  }
  if (!data) return null;
  return (data as { value: unknown }).value as T;
};

/**
 * Upsert a single setting. `value` is stored as jsonb — pass numbers as
 * numbers, strings as strings, etc. Postgres-side cast on read.
 */
export const setCapacitySetting = async (
  key: SettingKey,
  value: unknown,
  description?: string
): Promise<CapacitySettingRow> => {
  const row: { key: string; value: unknown; description?: string } = {
    key,
    value,
  };
  if (description !== undefined) row.description = description;

  const { data, error } = await capacitySupabase
    .from("capacity_settings")
    .upsert(row, { onConflict: "key" })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `[capacity-platform] setCapacitySetting(${key}) failed: ${error.message}`
    );
  }
  return data as CapacitySettingRow;
};

// --- Typed convenience accessors for the seeded keys ------------------------

export const getFteHoursPerWeek = (): Promise<number | null> =>
  getCapacitySetting<number>("fte_hours_per_week");

export const getRagRedPct = (): Promise<number | null> =>
  getCapacitySetting<number>("rag_red_pct");

export const getRagAmberPct = (): Promise<number | null> =>
  getCapacitySetting<number>("rag_amber_pct");

export const getWeekStartDay = (): Promise<string | null> =>
  getCapacitySetting<string>("week_start_day");

export const getDefaultHolidayState = (): Promise<string | null> =>
  getCapacitySetting<string>("default_holiday_state");
