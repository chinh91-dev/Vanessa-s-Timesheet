// ============================================================================
// WorkRequestKanban — drag-drop kanban for work_requests
// ----------------------------------------------------------------------------
// One column per WorkRequestStatus. Cards drag between columns; on drop we
// validate the target status against the server CHECK constraint
// (estimated_hours required for non-New/non-Cancelled) and surface a toast
// when the move is blocked. Successful moves fire
// `transitionWorkRequestStatus` and rely on its onSuccess invalidation.
// ============================================================================

import { useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import { useToast } from "@/components/ui/use-toast";
import {
  PRIORITY_META,
  WORK_REQUEST_STATUS_META,
  WORK_REQUEST_STATUS_ORDER,
  validateStatusTransition,
} from "@/lib/capacity-platform/workRequestStatus";
import { useTransitionWorkRequestStatus } from "@/hooks/capacity-platform";
import type {
  WorkRequestRow,
  WorkRequestStatus,
} from "@/lib/capacity-platform/types";
import type { CapacityProfileRow } from "@/lib/capacity-platform/profiles";
import WorkRequestCard from "./WorkRequestCard";

export interface WorkRequestKanbanProps {
  rows: WorkRequestRow[];
  profilesById: Map<string, CapacityProfileRow>;
  onCardClick: (row: WorkRequestRow) => void;
}

const sortByPriorityThenDate = (
  a: WorkRequestRow,
  b: WorkRequestRow
): number => {
  const pa = PRIORITY_META[a.priority].rank;
  const pb = PRIORITY_META[b.priority].rank;
  if (pa !== pb) return pa - pb;
  return (b.date_received ?? "").localeCompare(a.date_received ?? "");
};

const WorkRequestKanban = ({
  rows,
  profilesById,
  onCardClick,
}: WorkRequestKanbanProps) => {
  const { toast } = useToast();
  const transition = useTransitionWorkRequestStatus();

  const grouped = useMemo(() => {
    const m = new Map<WorkRequestStatus, WorkRequestRow[]>();
    for (const s of WORK_REQUEST_STATUS_ORDER) m.set(s, []);
    for (const r of rows) {
      m.get(r.status)?.push(r);
    }
    for (const arr of m.values()) arr.sort(sortByPriorityThenDate);
    return m;
  }, [rows]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const targetStatus = result.destination.droppableId as WorkRequestStatus;
    const sourceStatus = result.source.droppableId as WorkRequestStatus;
    if (sourceStatus === targetStatus) return;

    const row = rows.find((r) => r.id === result.draggableId);
    if (!row) return;

    const blocker = validateStatusTransition(targetStatus, {
      estimated_hours: row.estimated_hours,
    });
    if (blocker) {
      toast({
        title: "Move blocked",
        description: blocker,
        variant: "destructive",
      });
      return;
    }
    transition.mutate(
      { id: row.id, status: targetStatus },
      {
        onError: (err) => {
          toast({
            title: "Status change failed",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {WORK_REQUEST_STATUS_ORDER.map((status) => {
          const meta = WORK_REQUEST_STATUS_META[status];
          const cards = grouped.get(status) ?? [];
          return (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={[
                    "rounded-md border p-2 min-h-[120px] flex flex-col gap-2",
                    meta.columnClass,
                    snapshot.isDraggingOver
                      ? "ring-2 ring-primary/40"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide">
                      {meta.label}
                    </h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {cards.length}
                    </span>
                  </div>
                  {cards.map((row, idx) => (
                    <Draggable
                      key={row.id}
                      draggableId={row.id}
                      index={idx}
                    >
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                        >
                          <WorkRequestCard
                            request={row}
                            assignee={
                              row.assigned_to_id
                                ? profilesById.get(row.assigned_to_id) ?? null
                                : null
                            }
                            onClick={() => onCardClick(row)}
                            isDragging={snap.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {cards.length === 0 && (
                    <div className="text-xs text-muted-foreground italic text-center py-4">
                      —
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default WorkRequestKanban;
