import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, Plus, Trash2, GitBranch, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useIncidentRelationships, useCreateIncidentRelationship, useDeleteIncidentRelationship } from "@/hooks/useProjectAdvanced";
import { useIncidents } from "@/hooks/useIncidents";
import type { IncidentRelationship } from "@/types/project-types";

interface IncidentRelationshipsCardProps {
  incidentId: string;
}

const relationshipTypes = [
  { value: "duplicate", label: "Duplicate", color: "bg-yellow-500" },
  { value: "related", label: "Related", color: "bg-blue-500" },
  { value: "blocks", label: "Blocks", color: "bg-red-500" },
  { value: "blocked_by", label: "Blocked By", color: "bg-orange-500" },
  { value: "child_of", label: "Child Of", color: "bg-green-500" },
  { value: "parent_of", label: "Parent Of", color: "bg-purple-500" }
] as const;

export function IncidentRelationshipsCard({ incidentId }: IncidentRelationshipsCardProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: relationships = [] } = useIncidentRelationships(incidentId);
  const createRelationship = useCreateIncidentRelationship();
  const deleteRelationship = useDeleteIncidentRelationship();
  const { data: incidents = [] } = useIncidents({});

  const filteredIncidents = incidents.filter(incident => 
    incident.id !== incidentId &&
    (incident.incident_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
     incident.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateRelationship = (relatedIncidentId: string) => {
    if (!selectedType) {
      toast.error("Please select a relationship type");
      return;
    }

    createRelationship.mutate(
      {
        incident_id: incidentId,
        related_incident_id: relatedIncidentId,
        relationship_type: selectedType as any
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedType("");
          setSearchTerm("");
        }
      }
    );
  };

  const handleDeleteRelationship = (relationshipId: string) => {
    deleteRelationship.mutate(relationshipId);
  };

  const getRelationshipDisplay = (relationship: IncidentRelationship) => {
    const relType = relationshipTypes.find(t => t.value === relationship.relationship_type);
    return {
      color: relType?.color || "bg-gray-500",
      label: relType?.label || relationship.relationship_type,
      incident: relationship.related_incident
    };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Related Incidents
          {relationships.length > 0 && (
            <Badge variant="secondary" className="text-xs">{relationships.length}</Badge>
          )}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              Add Relationship
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Incident Relationship</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="relationship-type">Relationship Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="incident-search">Search Incidents</Label>
                <Input
                  id="incident-search"
                  placeholder="Search by number or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {searchTerm && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => handleCreateRelationship(incident.id)}
                    >
                      <div>
                        <div className="font-medium">{incident.incident_number}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {incident.title}
                        </div>
                      </div>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                  ))}
                  {filteredIncidents.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No incidents found
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {relationships.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div>No related incidents</div>
          </div>
        ) : (
          <div className="space-y-2">
            {relationships.map((relationship) => {
              const display = getRelationshipDisplay(relationship);
              return (
                <div
                  key={relationship.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${display.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{display.label}</span>
                        <Link className="h-3 w-3" />
                        <span className="text-sm">
                          {display.incident?.incident_number}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {display.incident?.title}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      style={{ color: display.incident?.priority?.color }}
                    >
                      {display.incident?.priority?.name}
                    </Badge>
                    {display.incident?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/incident-management/incidents/${display.incident!.id}`)}
                        title="Open incident"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRelationship(relationship.id)}
                      disabled={deleteRelationship.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}