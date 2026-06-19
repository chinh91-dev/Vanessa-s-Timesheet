import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PriorityBadge } from "./PriorityBadge";
import { EnhancedSLAIndicator } from "./EnhancedSLAIndicator";
import type { Incident } from "@/types/incident-types";

interface BoardIncidentCardProps {
  incident: Incident;
}

export function BoardIncidentCard({ incident }: BoardIncidentCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/incident-management/incidents/${incident.id}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md bg-background border group"
      onClick={handleClick}
    >
      <CardContent className="p-3 space-y-3">
        {/* Header with incident number and priority */}
        <div className="flex items-start justify-between">
          <Badge variant="outline" className="font-mono text-xs">
            {incident.incident_number}
          </Badge>
          <div className="flex items-center gap-1">
            <PriorityBadge priority={incident.priority} className="text-xs" />
            {incident.escalated_at && (
              <AlertTriangle className="h-3 w-3 text-warning" />
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {incident.title}
        </h4>

        {/* Description */}
        {incident.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {incident.description}
          </p>
        )}

        {/* SLA Indicator */}
        <EnhancedSLAIndicator incident={incident} />

        {/* Footer with assignee and time */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {incident.assignee ? (
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {getInitials(incident.assignee.full_name || incident.assignee.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground truncate max-w-16">
                  {incident.assignee.full_name?.split(' ')[0] || 
                   incident.assignee.email.split('@')[0]}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(incident.created_at), { 
                addSuffix: false 
              }).replace('about ', '')}
            </span>
          </div>
        </div>

        {/* Category */}
        {incident.category && (
          <Badge variant="secondary" className="text-xs w-fit">
            {incident.category.name}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}