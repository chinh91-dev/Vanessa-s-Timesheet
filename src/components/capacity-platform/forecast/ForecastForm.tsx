// ============================================================================
// ForecastForm — quarterly_forecast editor for a single month
// ----------------------------------------------------------------------------
// Loads the forecast row for the requested month (or null when empty), lets
// the user edit and save via upsert. Locked validation rule: when rag is
// 'Red', mitigation_plan must be non-empty before save is allowed.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import {
  useDeleteQuarterlyForecast,
  useQuarterlyForecastByMonth,
  useUpsertQuarterlyForecast,
} from "@/hooks/capacity-platform";
import type { RagStatus } from "@/lib/capacity-platform/types";

const RAG_OPTIONS: RagStatus[] = ["Green", "Amber", "Red"];

export interface ForecastFormProps {
  /** YYYY-MM-01 */
  month: string;
}

interface FormState {
  known_projects: string;
  expected_requests: string;
  risk_areas: string;
  resource_gap: string;
  mitigation_plan: string;
  rag: RagStatus;
  notes: string;
}

const emptyForm: FormState = {
  known_projects: "",
  expected_requests: "",
  risk_areas: "",
  resource_gap: "",
  mitigation_plan: "",
  rag: "Green",
  notes: "",
};

const ForecastForm = ({ month }: ForecastFormProps) => {
  const monthQ = useQuarterlyForecastByMonth(month);
  const upsert = useUpsertQuarterlyForecast();
  const del = useDeleteQuarterlyForecast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  useEffect(() => {
    setSaveError(null);
    if (monthQ.data) {
      setForm({
        known_projects: monthQ.data.known_projects ?? "",
        expected_requests: monthQ.data.expected_requests ?? "",
        risk_areas: monthQ.data.risk_areas ?? "",
        resource_gap: monthQ.data.resource_gap ?? "",
        mitigation_plan: monthQ.data.mitigation_plan ?? "",
        rag: monthQ.data.rag,
        notes: monthQ.data.notes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [monthQ.data, month]);

  const mitigationBlocker = useMemo(() => {
    if (form.rag === "Red" && form.mitigation_plan.trim().length === 0) {
      return "Red RAG requires a mitigation plan before saving.";
    }
    return null;
  }, [form.rag, form.mitigation_plan]);

  const isPending = upsert.isPending || del.isPending;
  const canSave = !mitigationBlocker && !isPending;
  const existing = monthQ.data;

  const onSave = async () => {
    if (!canSave) return;
    setSaveError(null);
    try {
      await upsert.mutateAsync({
        month,
        known_projects: form.known_projects.trim() || null,
        expected_requests: form.expected_requests.trim() || null,
        risk_areas: form.risk_areas.trim() || null,
        resource_gap: form.resource_gap.trim() || null,
        mitigation_plan: form.mitigation_plan.trim() || null,
        rag: form.rag,
        notes: form.notes.trim() || null,
        // Shared insert type lists these as required despite optional `?` overrides
        created_by: null,
        updated_by: null,
      });
      setSavedTick((t) => t + 1);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  const onDelete = async () => {
    if (!existing) return;
    if (!window.confirm(`Delete the forecast for ${month}?`)) return;
    setSaveError(null);
    try {
      await del.mutateAsync(existing.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Forecast — {month}</h2>
        <div className="flex items-center gap-2">
          {monthQ.isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {existing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="fc-known">Known projects</Label>
          <Textarea
            id="fc-known"
            rows={3}
            value={form.known_projects}
            onChange={(e) =>
              setForm((f) => ({ ...f, known_projects: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fc-expected">Expected requests</Label>
          <Textarea
            id="fc-expected"
            rows={3}
            value={form.expected_requests}
            onChange={(e) =>
              setForm((f) => ({ ...f, expected_requests: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fc-risk">Risk areas</Label>
          <Textarea
            id="fc-risk"
            rows={3}
            value={form.risk_areas}
            onChange={(e) =>
              setForm((f) => ({ ...f, risk_areas: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fc-gap">Resource gap</Label>
          <Textarea
            id="fc-gap"
            rows={3}
            value={form.resource_gap}
            onChange={(e) =>
              setForm((f) => ({ ...f, resource_gap: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="fc-rag">RAG</Label>
          <Select
            value={form.rag}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, rag: v as RagStatus }))
            }
          >
            <SelectTrigger id="fc-rag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RAG_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 grid gap-1.5">
          <Label htmlFor="fc-mitig">
            Mitigation plan{form.rag === "Red" ? "*" : ""}
          </Label>
          <Textarea
            id="fc-mitig"
            rows={3}
            value={form.mitigation_plan}
            onChange={(e) =>
              setForm((f) => ({ ...f, mitigation_plan: e.target.value }))
            }
          />
          {mitigationBlocker && (
            <span className="text-xs text-destructive">{mitigationBlocker}</span>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="fc-notes">Notes</Label>
        <Textarea
          id="fc-notes"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      {saveError && (
        <div className="text-xs text-destructive border border-destructive/40 bg-destructive/10 rounded px-2 py-1">
          {saveError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {existing
            ? `Last updated ${existing.updated_at}`
            : "No forecast saved for this month yet."}
          {savedTick > 0 && !upsert.isError && !upsert.isPending && (
            <span className="ml-2 text-green-700">Saved.</span>
          )}
        </span>
        <Button onClick={onSave} disabled={!canSave}>
          {upsert.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          )}
          Save forecast
        </Button>
      </div>
    </div>
  );
};

export default ForecastForm;
