// ============================================================================
// Capacity Platform — Public surface
// ----------------------------------------------------------------------------
// Thin barrel re-exports so callers can write
//   import { getCapacityLive, listSkills, ... } from "@/lib/capacity-platform";
// instead of digging into individual files.
// ============================================================================

export * from "./types";
export * from "./monday";
export * from "./capacity";
export * from "./skills";
export * from "./allocations";
export * from "./workRequests";
export * from "./forecast";
export * from "./settings";
export { capacitySupabase } from "./client";
