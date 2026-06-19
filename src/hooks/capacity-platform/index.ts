// ============================================================================
// Capacity Platform — Hooks barrel
// ============================================================================

export { capacityKeys } from "./queryKeys";

export { useCapacityLive } from "./useCapacityLive";
export type { UseCapacityLiveOptions } from "./useCapacityLive";

export { useDashboardKpis } from "./useDashboardKpis";
export { useSkillMatrix } from "./useSkillMatrix";
export { useFteLossSummary } from "./useFteLossSummary";

export {
  useSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeactivateSkill,
} from "./useSkills";

export {
  useCapacityAllocations,
  useCapacityAllocation,
  useCreateCapacityAllocation,
  useUpdateCapacityAllocation,
  useDeleteCapacityAllocation,
} from "./useCapacityAllocations";

export {
  useWorkRequests,
  useWorkRequest,
  useWorkRequestByCode,
  useCreateWorkRequest,
  useUpdateWorkRequest,
  useTransitionWorkRequestStatus,
  useDeleteWorkRequest,
} from "./useWorkRequests";

export {
  useQuarterlyForecasts,
  useQuarterlyForecastByMonth,
  useUpsertQuarterlyForecast,
  useUpdateQuarterlyForecast,
  useDeleteQuarterlyForecast,
} from "./useQuarterlyForecast";

export {
  useCapacitySettings,
  useCapacitySetting,
  useSetCapacitySetting,
} from "./useCapacitySettings";

export {
  useCapacityProfiles,
  useUpdateCapacityProfile,
} from "./useCapacityProfiles";

export {
  useUserSkillsBySkill,
  useUserSkillsByUser,
  useUpsertUserSkill,
  useDeleteUserSkill,
} from "./useUserSkills";

export { useLeaveForWeek, leaveQueryKey } from "./useLeaveForWeek";
export type { UseLeaveForWeekOptions } from "./useLeaveForWeek";
