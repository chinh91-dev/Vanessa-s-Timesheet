import React, { useState, useMemo } from "react";
import { useIncidents, useAssignableUsers } from "@/hooks/useIncidents";
import { useIncidentRealtime } from "@/hooks/useIncidentRealtime";
import { IncidentQueueFilters, ALL_STATUSES } from "@/components/incidents/IncidentQueueFilters";
import { IncidentQueueTable } from "@/components/incidents/IncidentQueueTable";
import { CreateIncidentDialog } from "@/components/incidents/CreateIncidentDialog";
import type { IncidentStatus, IncidentFilters } from "@/types/incident-types";

export default function IncidentListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<IncidentStatus[]>(["New", "Triaged", "In Progress"]);
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: assignableUsers } = useAssignableUsers();

  // Enable real-time updates
  useIncidentRealtime();

  const filters = useMemo((): IncidentFilters => {
    const baseFilters: IncidentFilters = {};
    if (searchTerm) baseFilters.search = searchTerm;
    if (selectedAssignee !== "all" && selectedAssignee !== "unassigned") {
      baseFilters.assigned_to = selectedAssignee;
    }
    return baseFilters;
  }, [searchTerm, selectedAssignee]);

  const { data: incidents = [], isLoading } = useIncidents(filters);

  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUSES.length) {
      result = result.filter((i) => selectedStatuses.includes(i.status as IncidentStatus));
    }
    if (selectedAssignee === "unassigned") {
      result = result.filter((i) => !i.assigned_to);
    }
    return result;
  }, [incidents, selectedStatuses, selectedAssignee]);

  return (
    <div className="container-responsive pt-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Active Incidents</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all active incidents across your projects
          </p>
        </div>

        <IncidentQueueFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedStatuses={selectedStatuses}
          onStatusChange={setSelectedStatuses}
          selectedAssignee={selectedAssignee}
          onAssigneeChange={setSelectedAssignee}
          itemCount={filteredIncidents.length}
          onCreateClick={() => setCreateDialogOpen(true)}
          assignees={assignableUsers}
        />

        <IncidentQueueTable
          incidents={filteredIncidents}
          isLoading={isLoading}
        />

        <CreateIncidentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </div>
  );
}
