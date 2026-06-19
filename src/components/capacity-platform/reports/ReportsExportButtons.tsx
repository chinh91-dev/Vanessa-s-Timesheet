// ============================================================================
// ReportsExportButtons — export buttons for the Reports page
// ----------------------------------------------------------------------------
// Phase 12 added CSV exports for capacity_live / allocations / work_requests.
// Phase 17 layers on:
//   - Weekly Capacity (XLSX) — KPIs + per-person table + SPOF skills
//   - Weekly Capacity (PDF)  — same shape, print-via-popup
//   - FTE Loss (XLSX)        — matches FTE_Loss_Summary sheet structure
//   - Audit Log (CSV)        — capacity.* actions over the selected window
//
// All exports are generated client-side (no Edge Function), Excel-injection
// defense via csvExport.ts, UTF-8 BOM for Excel auto-detect.
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileSpreadsheet, FileText, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format, subDays } from "date-fns";
import { mondayOf } from "@/lib/capacity-platform/monday";
import { getCapacityLive, getDashboardKpis } from "@/lib/capacity-platform/capacity";
import { listCapacityAllocations } from "@/lib/capacity-platform/allocations";
import { listWorkRequests } from "@/lib/capacity-platform/workRequests";
import { listCapacityAuditLogs } from "@/lib/capacity-platform/auditLogs";
import { getFteLossSummary } from "@/lib/capacity-platform/capacity";
import { getSkillMatrix } from "@/lib/capacity-platform/skills";
import {
  buildCsv,
  downloadCsv,
  type CsvColumn,
} from "@/lib/capacity-platform/csvExport";
import { downloadXls, type XlsColumn } from "@/lib/capacity-platform/xlsExport";
import { buildSimpleTable, exportPdf } from "@/lib/capacity-platform/pdfExport";
import { buildAllocationPivotSheets } from "@/lib/capacity-platform/allocationPivot";
import type {
  CapacityAllocationRow,
  CapacityLiveRow,
  WorkRequestRow,
} from "@/lib/capacity-platform/types";
import type { CapacityAuditRow } from "@/lib/capacity-platform/auditLogs";

const liveColumns: CsvColumn<CapacityLiveRow>[] = [
  { header: "person_id", accessor: (r) => r.person_id },
  { header: "full_name", accessor: (r) => r.full_name },
  { header: "email", accessor: (r) => r.email },
  { header: "employment_type", accessor: (r) => r.employment_type },
  { header: "weekly_hours", accessor: (r) => r.weekly_hours },
  { header: "base_weekly_capacity", accessor: (r) => r.base_weekly_capacity },
  { header: "leave_hours_this_week", accessor: (r) => r.leave_hours_this_week },
  { header: "adjusted_capacity", accessor: (r) => r.adjusted_capacity },
  { header: "allocated_hours", accessor: (r) => r.allocated_hours },
  { header: "allocation_pct", accessor: (r) => r.allocation_pct },
  { header: "rag_status", accessor: (r) => r.rag_status },
  {
    header: "over_allocated_on_leave",
    accessor: (r) => (r.over_allocated_on_leave ? "true" : "false"),
  },
];

const allocationColumns: CsvColumn<CapacityAllocationRow>[] = [
  { header: "id", accessor: (r) => r.id },
  { header: "person_id", accessor: (r) => r.person_id },
  { header: "week_start_date", accessor: (r) => r.week_start_date },
  { header: "customer", accessor: (r) => r.customer },
  { header: "work_type", accessor: (r) => r.work_type },
  { header: "mon_hours", accessor: (r) => r.mon_hours },
  { header: "tue_hours", accessor: (r) => r.tue_hours },
  { header: "wed_hours", accessor: (r) => r.wed_hours },
  { header: "thu_hours", accessor: (r) => r.thu_hours },
  { header: "fri_hours", accessor: (r) => r.fri_hours },
  { header: "sat_hours", accessor: (r) => r.sat_hours },
  { header: "sun_hours", accessor: (r) => r.sun_hours },
  { header: "total_hours", accessor: (r) => r.total_hours },
  { header: "notes", accessor: (r) => r.notes },
];

const workRequestColumns: CsvColumn<WorkRequestRow>[] = [
  { header: "code", accessor: (r) => r.code },
  { header: "date_received", accessor: (r) => r.date_received },
  { header: "customer", accessor: (r) => r.customer },
  { header: "request_type", accessor: (r) => r.request_type },
  { header: "skill_required_id", accessor: (r) => r.skill_required_id },
  { header: "estimated_hours", accessor: (r) => r.estimated_hours },
  { header: "priority", accessor: (r) => r.priority },
  { header: "due_date", accessor: (r) => r.due_date },
  { header: "assigned_to_id", accessor: (r) => r.assigned_to_id },
  { header: "status", accessor: (r) => r.status },
  { header: "notes", accessor: (r) => r.notes },
];

const auditColumns: CsvColumn<CapacityAuditRow>[] = [
  { header: "created_at", accessor: (r) => r.created_at },
  { header: "user_id", accessor: (r) => r.user_id },
  { header: "user_name", accessor: (r) => r.user_name },
  { header: "action", accessor: (r) => r.action },
  { header: "entity_name", accessor: (r) => r.entity_name },
  { header: "description", accessor: (r) => r.description },
  {
    header: "details",
    accessor: (r) =>
      r.details ? JSON.stringify(r.details) : "",
  },
];

const liveXlsColumns: XlsColumn<CapacityLiveRow>[] = [
  { header: "Person", accessor: (r) => r.full_name },
  { header: "Email", accessor: (r) => r.email },
  { header: "Weekly hrs", accessor: (r) => r.weekly_hours },
  { header: "Base", accessor: (r) => r.base_weekly_capacity },
  { header: "Leave (h)", accessor: (r) => r.leave_hours_this_week },
  { header: "Adj", accessor: (r) => r.adjusted_capacity },
  { header: "Allocated", accessor: (r) => r.allocated_hours },
  {
    header: "Util %",
    accessor: (r) =>
      r.allocation_pct == null ? "" : `${(r.allocation_pct * 100).toFixed(0)}%`,
  },
  { header: "RAG", accessor: (r) => r.rag_status ?? "—" },
];

export interface ReportsExportButtonsProps {
  weekStart: Date;
}

const ReportsExportButtons = ({ weekStart }: ReportsExportButtonsProps) => {
  const { toast } = useToast();
  const monday = mondayOf(weekStart);
  const mondayIso = format(monday, "yyyy-MM-dd");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const run = async (
    key: string,
    label: string,
    job: () => Promise<{ description: string }>
  ) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const { description } = await job();
      toast({ title: `${label} exported`, description });
    } catch (err) {
      toast({
        title: `${label} export failed`,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  // ── CSV exports (Phase 12) ───────────────────────────────────────────────
  const exportLive = () =>
    run("live", "Capacity live", async () => {
      const rows = await getCapacityLive(monday);
      downloadCsv(buildCsv(rows, liveColumns), `capacity_live_${mondayIso}`);
      return { description: `${rows.length} rows · ${mondayIso}` };
    });

  const exportAllocations = () =>
    run("alloc", "Allocations", async () => {
      const rows = await listCapacityAllocations({
        weekStartFrom: mondayIso,
        weekStartTo: mondayIso,
      });
      downloadCsv(
        buildCsv(rows, allocationColumns),
        `capacity_allocations_${mondayIso}`
      );
      return { description: `${rows.length} rows · ${mondayIso}` };
    });

  const exportWorkRequests = () =>
    run("work", "Work requests", async () => {
      const rows = await listWorkRequests();
      const today = format(new Date(), "yyyy-MM-dd");
      downloadCsv(buildCsv(rows, workRequestColumns), `work_requests_${today}`);
      return { description: `${rows.length} rows` };
    });

  // ── Phase 17 — XLSX + PDF + Audit Log ────────────────────────────────────
  const exportWeeklyCapacityXls = () =>
    run("weekly-xls", "Weekly Capacity (XLSX)", async () => {
      const [kpis, live, matrix] = await Promise.all([
        getDashboardKpis(monday),
        getCapacityLive(monday),
        getSkillMatrix(),
      ]);
      const kpiRows = kpis
        ? [
            { label: "Headcount", value: kpis.headcount },
            { label: "Total capacity (h)", value: kpis.total_capacity_hours },
            { label: "Leave impact (h)", value: kpis.leave_impact_hours },
            { label: "Adjusted capacity (h)", value: kpis.adjusted_capacity_hours },
            { label: "Allocated (h)", value: kpis.total_allocated_hours },
            {
              label: "Avg utilisation",
              value:
                kpis.avg_utilisation_pct == null
                  ? "—"
                  : `${(kpis.avg_utilisation_pct * 100).toFixed(0)}%`,
            },
            { label: "Red", value: kpis.red_count },
            { label: "Amber", value: kpis.amber_count },
            { label: "Green", value: kpis.green_count },
            { label: "SPOF skills", value: kpis.spof_skills_count },
          ]
        : [];
      const spofSkills = matrix.filter(
        (s) => s.spof_risk === "SPOF" || s.spof_risk === "NONE"
      );
      downloadXls(
        [
          {
            name: "KPIs",
            rows: kpiRows,
            columns: [
              { header: "Metric", accessor: (r) => r.label },
              { header: "Value", accessor: (r) => r.value },
            ],
          },
          {
            name: "Per-person",
            rows: live,
            columns: liveXlsColumns,
          },
          {
            name: "SPOF skills",
            rows: spofSkills,
            columns: [
              { header: "Skill", accessor: (s) => s.skill_name },
              { header: "Code", accessor: (s) => s.skill_code },
              { header: "Risk", accessor: (s) => s.spof_risk },
              { header: "Top SME", accessor: (s) => s.top_sme_name },
              { header: "Coverage %", accessor: (s) => s.coverage_pct },
              { header: "Action", accessor: (s) => s.action_needed },
            ],
          },
        ],
        `weekly_capacity_${mondayIso}`
      );
      return {
        description: `KPIs + ${live.length} people + ${spofSkills.length} SPOF skills`,
      };
    });

  const exportWeeklyCapacityPdf = () =>
    run("weekly-pdf", "Weekly Capacity (PDF)", async () => {
      const [kpis, live, matrix] = await Promise.all([
        getDashboardKpis(monday),
        getCapacityLive(monday),
        getSkillMatrix(),
      ]);
      const spofSkills = matrix
        .filter((s) => s.spof_risk === "SPOF" || s.spof_risk === "NONE")
        .slice(0, 10);
      const top = [...live]
        .sort(
          (a, b) =>
            Number(b.allocation_pct ?? 0) - Number(a.allocation_pct ?? 0)
        )
        .slice(0, 5);

      const kpiHtml = kpis
        ? buildSimpleTable(
            [
              { k: "Headcount", v: String(kpis.headcount) },
              { k: "Capacity (h)", v: String(kpis.total_capacity_hours) },
              { k: "Leave impact (h)", v: String(kpis.leave_impact_hours) },
              {
                k: "Adjusted capacity (h)",
                v: String(kpis.adjusted_capacity_hours),
              },
              { k: "Allocated (h)", v: String(kpis.total_allocated_hours) },
              {
                k: "Avg utilisation",
                v:
                  kpis.avg_utilisation_pct == null
                    ? "—"
                    : `${(kpis.avg_utilisation_pct * 100).toFixed(0)}%`,
              },
              {
                k: "Red / Amber / Green",
                v: `${kpis.red_count} / ${kpis.amber_count} / ${kpis.green_count}`,
              },
            ],
            [
              { header: "Metric", accessor: (r) => r.k },
              { header: "Value", accessor: (r) => r.v },
            ]
          )
        : "<p>No KPI row.</p>";

      exportPdf({
        title: `Weekly Capacity Report — week of ${mondayIso}`,
        subtitle: `Generated ${new Date().toLocaleString()}`,
        sections: [
          { title: "KPI summary", bodyHtml: kpiHtml },
          {
            title: "Top 5 over-allocated",
            bodyHtml: buildSimpleTable(top, [
              { header: "Person", accessor: (r) => r.full_name },
              {
                header: "Util",
                accessor: (r) =>
                  r.allocation_pct == null
                    ? "—"
                    : `${(r.allocation_pct * 100).toFixed(0)}%`,
              },
              { header: "Allocated", accessor: (r) => r.allocated_hours },
              { header: "Adjusted", accessor: (r) => r.adjusted_capacity },
              { header: "RAG", accessor: (r) => r.rag_status ?? "—" },
            ]),
          },
          {
            title: "Top 10 SPOF skills",
            bodyHtml: buildSimpleTable(spofSkills, [
              { header: "Skill", accessor: (s) => s.skill_name },
              { header: "Risk", accessor: (s) => s.spof_risk },
              { header: "Top SME", accessor: (s) => s.top_sme_name ?? "—" },
              { header: "Coverage %", accessor: (s) => s.coverage_pct },
            ]),
          },
        ],
      });
      return {
        description: `Print dialog opened for week ${mondayIso}`,
      };
    });

  const exportFteLossXls = () =>
    run("fte-xls", "FTE Loss (XLSX)", async () => {
      const rows = await getFteLossSummary();
      downloadXls(
        [
          {
            name: "FTE Loss",
            rows,
            columns: [
              { header: "Period", accessor: (r) => r.period_label },
              { header: "Start", accessor: (r) => r.period_start },
              { header: "End", accessor: (r) => r.period_end },
              { header: "Leave hours", accessor: (r) => r.total_leave_hours },
              { header: "FTE lost", accessor: (r) => r.fte_lost.toFixed(2) },
              {
                header: "Headcount on leave",
                accessor: (r) => r.headcount_on_leave,
              },
            ],
          },
        ],
        `fte_loss_${format(new Date(), "yyyy-MM-dd")}`
      );
      return { description: `${rows.length} period(s)` };
    });

  const exportSpofPdf = () =>
    run("spof-pdf", "Skill SPOF (PDF)", async () => {
      const matrix = await getSkillMatrix();
      const noneSkills = matrix.filter((s) => s.spof_risk === "NONE");
      const spofSkills = matrix.filter((s) => s.spof_risk === "SPOF");
      const cols = [
        { header: "Skill", accessor: (s: typeof matrix[number]) => s.skill_name },
        { header: "Code", accessor: (s: typeof matrix[number]) => s.skill_code },
        { header: "Top SME", accessor: (s: typeof matrix[number]) => s.top_sme_name ?? "—" },
        {
          header: "Coverage",
          accessor: (s: typeof matrix[number]) =>
            `${(Number(s.coverage_pct ?? 0) * 100).toFixed(0)}%`,
        },
        {
          header: "Headcount",
          accessor: (s: typeof matrix[number]) => s.active_headcount,
        },
        {
          header: "Capable",
          accessor: (s: typeof matrix[number]) => s.capable,
        },
        {
          header: "Experts",
          accessor: (s: typeof matrix[number]) => s.experts,
        },
        {
          header: "Action",
          accessor: (s: typeof matrix[number]) => s.action_needed ?? "—",
        },
      ];
      exportPdf({
        title: "Skill SPOF Report",
        subtitle: `Generated ${new Date().toLocaleString()} · ${noneSkills.length} NONE · ${spofSkills.length} SPOF`,
        sections: [
          {
            title: `Skills with NO expert (${noneSkills.length})`,
            bodyHtml:
              noneSkills.length === 0
                ? "<p><em>None — every skill has at least one expert.</em></p>"
                : buildSimpleTable(noneSkills, cols),
          },
          {
            title: `Single Point of Failure — one expert (${spofSkills.length})`,
            bodyHtml:
              spofSkills.length === 0
                ? "<p><em>None — every skill has more than one expert.</em></p>"
                : buildSimpleTable(spofSkills, cols),
          },
        ],
      });
      return {
        description: `Print dialog opened · ${noneSkills.length} NONE + ${spofSkills.length} SPOF`,
      };
    });

  const exportAllocationPivot = () =>
    run("alloc-pivot", "Allocation Pivot (XLSX)", async () => {
      const { sheets, thisWeekRowCount, forwardRowCount } =
        await buildAllocationPivotSheets(monday);
      downloadXls(sheets, `allocation_pivot_${mondayIso}`);
      return {
        description: `${thisWeekRowCount} this-week row(s) · ${forwardRowCount} forward row(s)`,
      };
    });

  const exportAuditLog = () =>
    run("audit", "Audit log", async () => {
      // Default window: last 30 days.
      const fromDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const toDate = format(new Date(), "yyyy-MM-dd");
      const rows = await listCapacityAuditLogs({ fromDate, toDate, limit: 1000 });
      downloadCsv(
        buildCsv(rows, auditColumns),
        `capacity_audit_${fromDate}_to_${toDate}`
      );
      return { description: `${rows.length} rows · ${fromDate} → ${toDate}` };
    });

  const Btn = (
    label: string,
    onClick: () => void,
    keyName: string,
    Icon: typeof Download = Download
  ) => (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={!!busyKey}
      className="gap-1"
    >
      {busyKey === keyName ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Btn("Capacity live (CSV)", exportLive, "live")}
      {Btn("Allocations (CSV)", exportAllocations, "alloc")}
      {Btn("Work requests (CSV)", exportWorkRequests, "work")}
      <span className="hidden md:inline-block w-px h-5 bg-border mx-1" />
      {Btn(
        "Weekly Capacity (XLSX)",
        exportWeeklyCapacityXls,
        "weekly-xls",
        FileSpreadsheet
      )}
      {Btn(
        "Weekly Capacity (PDF)",
        exportWeeklyCapacityPdf,
        "weekly-pdf",
        FileText
      )}
      {Btn("FTE Loss (XLSX)", exportFteLossXls, "fte-xls", FileSpreadsheet)}
      {Btn(
        "Allocation Pivot (XLSX)",
        exportAllocationPivot,
        "alloc-pivot",
        FileSpreadsheet
      )}
      {Btn("Skill SPOF (PDF)", exportSpofPdf, "spof-pdf", FileText)}
      {Btn("Audit log (CSV)", exportAuditLog, "audit", ShieldCheck)}
    </div>
  );
};

export default ReportsExportButtons;
