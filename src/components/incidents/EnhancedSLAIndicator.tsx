import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSLACalculation } from "@/hooks/useSLACalculation";
import type { Incident } from "@/types/incident-types";

interface EnhancedSLAIndicatorProps {
  incident: Incident;
  showDetails?: boolean;
}

export function EnhancedSLAIndicator({ incident, showDetails = false }: EnhancedSLAIndicatorProps) {
  const { slaData } = useSLACalculation(incident.id);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update every minute for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!slaData) {
    return null;
  }

  const { response_sla_breached, resolution_sla_breached, response_time_remaining, resolution_time_remaining } = slaData;

  // SLA met = responded/resolved on time (not breached, and already done)
  const responseMet = !response_sla_breached && incident.first_response_at != null;
  const resolutionMet = !resolution_sla_breached && incident.resolved_at != null;
  const allSLAMet = responseMet && resolutionMet;

  if (allSLAMet) {
    return (
      <div className="flex items-center gap-1">
        <Badge className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-300">
          <CheckCircle2 className="h-3 w-3" />
          SLA Met
        </Badge>
      </div>
    );
  }

  if (responseMet && showDetails) {
    // Response done on time, resolution still running
  }

  const getTimeRemaining = (minutes: number | null) => {
    if (!minutes || minutes <= 0) return "Overdue";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 48) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // Check if SLA is breached
  if (response_sla_breached || resolution_sla_breached) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          SLA Breached
        </Badge>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            {response_sla_breached && "Response"} 
            {response_sla_breached && resolution_sla_breached && " & "}
            {resolution_sla_breached && "Resolution"}
          </div>
        )}
      </div>
    );
  }

  // Show time remaining for active SLA
  const activeRemaining = responseMet ? resolution_time_remaining : response_time_remaining;
  const activeLabel = responseMet ? "Resolution" : "Response";
  const isUrgent = activeRemaining && activeRemaining < 60;

  return (
    <div className="flex items-center gap-1">
      {responseMet && showDetails && (
        <Badge className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-300 text-xs">
          <CheckCircle2 className="h-3 w-3" />
          Response
        </Badge>
      )}
      <Badge
        variant={isUrgent ? "destructive" : "secondary"}
        className="flex items-center gap-1"
      >
        <Clock className="h-3 w-3" />
        {getTimeRemaining(activeRemaining)}
      </Badge>
      {showDetails && (
        <div className="text-xs text-muted-foreground">{activeLabel} SLA</div>
      )}
    </div>
  );
}