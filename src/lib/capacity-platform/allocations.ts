// ============================================================================
// Capacity Platform — capacity_allocations CRUD
// ----------------------------------------------------------------------------
// Each row = one (person, week_start_date, customer, work_type) bucket.
// total_hours is generated server-side; never set it on insert/update.
// week_start_date must be a Monday — enforced by SQL CHECK and re-validated
// here for fast client-side feedback.
// ============================================================================

import { capacitySupabase } from "./client";
import { normaliseMondayInput } from "./monday";
import type {
  CapacityAllocationInsert,
  CapacityAllocationRow,
  CapacityAllocationUpdate,
  WorkType,
} from "./types";

export interface ListAllocationsFilter {
  /** Inclusive Monday lower-bound (or single week if upper not given). */
  weekStartFrom?: Date | string;
  /** Inclusive Monday upper-bound. */
  weekStartTo?: Date | string;
  personId?: string;
  customer?: string;
  workType?: WorkType;
}

export const listCapacityAllocations = async (
  filter: ListAllocationsFilter = {}
): Promise<CapacityAllocationRow[]> => {
  let q = capacitySupabase
    .from("capacity_allocations")
    .select("*")
    .order("week_start_date", { ascending: true })
    .order("customer", { ascending: true });

  if (filter.weekStartFrom) {
    q = q.gte("week_start_date", normaliseMondayInput(filter.weekStartFrom));
  }
  if (filter.weekStartTo) {
    q = q.lte("week_start_date", normaliseMondayInput(filter.weekStartTo));
  }
  if (filter.personId) {
    q = q.eq("person_id", filter.personId);
  }
  if (filter.customer) {
    q = q.eq("customer", filter.customer);
  }
  if (filter.workType) {
    q = q.eq("work_type", filter.workType);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(
      `[capacity-platform] listCapacityAllocations failed: ${error.message}`
    );
  }
  return (data ?? []) as CapacityAllocationRow[];
};

export const getCapacityAllocation = async (
  id: string
): Promise<CapacityAllocationRow | null> => {
  const { data, error } = await capacitySupabase
    .from("capacity_allocations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[capacity-platform] getCapacityAllocation(${id}) failed: ${error.message}`
    );
  }
  return (data ?? null) as CapacityAllocationRow | null;
};

export const createCapacityAllocation = async (
  input: CapacityAllocationInsert
): Promise<CapacityAllocationRow> => {
  // Validate Monday alignment client-side before round-trip.
  normaliseMondayInput(input.week_start_date);

  const { data, error } = await capacitySupabase
    .from("capacity_allocations")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `[capacity-platform] createCapacityAllocation failed: ${error.message}`
    );
  }
  return data as CapacityAllocationRow;
};

export const updateCapacityAllocation = async (
  id: string,
  patch: CapacityAllocationUpdate
): Promise<CapacityAllocationRow> => {
  if (patch.week_start_date) {
    normaliseMondayInput(patch.week_start_date);
  }

  const { data, error } = await capacitySupabase
    .from("capacity_allocations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `[capacity-platform] updateCapacityAllocation(${id}) failed: ${error.message}`
    );
  }
  return data as CapacityAllocationRow;
};

export const deleteCapacityAllocation = async (id: string): Promise<void> => {
  const { error } = await capacitySupabase
    .from("capacity_allocations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `[capacity-platform] deleteCapacityAllocation(${id}) failed: ${error.message}`
    );
  }
};
