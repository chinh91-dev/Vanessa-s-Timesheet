// ============================================================================
// AllocationGrid — Phase 10 editable allocation grid + customer drilldown
// ----------------------------------------------------------------------------
// Person pivot:
//   For each active profile we render
//     - header row: name, capacity, "+ Add allocation"
//     - one sub-row per (customer, work_type) allocation, with 5 editable
//       Mon-Fri cells and a delete button
//     - a totals row: per-day RAG (Green/Amber/Red) derived from
//       (weekly_hours/5 - leave_hours - sum(allocated_hours))
//
// Customer pivot:
//   For each customer in this week's allocations we render a clickable
//   summary row (Mon-Fri totals + week total). Clicking expands inline to
//   show one read-only sub-row per person who has hours against that
//   customer this week.
//
// Editing flow uses `useDebouncedCellCommit` per sub-row. Optimistic cache
// updates make typing feel instant; flush is debounced 600ms (Enter forces
// blur which commits immediately via onBlur).
// ============================================================================

import { Fragment, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Plus } from "lucide-react";
import {
  useCapacityAllocations,
  useCapacityLive,
  useCapacityProfiles,
  useDeleteCapacityAllocation,
  useLeaveForWeek,
} from "@/hooks/capacity-platform";
import { useDebouncedCellCommit } from "@/hooks/capacity-platform/useDebouncedCellCommit";
import {
  aggregateLeaveByPersonDay,
  buildStandardDayHoursMap,
  explodeLeaveToDayCells,
} from "@/lib/capacity-platform/leave";
import { mondayOf } from "@/lib/capacity-platform/monday";
import {
  DAY_KEYS,
  DAY_HOURS_FIELD,
  dailyCapacityForProfile,
  dailyHeadroom,
  ragForCell,
  sumAllocationHoursByCustomerPersonDay,
  type DayKey,
} from "@/lib/capacity-platform/allocationCells";
import type {
  CapacityAllocationRow,
  CapacityLiveRow,
  RagStatus,
} from "@/lib/capacity-platform/types";
import type { CapacityProfileRow } from "@/lib/capacity-platform/profiles";
import AllocationCell from "./AllocationCell";
import CellRagBadge from "./CellRagBadge";
import {
  AllocationRowDeleteButton,
  AllocationRowLabel,
} from "./AllocationRowControls";
import NewAllocationDialog from "./NewAllocationDialog";
import type { AllocationPivot } from "./PivotToggle";

const ragRowClass = (rag: RagStatus | null): string => {
  switch (rag) {
    case "Red":
      return "bg-red-50/60 dark:bg-red-950/20";
    case "Amber":
      return "bg-amber-50/60 dark:bg-amber-950/20";
    case "Green":
      return "bg-green-50/60 dark:bg-green-950/20";
    default:
      return "";
  }
};

const ragBadge = (rag: RagStatus | null) => {
  if (!rag) return <Badge variant="outline">—</Badge>;
  const classes: Record<RagStatus, string> = {
    Red: "bg-red-600 text-white border-red-700",
    Amber: "bg-amber-500 text-white border-amber-600",
    Green: "bg-green-600 text-white border-green-700",
  };
  return <Badge className={classes[rag]}>{rag}</Badge>;
};

// ---------------------------------------------------------------------------
// Editable sub-row — owns its own debounced commit hook instance
// ---------------------------------------------------------------------------

interface AllocationSubRowProps {
  row: CapacityAllocationRow;
  personLabel: string;
}

const AllocationSubRow = ({ row, personLabel }: AllocationSubRowProps) => {
  const { setDayHour, isPending } = useDebouncedCellCommit(row.id);
  const del = useDeleteCapacityAllocation();
  const rowLabel = `${row.customer || "(unspecified)"} · ${row.work_type}`;

  return (
    <TableRow>
      <TableCell className="pl-6">
        <AllocationRowLabel customer={row.customer} workType={row.work_type} />
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground" />
      {DAY_KEYS.map((dk, i) => {
        const v = row[DAY_HOURS_FIELD[dk]] as number | null | undefined;
        return (
          <TableCell key={i} className="p-1">
            <AllocationCell
              allocatedHours={Number(v ?? 0)}
              editable
              disabled={isPending || del.isPending}
              ariaLabel={`${personLabel} ${rowLabel} ${dk}`}
              onChange={(next) => setDayHour(dk as DayKey, next)}
              onCommit={(next) => setDayHour(dk as DayKey, next)}
            />
          </TableCell>
        );
      })}
      <TableCell className="text-right tabular-nums text-sm">
        {Number(row.total_hours ?? 0)}
      </TableCell>
      <TableCell className="w-[1%]">
        <AllocationRowDeleteButton
          rowLabel={rowLabel}
          disabled={del.isPending}
          onConfirm={() => del.mutate(row.id)}
        />
      </TableCell>
    </TableRow>
  );
};

// ---------------------------------------------------------------------------
// Person group — header + sub-rows + totals/RAG row
// ---------------------------------------------------------------------------

interface PersonGroupProps {
  profile: CapacityProfileRow;
  rows: CapacityAllocationRow[];
  live: CapacityLiveRow | null;
  leaveByDay: Map<string, number> | undefined;
  dayDates: readonly string[];
  onAdd: () => void;
}

const PersonGroup = ({
  profile,
  rows,
  live,
  leaveByDay,
  dayDates,
  onAdd,
}: PersonGroupProps) => {
  const dailyCap = dailyCapacityForProfile(profile.weekly_hours);
  const personRowSums: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of rows) {
    DAY_KEYS.forEach((dk, i) => {
      personRowSums[i] += Number(
        (r[DAY_HOURS_FIELD[dk]] as number | null | undefined) ?? 0
      );
    });
  }

  const personLabel = profile.full_name ?? profile.email ?? profile.id.slice(0, 8);

  return (
    <>
      <TableRow className={ragRowClass(live?.rag_status ?? null)}>
        <TableCell>
          <div className="font-medium">{profile.full_name ?? "(no name)"}</div>
          <div className="text-xs text-muted-foreground">
            {profile.email ?? "—"}
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          {live?.adjusted_capacity ?? profile.weekly_hours ?? "—"}
        </TableCell>
        {DAY_KEYS.map((_, i) => {
          const iso = dayDates[i];
          const lh = leaveByDay?.get(iso) ?? 0;
          if (lh === 0) {
            return <TableCell key={i} />;
          }
          return (
            <TableCell key={i} className="p-1">
              <div className="flex justify-end">
                <span
                  className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 rounded px-1 py-px"
                  title="Approved leave"
                >
                  L {lh}
                </span>
              </div>
            </TableCell>
          );
        })}
        <TableCell />
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" onClick={onAdd} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Add</span>
          </Button>
        </TableCell>
      </TableRow>

      {rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={9} className="pl-6 text-xs italic text-muted-foreground">
            No allocations for this week. Click "Add" to create one.
          </TableCell>
        </TableRow>
      ) : (
        rows.map((r) => (
          <AllocationSubRow key={r.id} row={r} personLabel={personLabel} />
        ))
      )}

      <TableRow className="border-b-2 border-border/60">
        <TableCell className="pl-6 text-xs font-medium text-muted-foreground">
          Headroom
        </TableCell>
        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
          {dailyCap.toFixed(2)}/day
        </TableCell>
        {DAY_KEYS.map((_, i) => {
          const iso = dayDates[i];
          const leaveH = leaveByDay?.get(iso) ?? 0;
          const allocated = personRowSums[i];
          const rag = ragForCell({
            dailyCapacity: dailyCap,
            leaveHours: leaveH,
            allocatedHours: allocated,
          });
          const headroom = dailyHeadroom({
            dailyCapacity: dailyCap,
            leaveHours: leaveH,
            allocatedHours: allocated,
          });
          return (
            <TableCell key={i} className="p-0">
              <CellRagBadge
                rag={rag}
                headroomHours={headroom}
                totalAllocatedHours={allocated}
              />
            </TableCell>
          );
        })}
        <TableCell className="text-right tabular-nums text-sm font-medium">
          {personRowSums.reduce((s, h) => s + h, 0).toFixed(2)}
        </TableCell>
        <TableCell />
      </TableRow>

      {/* Spacer between person groups for visual separation */}
      <TableRow aria-hidden>
        <TableCell colSpan={9} className="h-2 p-0 bg-transparent" />
      </TableRow>
    </>
  );
};

// ---------------------------------------------------------------------------
// Main grid
// ---------------------------------------------------------------------------

export interface AllocationGridProps {
  weekStart: Date;
  pivot: AllocationPivot;
}

const AllocationGrid = ({ weekStart, pivot }: AllocationGridProps) => {
  const monday = mondayOf(weekStart);
  const mondayIso = format(monday, "yyyy-MM-dd");

  const liveQ = useCapacityLive(monday);
  const profilesQ = useCapacityProfiles({ activeOnly: true });
  const allocationsQ = useCapacityAllocations({
    weekStartFrom: mondayIso,
    weekStartTo: mondayIso,
  });
  const leaveQ = useLeaveForWeek(monday);

  const [newAllocFor, setNewAllocFor] = useState<{
    personId: string;
    label: string;
  } | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dayDates = useMemo(
    () => DAY_KEYS.map((_, i) => format(addDays(monday, i), "yyyy-MM-dd")),
    [mondayIso] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isLoading =
    liveQ.isLoading ||
    profilesQ.isLoading ||
    allocationsQ.isLoading ||
    leaveQ.isLoading;

  const error =
    liveQ.error || profilesQ.error || allocationsQ.error || leaveQ.error;

  const liveByPersonId = useMemo(() => {
    const m = new Map<string, CapacityLiveRow>();
    for (const r of liveQ.data ?? []) m.set(r.person_id, r);
    return m;
  }, [liveQ.data]);

  const allocationsByPersonId = useMemo(() => {
    const m = new Map<string, CapacityAllocationRow[]>();
    for (const a of allocationsQ.data ?? []) {
      const cur = m.get(a.person_id);
      if (cur) cur.push(a);
      else m.set(a.person_id, [a]);
    }
    return m;
  }, [allocationsQ.data]);

  const leaveByPersonDay = useMemo(() => {
    const profiles = profilesQ.data ?? [];
    const dayHoursByUser = buildStandardDayHoursMap(profiles);
    const cells = explodeLeaveToDayCells(leaveQ.data ?? [], monday, dayHoursByUser);
    return aggregateLeaveByPersonDay(cells);
  }, [leaveQ.data, profilesQ.data, mondayIso]); // eslint-disable-line react-hooks/exhaustive-deps

  const customerDrilldown = useMemo(
    () => sumAllocationHoursByCustomerPersonDay(allocationsQ.data ?? []),
    [allocationsQ.data]
  );

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load capacity data: {(error as Error).message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Loading capacity grid…
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const dayHeader = DAY_KEYS.map((_, i) => (
    <TableHead key={i} className="text-right tabular-nums">
      <div className="flex flex-col items-end">
        <span className="text-xs uppercase">
          {format(addDays(monday, i), "EEE")}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {format(addDays(monday, i), "d MMM")}
        </span>
      </div>
    </TableHead>
  ));

  if (pivot === "person") {
    const profiles = profilesQ.data ?? [];
    if (profiles.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic py-6 text-center">
          No active profiles found.
        </div>
      );
    }
    const onLeaveOverAllocated = (liveQ.data ?? []).filter(
      (r) => r.over_allocated_on_leave
    );
    return (
      <>
        {onLeaveOverAllocated.length > 0 && (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-3 mb-3 flex items-start gap-2"
          >
            <AlertTriangle
              className="h-4 w-4 text-red-700 dark:text-red-300 mt-0.5 shrink-0"
              aria-hidden
            />
            <div className="text-sm">
              <strong className="font-semibold text-red-800 dark:text-red-200">
                {onLeaveOverAllocated.length} person
                {onLeaveOverAllocated.length === 1 ? "" : "s"} fully on leave
                with hours allocated:
              </strong>{" "}
              <span className="text-red-900/90 dark:text-red-100/90">
                {onLeaveOverAllocated
                  .map((r) => r.full_name)
                  .join(", ")}
                . Move or remove the allocation before saving.
              </span>
            </div>
          </div>
        )}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Person / Allocation</TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  Cap (h)
                </TableHead>
                {dayHeader}
                <TableHead className="text-right whitespace-nowrap">
                  Total (h)
                </TableHead>
                <TableHead className="w-[1%] text-right">RAG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <PersonGroup
                  key={p.id}
                  profile={p}
                  rows={allocationsByPersonId.get(p.id) ?? []}
                  live={liveByPersonId.get(p.id) ?? null}
                  leaveByDay={leaveByPersonDay.get(p.id)}
                  dayDates={dayDates}
                  onAdd={() =>
                    setNewAllocFor({
                      personId: p.id,
                      label: p.full_name ?? p.email ?? p.id.slice(0, 8),
                    })
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
            Green ≥ 1h headroom
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            Amber 0–1h
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-600" />
            Red over capacity
          </div>
          <div className="ml-2">
            Edits commit on blur or after 600 ms of inactivity.
          </div>
        </div>

        {newAllocFor && (
          <NewAllocationDialog
            open={!!newAllocFor}
            onOpenChange={(next) => {
              if (!next) setNewAllocFor(null);
            }}
            personId={newAllocFor.personId}
            personLabel={newAllocFor.label}
            weekStart={mondayIso}
          />
        )}
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Customer pivot — summary + drilldown
  // ---------------------------------------------------------------------------

  const customers = Array.from(customerDrilldown.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  if (customers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-6 text-center">
        No allocations recorded for this week.
      </div>
    );
  }
  const profilesById = new Map((profilesQ.data ?? []).map((p) => [p.id, p]));
  const toggleExpanded = (c: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Customer</TableHead>
            {dayHeader}
            <TableHead className="text-right whitespace-nowrap">
              Total (h)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => {
            const inner = customerDrilldown.get(c)!;
            const dayTotals: [number, number, number, number, number] = [
              0, 0, 0, 0, 0,
            ];
            for (const days of inner.values()) {
              for (let i = 0; i < 5; i++) dayTotals[i] += days[i];
            }
            const total = dayTotals.reduce((s, h) => s + h, 0);
            const isOpen = expanded.has(c);
            return (
              <Fragment key={c}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => toggleExpanded(c)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {c}
                    </div>
                  </TableCell>
                  {DAY_KEYS.map((_, i) => (
                    <TableCell key={i} className="text-right p-1">
                      <AllocationCell allocatedHours={dayTotals[i]} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    {total === 0 ? "—" : total}
                  </TableCell>
                </TableRow>
                {isOpen &&
                  Array.from(inner.entries())
                    .sort(([a], [b]) => {
                      const an =
                        profilesById.get(a)?.full_name ?? a;
                      const bn =
                        profilesById.get(b)?.full_name ?? b;
                      return an.localeCompare(bn);
                    })
                    .map(([personId, days]) => {
                      const prof = profilesById.get(personId);
                      const personTotal = days.reduce((s, h) => s + h, 0);
                      return (
                        <TableRow key={`${c}::${personId}`} className="bg-muted/10">
                          <TableCell className="pl-9 text-sm">
                            {prof?.full_name ?? prof?.email ?? personId.slice(0, 8)}
                          </TableCell>
                          {DAY_KEYS.map((_, i) => (
                            <TableCell key={i} className="text-right p-1">
                              <AllocationCell allocatedHours={days[i]} />
                            </TableCell>
                          ))}
                          <TableCell className="text-right tabular-nums text-sm">
                            {personTotal === 0 ? "—" : personTotal}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default AllocationGrid;
