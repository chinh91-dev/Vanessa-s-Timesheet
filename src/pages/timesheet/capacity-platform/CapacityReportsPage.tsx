import { useMemo, useState } from "react";
import WeekNavigator from "@/components/capacity-platform/allocation/WeekNavigator";
import ReportsKpiCard from "@/components/capacity-platform/reports/ReportsKpiCard";
import ReportsExportButtons from "@/components/capacity-platform/reports/ReportsExportButtons";
import FteLossPanel from "@/components/capacity-platform/forecast/FteLossPanel";
import SkillMatrixTable from "@/components/capacity-platform/SkillMatrixTable";
import { useSkillMatrix } from "@/hooks/capacity-platform";
import { Skeleton } from "@/components/ui/skeleton";
import { mondayOf } from "@/lib/capacity-platform/monday";
import { useSearchParams } from "react-router-dom";

const parseWeek = (raw: string | null): Date => {
  if (!raw) return mondayOf(new Date());
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return mondayOf(new Date());
  return mondayOf(d);
};

const CapacityReportsPage = () => {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get("week");
  const weekStart = useMemo(() => parseWeek(raw), [raw]);
  const skillMatrixQ = useSkillMatrix();
  const [_, setNonce] = useState(0); // forces re-render when WeekNavigator self-heals

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Capacity exports, KPI summary, FTE-loss windows, and the live skill
          matrix. Week-scoped data uses the same <code>?week=</code> URL param
          as the Allocation grid.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <WeekNavigator onChange={() => setNonce((n) => n + 1)} />
        <ReportsExportButtons weekStart={weekStart} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">KPI summary</h2>
        <ReportsKpiCard weekStart={weekStart} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">FTE-loss windows</h2>
        <FteLossPanel variant="full" />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Skill matrix</h2>
        {skillMatrixQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : skillMatrixQ.error ? (
          <div className="text-sm text-destructive">
            Failed to load skill matrix: {(skillMatrixQ.error as Error).message}
          </div>
        ) : (
          <SkillMatrixTable rows={skillMatrixQ.data ?? []} />
        )}
      </section>
    </section>
  );
};

export default CapacityReportsPage;
