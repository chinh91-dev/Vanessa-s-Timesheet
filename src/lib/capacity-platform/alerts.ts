// ============================================================================
// Capacity Platform — derived alert detectors
// ----------------------------------------------------------------------------
// Pure functions that turn the cached query data into a flat list of
// in-app alerts. Spec §12 deliveries (email, weekly digest) require Edge
// Functions; the in-app surface is built here from live data so users see
// the same signals immediately without waiting for a job.
// ============================================================================

import type {
  CapacityLiveRow,
  QuarterlyForecastRow,
  SkillMatrixRow,
} from "./types";

export type AlertSeverity = "info" | "warn" | "danger";

export interface CapacityAlert {
  id: string; // stable composite id for dedupe / read-state
  severity: AlertSeverity;
  title: string;
  description: string;
  /** Optional deep-link path. */
  link?: string;
  category: "red" | "over_on_leave" | "spof" | "rollover";
}

export const detectRedPeople = (
  rows: CapacityLiveRow[] | undefined
): CapacityAlert[] => {
  if (!rows) return [];
  return rows
    .filter((r) => r.rag_status === "Red")
    .map((r) => ({
      id: `red::${r.person_id}`,
      severity: "danger" as AlertSeverity,
      title: `${r.full_name} is Red this week`,
      description: `Allocated ${r.allocated_hours}h vs adjusted ${r.adjusted_capacity}h${
        r.allocation_pct == null
          ? ""
          : ` (${(r.allocation_pct * 100).toFixed(0)}%)`
      }.`,
      link: "/capacity-platform/allocation",
      category: "red",
    }));
};

export const detectOverAllocatedOnLeave = (
  rows: CapacityLiveRow[] | undefined
): CapacityAlert[] => {
  if (!rows) return [];
  return rows
    .filter((r) => r.over_allocated_on_leave)
    .map((r) => ({
      id: `over-leave::${r.person_id}`,
      severity: "danger" as AlertSeverity,
      title: `${r.full_name} is fully on leave but has hours allocated`,
      description: `Adjusted capacity is 0; allocated ${r.allocated_hours}h. Move or remove the allocation.`,
      link: "/capacity-platform/allocation",
      category: "over_on_leave",
    }));
};

export const detectSpofSkills = (
  rows: SkillMatrixRow[] | undefined
): CapacityAlert[] => {
  if (!rows) return [];
  const flagged = rows.filter(
    (s) => s.spof_risk === "SPOF" || s.spof_risk === "NONE"
  );
  if (flagged.length === 0) return [];
  // Aggregate to one alert per category to avoid noise; details list the
  // skill names. Keeps the bell readable when many skills are at risk.
  const noneSkills = flagged.filter((s) => s.spof_risk === "NONE");
  const spofSkills = flagged.filter((s) => s.spof_risk === "SPOF");
  const out: CapacityAlert[] = [];
  if (noneSkills.length > 0) {
    out.push({
      id: "spof::none",
      severity: "danger",
      title: `${noneSkills.length} skill${noneSkills.length === 1 ? "" : "s"} have NO expert`,
      description: noneSkills.map((s) => s.skill_name).join(", "),
      link: "/capacity-platform/skills",
      category: "spof",
    });
  }
  if (spofSkills.length > 0) {
    out.push({
      id: "spof::single",
      severity: "warn",
      title: `${spofSkills.length} SPOF skill${spofSkills.length === 1 ? "" : "s"} (one expert)`,
      description: spofSkills.map((s) => s.skill_name).join(", "),
      link: "/capacity-platform/skills",
      category: "spof",
    });
  }
  return out;
};

const QUARTER_BOUNDARY_MONTHS = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct (0-indexed)

export const detectQuarterRollover = (
  today: Date,
  savedForecasts: QuarterlyForecastRow[] | undefined
): CapacityAlert[] => {
  if (!savedForecasts) return [];
  const isQuarterStart =
    QUARTER_BOUNDARY_MONTHS.includes(today.getMonth()) &&
    today.getDate() <= 7; // surface alert for the first week of a new quarter
  if (!isQuarterStart) return [];
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const currentMonthIso = `${yyyy}-${mm}-01`;
  const exists = savedForecasts.some((f) => f.month === currentMonthIso);
  if (exists) return [];
  return [
    {
      id: `rollover::${currentMonthIso}`,
      severity: "info" as AlertSeverity,
      title: "Quarter rollover — new month forecast missing",
      description: `Save a forecast row for ${currentMonthIso} to seed the new quarter.`,
      link: "/capacity-platform/forecast",
      category: "rollover",
    },
  ];
};
