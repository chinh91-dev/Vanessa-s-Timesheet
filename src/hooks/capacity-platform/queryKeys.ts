// ============================================================================
// Capacity Platform — TanStack Query key factory
// ----------------------------------------------------------------------------
// Centralised so hooks and mutation invalidations stay aligned.
// All keys live under the 'capacity' root for one-shot prefix invalidation.
// ============================================================================

import type {
  ListAllocationsFilter,
} from "@/lib/capacity-platform/allocations";
import type {
  ListWorkRequestsFilter,
} from "@/lib/capacity-platform/workRequests";
import type {
  ListForecastFilter,
} from "@/lib/capacity-platform/forecast";
import type { PeriodInput } from "@/lib/capacity-platform/types";

export const capacityKeys = {
  all: ["capacity"] as const,

  live: (weekStartIso: string) =>
    ["capacity", "live", weekStartIso] as const,

  kpis: (weekStartIso: string) =>
    ["capacity", "kpis", weekStartIso] as const,

  skillMatrix: () => ["capacity", "skill-matrix"] as const,

  fteLoss: (periods?: PeriodInput[]) =>
    ["capacity", "fte-loss", periods ?? null] as const,

  skills: {
    all: ["capacity", "skills"] as const,
    list: (activeOnly: boolean) =>
      ["capacity", "skills", "list", activeOnly] as const,
  },

  allocations: {
    all: ["capacity", "allocations"] as const,
    list: (filter: ListAllocationsFilter) =>
      ["capacity", "allocations", "list", filter] as const,
    detail: (id: string) =>
      ["capacity", "allocations", "detail", id] as const,
  },

  workRequests: {
    all: ["capacity", "work-requests"] as const,
    list: (filter: ListWorkRequestsFilter) =>
      ["capacity", "work-requests", "list", filter] as const,
    detail: (id: string) =>
      ["capacity", "work-requests", "detail", id] as const,
    byCode: (code: string) =>
      ["capacity", "work-requests", "code", code] as const,
  },

  forecast: {
    all: ["capacity", "forecast"] as const,
    list: (filter: ListForecastFilter) =>
      ["capacity", "forecast", "list", filter] as const,
    byMonth: (month: string) =>
      ["capacity", "forecast", "month", month] as const,
  },

  settings: {
    all: ["capacity", "settings"] as const,
    detail: (key: string) =>
      ["capacity", "settings", "detail", key] as const,
  },
} as const;
