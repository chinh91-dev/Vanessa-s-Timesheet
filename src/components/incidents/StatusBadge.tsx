import React from "react";
import { Badge } from "@/components/ui/badge";
import { INCIDENT_STATUS_COLORS } from "@/types/incident-types";
import type { IncidentStatus } from "@/types/incident-types";

interface StatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: IncidentStatus) => {
    switch (status) {
      case "New":
        return {
          variant: "destructive" as const,
          className: "text-destructive-foreground bg-destructive"
        };
      case "Triaged":
        return {
          variant: "secondary" as const,
          className: "text-orange-900 bg-orange-100 dark:text-orange-100 dark:bg-orange-900/20"
        };
      case "In Progress":
        return {
          variant: "default" as const,
          className: "text-blue-900 bg-blue-100 dark:text-blue-100 dark:bg-blue-900/20"
        };
      case "Pending":
        return {
          variant: "secondary" as const,
          className: "text-amber-900 bg-amber-100 dark:text-amber-100 dark:bg-amber-900/20"
        };
      case "Resolved":
        return {
          variant: "secondary" as const,
          className: "text-green-900 bg-green-100 dark:text-green-100 dark:bg-green-900/20"
        };
      case "Cancelled":
        return {
          variant: "secondary" as const,
          className: "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800/50 line-through opacity-75"
        };
      case "Closed":
        return {
          variant: "secondary" as const,
          className: "text-muted-foreground bg-muted"
        };
      default:
        return {
          variant: "secondary" as const,
          className: "text-muted-foreground bg-muted"
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ""}`}
    >
      {status}
    </Badge>
  );
}