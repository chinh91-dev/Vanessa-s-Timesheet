// ============================================================================
// ReportsKpiCard — high-level capacity KPIs for the Reports page
// ----------------------------------------------------------------------------
// Pulls public.get_dashboard_kpis for the requested Monday and renders a
// 6-tile strip. Same source as the Hub page; presented in compact form.
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardKpis } from "@/hooks/capacity-platform";
import { mondayOf } from "@/lib/capacity-platform/monday";

export interface ReportsKpiCardProps {
  weekStart: Date;
}

const ReportsKpiCard = ({ weekStart }: ReportsKpiCardProps) => {
  const monday = mondayOf(weekStart);
  const q = useDashboardKpis(monday);

  if (q.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load KPIs: {(q.error as Error).message}
      </div>
    );
  }
  const k = q.data;
  if (!k) {
    return (
      <div className="text-sm text-muted-foreground italic">No KPI row.</div>
    );
  }

  const tiles: Array<{ label: string; value: string | number; tone?: string }> = [
    { label: "Headcount", value: k.headcount },
    { label: "Capacity (h)", value: k.total_capacity_hours },
    { label: "Leave impact", value: k.leave_impact_hours },
    { label: "Adjusted capacity", value: k.adjusted_capacity_hours },
    { label: "Allocated", value: k.total_allocated_hours },
    {
      label: "Avg utilisation",
      value: `${(k.avg_utilisation_pct ?? 0).toFixed(0)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">{t.label}</div>
          <div className="text-xl font-semibold tabular-nums">{t.value}</div>
        </div>
      ))}
      <div className="col-span-2 md:col-span-3 lg:col-span-6 grid grid-cols-3 gap-2 mt-1">
        <div className="rounded-md border bg-red-50 dark:bg-red-950/30 p-2 text-center">
          <span className="text-xs text-muted-foreground">Red</span>
          <div className="text-lg font-semibold text-red-700 tabular-nums">
            {k.red_count}
          </div>
        </div>
        <div className="rounded-md border bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
          <span className="text-xs text-muted-foreground">Amber</span>
          <div className="text-lg font-semibold text-amber-700 tabular-nums">
            {k.amber_count}
          </div>
        </div>
        <div className="rounded-md border bg-green-50 dark:bg-green-950/30 p-2 text-center">
          <span className="text-xs text-muted-foreground">Green</span>
          <div className="text-lg font-semibold text-green-700 tabular-nums">
            {k.green_count}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsKpiCard;
