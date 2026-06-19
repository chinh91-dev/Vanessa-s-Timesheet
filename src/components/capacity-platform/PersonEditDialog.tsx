// ============================================================================
// PersonEditDialog — edit the 4 capacity-platform profile fields
// ----------------------------------------------------------------------------
// Identity fields (full_name, email, role, employment_type) are NOT editable
// here — they live on the existing /timesheet/team page.
//
// Fields:
//   weekly_hours          numeric — null allowed (uses default 38 elsewhere)
//   on_call_capable       boolean
//   can_lead_onboarding   boolean
//   backup_for_id         uuid | null — selected from active profiles list,
//                         excluding self; cycle-checked client-side.
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  detectBackupCycle,
  type CapacityProfileRow,
} from "@/lib/capacity-platform/profiles";
import { useUpdateCapacityProfile } from "@/hooks/capacity-platform";
import BackupCyclePreview from "./BackupCyclePreview";

const NULL_BACKUP_VALUE = "__none__";

export interface PersonEditDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  person: CapacityProfileRow;
  /** Used for the backup dropdown options + cycle detection. */
  allProfiles: CapacityProfileRow[];
}

interface FormState {
  weekly_hours: string; // text-input string for ergonomics
  on_call_capable: boolean;
  can_lead_onboarding: boolean;
  backup_for_id: string; // NULL_BACKUP_VALUE for no-backup
}

const initial = (p: CapacityProfileRow): FormState => ({
  weekly_hours: p.weekly_hours == null ? "" : String(p.weekly_hours),
  on_call_capable: !!p.on_call_capable,
  can_lead_onboarding: !!p.can_lead_onboarding,
  backup_for_id: p.backup_for_id ?? NULL_BACKUP_VALUE,
});

const PersonEditDialog = ({
  open,
  onOpenChange,
  person,
  allProfiles,
}: PersonEditDialogProps) => {
  const [form, setForm] = useState<FormState>(() => initial(person));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const update = useUpdateCapacityProfile();

  // Reset on open / person change
  useEffect(() => {
    if (open) {
      setForm(initial(person));
      setSubmitError(null);
    }
  }, [open, person]);

  const proposedBackupId =
    form.backup_for_id === NULL_BACKUP_VALUE ? null : form.backup_for_id;

  // Validate weekly_hours
  const weeklyHoursTrimmed = form.weekly_hours.trim();
  let weeklyHoursValue: number | null = null;
  let weeklyHoursError: string | null = null;
  if (weeklyHoursTrimmed === "") {
    weeklyHoursValue = null;
  } else {
    const n = Number(weeklyHoursTrimmed);
    if (!Number.isFinite(n)) {
      weeklyHoursError = "Must be a number.";
    } else if (n < 0) {
      weeklyHoursError = "Must be ≥ 0.";
    } else if (n > 80) {
      weeklyHoursError = "Must be ≤ 80.";
    } else {
      weeklyHoursValue = Math.round(n * 100) / 100;
    }
  }

  const cycle = proposedBackupId
    ? detectBackupCycle(person.id, proposedBackupId, allProfiles)
    : null;
  const hasCycle = !!cycle;

  const canSubmit =
    !weeklyHoursError && !hasCycle && !update.isPending;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      await update.mutateAsync({
        id: person.id,
        patch: {
          weekly_hours: weeklyHoursValue,
          on_call_capable: form.on_call_capable,
          can_lead_onboarding: form.can_lead_onboarding,
          backup_for_id: proposedBackupId,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  const backupCandidates = allProfiles
    .filter((p) => p.id !== person.id && p.is_active)
    .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit capacity — {person.full_name ?? "(no name)"}</DialogTitle>
          <DialogDescription>
            Identity (name, email, role, employment type) is edited on the
            Team page. This dialog edits only the capacity-platform fields.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="weekly_hours">Weekly hours</Label>
            <Input
              id="weekly_hours"
              inputMode="decimal"
              placeholder="e.g. 38"
              value={form.weekly_hours}
              onChange={(e) => setForm((f) => ({ ...f, weekly_hours: e.target.value }))}
            />
            {weeklyHoursError && (
              <span className="text-xs text-destructive">{weeklyHoursError}</span>
            )}
            <span className="text-xs text-muted-foreground">
              Leave blank to fall back to the org default.
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="on_call_capable" className="cursor-pointer">
              On-call capable
            </Label>
            <Switch
              id="on_call_capable"
              checked={form.on_call_capable}
              onCheckedChange={(v) => setForm((f) => ({ ...f, on_call_capable: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="can_lead_onboarding" className="cursor-pointer">
              Can lead onboarding
            </Label>
            <Switch
              id="can_lead_onboarding"
              checked={form.can_lead_onboarding}
              onCheckedChange={(v) => setForm((f) => ({ ...f, can_lead_onboarding: v }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="backup_for_id">Primary backup</Label>
            <Select
              value={form.backup_for_id}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, backup_for_id: v }))
              }
            >
              <SelectTrigger id="backup_for_id">
                <SelectValue placeholder="Select a backup..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_BACKUP_VALUE}>(none)</SelectItem>
                {backupCandidates.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.email ?? p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <BackupCyclePreview
              personId={person.id}
              proposedBackupId={proposedBackupId}
              profiles={allProfiles}
            />
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
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {update.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PersonEditDialog;
