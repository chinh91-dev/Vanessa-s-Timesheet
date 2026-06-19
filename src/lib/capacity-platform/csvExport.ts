// ============================================================================
// Capacity Platform — generic client-side CSV export
// ----------------------------------------------------------------------------
// Wraps an array of plain objects into an RFC-4180-ish CSV (CRLF line endings,
// quoted fields containing comma/quote/newline). Triggers a download via Blob
// + transient anchor click.
//
// CSV-injection defense: any cell starting with =, +, -, @, tab, or CR is
// prefixed with a single quote when imported into Excel/Sheets. Mirrors the
// hardening already applied in `src/utils/csv-generation.utils.ts`.
// ============================================================================

const NEEDS_QUOTING = /[",\r\n]/;
const INJECTION_LEADS = ["=", "+", "-", "@", "\t", "\r"] as const;

const escapeCell = (raw: unknown): string => {
  if (raw === null || raw === undefined) return "";
  let s = typeof raw === "string" ? raw : String(raw);
  if (s.length > 0 && INJECTION_LEADS.includes(s[0] as (typeof INJECTION_LEADS)[number])) {
    s = `'${s}`;
  }
  if (NEEDS_QUOTING.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => unknown;
}

export const buildCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((r) =>
    columns.map((c) => escapeCell(c.accessor(r))).join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
};

export const sanitizeFilename = (raw: string): string =>
  raw.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");

export const downloadCsv = (csv: string, filenameBase: string): void => {
  const fname = sanitizeFilename(filenameBase) || "export";
  // Prepend BOM so Excel auto-detects UTF-8.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fname}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so older Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 250);
};
