// ============================================================================
// WorkIntakeView — orchestrator for queue + kanban + active incidents tabs
// ----------------------------------------------------------------------------
// Loads work_requests + profiles once, lets the user toggle between Queue
// (table), Kanban (drag-drop), and Incidents (active-only incident list)
// views, and surfaces a "+ New" button that opens the create dialog.
// Row/card clicks open the same dialog in edit mode. Incident rows navigate
// directly to the incident detail page in the Incident Management app.
// ============================================================================

import { lazy, Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, LayoutGrid, ListChecks, Loader2, Plus } from "lucide-react";
import {
  useCapacityProfiles,
  useWorkRequests,
} from "@/hooks/capacity-platform";
import { useIncidents } from "@/hooks/useIncidents";
import type { WorkRequestRow } from "@/lib/capacity-platform/types";
import WorkIntakeFilters, {
  emptyIntakeFilter,
  matchesIntakeFilter,
  type IntakeFilterState,
} from "./WorkIntakeFilters";
import WorkRequestQueueTable from "./WorkRequestQueueTable";
import WorkRequestDialog from "./WorkRequestDialog";
import ActiveIncidentsTable from "./ActiveIncidentsTable";

// Lazy-load the kanban — react-beautiful-dnd is ~110kB gzipped.
const WorkRequestKanban = lazy(() => import("./WorkRequestKanban"));

const ACTIVE_INCIDENT_STATUSES = ["New", "Triaged", "In Progress"] as const;

type ViewMode = "queue" | "kanban" | "incidents";

const WorkIntakeView = () => {
  const requestsQ = useWorkRequests();
  const profilesQ = useCapacityProfiles({ activeOnly: true });
  const incidentsQ = useIncidents({ status: [...ACTIVE_INCIDENT_STATUSES] });
  const [view, setView] = useState<ViewMode>("queue");
  const [filter, setFilter] = useState<IntakeFilterState>(emptyIntakeFilter);
  const [dialogState, setDialogState] = useState<
    | { mode: "create" }
    | { mode: "edit"; request: WorkRequestRow }
    | null
  >(null);

  const profilesById = useMemo(
    () => new Map((profilesQ.data ?? []).map((p) => [p.id, p])),
    [profilesQ.data]
  );

  const filteredRows = useMemo(
    () =>
      (requestsQ.data ?? []).filter((r) => matchesIntakeFilter(r, filter)),
    [requestsQ.data, filter]
  );

  if (requestsQ.error || profilesQ.error) {
    const err = (requestsQ.error ?? profilesQ.error) as Error;
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load work intake data: {err.message}
      </div>
    );
  }

  if (requestsQ.isLoading || profilesQ.isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Loading work intake…
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const activeIncidentCount = incidentsQ.data?.length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="queue" className="gap-1">
                <ListChecks className="h-4 w-4" /> Queue
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1">
                <LayoutGrid className="h-4 w-4" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="incidents" className="gap-1">
                <AlertCircle className="h-4 w-4" /> Incidents
                {activeIncidentCount > 0 && (
                  <span className="ml-1 rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-xs tabular-nums leading-none">
                    {activeIncidentCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {view !== "incidents" && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredRows.length} / {requestsQ.data?.length ?? 0}
            </span>
          )}
        </div>
        {view !== "incidents" && (
          <Button
            size="sm"
            onClick={() => setDialogState({ mode: "create" })}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> New request
          </Button>
        )}
      </div>

      {view !== "incidents" && (
        <WorkIntakeFilters
          value={filter}
          onChange={setFilter}
          profiles={profilesQ.data ?? []}
        />
      )}

      {view === "queue" ? (
        <WorkRequestQueueTable
          rows={filteredRows}
          profilesById={profilesById}
          onRowClick={(r) => setDialogState({ mode: "edit", request: r })}
        />
      ) : view === "kanban" ? (
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading kanban…
            </div>
          }
        >
          <WorkRequestKanban
            rows={filteredRows}
            profilesById={profilesById}
            onCardClick={(r) => setDialogState({ mode: "edit", request: r })}
          />
        </Suspense>
      ) : (
        <>
          {incidentsQ.error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load incidents: {(incidentsQ.error as Error).message}
            </div>
          ) : incidentsQ.isLoading ? (
            <div
              className="space-y-2"
              aria-busy="true"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading incidents…
              </div>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <ActiveIncidentsTable incidents={incidentsQ.data ?? []} />
          )}
        </>
      )}

      {dialogState && (
        <WorkRequestDialog
          open={!!dialogState}
          onOpenChange={(next) => {
            if (!next) setDialogState(null);
          }}
          mode={dialogState.mode}
          request={dialogState.mode === "edit" ? dialogState.request : null}
        />
      )}
    </div>
  );
};

export default WorkIntakeView;
