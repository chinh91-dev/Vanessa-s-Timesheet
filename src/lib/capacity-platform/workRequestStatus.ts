// ============================================================================
// Capacity Platform — Work Request status metadata & transition rules
// ----------------------------------------------------------------------------
// Single source of truth for status display order, colour, and the
// "estimated_hours required" CHECK constraint enforced server-side
// (`work_requests_estimated_hours_required_chk`).
//
// Used by both the queue table and the kanban board.
// ============================================================================

import type { WorkRequestStatus, TaskPriority } from "./types";

export const WORK_REQUEST_STATUS_ORDER: WorkRequestStatus[] = [
  "New",
  "Allocated",
  "In Progress",
  "On Hold",
  "Complete",
  "Cancelled",
];

export interface WorkRequestStatusMeta {
  label: string;
  /** Tailwind classes for badge background + text. */
  badgeClass: string;
  /** Tailwind classes for kanban column header. */
  columnClass: string;
  /** True when the server CHECK requires estimated_hours to be set. */
  requiresEstimatedHours: boolean;
}

export const WORK_REQUEST_STATUS_META: Record<
  WorkRequestStatus,
  WorkRequestStatusMeta
> = {
  New: {
    label: "New",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    columnClass: "bg-slate-50 dark:bg-slate-900/30",
    requiresEstimatedHours: false,
  },
  Allocated: {
    label: "Allocated",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    columnClass: "bg-blue-50 dark:bg-blue-950/30",
    requiresEstimatedHours: true,
  },
  "In Progress": {
    label: "In Progress",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
    columnClass: "bg-indigo-50 dark:bg-indigo-950/30",
    requiresEstimatedHours: true,
  },
  "On Hold": {
    label: "On Hold",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    columnClass: "bg-amber-50 dark:bg-amber-950/30",
    requiresEstimatedHours: true,
  },
  Complete: {
    label: "Complete",
    badgeClass: "bg-green-100 text-green-800 border-green-300",
    columnClass: "bg-green-50 dark:bg-green-950/30",
    requiresEstimatedHours: true,
  },
  Cancelled: {
    label: "Cancelled",
    badgeClass: "bg-zinc-200 text-zinc-700 border-zinc-300",
    columnClass: "bg-zinc-50 dark:bg-zinc-900/30",
    requiresEstimatedHours: false,
  },
};

export const PRIORITY_ORDER: TaskPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
];

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string; rank: number }
> = {
  urgent: {
    label: "Urgent",
    badgeClass: "bg-red-600 text-white border-red-700",
    rank: 0,
  },
  high: {
    label: "High",
    badgeClass: "bg-orange-500 text-white border-orange-600",
    rank: 1,
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-yellow-400 text-yellow-900 border-yellow-500",
    rank: 2,
  },
  low: {
    label: "Low",
    badgeClass: "bg-slate-200 text-slate-700 border-slate-300",
    rank: 3,
  },
};

/**
 * Pre-flight check before requesting a status transition. Returns a
 * human-readable error string when the transition is blocked, or null
 * when allowed.
 */
export const validateStatusTransition = (
  nextStatus: WorkRequestStatus,
  current: { estimated_hours: number | null | undefined }
): string | null => {
  const meta = WORK_REQUEST_STATUS_META[nextStatus];
  if (
    meta.requiresEstimatedHours &&
    (current.estimated_hours === null ||
      current.estimated_hours === undefined ||
      Number(current.estimated_hours) <= 0)
  ) {
    return `${nextStatus} requires "Estimated hours" to be set first.`;
  }
  return null;
};
