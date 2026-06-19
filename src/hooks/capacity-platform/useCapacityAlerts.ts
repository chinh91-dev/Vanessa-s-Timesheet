// ============================================================================
// useCapacityAlerts — composes live + skill-matrix + forecast queries into
// a single AlertItem[] for the in-app notifications bell.
// ----------------------------------------------------------------------------
// Read state (which alerts the user has dismissed) is stored in localStorage
// keyed by alert.id, so the bell stays quiet across page refreshes without
// requiring a per-user persistence table.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useCapacityLive,
  useDashboardKpis,
  useQuarterlyForecasts,
  useSkillMatrix,
} from "@/hooks/capacity-platform";
import {
  detectOverAllocatedOnLeave,
  detectQuarterRollover,
  detectRedPeople,
  detectSpofSkills,
  type CapacityAlert,
} from "@/lib/capacity-platform/alerts";

const READ_STATE_KEY = "capacity-platform:alerts-read";

type ReadSet = Set<string>;

const loadReadSet = (): ReadSet => {
  try {
    const raw = window.localStorage.getItem(READ_STATE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

const saveReadSet = (s: ReadSet): void => {
  try {
    window.localStorage.setItem(READ_STATE_KEY, JSON.stringify([...s]));
  } catch {
    /* no-op */
  }
};

export interface UseCapacityAlertsResult {
  alerts: CapacityAlert[];
  unreadAlerts: CapacityAlert[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** True when at least one upstream query is still loading. */
}

export const useCapacityAlerts = (): UseCapacityAlertsResult => {
  const liveQ = useCapacityLive(new Date());
  const matrixQ = useSkillMatrix();
  const forecastsQ = useQuarterlyForecasts();
  // Hub uses useDashboardKpis already; keep it warm here too — cheap if cached.
  useDashboardKpis(new Date());

  const [readSet, setReadSet] = useState<ReadSet>(() => loadReadSet());

  // Persist when the set changes.
  useEffect(() => {
    saveReadSet(readSet);
  }, [readSet]);

  const alerts = useMemo<CapacityAlert[]>(() => {
    const out: CapacityAlert[] = [];
    out.push(...detectRedPeople(liveQ.data));
    out.push(...detectOverAllocatedOnLeave(liveQ.data));
    out.push(...detectSpofSkills(matrixQ.data));
    out.push(...detectQuarterRollover(new Date(), forecastsQ.data));
    // Stable-sort: danger → warn → info; then by id.
    const rank: Record<string, number> = { danger: 0, warn: 1, info: 2 };
    return out.sort((a, b) => {
      if (rank[a.severity] !== rank[b.severity]) {
        return rank[a.severity] - rank[b.severity];
      }
      return a.id.localeCompare(b.id);
    });
  }, [liveQ.data, matrixQ.data, forecastsQ.data]);

  const unreadAlerts = useMemo(
    () => alerts.filter((a) => !readSet.has(a.id)),
    [alerts, readSet]
  );

  const markRead = useCallback((id: string) => {
    setReadSet((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadSet((prev) => {
      const next = new Set(prev);
      for (const a of alerts) next.add(a.id);
      return next;
    });
  }, [alerts]);

  return {
    alerts,
    unreadAlerts,
    unreadCount: unreadAlerts.length,
    isLoading: liveQ.isLoading || matrixQ.isLoading || forecastsQ.isLoading,
    markRead,
    markAllRead,
  };
};
