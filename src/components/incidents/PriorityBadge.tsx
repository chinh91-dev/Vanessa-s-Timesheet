import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, Minus } from "lucide-react";
import type { IncidentPriority } from "@/types/incident-types";

interface PriorityBadgeProps {
  priority?: IncidentPriority | null;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  if (!priority) {
    return (
      <Badge variant="outline" className={className}>
        <Minus className="h-3 w-3 mr-1" />
        No Priority
      </Badge>
    );
  }

  const getPriorityIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("critical")) return AlertTriangle;
    if (lowerName.includes("high")) return AlertCircle;
    if (lowerName.includes("medium")) return Info;
    return Minus;
  };

  const getPriorityVariant = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("critical")) return "destructive";
    if (lowerName.includes("high")) return "destructive";
    if (lowerName.includes("medium")) return "default";
    return "secondary";
  };

  const Icon = getPriorityIcon(priority.name);

  return (
    <Badge 
      variant={getPriorityVariant(priority.name)}
      className={className}
      style={{ 
        backgroundColor: priority.color,
        color: priority.name.toLowerCase().includes("critical") || priority.name.toLowerCase().includes("high") ? "white" : "inherit"
      }}
    >
      <Icon className="h-3 w-3 mr-1" />
      {priority.name}
    </Badge>
  );
}