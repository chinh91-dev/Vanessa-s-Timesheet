import React, { useState, useMemo } from "react";
import { useIncidents } from "@/hooks/useIncidents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus } from "lucide-react";
import { IncidentCard } from "./IncidentCard";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { CreateIncidentDialog } from "./CreateIncidentDialog";
import type { Incident, IncidentFilters, IncidentStatus } from "@/types/incident-types";

interface IncidentListProps {
  projectId?: string;
  showCreateButton?: boolean;
}

export function IncidentList({ projectId, showCreateButton = true }: IncidentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | "all">("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filters = useMemo((): IncidentFilters => {
    const baseFilters: IncidentFilters = {};
    
    if (projectId) {
      baseFilters.incident_project_id = projectId;
    }
    
    if (searchTerm) {
      baseFilters.search = searchTerm;
    }
    
    if (selectedStatus !== "all") {
      baseFilters.status = selectedStatus;
    }
    
    if (selectedPriority !== "all") {
      baseFilters.priority_id = selectedPriority;
    }
    
    return baseFilters;
  }, [projectId, searchTerm, selectedStatus, selectedPriority]);

  const { data: incidents = [], isLoading, error } = useIncidents(filters);

  const statusOptions: { value: IncidentStatus | "all"; label: string }[] = [
    { value: "all", label: "All Statuses" },
    { value: "New", label: "New" },
    { value: "Triaged", label: "Triaged" },
    { value: "In Progress", label: "In Progress" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" }
  ];

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading incidents: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </span>
            {showCreateButton && (
              <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Incident
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as IncidentStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No incidents found matching your criteria.</p>
              {showCreateButton && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)} 
                  className="mt-4"
                  variant="outline"
                >
                  Create First Incident
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))
        )}
      </div>

      {/* Create Dialog */}
      <CreateIncidentDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        defaultProjectId={projectId}
      />
    </div>
  );
}