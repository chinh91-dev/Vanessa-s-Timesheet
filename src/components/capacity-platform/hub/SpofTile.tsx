// ============================================================================
// SpofTile — count of SPOF + NONE skills with link to Skills page
// ----------------------------------------------------------------------------
// Spec §8.7 — "SPOF tile: count of skills flagged ⚠ SPOF or 🔴 NONE — links
// to Skills page". Reads from the already-cached useSkillMatrix query.
// ============================================================================

import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Skull } from "lucide-react";
import { useSkillMatrix } from "@/hooks/capacity-platform";
import { Skeleton } from "@/components/ui/skeleton";

const SpofTile = () => {
  const q = useSkillMatrix();

  if (q.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  const rows = q.data ?? [];
  const spof = rows.filter((r) => r.spof_risk === "SPOF").length;
  const none = rows.filter((r) => r.spof_risk === "NONE").length;
  const totalRisky = spof + none;

  return (
    <Link
      to="/capacity-platform/skills"
      className="rounded-md border p-4 flex flex-col gap-2 hover:bg-accent/40 hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Skills at risk</h3>
        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="text-3xl font-semibold tabular-nums">{totalRisky}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Skull className="h-3.5 w-3.5 text-red-700" aria-hidden />
          <span className="text-muted-foreground">NONE</span>
          <span className="font-medium tabular-nums ml-auto">{none}</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle
            className="h-3.5 w-3.5 text-amber-600"
            aria-hidden
          />
          <span className="text-muted-foreground">SPOF</span>
          <span className="font-medium tabular-nums ml-auto">{spof}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        Click to open the skill matrix.
      </span>
    </Link>
  );
};

export default SpofTile;
