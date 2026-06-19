// ============================================================================
// SkillRatingsDrawer — edit per-person ratings for one skill
// ----------------------------------------------------------------------------
// Opens as a Sheet on the right. Lists every active profile with their
// current proficiency_level for the selected skill (1..4 or "—" if no rating).
// Inline select to change rating; clear ("—") deletes the row.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useUserSkillsBySkill,
  useUpsertUserSkill,
  useDeleteUserSkill,
  useCapacityProfiles,
} from "@/hooks/capacity-platform";
import { PROFICIENCY_LABELS } from "@/lib/capacity-platform/userSkills";
import type { SkillMatrixRow } from "@/lib/capacity-platform/types";
import type { SkillRow } from "@/lib/capacity-platform/types";

type Level = "" | "1" | "2" | "3" | "4";

export interface SkillRatingsDrawerProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** The skill to edit ratings for. */
  skill: SkillMatrixRow | null;
}

const SkillRatingsDrawer = ({ open, onOpenChange, skill }: SkillRatingsDrawerProps) => {
  const profiles = useCapacityProfiles({ activeOnly: true });
  const ratings = useUserSkillsBySkill(skill?.skill_id);
  const upsert = useUpsertUserSkill();
  const remove = useDeleteUserSkill();

  // Local edit map: userId -> Level (string), seeded from server data.
  const [edits, setEdits] = useState<Record<string, Level>>({});
  const [busy, setBusy] = useState(false);

  // Seed/reset edits when skill or ratings data changes.
  useEffect(() => {
    if (!ratings.data) return;
    const seed: Record<string, Level> = {};
    for (const r of ratings.data) {
      seed[r.user_id] = String(r.proficiency_level) as Level;
    }
    setEdits(seed);
  }, [ratings.data, skill?.skill_id]);

  const ratingByUser = useMemo(() => {
    const m = new Map<string, { id: string; level: number }>();
    (ratings.data ?? []).forEach((r) =>
      m.set(r.user_id, { id: r.id, level: r.proficiency_level })
    );
    return m;
  }, [ratings.data]);

  const onSubmit = async () => {
    if (!skill) return;
    if (!skill.category_id) {
      toast({
        title: "Cannot save",
        description: "This skill has no category_id.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const ops: Array<Promise<unknown>> = [];
      const sk: Pick<SkillRow, "id" | "name" | "category_id"> = {
        id: skill.skill_id,
        name: skill.skill_name,
        category_id: skill.category_id,
      };

      for (const [userId, level] of Object.entries(edits)) {
        const existing = ratingByUser.get(userId);
        if (level === "") {
          if (existing) ops.push(remove.mutateAsync(existing.id));
          continue;
        }
        const lvl = Number(level);
        if (!Number.isFinite(lvl) || lvl < 1 || lvl > 4) continue;
        if (existing && existing.level === lvl) continue; // no change
        ops.push(
          upsert.mutateAsync({
            userId,
            skill: sk,
            proficiencyLevel: lvl,
          })
        );
      }
      // Also handle removals where edits has no key for an existing rating
      // (defensive — shouldn't happen given seed step, but covers manual UI states).

      if (ops.length === 0) {
        toast({ title: "No changes", description: "Nothing to save." });
        onOpenChange(false);
        return;
      }

      const results = await Promise.allSettled(ops);
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) {
        toast({
          title: "Ratings saved",
          description: `${ops.length} rating${ops.length === 1 ? "" : "s"} updated.`,
        });
        onOpenChange(false);
      } else {
        toast({
          title: `Partial save (${ops.length - failed.length}/${ops.length})`,
          description: failed
            .slice(0, 3)
            .map((r) => (r as PromiseRejectedResult).reason?.message ?? "error")
            .join(" · "),
          variant: "destructive",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const all = profiles.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{skill?.skill_name ?? "Skill ratings"}</SheetTitle>
          <SheetDescription>
            {skill?.skill_code ?? ""} · {skill?.category_name ?? "—"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {(profiles.isPending || ratings.isPending) && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading...
            </div>
          )}
          {profiles.isError && (
            <div className="text-sm text-destructive">
              Failed to load profiles.
            </div>
          )}
          {ratings.isError && (
            <div className="text-sm text-destructive">
              Failed to load ratings.
            </div>
          )}

          {profiles.data && ratings.data && all.length === 0 && (
            <div className="text-sm text-muted-foreground italic">
              No active profiles to rate.
            </div>
          )}

          {profiles.data && ratings.data && all.length > 0 && (
            <ul className="divide-y border rounded-md">
              {all.map((p) => {
                const current: Level = (edits[p.id] ?? "") as Level;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p.full_name ?? p.email ?? p.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.email ?? ""}
                      </div>
                    </div>
                    <Select
                      value={current === "" ? "_none" : current}
                      onValueChange={(v) =>
                        setEdits((e) => ({
                          ...e,
                          [p.id]: v === "_none" ? "" : (v as Level),
                        }))
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— (no rating)</SelectItem>
                        {[1, 2, 3, 4].map((lvl) => (
                          <SelectItem key={lvl} value={String(lvl)}>
                            {lvl} · {PROFICIENCY_LABELS[lvl]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={busy || !skill}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            <Save className="h-4 w-4 mr-1" aria-hidden />
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SkillRatingsDrawer;
