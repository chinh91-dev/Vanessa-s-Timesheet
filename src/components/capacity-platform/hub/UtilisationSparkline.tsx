// ============================================================================
// UtilisationSparkline — 8-week trailing avg utilisation trend
// ----------------------------------------------------------------------------
// Spec §8.7 — "trend sparkline of avg utilisation over last 8 weeks".
// Recharts LineChart with hidden axes + dots; tooltip shows week + value.
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";
import { useUtilisationHistory } from "@/hooks/capacity-platform/useUtilisationHistory";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface UtilisationSparklineProps {
  weekStart: Date;
}

const fmtPct = (n: number): string => `${Math.round(n * 100)}%`;

const UtilisationSparkline = ({ weekStart }: UtilisationSparklineProps) => {
  const q = useUtilisationHistory(weekStart, 8);

  if (q.isLoading) {
    return <Skeleton className="h-32 w-full rounded-md" />;
  }
  if (q.error) {
    return (
      <div className="rounded-md border p-4 text-xs text-destructive">
        Failed to load utilisation trend: {(q.error as Error).message}
      </div>
    );
  }
  const data = (q.data ?? []).map((p) => ({
    week: p.weekStart.slice(5), // mm-dd for compact label
    util: p.avgUtilisationPct,
  }));
  const last = data[data.length - 1];

  return (
    <div className="rounded-md border p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Avg utilisation — 8 wk trend</h3>
        <span className="text-xl font-semibold tabular-nums">
          {last ? fmtPct(last.util) : "—"}
        </span>
      </div>
      <div className="h-24 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="week" hide />
            <YAxis domain={[0, "dataMax"]} hide />
            <ReferenceLine
              y={0.95}
              stroke="#dc2626"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <ReferenceLine
              y={0.75}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Tooltip
              formatter={(v: number) => fmtPct(v)}
              labelFormatter={(w) => `Week of ${w}`}
              contentStyle={{ fontSize: 12, padding: "4px 8px" }}
            />
            <Line
              type="monotone"
              dataKey="util"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span className="text-[11px] text-muted-foreground">
        Dashed lines = RAG thresholds (75% amber / 95% red).
      </span>
    </div>
  );
};

export default UtilisationSparkline;
