import React, { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, List, Plus, ChevronDown, X } from "lucide-react";
import type { IncidentStatus } from "@/types/incident-types";

export const ALL_STATUSES: IncidentStatus[] = [
  "New",
  "Triaged",
  "In Progress",
  "Pending",
  "Resolved",
  "Cancelled",
  "Closed",
];

interface IncidentQueueFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: IncidentStatus[];
  onStatusChange: (values: IncidentStatus[]) => void;
  selectedAssignee: string;
  onAssigneeChange: (value: string) => void;
  itemCount: number;
  onCreateClick: () => void;
  assignees?: Array<{ id: string; full_name?: string; email?: string }>;
  projectId?: string;
}

const STATUS_COLORS: Record<IncidentStatus, string> = {
  New: "bg-blue-500/10 text-blue-600 border-blue-200",
  Triaged: "bg-purple-500/10 text-purple-600 border-purple-200",
  "In Progress": "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  Pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  Resolved: "bg-green-500/10 text-green-600 border-green-200",
  Cancelled: "bg-gray-500/10 text-gray-400 border-gray-200 line-through",
  Closed: "bg-gray-500/10 text-gray-600 border-gray-200",
};

/** Persist per-project default status selection in localStorage */
function getProjectDefaultStatuses(projectId?: string): IncidentStatus[] {
  if (!projectId) return ["New", "Triaged", "In Progress", "Pending"];
  try {
    const stored = localStorage.getItem(`incident-status-default-${projectId}`);
    if (stored) return JSON.parse(stored) as IncidentStatus[];
  } catch (e) {
    console.warn('[IncidentQueueFilters] localStorage read/parse failed:', e);
  }
  return ["New", "Triaged", "In Progress", "Pending"];
}

function saveProjectDefaultStatuses(projectId: string, statuses: IncidentStatus[]) {
  try {
    localStorage.setItem(`incident-status-default-${projectId}`, JSON.stringify(statuses));
  } catch (e) {
    console.warn('[IncidentQueueFilters] localStorage write failed:', e);
  }
}

export function useProjectStatusDefault(projectId?: string): [IncidentStatus[], React.Dispatch<React.SetStateAction<IncidentStatus[]>>] {
  const [statuses, setStatuses] = useState<IncidentStatus[]>(() =>
    getProjectDefaultStatuses(projectId)
  );

  // Persist whenever statuses or projectId changes
  useEffect(() => {
    if (projectId) {
      saveProjectDefaultStatuses(projectId, statuses);
    }
  }, [statuses, projectId]);

  return [statuses, setStatuses];
}

export function IncidentQueueFilters({
  searchTerm,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  selectedAssignee,
  onAssigneeChange,
  itemCount,
  onCreateClick,
  assignees = [],
  projectId,
}: IncidentQueueFiltersProps) {
  const [statusOpen, setStatusOpen] = useState(false);

  const toggleStatus = (status: IncidentStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const selectAll = () => onStatusChange([...ALL_STATUSES]);
  const clearAll = () => onStatusChange([]);

  const saveAsDefault = () => {
    if (projectId) {
      saveProjectDefaultStatuses(projectId, selectedStatuses);
    }
  };

  const statusLabel =
    selectedStatuses.length === 0
      ? "No Status"
      : selectedStatuses.length === ALL_STATUSES.length
      ? "All Status"
      : `${selectedStatuses.length} selected`;

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <List className="h-4 w-4" />
            <span>List</span>
          </Button>
        </div>
        <Button size="sm" onClick={onCreateClick} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        {/* Multi-select status filter */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 min-w-[130px] justify-between"
            >
              <span className="truncate text-sm">{statusLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-xs font-medium text-muted-foreground">Filter by Status</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={selectAll}>
                    All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
              </div>
              {ALL_STATUSES.map((status) => (
                <div
                  key={status}
                  className="flex items-center gap-2 py-0.5 cursor-pointer"
                  onClick={() => toggleStatus(status)}
                >
                  <Checkbox
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                    className="h-4 w-4"
                  />
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 ${STATUS_COLORS[status]}`}
                  >
                    {status}
                  </Badge>
                </div>
              ))}
              {projectId && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={saveAsDefault}
                  >
                    Save as default for this project
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={selectedAssignee} onValueChange={onAssigneeChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || user.email || "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active status chips */}
      {selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUSES.length && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedStatuses.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className={`text-xs gap-1 cursor-pointer ${STATUS_COLORS[s]}`}
              onClick={() => toggleStatus(s)}
            >
              {s}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}

      {/* Item count */}
      <div className="text-sm text-muted-foreground">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
