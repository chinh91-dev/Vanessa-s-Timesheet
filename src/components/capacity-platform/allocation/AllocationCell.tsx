// ============================================================================
// AllocationCell — single (row × day) cell for the allocation grid
// ----------------------------------------------------------------------------
// Two modes:
//   - Read-only (default): tabular-nums display + optional leave overlay
//   - Editable (Phase 10): controlled <input type="number"> with debounced
//     commit handled by the parent via onChange + onBlur callbacks.
//
// Editable cell still shows the leave overlay; the overlay is informational
// only and not subtracted from the input value (allocations and leave are
// independent rows in the data model).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import {
  HOURS_MAX,
  HOURS_MIN,
  HOURS_STEP,
  clampCellHours,
} from "@/lib/capacity-platform/allocationCells";

const fmtHours = (h: number): string => {
  if (h === 0) return "—";
  const rounded = Math.round(h * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
};

export interface AllocationCellProps {
  allocatedHours: number;
  leaveHours?: number;
  leaveLabel?: string | null;
  /** Phase 10 editable mode. */
  editable?: boolean;
  onChange?: (next: number) => void;
  onCommit?: (next: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const LeaveBadge = ({
  leaveHours,
  leaveLabel,
}: {
  leaveHours: number;
  leaveLabel?: string | null;
}) => (
  <span
    className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 rounded px-1 py-px"
    title={leaveLabel ?? "Leave"}
  >
    L {fmtHours(leaveHours)}
  </span>
);

const AllocationCell = ({
  allocatedHours,
  leaveHours = 0,
  leaveLabel,
  editable = false,
  onChange,
  onCommit,
  disabled = false,
  ariaLabel,
}: AllocationCellProps) => {
  const hasLeave = leaveHours > 0;
  const [draft, setDraft] = useState<string>(String(allocatedHours ?? 0));
  const focusedRef = useRef(false);

  // Sync external value into draft when the cell isn't focused (e.g. server
  // refetch overwrites the optimistic value). Prevents typing being clobbered.
  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(allocatedHours ?? 0));
    }
  }, [allocatedHours]);

  if (!editable) {
    return (
      <div className="flex flex-col items-end justify-center gap-0.5 py-1.5 pr-1">
        <span className="text-sm tabular-nums">{fmtHours(allocatedHours)}</span>
        {hasLeave && <LeaveBadge leaveHours={leaveHours} leaveLabel={leaveLabel} />}
      </div>
    );
  }

  const commit = (raw: string) => {
    const parsed = parseFloat(raw);
    const clamped = clampCellHours(Number.isNaN(parsed) ? 0 : parsed);
    setDraft(String(clamped));
    onCommit?.(clamped);
  };

  return (
    <div className="flex flex-col items-end justify-center gap-0.5 py-1 pr-1">
      <input
        type="number"
        inputMode="decimal"
        step={HOURS_STEP}
        min={HOURS_MIN}
        max={HOURS_MAX}
        value={draft}
        disabled={disabled}
        aria-label={ariaLabel}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseFloat(raw);
          if (!Number.isNaN(parsed)) {
            const clamped = clampCellHours(parsed);
            onChange?.(clamped);
          }
        }}
        className="w-16 text-right tabular-nums text-sm bg-background border border-input rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      {hasLeave && <LeaveBadge leaveHours={leaveHours} leaveLabel={leaveLabel} />}
    </div>
  );
};

export default AllocationCell;
