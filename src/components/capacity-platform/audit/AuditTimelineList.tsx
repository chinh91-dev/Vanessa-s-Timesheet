// ============================================================================
// AuditTimelineList — chronological list of capacity-scoped audit entries
// ----------------------------------------------------------------------------
// Each entry shows: timestamp · actor · action · description, with a
// collapsible JSON details block. Limit is enforced server-side.
// ============================================================================

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { useCapacityAuditLogs } from "@/hooks/capacity-platform/useAuditLogs";
import type { ListAuditLogsFilter } from "@/lib/capacity-platform/auditLogs";

export interface AuditTimelineListProps {
  filter?: ListAuditLogsFilter;
  /** Empty-state copy. */
  emptyText?: string;
}

const fmtDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const ActionBadge = ({ action }: { action: string }) => {
  const lower = action.toLowerCase();
  let cls = "bg-slate-200 text-slate-700 border-slate-300";
  if (lower.includes("delete")) cls = "bg-red-100 text-red-800 border-red-300";
  else if (lower.includes("insert") || lower.includes("create"))
    cls = "bg-green-100 text-green-800 border-green-300";
  else if (lower.includes("update") || lower.includes("upsert"))
    cls = "bg-blue-100 text-blue-800 border-blue-300";
  return (
    <Badge variant="outline" className={`text-[10px] font-mono ${cls}`}>
      {action}
    </Badge>
  );
};

const AuditTimelineList = ({
  filter,
  emptyText = "No audit entries.",
}: AuditTimelineListProps) => {
  const q = useCapacityAuditLogs(filter ?? {});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="text-xs text-destructive">
        Failed to load audit log: {(q.error as Error).message}
      </div>
    );
  }
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-6 flex flex-col items-center text-center gap-2">
        <History className="h-6 w-6 text-muted-foreground" aria-hidden />
        <span className="text-sm text-muted-foreground italic">{emptyText}</span>
      </div>
    );
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const isOpen = expanded.has(r.id);
        const hasDetails =
          r.details &&
          (typeof r.details === "object"
            ? Object.keys(r.details).length > 0
            : true);
        return (
          <li
            key={r.id}
            className="rounded-md border p-2.5 bg-card text-sm space-y-1"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground tabular-nums">
                {fmtDateTime(r.created_at)}
              </span>
              <ActionBadge action={r.action} />
              {r.entity_name && (
                <span className="text-xs font-mono text-muted-foreground">
                  {r.entity_name}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground truncate">
                by {r.user_name ?? r.user_id.slice(0, 8)}
              </span>
            </div>
            {r.description && (
              <p className="text-sm">{r.description}</p>
            )}
            {hasDetails && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(r.id)}
                  className="h-6 px-2 gap-1 text-xs"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Details
                </Button>
                {isOpen && (
                  <pre className="text-[11px] bg-muted/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(r.details, null, 2)}
                  </pre>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default AuditTimelineList;
