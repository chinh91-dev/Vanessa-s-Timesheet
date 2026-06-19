// ============================================================================
// CellRagBadge — small per-day RAG indicator for the totals row
// ----------------------------------------------------------------------------
// Used on the person-totals row, one per day column. Shows headroom in hours
// and a RAG dot. `null` rag (no rated capacity) renders muted dash.
// ============================================================================

import type { RagStatus } from "@/lib/capacity-platform/types";

const DOT_CLASSES: Record<RagStatus, string> = {
  Red: "bg-red-600",
  Amber: "bg-amber-500",
  Green: "bg-green-600",
};

const TEXT_CLASSES: Record<RagStatus, string> = {
  Red: "text-red-700 dark:text-red-300",
  Amber: "text-amber-700 dark:text-amber-300",
  Green: "text-green-700 dark:text-green-300",
};

const fmtH = (h: number): string => {
  const r = Math.round(h * 100) / 100;
  return Number.isInteger(r) ? `${r}` : r.toFixed(2);
};

export interface CellRagBadgeProps {
  rag: RagStatus | null;
  headroomHours: number;
  totalAllocatedHours: number;
}

const CellRagBadge = ({ rag, headroomHours, totalAllocatedHours }: CellRagBadgeProps) => {
  if (!rag) {
    return (
      <div className="text-right text-xs text-muted-foreground py-1 pr-1">
        {totalAllocatedHours === 0 ? "—" : fmtH(totalAllocatedHours)}
      </div>
    );
  }
  const sign = headroomHours >= 0 ? "+" : "";
  return (
    <div
      className={`flex items-center justify-end gap-1 py-1 pr-1 tabular-nums text-xs ${TEXT_CLASSES[rag]}`}
      title={`Headroom: ${sign}${fmtH(headroomHours)}h · Allocated: ${fmtH(totalAllocatedHours)}h`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${DOT_CLASSES[rag]}`}
        aria-hidden
      />
      <span className="font-medium">{fmtH(totalAllocatedHours)}</span>
    </div>
  );
};

export default CellRagBadge;
