// ============================================================================
// Capacity Platform — HTML-as-Excel exporter
// ----------------------------------------------------------------------------
// Mirrors the existing pattern used by IncidentExportReport: writes a
// minimal HTML table with the Excel-namespace header, served with the
// `application/vnd.ms-excel` MIME type. Excel + Sheets accept this and
// preserve column headers + numeric/date values without us pulling in
// exceljs/xlsx.
// ============================================================================

import { sanitizeFilename } from "./csvExport";

export interface XlsColumn<T> {
  header: string;
  accessor: (row: T) => unknown;
}

const escHtml = (raw: unknown): string => {
  if (raw === null || raw === undefined) return "";
  const s = typeof raw === "string" ? raw : String(raw);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export interface XlsSheet<T> {
  name: string;
  rows: T[];
  columns: XlsColumn<T>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderSheet = (sheet: XlsSheet<any>): string => {
  const headerRow = sheet.columns
    .map((c) => `<th>${escHtml(c.header)}</th>`)
    .join("");
  const bodyRows = sheet.rows
    .map(
      (r) =>
        `<tr>${sheet.columns
          .map((c) => `<td>${escHtml(c.accessor(r))}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `<table border="1">
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
};

const sheetMetaXml = (names: string[]): string =>
  names
    .map(
      (n) => `<x:ExcelWorksheet>
        <x:Name>${escHtml(n)}</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet>`
    )
    .join("");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyXlsSheet = XlsSheet<any>;

export const downloadXls = (
  sheets: AnyXlsSheet[],
  filenameBase: string
): void => {
  if (sheets.length === 0) return;
  const fname = sanitizeFilename(filenameBase) || "export";
  const sheetHtml = sheets.map((s) => renderSheet(s)).join("<br/>");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8">
    <!--[if gte mso 9]><xml>
      <x:ExcelWorkbook><x:ExcelWorksheets>
        ${sheetMetaXml(sheets.map((s) => s.name))}
      </x:ExcelWorksheets></x:ExcelWorkbook>
    </xml><![endif]-->
    <style>
      th { background:#f2f2f2; font-weight:bold; }
      td, th { border:1px solid #ccc; padding:4px 8px; white-space:nowrap; font-family:Arial,sans-serif; font-size:11px; }
    </style>
  </head>
  <body>
    ${sheetHtml}
  </body>
  </html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fname}.xls`;
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 250);
};
