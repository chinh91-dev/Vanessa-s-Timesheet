// ============================================================================
// SkillsPage — Phase 8 (matrix) + Phase 16 (heat-map)
// ----------------------------------------------------------------------------
// Two views:
//   Matrix   — per-skill aggregates (avg, experts, SPOF, weighted risk).
//   Heat-map — people × skills colour grid (spec §8.2).
// Admin panel sits below both views.
// ============================================================================

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Grid3X3, ListChecks } from "lucide-react";
import { useSkillMatrix } from "@/hooks/capacity-platform";
import SkillMatrixTable from "@/components/capacity-platform/SkillMatrixTable";
import SkillRatingsDrawer from "@/components/capacity-platform/SkillRatingsDrawer";
import SkillAdminPanel from "@/components/capacity-platform/SkillAdminPanel";
import SkillHeatMap from "@/components/capacity-platform/skills/SkillHeatMap";
import type { SkillMatrixRow } from "@/lib/capacity-platform/types";

const SkillsPage = () => {
  const matrix = useSkillMatrix();
  const [search, setSearch] = useState("");
  const [activeSkill, setActiveSkill] = useState<SkillMatrixRow | null>(null);

  const filtered = useMemo(() => {
    const all = matrix.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((s) => {
      const hay =
        `${s.skill_name} ${s.skill_code} ${s.category_name ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [matrix.data, search]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>
            Per-skill aggregates and per-person ratings. Click a skill to edit
            ratings inline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5 max-w-sm">
            <Label htmlFor="skill-search" className="text-xs">
              Search
            </Label>
            <div className="relative">
              <Search
                className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="skill-search"
                value={search}
                placeholder="Skill name, code, or category"
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs defaultValue="matrix">
            <TabsList>
              <TabsTrigger value="matrix" className="gap-1">
                <ListChecks className="h-4 w-4" /> Matrix
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-1">
                <Grid3X3 className="h-4 w-4" /> Heat-map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matrix" className="mt-4 space-y-2">
              {matrix.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading skill matrix...
                </div>
              )}
              {matrix.isError && (
                <div className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded px-3 py-2">
                  Failed to load skill matrix:{" "}
                  {(matrix.error as Error)?.message ?? "unknown error"}
                </div>
              )}
              {matrix.data && (
                <SkillMatrixTable
                  rows={filtered}
                  onSkillClick={(row) => setActiveSkill(row)}
                />
              )}
            </TabsContent>

            <TabsContent value="heatmap" className="mt-4">
              <SkillHeatMap />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SkillAdminPanel />

      <SkillRatingsDrawer
        open={!!activeSkill}
        onOpenChange={(next) => {
          if (!next) setActiveSkill(null);
        }}
        skill={activeSkill}
      />
    </div>
  );
};

export default SkillsPage;
