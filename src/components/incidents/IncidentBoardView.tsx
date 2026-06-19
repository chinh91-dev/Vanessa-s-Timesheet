import React, { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { useIncidents, useUpdateIncident } from "@/hooks/useIncidents";
import { useIncidentRealtime } from "@/hooks/useIncidentRealtime";
import { BoardIncidentCard } from "./BoardIncidentCard";
import { CreateIncidentDialog } from "./CreateIncidentDialog";
import { toast } from "@/hooks/use-toast";
import type { Incident, IncidentStatus } from "@/types/incident-types";
import { INCIDENT_STATUS_FLOW, INCIDENT_STATUS_COLORS } from "@/types/incident-types";

interface IncidentBoardViewProps {
  projectId: string;
}

const BOARD_COLUMNS: { status: IncidentStatus; title: string }[] = [
  { status: 'New', title: 'New' },
  { status: 'Triaged', title: 'Triaged' },
  { status: 'In Progress', title: 'In Progress' },
  { status: 'Resolved', title: 'Resolved' },
  { status: 'Closed', title: 'Closed' },
];

export function IncidentBoardView({ projectId }: IncidentBoardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { data: incidents = [], isLoading } = useIncidents({ 
    incident_project_id: projectId 
  });
  
  const updateIncident = useUpdateIncident();

  // Enable real-time updates for this project
  useIncidentRealtime({ projectId });

  // Filter incidents by search term
  const filteredIncidents = incidents.filter(incident => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      incident.title.toLowerCase().includes(searchLower) ||
      incident.incident_number.toLowerCase().includes(searchLower) ||
      incident.description?.toLowerCase().includes(searchLower)
    );
  });

  // Group incidents by status
  const incidentsByStatus = BOARD_COLUMNS.reduce((acc, column) => {
    acc[column.status] = filteredIncidents.filter(incident => incident.status === column.status);
    return acc;
  }, {} as Record<IncidentStatus, Incident[]>);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as IncidentStatus;
    const incident = incidents.find(inc => inc.id === draggableId);
    
    if (!incident) return;

    // Check if the status transition is valid
    const allowedTransitions = INCIDENT_STATUS_FLOW[incident.status];
    if (!allowedTransitions.includes(newStatus)) {
      toast({
        title: "Invalid Status Transition",
        description: `Cannot move incident from ${incident.status} to ${newStatus}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        updates: { status: newStatus },
      });

      toast({
        title: "Status Updated",
        description: `Incident ${incident.incident_number} moved to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update incident status",
        variant: "destructive",
      });
    }
  }, [incidents, updateIncident]);

  const getColumnColor = (status: IncidentStatus) => {
    const colorMap: Record<IncidentStatus, string> = {
      'New': 'border-red-200 bg-red-50',
      'Triaged': 'border-yellow-200 bg-yellow-50',
      'In Progress': 'border-blue-200 bg-blue-50',
      'Resolved': 'border-green-200 bg-green-50',
      'Closed': 'border-gray-200 bg-gray-50',
    };
    return colorMap[status];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-10 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {BOARD_COLUMNS.map((column, index) => (
            <Card key={index} className="h-96">
              <CardHeader className="pb-3">
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Incident
        </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[600px]">
          {BOARD_COLUMNS.map((column) => {
            const columnIncidents = incidentsByStatus[column.status] || [];
            
            return (
              <Card key={column.status} className={`${getColumnColor(column.status)} border-2`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{column.title}</span>
                    <Badge 
                      variant="secondary" 
                      className="ml-2"
                      style={{ 
                        backgroundColor: INCIDENT_STATUS_COLORS[column.status] + '20',
                        color: INCIDENT_STATUS_COLORS[column.status],
                        border: `1px solid ${INCIDENT_STATUS_COLORS[column.status]}40`
                      }}
                    >
                      {columnIncidents.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-3 pt-0">
                  <Droppable droppableId={column.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[400px] p-2 rounded-md transition-colors ${
                          snapshot.isDraggingOver ? 'bg-muted/50' : ''
                        }`}
                      >
                        {columnIncidents.map((incident, index) => (
                          <Draggable
                            key={incident.id}
                            draggableId={incident.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`${
                                  snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                                }`}
                              >
                                <BoardIncidentCard incident={incident} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {columnIncidents.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No incidents
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DragDropContext>

      {/* Create Incident Dialog */}
      <CreateIncidentDialog 
        defaultProjectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}