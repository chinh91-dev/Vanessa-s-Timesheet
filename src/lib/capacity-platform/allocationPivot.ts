// ============================================================================
// Capacity Platform — Allocation Pivot builder
// ----------------------------------------------------------------------------
// Spec §13 — "Allocation Pivot — XLSX: Customer × Person × Hours, current
// week or next 4 weeks."
//
// Produces two XLSX sheets:
//   1. "This week"      — rows=customer, cols=person, cells=hours for
//                         the week of `monday`.
//   2. "Next 4 weeks"   — rows=customer, cols=person, cells=hours summed
//                         across mondays + 4 forward weeks (excludes
//                         this week to avoid double-counting against #1).
// Each sheet appends a "Total" row + "Total" column.
// ============================================================================

import { addDays, format } from "date-fns";
import { listCapacityAllocations } from "./allocations";
import { listCapacityProfiles, type CapacityProfileRow } from "./profiles";
import type { AnyXlsSheet } from "./xlsExport";
import type { CapacityAllocationRow } from "./types";

const personLabel = (p: CapacityProfileRow): string =>
  p.full_name ?? p.email ?? p.id.slice(0, 8);

interface PivotSheetInput {
  name: string;
  rows: CapacityAllocationRow[];
  people: CapacityProfileRow[];
}

const buildPivotSheet = ({
  name,
  rows,
  people,
}: PivotSheetInput): AnyXlsSheet => {
  // Map<customer, Map<personId, hours>>
  const totals = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const c = r.customer || "(unspecified)";
    let inner = totals.get(c);
    if (!inner) {
      inner = new Map<string, number>();
      totals.set(c, inner);
    }
    inner.set(
      r.person_id,
      (inner.get(r.person_id) ?? 0) + Number(r.total_hours ?? 0)
    );
  }

  const customers = Array.from(totals.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  // Build flattened row records: { customer, [persons.label]: hours, total }
  const personIds = people.map((p) => p.id);
  const personHeaders = people.map((p) => personLabel(p));

  const dataRows = customers.map((c) => {
    const inner = totals.get(c)!;
    let rowTotal = 0;
    const rec: Record<string, string | number> = { customer: c };
    for (let i = 0; i < people.length; i++) {
      const v = inner.get(personIds[i]) ?? 0;
      rowTotal += v;
      rec[`p_${i}`] = v === 0 ? "" : v;
    }
    rec.total = rowTotal === 0 ? "" : rowTotal;
    return rec;
  });

  // Append a Totals footer row.
  if (dataRows.length > 0) {
    let grand = 0;
    const footer: Record<string, string | number> = { customer: "Total" };
    for (let i = 0; i < people.length; i++) {
      let colTotal = 0;
      for (const row of dataRows) {
        const v = row[`p_${i}`];
        if (typeof v === "number") colTotal += v;
      }
      grand += colTotal;
      footer[`p_${i}`] = colTotal === 0 ? "" : colTotal;
    }
    footer.total = grand === 0 ? "" : grand;
    dataRows.push(footer);
  }

  const columns = [
    {
      header: "Customer",
      accessor: (r: Record<string, string | number>) => r.customer,
    },
    ...personHeaders.map((label, i) => ({
      header: label,
      accessor: (r: Record<string, string | number>) => r[`p_${i}`],
    })),
    {
      header: "Total",
      accessor: (r: Record<string, string | number>) => r.total,
    },
  ];

  return {
    name,
    rows: dataRows,
    columns,
  };
};

export interface AllocationPivotResult {
  sheets: AnyXlsSheet[];
  thisWeekRowCount: number;
  forwardRowCount: number;
}

export const buildAllocationPivotSheets = async (
  monday: Date
): Promise<AllocationPivotResult> => {
  const mondayIso = format(monday, "yyyy-MM-dd");
  const next4Start = format(addDays(monday, 7), "yyyy-MM-dd");
  const next4End = format(addDays(monday, 7 * 4), "yyyy-MM-dd");

  const [people, thisWeekRows, forwardRows] = await Promise.all([
    listCapacityProfiles({ activeOnly: true }),
    listCapacityAllocations({
      weekStartFrom: mondayIso,
      weekStartTo: mondayIso,
    }),
    listCapacityAllocations({
      weekStartFrom: next4Start,
      weekStartTo: next4End,
    }),
  ]);

  return {
    sheets: [
      buildPivotSheet({
        name: `Wk ${mondayIso}`,
        rows: thisWeekRows,
        people,
      }),
      buildPivotSheet({
        name: `Next 4 wk`,
        rows: forwardRows,
        people,
      }),
    ],
    thisWeekRowCount: thisWeekRows.length,
    forwardRowCount: forwardRows.length,
  };
};
