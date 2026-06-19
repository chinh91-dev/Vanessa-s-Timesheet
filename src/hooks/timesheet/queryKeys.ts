export const timesheetKeys = {
  all: ["timesheet"] as const,

  entries: {
    all: ["timesheet-entries"] as const,
    byWeek: (userId: string, weekStart: string, weekEnd: string) =>
      ["timesheet-entries", userId, weekStart, weekEnd] as const,
  },

  data: (userId: string, startDate: string, endDate: string) =>
    ["timesheet", userId, startDate, endDate] as const,

  weekValidation: (userId: string, weekStart: string) =>
    ["week-validation-batch", userId, weekStart] as const,

  schedule: {
    unified: () => ["work-schedule-unified"] as const,
    unifiedForUser: (userId: string) =>
      ["work-schedule-unified", userId] as const,
    weekly: () => ["weeklySchedules"] as const,
    weeklyForUser: (userId: string, weekStart: string) =>
      ["weeklySchedules", userId, weekStart] as const,
    workSchedule: () => ["workSchedule"] as const,
    weeklyWork: () => ["weeklyWorkSchedule"] as const,
    weeklyWorkForUser: (userId: string, weekStart: string) =>
      ["weeklyWorkSchedule", userId, weekStart] as const,
  },

  userProfile: (userId: string) =>
    ["user-profile-with-locations-v3", userId] as const,

  projects: () => ["projects"] as const,
} as const;
