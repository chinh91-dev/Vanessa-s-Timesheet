// ============================================================================
// AllocationPage — Phase 9 read-only capacity & allocation grid
// ----------------------------------------------------------------------------
// URL is the source of truth for the selected week (?week=YYYY-MM-DD).
// Pivot is local state; defaults to "person".
// ============================================================================

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mondayOf } from "@/lib/capacity-platform/monday";
import WeekNavigator from "@/components/capacity-platform/allocation/WeekNavigator";
import PivotToggle, {
  type AllocationPivot,
} from "@/components/capacity-platform/allocation/PivotToggle";
import AllocationGrid from "@/components/capacity-platform/allocation/AllocationGrid";

const parseWeekParam = (raw: string | null): Date => {
  if (!raw) return mondayOf(new Date());
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return mondayOf(new Date());
  return mondayOf(parsed);
};

const AllocationPage = () => {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get("week");
  const weekStart = useMemo(() => parseWeekParam(raw), [raw]);
  const [pivot, setPivot] = useState<AllocationPivot>("person");

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Allocation</h1>
        <p className="text-sm text-muted-foreground">
          Weekly capacity grid. Person pivot is editable (Mon–Fri); customer
          pivot shows summary + per-person drilldown. Approved leave is
          overlaid on person rows.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNavigator />
        <PivotToggle value={pivot} onChange={setPivot} />
      </div>

      <AllocationGrid weekStart={weekStart} pivot={pivot} />

      <footer className="text-xs text-muted-foreground pt-2">
        Row-shading reflects the person's weekly capacity vs allocated hours
        (from <code>get_capacity_live</code>). Per-day RAG on the headroom row
        derives from <code>weekly_hours/5 − leave − allocated</code>. Leave
        overlay sources approved <code>leave_applications</code> only.
      </footer>
    </section>
  );
};

export default AllocationPage;
