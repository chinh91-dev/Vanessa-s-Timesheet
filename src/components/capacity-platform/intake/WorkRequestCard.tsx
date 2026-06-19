// ============================================================================
// WorkRequestCard — compact card used in the kanban board
// ----------------------------------------------------------------------------
// Click anywhere on the card opens the edit dialog. The card is also the
// drag handle (entire card draggable, no handle separation).
// ============================================================================

import { Badge } from "@/components/ui/badge";
import { CalendarClock, Hash, User } from "lucide-react";
import {
  PRIORITY_META,
} from "@/lib/capacity-platform/workRequestStatus";
import type { WorkRequestRow } from "@/lib/capacity-platform/types";
import type { CapacityProfileRow } from "@/lib/capacity-platform/profiles";

export interface WorkRequestCardProps {
  request: WorkRequestRow;
  assignee?: CapacityProfileRow | null;
  onClick?: () => void;
  isDragging?: boolean;
}

const fmtDueDate = (raw: string | null): string => {
  if (!raw) return "—";
  return raw;
};

const WorkRequestCard = ({
  request,
  assignee,
  onClick,
  isDragging,
}: WorkRequestCardProps) => {
  const pmeta = PRIORITY_META[request.priority];
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "block w-full text-left rounded-md border bg-card p-2.5 shadow-sm",
        "hover:bg-accent/40 hover:border-primary/40 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        isDragging ? "ring-2 ring-primary shadow-lg rotate-1" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
          <Hash className="h-3 w-3" aria-hidden />
          {request.code || "—"}
        </span>
        <Badge
          variant="outline"
          className={`${pmeta.badgeClass} text-[10px]`}
        >
          {pmeta.label}
        </Badge>
      </div>

      <div className="text-sm font-medium line-clamp-2 mb-1.5">
        {request.customer || "(no customer)"}
      </div>

      {request.request_type && (
        <div className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
          {request.request_type}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3 w-3" aria-hidden />
          {fmtDueDate(request.due_date)}
        </span>
        <span className="inline-flex items-center gap-1 truncate">
          <User className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">
            {assignee?.full_name ?? assignee?.email ?? "Unassigned"}
          </span>
        </span>
      </div>

      {request.estimated_hours != null && request.estimated_hours > 0 && (
        <div className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
          Est: {request.estimated_hours}h
        </div>
      )}
    </button>
  );
};

export default WorkRequestCard;
