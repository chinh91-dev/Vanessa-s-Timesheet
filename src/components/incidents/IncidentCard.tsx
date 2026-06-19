import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MessageSquare, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { EnhancedSLAIndicator } from "./EnhancedSLAIndicator";
import type { Incident } from "@/types/incident-types";

interface IncidentCardProps {
  incident: Incident;
  onClick?: (incident: Incident) => void;
}

export function IncidentCard({ incident, onClick }: IncidentCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(incident);
    } else {
      navigate(`/incident-management/incidents/${incident.id}`);
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {incident.incident_number}
              </Badge>
              <StatusBadge status={incident.status} />
              <PriorityBadge priority={incident.priority} />
            </div>
            <h3 className="font-semibold text-lg leading-none">{incident.title}</h3>
          </div>
          <EnhancedSLAIndicator incident={incident} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {incident.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {incident.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>
              {incident.assignee ? 
                (incident.assignee.full_name || incident.assignee.email) : 
                "Unassigned"
              }
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              Created {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {incident.category && (
            <Badge variant="secondary" className="text-xs">
              {incident.category.name}
            </Badge>
          )}
        </div>
        
        {incident.incident_project && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {incident.incident_project.project_key}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {incident.incident_project.name}
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {incident.escalated_at && (
              <div className="flex items-center gap-1 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Escalated</span>
              </div>
            )}
            
            {incident.auto_assigned && (
              <Badge variant="secondary" className="text-xs">
                Auto-assigned
              </Badge>
            )}
          </div>
          
          <Button variant="ghost" size="sm" className="h-8">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}