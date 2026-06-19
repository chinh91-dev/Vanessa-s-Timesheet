// ============================================================================
// PersonProfileTab — read-only profile summary + edit shortcut
// ----------------------------------------------------------------------------
// Phase 16 — spec §8.1. Identity stays on the Team page (handled by
// existing /timesheet/team); this tab summarises the capacity-relevant
// fields and offers an "Edit" button that opens the existing
// PersonEditDialog.
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import PersonEditDialog from "@/components/capacity-platform/PersonEditDialog";
import { useCapacityProfiles } from "@/hooks/capacity-platform";
import type { CapacityProfileRow } from "@/lib/capacity-platform/profiles";

const yesNo = (v: boolean | null | undefined): string =>
  v === null || v === undefined ? "—" : v ? "Yes" : "No";

export interface PersonProfileTabProps {
  person: CapacityProfileRow;
}

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[160px_1fr] gap-3 items-baseline py-2 border-b last:border-b-0">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium">{value ?? "—"}</dd>
  </div>
);

const PersonProfileTab = ({ person }: PersonProfileTabProps) => {
  const profilesQ = useCapacityProfiles();
  const [editOpen, setEditOpen] = useState(false);
  const allProfiles = profilesQ.data ?? [person];
  const backup = person.backup_for_id
    ? allProfiles.find((p) => p.id === person.backup_for_id) ?? null
    : null;

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Profile</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="gap-1"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
      <dl>
        <Field label="Full name" value={person.full_name ?? "—"} />
        <Field label="Email" value={person.email ?? "—"} />
        <Field label="Employment type" value={person.employment_type ?? "—"} />
        <Field
          label="Status"
          value={
            person.is_active ? (
              <Badge>Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )
          }
        />
        <Field
          label="Weekly hours"
          value={person.weekly_hours ?? <span className="italic text-muted-foreground">org default</span>}
        />
        <Field label="On-call capable" value={yesNo(person.on_call_capable)} />
        <Field
          label="Can lead onboarding"
          value={yesNo(person.can_lead_onboarding)}
        />
        <Field
          label="Primary backup"
          value={
            backup
              ? backup.full_name ?? backup.email ?? backup.id.slice(0, 8)
              : "—"
          }
        />
      </dl>

      <PersonEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        person={person}
        allProfiles={allProfiles}
      />
    </div>
  );
};

export default PersonProfileTab;
