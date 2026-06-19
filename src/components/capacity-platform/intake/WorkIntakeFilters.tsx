// ============================================================================
// WorkIntakeFilters — top filter strip for queue + kanban views
// ----------------------------------------------------------------------------
// Filters applied client-side to the already-fetched useWorkRequests result.
// Server-side narrowing is intentionally avoided here — queue volumes are
// expected to be small (< few hundred rows) and switching filters should
// feel instant without re-querying.
// ============================================================================

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  PRIORITY_META,
  PRIORITY_ORDER,
} from "@/lib/capacity-platform/workRequestStatus";
import type { TaskPriority } from "@/lib/capacity-platform/types";
import type { CapacityProfileRow } from "@/lib/capacity-platform/profiles";

const ALL = "__all__";
const UNASSIGNED = "__unassigned__";

export interface IntakeFilterState {
  customer: string;
  priority: TaskPriority | "all";
  assignedTo: string; // person id | ALL | UNASSIGNED
}

export const emptyIntakeFilter: IntakeFilterState = {
  customer: "",
  priority: "all",
  assignedTo: ALL,
};

export interface WorkIntakeFiltersProps {
  value: IntakeFilterState;
  onChange: (next: IntakeFilterState) => void;
  profiles: CapacityProfileRow[];
}

const WorkIntakeFilters = ({
  value,
  onChange,
  profiles,
}: WorkIntakeFiltersProps) => {
  const isFiltered =
    value.customer !== "" ||
    value.priority !== "all" ||
    value.assignedTo !== ALL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Filter customer…"
        value={value.customer}
        onChange={(e) => onChange({ ...value, customer: e.target.value })}
        className="w-48"
      />

      <Select
        value={value.priority}
        onValueChange={(v) =>
          onChange({ ...value, priority: v as TaskPriority | "all" })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {PRIORITY_ORDER.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_META[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.assignedTo}
        onValueChange={(v) => onChange({ ...value, assignedTo: v })}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All assignees</SelectItem>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name ?? p.email ?? p.id.slice(0, 8)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(emptyIntakeFilter)}
          className="gap-1"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
};

export const matchesIntakeFilter = (
  row: { customer: string; priority: TaskPriority; assigned_to_id: string | null },
  filter: IntakeFilterState
): boolean => {
  if (filter.customer.trim() !== "") {
    const needle = filter.customer.trim().toLowerCase();
    if (!(row.customer ?? "").toLowerCase().includes(needle)) return false;
  }
  if (filter.priority !== "all" && row.priority !== filter.priority) {
    return false;
  }
  if (filter.assignedTo === UNASSIGNED) {
    if (row.assigned_to_id !== null) return false;
  } else if (filter.assignedTo !== ALL) {
    if (row.assigned_to_id !== filter.assignedTo) return false;
  }
  return true;
};

export default WorkIntakeFilters;
