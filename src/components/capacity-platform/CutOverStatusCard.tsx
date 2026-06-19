// ============================================================================
// CutOverStatusCard — admin control for capacity_settings.cut_over_status
// ----------------------------------------------------------------------------
// Lives on the Settings page alongside the existing 5 keys. Writes a single
// capacity_settings row with key='cut_over_status'.
// ============================================================================

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import {
  useCapacitySetting,
  useSetCapacitySetting,
} from "@/hooks/capacity-platform";

type CutOverStatus = "parallel" | "cut_over" | "archived";

const OPTIONS: Array<{ value: CutOverStatus; label: string; hint: string }> = [
  {
    value: "parallel",
    label: "Parallel run",
    hint: "Workbook is authoritative; module is being verified.",
  },
  {
    value: "cut_over",
    label: "Cut-over complete",
    hint: "Module is the system of record. Workbook is read-only.",
  },
  {
    value: "archived",
    label: "Archived (banner hidden)",
    hint: "Workbook archived. No banner is shown.",
  },
];

const isStatus = (raw: unknown): raw is CutOverStatus =>
  raw === "parallel" || raw === "cut_over" || raw === "archived";

const CutOverStatusCard = () => {
  const settingQ = useCapacitySetting<string>("cut_over_status");
  const set = useSetCapacitySetting();

  const [value, setValue] = useState<CutOverStatus>("parallel");
  const [initial, setInitial] = useState<CutOverStatus>("parallel");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settingQ.isLoading) return;
    const raw = settingQ.data;
    const next: CutOverStatus = isStatus(raw) ? raw : "parallel";
    setValue(next);
    setInitial(next);
  }, [settingQ.data, settingQ.isLoading]);

  const dirty = value !== initial;

  const onSave = async () => {
    setSaveError(null);
    try {
      await set.mutateAsync({
        key: "cut_over_status",
        value,
      });
      setInitial(value);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  const meta = OPTIONS.find((o) => o.value === value);

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Rollout status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Controls the platform-wide cut-over banner. Mirrors Phase 14 of the
          rollout plan.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="cut-over-status">Status</Label>
        <Select
          value={value}
          onValueChange={(v) => setValue(v as CutOverStatus)}
          disabled={settingQ.isLoading}
        >
          <SelectTrigger id="cut-over-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {meta && (
          <span className="text-xs text-muted-foreground">{meta.hint}</span>
        )}
      </div>

      {saveError && (
        <div className="text-xs text-destructive border border-destructive/40 bg-destructive/10 rounded px-2 py-1">
          {saveError}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={!dirty || set.isPending}
          size="sm"
          className="gap-1"
        >
          {set.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
};

export default CutOverStatusCard;
