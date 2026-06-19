// ============================================================================
// SkillHeatMap — people × skills colour-coded grid
// ----------------------------------------------------------------------------
// Spec §8.2 — "27 skills × N active people, colour-coded by score
// (1=light, 2=mid, 3=dark, 4=star). Inline edit for Admin/Manager".
//
// Phase 16 ships the read-only matrix; click a skill row label to open the
// existing per-skill ratings drawer for inline edits. Patterns + labels are
// included alongside colour to keep the matrix accessible per spec §16.
// ============================================================================

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import {
  useCapacityProfiles,
  useSkills,
} from "@/hooks/capacity-platform";
import { useAllUserSkills } from "@/hooks/capacity-platform/useAllUserSkills";
import SkillRatingsDrawer from "@/components/capacity-platform/SkillRatingsDrawer";
import type {
  SkillMatrixRow,
  SkillRow,
} from "@/lib/capacity-platform/types";

interface CellProps {
  level: number; // 0..4
}

const LEVEL_BG: Record<number, string> = {
  0: "",
  1: "bg-emerald-100 dark:bg-emerald-950/40",
  2: "bg-emerald-300 dark:bg-emerald-900/60",
  3: "bg-emerald-500/80 text-white",
  4: "bg-amber-500 text-white",
};

const LEVEL_LABEL: Record<number, string> = {
  0: "—",
  1: "1",
  2: "2",
  3: "3",
  4: "★",
};

const HeatCell = ({ level }: CellProps) => {
  const bg = LEVEL_BG[level] ?? "";
  return (
    <div
      className={`h-7 w-9 flex items-center justify-center text-[11px] font-medium tabular-nums border ${bg}`}
      title={`Proficiency ${level === 0 ? "not rated" : level}`}
      aria-label={`Proficiency ${level === 0 ? "not rated" : level}`}
    >
      {level === 4 ? (
        <Star className="h-3 w-3" aria-hidden />
      ) : (
        <span>{LEVEL_LABEL[level]}</span>
      )}
    </div>
  );
};

const getInitials = (fullName: string | null): string => {
  if (!fullName) return "??";
  if (fullName === "Chinh Phan Cong") return "CP";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const skillToMatrixRow = (s: SkillRow): SkillMatrixRow => ({
  skill_id: s.id,
  skill_code: s.code,
  skill_name: s.name,
  category_id: s.category_id,
  category_name: null,
  weight: s.weight,
  active_headcount: 0,
  avg_score: null,
  trainers: 0,
  experts: 0,
  capable: 0,
  aware: 0,
  coverage_pct: 0,
  spof_risk: "OK",
  risk_level: "Low",
  top_sme_id: null,
  top_sme_name: null,
  weighted_risk_score: 0,
  action_needed: null,
});

const SkillHeatMap = () => {
  // staleTime:0 forces fresh fetch on each mount — prevents stale empty cache
  // from a prior unauthenticated request hiding real data.
  const skillsQ = useSkills({ activeOnly: true, staleTime: 0 });
  const profilesQ = useCapacityProfiles({ activeOnly: true, staleTime: 0 });
  const userSkillsQ = useAllUserSkills();
  const [drawerSkill, setDrawerSkill] = useState<SkillMatrixRow | null>(null);

  // React Query v5: isPending covers both "disabled" and "fetching" states;
  // isLoading is false for disabled queries (no session yet), causing premature
  // empty-state render before auth is resolved.
  const isLoading =
    skillsQ.isPending || profilesQ.isPending || userSkillsQ.isPending;
  const error = skillsQ.error || profilesQ.error || userSkillsQ.error;

  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of userSkillsQ.data ?? []) {
      // key by both (skill_id, user_id) and (category_id::skill_name, user_id)
      // because some legacy rows may have skill_id null.
      if (r.skill_id) {
        m.set(`${r.skill_id}::${r.user_id}`, r.proficiency_level);
      }
      m.set(
        `${r.skill_category_id}::${r.skill_name}::${r.user_id}`,
        r.proficiency_level
      );
    }
    return m;
  }, [userSkillsQ.data]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load heat-map: {(error as Error).message}
      </div>
    );
  }

  const skills = skillsQ.data ?? [];
  const profiles = profilesQ.data ?? [];

  if (skills.length === 0 || profiles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-6 text-center border rounded-md">
        No skills or active people to plot.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background border-r border-b text-left text-xs font-medium px-2 py-1 min-w-[180px]">
                Skill
              </th>
              {profiles.map((p) => (
                <th
                  key={p.id}
                  className="border-b text-[10px] font-bold text-center px-1 py-1 min-w-[2.25rem]"
                  title={p.full_name ?? p.email ?? p.id}
                >
                  {getInitials(p.full_name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <th
                  className="sticky left-0 bg-background border-r text-left text-xs font-medium px-2 py-1 cursor-pointer hover:text-primary"
                  scope="row"
                  onClick={() => setDrawerSkill(skillToMatrixRow(s))}
                  title={`Edit ${s.name} ratings`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {s.code}
                  </div>
                </th>
                {profiles.map((p) => {
                  const k1 = `${s.id}::${p.id}`;
                  const k2 = s.category_id
                    ? `${s.category_id}::${s.name}::${p.id}`
                    : null;
                  const level =
                    lookup.get(k1) ?? (k2 ? lookup.get(k2) ?? 0 : 0);
                  return (
                    <td key={p.id} className="p-0">
                      <HeatCell level={level} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Click a skill row to edit ratings.</span>
        <div className="flex items-center gap-1">
          <span className={`inline-block w-4 h-4 ${LEVEL_BG[1]}`} />
          1 Aware
        </div>
        <div className="flex items-center gap-1">
          <span className={`inline-block w-4 h-4 ${LEVEL_BG[2]}`} />
          2 Capable
        </div>
        <div className="flex items-center gap-1">
          <span className={`inline-block w-4 h-4 ${LEVEL_BG[3]}`} />
          3 Expert
        </div>
        <div className="flex items-center gap-1">
          <span className={`inline-block w-4 h-4 ${LEVEL_BG[4]}`} />
          <Star className="h-3 w-3 inline" aria-hidden /> 4 Trainer
        </div>
      </div>

      <SkillRatingsDrawer
        open={!!drawerSkill}
        onOpenChange={(next) => {
          if (!next) setDrawerSkill(null);
        }}
        skill={drawerSkill}
      />
    </>
  );
};

export default SkillHeatMap;
