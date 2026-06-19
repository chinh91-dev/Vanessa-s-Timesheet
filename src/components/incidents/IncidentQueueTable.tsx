import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow, isToday, isPast } from "date-fns";
import { Clock, AlertCircle } from "lucide-react";
import type { Incident, IncidentStatus } from "@/types/incident-types";
import { cn } from "@/lib/utils";
import { SourceBadge } from "./SourceBadge";

interface IncidentQueueTableProps {
  incidents: Incident[];
  isLoading?: boolean;
  onIncidentClick?: (incident: Incident) => void;
}

const getStatusStyle = (status: IncidentStatus) => {
  switch (status) {
    case "New":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "Triaged":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "In Progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "Resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "Closed":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getInitials = (name?: string, email?: string) => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
};

function SLAIndicator({ slaDueDate }: { slaDueDate?: string }) {
  if (!slaDueDate) return <span className="text-muted-foreground">—</span>;

  const dueDate = new Date(slaDueDate);
  const isBreached = isPast(dueDate);
  const isTodayDue = isToday(dueDate);

  if (isBreached) {
    return (
      <div className="flex items-center gap-1.5 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-xs font-medium">Breached</span>
      </div>
    );
  }

  if (isTodayDue) {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <Clock className="h-4 w-4" />
        <span className="text-xs font-medium">
          Today {format(dueDate, "HH:mm")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span className="text-xs">{formatDistanceToNow(dueDate, { addSuffix: true })}</span>
    </div>
  );
}

export function IncidentQueueTable({
  incidents,
  isLoading,
  onIncidentClick,
}: IncidentQueueTableProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = incidents.length > 0 && selectedIds.size === incidents.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < incidents.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(incidents.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleRowClick = (incident: Incident) => {
    if (onIncidentClick) {
      onIncidentClick(incident);
    } else {
      navigate(`/incident-management/incidents/${incident.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Key</TableHead>
              <TableHead className="min-w-[250px]">Summary</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Time to Resolution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No incidents found.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={someSelected ? "data-[state=checked]:bg-primary" : ""}
              />
            </TableHead>
            <TableHead className="font-semibold">Key</TableHead>
            <TableHead className="font-semibold min-w-[250px]">Summary</TableHead>
            <TableHead className="font-semibold">Reporter</TableHead>
            <TableHead className="font-semibold">Assignee</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Created</TableHead>
            <TableHead className="font-semibold">Time to Resolution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => (
            <TableRow
              key={incident.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleRowClick(incident)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(incident.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(incident.id, checked as boolean)
                  }
                  aria-label={`Select ${incident.incident_number}`}
                />
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-primary font-medium">
                  {incident.incident_number}
                </span>
              </TableCell>
              <TableCell>
                <div className="max-w-[300px]">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{incident.title}</p>
                    {incident.source && incident.source !== 'web' && (
                      <SourceBadge source={incident.source} />
                    )}
                  </div>
                  {incident.category && (
                    <p className="text-xs text-muted-foreground truncate">
                      {incident.category.name}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {incident.creator?.full_name || incident.creator?.email || "Unknown"}
                </span>
              </TableCell>
              <TableCell>
                {incident.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(
                          incident.assignee.full_name,
                          incident.assignee.email
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm hidden lg:inline">
                      {incident.assignee.full_name || incident.assignee.email}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    getStatusStyle(incident.status)
                  )}
                >
                  {incident.status}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(incident.created_at), "dd/MMM/yy")}
                </span>
              </TableCell>
              <TableCell>
                <SLAIndicator slaDueDate={incident.sla_due_date} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
