// ============================================================================
// useDebouncedCellCommit — per-row debounced day-hours mutation
// ----------------------------------------------------------------------------
// One instance per allocation row. Buffers Mon-Fri patches and flushes via
// updateCapacityAllocation after `delayMs` (default 600ms). Multiple rapid
// edits to the same row coalesce into a single PATCH.
//
// On flush: invalidates capacityKeys.allocations.all + ['capacity','live'] +
// ['capacity','kpis'] (delegated to useUpdateCapacityAllocation).
//
// Optimistic update is applied to every list-form allocations cache entry
// the moment the user types — so the UI feels instant.
// ============================================================================

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateCapacityAllocation } from "./useCapacityAllocations";
import { capacityKeys } from "./queryKeys";
import { clampCellHours, type DayKey, DAY_HOURS_FIELD } from "@/lib/capacity-platform/allocationCells";
import type {
  CapacityAllocationRow,
  CapacityAllocationUpdate,
} from "@/lib/capacity-platform/types";

export interface UseDebouncedCellCommitOptions {
  delayMs?: number;
}

interface PendingPatch {
  patch: CapacityAllocationUpdate;
  timer: ReturnType<typeof setTimeout> | null;
}

export const useDebouncedCellCommit = (
  rowId: string,
  options: UseDebouncedCellCommitOptions = {}
) => {
  const { delayMs = 600 } = options;
  const qc = useQueryClient();
  const update = useUpdateCapacityAllocation();
  const pendingRef = useRef<PendingPatch>({ patch: {}, timer: null });

  // Cleanup any pending timer on unmount — run a final flush so the user's
  // last edit isn't lost when navigating away.
  useEffect(() => {
    return () => {
      const p = pendingRef.current;
      if (p.timer) clearTimeout(p.timer);
      if (Object.keys(p.patch).length > 0) {
        update.mutate({ id: rowId, patch: p.patch });
      }
      pendingRef.current = { patch: {}, timer: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId]);

  const setDayHour = useCallback(
    (day: DayKey, rawValue: number) => {
      const value = clampCellHours(rawValue);
      const field = DAY_HOURS_FIELD[day] as keyof CapacityAllocationUpdate;

      // Optimistic cache update — patch every cached list query that contains
      // this row. List queries live under capacityKeys.allocations.all.
      qc.setQueriesData<CapacityAllocationRow[] | undefined>(
        { queryKey: capacityKeys.allocations.all },
        (old) => {
          if (!old) return old;
          let dirty = false;
          const next = old.map((r) => {
            if (r.id !== rowId) return r;
            dirty = true;
            return { ...r, [field]: value } as CapacityAllocationRow;
          });
          return dirty ? next : old;
        }
      );

      // Buffer the patch; restart the debounce timer.
      const p = pendingRef.current;
      p.patch = { ...p.patch, [field]: value };
      if (p.timer) clearTimeout(p.timer);
      p.timer = setTimeout(() => {
        const flushPatch = pendingRef.current.patch;
        pendingRef.current = { patch: {}, timer: null };
        if (Object.keys(flushPatch).length === 0) return;
        update.mutate({ id: rowId, patch: flushPatch });
      }, delayMs);
    },
    [qc, rowId, update, delayMs]
  );

  const flushNow = useCallback(() => {
    const p = pendingRef.current;
    if (p.timer) clearTimeout(p.timer);
    const flushPatch = p.patch;
    pendingRef.current = { patch: {}, timer: null };
    if (Object.keys(flushPatch).length === 0) return;
    update.mutate({ id: rowId, patch: flushPatch });
  }, [rowId, update]);

  return {
    setDayHour,
    flushNow,
    isPending: update.isPending,
    error: update.error,
  };
};
