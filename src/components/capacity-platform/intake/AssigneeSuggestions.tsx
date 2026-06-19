// ============================================================================
// AssigneeSuggestions — ranked assignee picker for the New Request dialog
// ----------------------------------------------------------------------------
// Spec §11.2 — "System suggests assignees ranked by skill score × free
// capacity in due-date week".
//
// Score formula: proficiency * max(0, adjusted_capacity - allocated_hours)
// for the Monday containing the due_date (defaults to next Monday when
// due_date is empty). People without a rating on the requested skill are
// excluded.
// ============================================================================

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCapacityLive,
  useCapacityProfiles,
  useUserSkillsBySkill,
} from "@/hooks/capacity-platform";
import { mondayOf } from "@/lib/capacity-platform/monday";

interface SuggestionRow {
  user_id: string;
  full_name: string;
  proficiency_level: number;
  free_hours: number;
  score: number;
}

const PROFICIENCY_BADGES: Record<number, string> = {
  1: "bg-slate-200 text-slate-700",
  2: "bg-emerald-200 text-emerald-800",
  3: "bg-emerald-500 text-white",
  4: "bg-amber-500 text-white",
};

export interface AssigneeSuggestionsProps {
  skillId: string | null;
  dueDate: string; // yyyy-mm-dd or ""
  currentAssigneeId: string | null;
  onPick: (personId: string) => void;
}

const AssigneeSuggestions = ({
  skillId,
  dueDate,
  currentAssigneeId,
  onPick,
}: AssigneeSuggestionsProps) => {
  const targetWeek = useMemo(() => {
    if (dueDate) {
      const d = new Date(`${dueDate}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return mondayOf(d);
    }
    // Default to next Monday if no due-date selected.
    const today = new Date();
    return mondayOf(new Date(today.getTime() + 7 * 24 * 3600 * 1000));
  }, [dueDate]);

  const ratingsQ = useUserSkillsBySkill(skillId ?? undefined);
  const liveQ = useCapacityLive(targetWeek);
  const profilesQ = useCapacityProfiles({ activeOnly: true });

  if (!skillId) return null;

  if (ratingsQ.isLoading || liveQ.isLoading || profilesQ.isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }
  const ratings = ratingsQ.data ?? [];
  if (ratings.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic border rounded-md px-2 py-2">
        No-one is rated on this skill yet.
      </div>
    );
  }

  const liveByPerson = new Map((liveQ.data ?? []).map((r) => [r.person_id, r]));
  const profileById = new Map((profilesQ.data ?? []).map((p) => [p.id, p]));

  const suggestions: SuggestionRow[] = ratings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => {
      const live = liveByPerson.get(r.user_id);
      const free = live
        ? Math.max(
            0,
            Number(live.adjusted_capacity ?? 0) -
              Number(live.allocated_hours ?? 0)
          )
        : 0;
      const profile = profileById.get(r.user_id);
      const score = Number(r.proficiency_level) * free;
      return {
        user_id: r.user_id,
        full_name:
          profile?.full_name ??
          profile?.email ??
          r.user_id.slice(0, 8),
        proficiency_level: Number(r.proficiency_level),
        free_hours: free,
        score,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.proficiency_level !== a.proficiency_level)
        return b.proficiency_level - a.proficiency_level;
      return b.free_hours - a.free_hours;
    })
    .slice(0, 5);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">
          Suggested assignees · week of {targetWeek.toISOString().slice(0, 10)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          score = proficiency × free hours
        </span>
      </div>
      <ul className="space-y-1">
        {suggestions.map((s) => {
          const isCurrent = s.user_id === currentAssigneeId;
          return (
            <li
              key={s.user_id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge
                  className={`text-[10px] ${PROFICIENCY_BADGES[s.proficiency_level] ?? ""}`}
                >
                  {s.proficiency_level === 4
                    ? "Trainer"
                    : `L${s.proficiency_level}`}
                </Badge>
                <span className="text-sm truncate">{s.full_name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.free_hours.toFixed(1)} h free
                </span>
              </div>
              <Button
                variant={isCurrent ? "secondary" : "outline"}
                size="sm"
                onClick={() => onPick(s.user_id)}
                disabled={isCurrent}
              >
                {isCurrent ? "Current" : "Pick"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AssigneeSuggestions;
