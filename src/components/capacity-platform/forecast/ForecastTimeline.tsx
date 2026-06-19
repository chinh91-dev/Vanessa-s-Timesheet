// ============================================================================
// ForecastTimeline — sidebar list of saved monthly forecasts
// ----------------------------------------------------------------------------
// Click a row → loads that month into the editor. RAG dot + month label.
// ============================================================================

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuarterlyForecasts } from "@/hooks/capacity-platform";
import type { RagStatus } from "@/lib/capacity-platform/types";

const DOT: Record<RagStatus, string> = {
  Red: "bg-red-600",
  Amber: "bg-amber-500",
  Green: "bg-green-600",
};

export interface ForecastTimelineProps {
  selectedMonth: string;
  onSelect: (month: string) => void;
}

const ForecastTimeline = ({
  selectedMonth,
  onSelect,
}: ForecastTimelineProps) => {
  const q = useQuarterlyForecasts();

  if (q.isLoading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="text-xs text-destructive">
        Failed to load forecasts: {(q.error as Error).message}
      </div>
    );
  }
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        No saved forecasts yet.
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const isActive = r.month === selectedMonth;
        return (
          <li key={r.id}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-between gap-2"
              onClick={() => onSelect(r.month)}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${DOT[r.rag]}`}
                  aria-hidden
                />
                <span className="font-mono text-xs">{r.month}</span>
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                {r.resource_gap ?? r.notes ?? ""}
              </span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
};

export default ForecastTimeline;
