// ============================================================================
// CapacityHubPage — landing page for /capacity-platform
// ----------------------------------------------------------------------------
// Spec §8.7 implementation. Sections (top → bottom):
//   - Cut-over banner (Phase 14)
//   - KPI strip
//   - RAG donut · SPOF tile · Utilisation sparkline
//   - Top over-allocated · Leave on the horizon
//   - Per-person capacity table
//   - Nav cards into the 7 sub-pages
// ============================================================================

import { useNavigate } from "react-router-dom";
import {
  useCapacityLive,
  useDashboardKpis,
} from "@/hooks/capacity-platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Sparkles,
  CalendarRange,
  Inbox,
  TrendingUp,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import CutOverBanner from "@/components/capacity-platform/CutOverBanner";
import RagDonut from "@/components/capacity-platform/hub/RagDonut";
import SpofTile from "@/components/capacity-platform/hub/SpofTile";
import UtilisationSparkline from "@/components/capacity-platform/hub/UtilisationSparkline";
import TopOverallocatedTile from "@/components/capacity-platform/hub/TopOverallocatedTile";
import LeaveHorizonTile from "@/components/capacity-platform/hub/LeaveHorizonTile";
import PersonCapacityTable from "@/components/capacity-platform/hub/PersonCapacityTable";

interface NavCard {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const NAV_CARDS: NavCard[] = [
  {
    to: "/capacity-platform/people",
    title: "People",
    description: "Active headcount, employment types, weekly hours",
    icon: Users,
  },
  {
    to: "/capacity-platform/skills",
    title: "Skills",
    description: "Coverage matrix, SPOF risk, weighted scores",
    icon: Sparkles,
  },
  {
    to: "/capacity-platform/allocation",
    title: "Allocation",
    description: "Per-person weekly grid by customer + work type",
    icon: CalendarRange,
  },
  {
    to: "/capacity-platform/intake",
    title: "Work Intake",
    description: "Inbound queue and kanban for REQ-#### requests",
    icon: Inbox,
  },
  {
    to: "/capacity-platform/forecast",
    title: "Forecast",
    description: "Rolling quarterly forecast with RAG and mitigations",
    icon: TrendingUp,
  },
  {
    to: "/capacity-platform/reports",
    title: "Reports",
    description: "Exports, parity harness, and reporting views",
    icon: BarChart3,
  },
  {
    to: "/capacity-platform/settings",
    title: "Settings",
    description: "FTE basis, RAG thresholds, holiday state",
    icon: Settings,
  },
];

const fmtPct = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${(Number(n) * 100).toFixed(0)}%`;
const fmtNum = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : Number(n).toLocaleString();

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}
const KpiCard = ({ label, value, hint }: KpiCardProps) => (
  <Card className="min-w-[140px]">
    <CardHeader className="pb-1">
      <CardDescription className="text-xs">{label}</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {hint && (
        <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
      )}
    </CardContent>
  </Card>
);

const CapacityHubPage = () => {
  const navigate = useNavigate();

  // Default to current week (the hooks normalise to Monday).
  const weekStart = new Date();
  const kpis = useDashboardKpis(weekStart);
  const live = useCapacityLive(weekStart);

  return (
    <div className="flex flex-col gap-6">
      <CutOverBanner />

      {/* KPI strip */}
      <section aria-label="This week's KPIs">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          This week
        </h2>
        <div className="flex flex-wrap gap-3">
          {kpis.isPending && (
            <div className="text-sm text-muted-foreground">
              Loading capacity KPIs…
            </div>
          )}
          {kpis.isError && (
            <div className="text-sm text-destructive">
              Could not load KPIs:{" "}
              {(kpis.error as Error)?.message ?? "unknown error"}
            </div>
          )}
          {kpis.data && (
            <>
              <KpiCard label="Headcount" value={fmtNum(kpis.data.headcount)} />
              <KpiCard
                label="Capacity (hrs)"
                value={fmtNum(kpis.data.adjusted_capacity_hours)}
                hint={`base ${fmtNum(kpis.data.total_capacity_hours)}`}
              />
              <KpiCard
                label="Leave impact (hrs)"
                value={fmtNum(kpis.data.leave_impact_hours)}
              />
              <KpiCard
                label="Allocated (hrs)"
                value={fmtNum(kpis.data.total_allocated_hours)}
              />
              <KpiCard
                label="Avg utilisation"
                value={fmtPct(kpis.data.avg_utilisation_pct)}
              />
            </>
          )}
        </div>
      </section>

      {/* Charts strip */}
      <section
        aria-label="RAG, skills risk, utilisation trend"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {kpis.data ? (
          <RagDonut
            red={kpis.data.red_count}
            amber={kpis.data.amber_count}
            green={kpis.data.green_count}
          />
        ) : (
          <div className="rounded-md border p-4 h-48" />
        )}
        <SpofTile />
        <UtilisationSparkline weekStart={weekStart} />
      </section>

      {/* Forward look + leave horizon */}
      <section
        aria-label="Forward over-allocations and leave horizon"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <TopOverallocatedTile />
        <LeaveHorizonTile />
      </section>

      {/* Per-person table */}
      <section aria-label="Per-person capacity for this week" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Per-person — this week
        </h2>
        <PersonCapacityTable rows={live.data} isLoading={live.isLoading} />
      </section>

      {/* Nav cards */}
      <section aria-label="Capacity Platform sections">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Sections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {NAV_CARDS.map(({ to, title, description, icon: Icon }) => (
            <Card
              key={to}
              role="link"
              tabIndex={0}
              onClick={() => navigate(to)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(to);
                }
              }}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CapacityHubPage;
