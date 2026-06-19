// ============================================================================
// SettingsForm — editor for the 5 seeded capacity_settings keys
// ----------------------------------------------------------------------------
// Admin-only via parent AdminGate. Loads current values via
// useCapacitySettings, supports per-row save via useSetCapacitySetting.
//
// Keys:
//   fte_hours_per_week     number > 0
//   rag_red_pct            number 0..1
//   rag_amber_pct          number 0..rag_red_pct
//   week_start_day         "Monday" | "Sunday"
//   default_holiday_state  "VIC" | "NSW" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "ACT" | "NATIONAL"
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useCapacitySettings,
  useSetCapacitySetting,
} from "@/hooks/capacity-platform";
import type { SettingKey } from "@/lib/capacity-platform/settings";

const HOLIDAY_STATES = [
  "VIC",
  "NSW",
  "QLD",
  "SA",
  "WA",
  "TAS",
  "NT",
  "ACT",
  "NATIONAL",
] as const;

const WEEK_START_DAYS = ["Monday", "Sunday"] as const;

interface RowState {
  current: string;       // raw input value
  initial: string;       // server value, to detect dirty
  error: string | null;
}

const fmtVal = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
};

const SettingsForm = () => {
  const settings = useCapacitySettings();
  const set = useSetCapacitySetting();

  const seeded = useMemo(() => {
    const map = new Map<string, unknown>();
    (settings.data ?? []).forEach((r) => map.set(r.key, r.value));
    return map;
  }, [settings.data]);

  const [state, setState] = useState<Record<string, RowState>>({});

  useEffect(() => {
    if (!settings.data) return;
    setState({
      fte_hours_per_week: { current: fmtVal(seeded.get("fte_hours_per_week") ?? 38), initial: fmtVal(seeded.get("fte_hours_per_week") ?? 38), error: null },
      rag_red_pct: { current: fmtVal(seeded.get("rag_red_pct") ?? 0.95), initial: fmtVal(seeded.get("rag_red_pct") ?? 0.95), error: null },
      rag_amber_pct: { current: fmtVal(seeded.get("rag_amber_pct") ?? 0.75), initial: fmtVal(seeded.get("rag_amber_pct") ?? 0.75), error: null },
      week_start_day: { current: fmtVal(seeded.get("week_start_day") ?? "Monday"), initial: fmtVal(seeded.get("week_start_day") ?? "Monday"), error: null },
      default_holiday_state: { current: fmtVal(seeded.get("default_holiday_state") ?? "VIC"), initial: fmtVal(seeded.get("default_holiday_state") ?? "VIC"), error: null },
    });
  }, [settings.data, seeded]);

  const setVal = (key: string, val: string) =>
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? { initial: "", error: null }), current: val } }));

  const validateNumber = (key: string, raw: string, opts: { min?: number; max?: number }): { value: number | null; error: string | null } => {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) return { value: null, error: "Must be a number." };
    if (opts.min !== undefined && n < opts.min) return { value: null, error: `Must be ≥ ${opts.min}.` };
    if (opts.max !== undefined && n > opts.max) return { value: null, error: `Must be ≤ ${opts.max}.` };
    return { value: n, error: null };
  };

  const onSave = async (key: SettingKey, value: unknown) => {
    try {
      await set.mutateAsync({ key, value });
      toast({ title: "Saved", description: `${key} updated.` });
      setState((s) => ({
        ...s,
        [key]: { ...(s[key] ?? { current: "", error: null }), initial: fmtVal(value), error: null },
      }));
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  if (settings.isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading settings...
      </div>
    );
  }
  if (settings.isError) {
    return (
      <div className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded px-3 py-2">
        Failed to load settings: {(settings.error as Error)?.message ?? "unknown error"}
      </div>
    );
  }

  const rows: Array<{
    key: SettingKey;
    label: string;
    description: string;
    render: () => JSX.Element;
    parse: () => { value: unknown; error: string | null };
  }> = [
    {
      key: "fte_hours_per_week",
      label: "FTE hours per week",
      description: "Standard full-time-equivalent basis (default 38).",
      render: () => (
        <Input
          inputMode="decimal"
          value={state.fte_hours_per_week?.current ?? ""}
          onChange={(e) => setVal("fte_hours_per_week", e.target.value)}
        />
      ),
      parse: () => validateNumber("fte_hours_per_week", state.fte_hours_per_week?.current ?? "", { min: 1, max: 80 }),
    },
    {
      key: "rag_red_pct",
      label: "RAG red threshold",
      description: "Utilisation ≥ this is RED (0..1, e.g. 0.95).",
      render: () => (
        <Input
          inputMode="decimal"
          value={state.rag_red_pct?.current ?? ""}
          onChange={(e) => setVal("rag_red_pct", e.target.value)}
        />
      ),
      parse: () => validateNumber("rag_red_pct", state.rag_red_pct?.current ?? "", { min: 0, max: 1 }),
    },
    {
      key: "rag_amber_pct",
      label: "RAG amber threshold",
      description: "Utilisation ≥ this (and < red) is AMBER (0..1).",
      render: () => (
        <Input
          inputMode="decimal"
          value={state.rag_amber_pct?.current ?? ""}
          onChange={(e) => setVal("rag_amber_pct", e.target.value)}
        />
      ),
      parse: () => {
        const r = validateNumber("rag_amber_pct", state.rag_amber_pct?.current ?? "", { min: 0, max: 1 });
        if (r.error || r.value === null) return r;
        const red = Number(state.rag_red_pct?.current ?? "");
        if (Number.isFinite(red) && r.value > red) {
          return { value: null, error: "Must be ≤ red threshold." };
        }
        return r;
      },
    },
    {
      key: "week_start_day",
      label: "Week start day",
      description: "Convention for capacity calculations (default Monday).",
      render: () => (
        <Select
          value={state.week_start_day?.current ?? "Monday"}
          onValueChange={(v) => setVal("week_start_day", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEK_START_DAYS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      parse: () => {
        const v = state.week_start_day?.current ?? "";
        if (!WEEK_START_DAYS.includes(v as typeof WEEK_START_DAYS[number])) {
          return { value: null, error: "Pick a valid day." };
        }
        return { value: v, error: null };
      },
    },
    {
      key: "default_holiday_state",
      label: "Default holiday state",
      description: "Used for calculate_business_days() lookups.",
      render: () => (
        <Select
          value={state.default_holiday_state?.current ?? "VIC"}
          onValueChange={(v) => setVal("default_holiday_state", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOLIDAY_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      parse: () => {
        const v = state.default_holiday_state?.current ?? "";
        if (!HOLIDAY_STATES.includes(v as typeof HOLIDAY_STATES[number])) {
          return { value: null, error: "Pick a valid state." };
        }
        return { value: v, error: null };
      },
    },
  ];

  return (
    <div className="grid gap-6">
      {rows.map((row) => {
        const rs = state[row.key];
        const dirty = rs && rs.current !== rs.initial;
        const parsed = row.parse();
        const canSave = dirty && !parsed.error && !set.isPending;
        return (
          <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[200px_1fr_auto] gap-3 items-start">
            <div>
              <Label className="text-sm font-medium">{row.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {row.description}
              </p>
            </div>
            <div className="grid gap-1">
              {row.render()}
              {parsed.error && (
                <span className="text-xs text-destructive">{parsed.error}</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => parsed.value !== null && onSave(row.key, parsed.value)}
              disabled={!canSave}
            >
              {set.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="mr-2 h-4 w-4" aria-hidden />
              )}
              Save
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default SettingsForm;
