// ============================================================================
// PersonSkillsTab — per-person skill ratings with inline edit
// ----------------------------------------------------------------------------
// Spec §8.1 / §8.2 — "per-person Skills tab — radar chart + flat list with
// inline edit". Phase 16 ships the flat-list editor; radar chart can be
// layered later via Recharts RadarChart against the same data.
// ============================================================================

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  useSkills,
  useUpsertUserSkill,
  useUserSkillsByUser,
} from "@/hooks/capacity-platform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { SkillRow } from "@/lib/capacity-platform/types";

const PROFICIENCY_LABELS: Record<string, string> = {
  "0": "—",
  "1": "1 · Aware",
  "2": "2 · Capable",
  "3": "3 · Expert",
  "4": "4 · Trainer",
};

export interface PersonSkillsTabProps {
  userId: string;
  personLabel: string;
}

const PersonSkillsTab = ({ userId, personLabel }: PersonSkillsTabProps) => {
  const { toast } = useToast();
  const skillsQ = useSkills({ activeOnly: true });
  const ratingsQ = useUserSkillsByUser(userId);
  const upsert = useUpsertUserSkill();

  // Dual-key lookup: prefer skill_id (when populated), fall back to the
  // legacy (category_id, skill_name) tuple. Phase 1.5 added skill_id but
  // some legacy rows may still be null OR the upstream skill name may
  // not byte-equal the dictionary's skills.name (whitespace drift). Both
  // paths covered.
  const ratingByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ratingsQ.data ?? []) {
      if (r.skill_id) {
        m.set(`id:${r.skill_id}`, r.proficiency_level);
      }
      m.set(
        `cat:${r.skill_category_id}::${r.skill_name}`,
        r.proficiency_level
      );
    }
    return m;
  }, [ratingsQ.data]);

  const lookupLevel = (s: SkillRow): number => {
    const byId = ratingByKey.get(`id:${s.id}`);
    if (byId !== undefined) return byId;
    if (s.category_id) {
      const byCat = ratingByKey.get(`cat:${s.category_id}::${s.name}`);
      if (byCat !== undefined) return byCat;
    }
    return 0;
  };

  const radarData = useMemo(() => {
    const skills = skillsQ.data ?? [];
    return skills.map((s) => ({
      skill: s.code,
      full_name: s.name,
      level: lookupLevel(s),
    }));
    // ratingByKey is the dependency; lookupLevel closes over it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsQ.data, ratingByKey]);

  const isLoading = skillsQ.isLoading || ratingsQ.isLoading;
  const error = skillsQ.error || ratingsQ.error;

  const onChange = async (skill: SkillRow, level: number) => {
    if (!skill.category_id) {
      toast({
        title: "Cannot save rating",
        description: `Skill ${skill.name} has no category.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await upsert.mutateAsync({
        userId,
        skill: {
          id: skill.id,
          name: skill.name,
          category_id: skill.category_id,
        },
        proficiencyLevel: level,
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

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
      <div className="text-xs text-destructive">
        Failed to load skills: {(error as Error).message}
      </div>
    );
  }
  const skills = skillsQ.data ?? [];

  const ratedCount = radarData.filter((d) => d.level > 0).length;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Skill ratings</h3>
        <span className="text-xs text-muted-foreground">
          Inline edit — saves on change
        </span>
      </div>

      {skills.length > 0 && (
        <div className="rounded-md border bg-muted/10 p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">Proficiency radar</span>
            <span className="text-[11px] text-muted-foreground">
              {ratedCount}/{skills.length} skills rated
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fontSize: 9 }}
                />
                <PolarRadiusAxis
                  domain={[0, 4]}
                  tickCount={5}
                  tick={{ fontSize: 9 }}
                />
                <Tooltip
                  formatter={(v: number) =>
                    v === 0 ? "not rated" : `Level ${v}`
                  }
                  labelFormatter={(label, payload) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const p = payload?.[0]?.payload as any;
                    return p?.full_name ?? label;
                  }}
                  contentStyle={{ fontSize: 12, padding: "4px 8px" }}
                />
                <Radar
                  name="Proficiency"
                  dataKey="level"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.35}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            0 = not rated · 1 Aware · 2 Capable · 3 Expert · 4 Trainer.
          </p>
        </div>
      )}

      {skills.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          No skills configured.
        </div>
      ) : (
        <ul className="space-y-1">
          {skills.map((s) => {
            const level = lookupLevel(s);
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {s.code}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {level === 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      not rated
                    </Badge>
                  )}
                  <Select
                    value={String(level)}
                    onValueChange={(v) => onChange(s, Number(v))}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{PROFICIENCY_LABELS["1"]}</SelectItem>
                      <SelectItem value="2">{PROFICIENCY_LABELS["2"]}</SelectItem>
                      <SelectItem value="3">{PROFICIENCY_LABELS["3"]}</SelectItem>
                      <SelectItem value="4">{PROFICIENCY_LABELS["4"]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="text-[11px] text-muted-foreground">
        Editing {personLabel}'s ratings. 1 = Aware, 2 = Capable, 3 = Expert,
        4 = Trainer.
      </div>
    </div>
  );
};

export default PersonSkillsTab;
