// ============================================================================
// PeopleTable — capacity-relevant view of profiles
// ----------------------------------------------------------------------------
// Read-only table; row click opens <PersonEditDialog />. Identity columns
// (full_name, email, employment_type, is_active) are visible but the dialog
// only edits capacity-platform fields.
// ============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronRight, ExternalLink, Pencil } from "lucide-react";
import type { CapacityProfileRow } from "@/lib/capacity-platform/profiles";
import PersonEditDialog from "./PersonEditDialog";

export interface PeopleTableProps {
  profiles: CapacityProfileRow[];
}

const yesNo = (v: boolean | null | undefined): string =>
  v === null || v === undefined ? "—" : v ? "Yes" : "No";

const PeopleTable = ({ profiles }: PeopleTableProps) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<CapacityProfileRow | null>(null);

  const byId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p] as const)),
    [profiles]
  );

  if (profiles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-6 text-center">
        No profiles found.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employment</TableHead>
              <TableHead className="text-right">Weekly hrs</TableHead>
              <TableHead>On-call</TableHead>
              <TableHead>Onboarding lead</TableHead>
              <TableHead>Backup</TableHead>
              <TableHead className="text-right w-[1%]">Edit</TableHead>
              <TableHead className="text-right w-[1%]">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const backup = p.backup_for_id ? byId.get(p.backup_for_id) : null;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">
                      {p.full_name ?? "(no name)"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.email ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.employment_type ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.weekly_hours ?? "—"}
                  </TableCell>
                  <TableCell>{yesNo(p.on_call_capable)}</TableCell>
                  <TableCell>{yesNo(p.can_lead_onboarding)}</TableCell>
                  <TableCell className="text-sm">
                    {backup
                      ? backup.full_name ?? backup.email ?? backup.id.slice(0, 8)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(p)}
                      aria-label={`Edit capacity fields for ${p.full_name ?? p.id.slice(0, 8)}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate(`/capacity-platform/people/${p.id}`)
                      }
                      aria-label={`Open detail page for ${p.full_name ?? p.id.slice(0, 8)}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
        Identity fields (name, email, role) are edited on the
        <Button
          variant="link"
          size="sm"
          className="px-1 h-auto"
          onClick={() => navigate("/timesheet/team")}
        >
          Team page
          <ExternalLink className="h-3 w-3 ml-1" aria-hidden />
        </Button>
        .
      </div>

      {editing && (
        <PersonEditDialog
          open={!!editing}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          person={editing}
          allProfiles={profiles}
        />
      )}
    </>
  );
};

export default PeopleTable;
