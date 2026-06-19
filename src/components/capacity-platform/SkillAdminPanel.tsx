// ============================================================================
// SkillAdminPanel — admin-only create/deactivate skills
// ----------------------------------------------------------------------------
// Compact form: code, name, category, weight (default 1.00), display_order.
// Listing + deactivate handled inline (deactivation only — no hard delete).
// ============================================================================

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeactivateSkill,
} from "@/hooks/capacity-platform";
import type { SkillRow } from "@/lib/capacity-platform/types";
import AdminGate from "./AdminGate";

const SkillAdminPanel = () => {
  return (
    <AdminGate>
      <SkillAdminPanelInner />
    </AdminGate>
  );
};

const SkillAdminPanelInner = () => {
  const all = useSkills({ activeOnly: false });
  const create = useCreateSkill();
  const update = useUpdateSkill();
  const deactivate = useDeactivateSkill();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1.00");

  const onCreate = async () => {
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const w = Number(weight);
    if (!cleanCode || !cleanName) {
      toast({
        title: "Missing fields",
        description: "Code and name are required.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isFinite(w) || w <= 0) {
      toast({
        title: "Invalid weight",
        description: "Weight must be > 0 (defaults to 1.00).",
        variant: "destructive",
      });
      return;
    }
    try {
      await create.mutateAsync({
        code: cleanCode,
        name: cleanName,
        weight: w,
        is_active: true,
        category_id: null,
        display_order: null,
      });
      toast({ title: "Skill created", description: cleanCode });
      setCode("");
      setName("");
      setWeight("1.00");
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const onToggle = async (s: SkillRow) => {
    try {
      if (s.is_active) {
        await deactivate.mutateAsync(s.id);
        toast({ title: "Skill deactivated", description: s.code });
      } else {
        await update.mutateAsync({ id: s.id, patch: { is_active: true } });
        toast({ title: "Skill reactivated", description: s.code });
      }
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const skills = all.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill admin</CardTitle>
        <CardDescription>
          Create or deactivate skills. Skill weights are locked at 1.00 (spec §18 Q1).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr_100px_auto] gap-2 items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="skill-code" className="text-xs">Code</Label>
            <Input
              id="skill-code"
              placeholder="e.g. CLOUD_AZ"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skill-name" className="text-xs">Name</Label>
            <Input
              id="skill-name"
              placeholder="e.g. Microsoft Azure"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skill-weight" className="text-xs">Weight</Label>
            <Input
              id="skill-weight"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <Button onClick={onCreate} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="mr-2 h-4 w-4" aria-hidden />
            )}
            Create
          </Button>
        </div>

        {all.isPending && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading skills...
          </div>
        )}
        {all.isError && (
          <div className="text-sm text-destructive">
            Failed to load skills.
          </div>
        )}
        {skills.length > 0 && (
          <ul className="divide-y border rounded-md text-sm">
            {skills.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className={s.is_active ? "" : "opacity-60"}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {s.code}
                    </span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    w={Number(s.weight).toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggle(s)}
                    disabled={deactivate.isPending || update.isPending}
                    aria-label={s.is_active ? "Deactivate" : "Reactivate"}
                  >
                    {s.is_active ? (
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default SkillAdminPanel;
