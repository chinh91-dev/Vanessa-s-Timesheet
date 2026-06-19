// ============================================================================
// BackupCyclePreview — visualises a backup chain or a detected cycle
// ----------------------------------------------------------------------------
// Given the candidate (personId, proposedBackupId), walks the existing
// chain via `detectBackupCycle`. Renders one of:
//   - "would create a cycle" with the path  (red)
//   - the resolved chain                    (neutral)
//   - "no backup"                            (muted) when proposedBackupId is null
// ============================================================================

import { AlertCircle, ArrowRight, Users } from "lucide-react";
import {
  detectBackupCycle,
  type CapacityProfileRow,
} from "@/lib/capacity-platform/profiles";

export interface BackupCyclePreviewProps {
  personId: string;
  proposedBackupId: string | null;
  profiles: CapacityProfileRow[];
}

const BackupCyclePreview = ({
  personId,
  proposedBackupId,
  profiles,
}: BackupCyclePreviewProps) => {
  const byId = new Map(profiles.map((p) => [p.id, p] as const));
  const nameOf = (id: string) => byId.get(id)?.full_name ?? id.slice(0, 8);

  if (!proposedBackupId) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-4 w-4" aria-hidden />
        No backup selected.
      </div>
    );
  }

  const cycle = detectBackupCycle(personId, proposedBackupId, profiles);
  if (cycle) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="h-4 w-4 mt-0.5" aria-hidden />
        <div>
          <div className="font-medium mb-1">Would create a backup cycle</div>
          <div className="font-mono text-[11px]">
            {cycle.map((id, i) => (
              <span key={`${id}-${i}`}>
                {nameOf(id)}
                {i < cycle.length - 1 && (
                  <ArrowRight className="inline h-3 w-3 mx-1" aria-hidden />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Walk the resolved chain for display
  const path: string[] = [personId, proposedBackupId];
  const visited = new Set<string>(path);
  let cursor = byId.get(proposedBackupId)?.backup_for_id ?? null;
  let safety = 0;
  while (cursor && !visited.has(cursor) && safety < 20) {
    path.push(cursor);
    visited.add(cursor);
    cursor = byId.get(cursor)?.backup_for_id ?? null;
    safety++;
  }

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <Users className="h-4 w-4 mt-0.5" aria-hidden />
      <div className="font-mono text-[11px]">
        {path.map((id, i) => (
          <span key={`${id}-${i}`}>
            {nameOf(id)}
            {i < path.length - 1 && (
              <ArrowRight className="inline h-3 w-3 mx-1" aria-hidden />
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BackupCyclePreview;
