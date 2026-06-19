import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import type { Incident } from "@/types/incident-types";
import { useSLACalculation } from "@/hooks/useSLACalculation";

interface SLAIndicatorProps {
  incident: Incident;
  showDetails?: boolean;
}

export function SLAIndicator({ incident, showDetails = false }: SLAIndicatorProps) {
  const { slaData, loading } = useSLACalculation(incident.id);

  if (loading || !slaData) {
    return null;
  }

  const isResponseBreached = slaData.response_sla_breached;
  const isResolutionBreached = slaData.resolution_sla_breached;
  const isAnyBreached = isResponseBreached || isResolutionBreached;

  const getTimeRemaining = () => {
    if (slaData.resolution_time_remaining && slaData.resolution_time_remaining > 0) {
      return `${Math.floor(slaData.resolution_time_remaining / 60)}h ${slaData.resolution_time_remaining % 60}m`;
    }
    if (slaData.response_time_remaining && slaData.response_time_remaining > 0) {
      return `${Math.floor(slaData.response_time_remaining / 60)}h ${slaData.response_time_remaining % 60}m`;
    }
    return null;
  };

  const timeRemaining = getTimeRemaining();

  if (isAnyBreached) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          SLA Breached
        </Badge>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            {isResponseBreached && "Response overdue"}
            {isResponseBreached && isResolutionBreached && " • "}
            {isResolutionBreached && "Resolution overdue"}
          </div>
        )}
      </div>
    );
  }

  if (timeRemaining) {
    const isUrgent = (slaData.response_time_remaining && slaData.response_time_remaining < 60) ||
                     (slaData.resolution_time_remaining && slaData.resolution_time_remaining < 60);
    
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant={isUrgent ? "destructive" : "secondary"}
          className="flex items-center gap-1"
        >
          <Clock className="h-3 w-3" />
          {timeRemaining}
        </Badge>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            {slaData.resolution_time_remaining ? "until resolution due" : "until response due"}
          </div>
        )}
      </div>
    );
  }

  return null;
}