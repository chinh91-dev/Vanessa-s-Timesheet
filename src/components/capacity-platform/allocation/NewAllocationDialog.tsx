// ============================================================================
// NewAllocationDialog — create a (person, week, customer, work_type) row
// ----------------------------------------------------------------------------
// Triggered from a person row's "+ Add allocation" button. Initial Mon-Fri
// hours default to 0; user fills via inline editing once the row exists.
//
// On success: invalidates `capacityKeys.allocations.all` (handled by
// useCreateCapacityAllocation), so the new row appears in the grid.
// ============================================================================

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateCapacityAllocation } from "@/hooks/capacity-platform";
import type { WorkType } from "@/lib/capacity-platform/types";

const WORK_TYPES: WorkType[] = [
  "BAU",
  "Project",
  "Onboarding",
  "Escalation",
  "Internal",
];

export interface NewAllocationDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  personId: string;
  personLabel: string;
  /** Monday ISO yyyy-mm-dd. */
  weekStart: string;
}

const NewAllocationDialog = ({
  open,
  onOpenChange,
  personId,
  personLabel,
  weekStart,
}: NewAllocationDialogProps) => {
  const [customer, setCustomer] = useState("");
  const [workType, setWorkType] = useState<WorkType>("BAU");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const create = useCreateCapacityAllocation();

  useEffect(() => {
    if (open) {
      setCustomer("");
      setWorkType("BAU");
      setSubmitError(null);
    }
  }, [open]);

  const trimmedCustomer = customer.trim();
  const canSubmit = trimmedCustomer.length > 0 && !create.isPending;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      await create.mutateAsync({
        person_id: personId,
        week_start_date: weekStart,
        customer: trimmedCustomer,
        work_type: workType,
        mon_hours: 0,
        tue_hours: 0,
        wed_hours: 0,
        thu_hours: 0,
        fri_hours: 0,
        sat_hours: 0,
        sun_hours: 0,
        notes: null,
        created_by: null,
        updated_by: null,
      });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add allocation — {personLabel}</DialogTitle>
          <DialogDescription>
            Creates a row for week {weekStart}. Mon–Fri hours start at 0; fill
            via the grid.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="alloc-customer">Customer</Label>
            <Input
              id="alloc-customer"
              placeholder="e.g. ACME Pty Ltd"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="alloc-work-type">Work type</Label>
            <Select
              value={workType}
              onValueChange={(v) => setWorkType(v as WorkType)}
            >
              <SelectTrigger id="alloc-work-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map((wt) => (
                  <SelectItem key={wt} value={wt}>
                    {wt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {submitError && (
            <div className="text-xs text-destructive border border-destructive/40 bg-destructive/10 rounded px-2 py-1">
              {submitError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {create.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewAllocationDialog;
