// ============================================================================
// CutOverBanner — top-of-page banner driven by capacity_settings.cut_over_status
// ----------------------------------------------------------------------------
// States (locked Phase 14 default):
//   "parallel"  → amber: workbook + module run side-by-side; verify both
//   "cut_over"  → green: module is the system of record; archive workbook
//   "archived"  → no banner (cut-over complete + workbook archived)
//
// Stored as a single capacity_settings row with key='cut_over_status' and
// value as plain JSON string. Missing row → defaults to "parallel" so a
// fresh deploy is treated as in-flight.
// ============================================================================

import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useCapacitySetting } from "@/hooks/capacity-platform";

const DISMISS_KEY = "capacity-platform:cut-over-banner-dismissed";

type CutOverStatus = "parallel" | "cut_over" | "archived";

const isStatus = (raw: unknown): raw is CutOverStatus =>
  raw === "parallel" || raw === "cut_over" || raw === "archived";

const useDismissed = () => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* no-op */
    }
    setDismissed(true);
  };
  return { dismissed, dismiss };
};

const CutOverBanner = () => {
  const settingQ = useCapacitySetting<string>("cut_over_status");
  const { dismissed, dismiss } = useDismissed();

  if (settingQ.isLoading || settingQ.error) return null;

  const raw = settingQ.data;
  const status: CutOverStatus = isStatus(raw) ? raw : "parallel";
  if (status === "archived") return null;
  if (dismissed && status === "parallel") return null;

  if (status === "cut_over") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/30 p-3"
      >
        <CheckCircle2
          className="h-5 w-5 text-green-700 dark:text-green-300 mt-0.5 shrink-0"
          aria-hidden
        />
        <div className="text-sm">
          <strong className="font-semibold text-green-800 dark:text-green-200">
            Module is now the system of record.
          </strong>{" "}
          <span className="text-green-900/90 dark:text-green-100/90">
            Workbook is read-only. Archive it after the parallel-run review.
          </span>
        </div>
      </div>
    );
  }

  // parallel
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3"
    >
      <AlertTriangle
        className="h-5 w-5 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0"
        aria-hidden
      />
      <div className="text-sm flex-1">
        <strong className="font-semibold text-amber-800 dark:text-amber-200">
          Parallel run in effect.
        </strong>{" "}
        <span className="text-amber-900/90 dark:text-amber-100/90">
          The capacity workbook is still authoritative until cut-over. Verify
          KPI parity between this module and the workbook before relying on
          either alone.
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="text-amber-900/70 hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-200 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default CutOverBanner;
