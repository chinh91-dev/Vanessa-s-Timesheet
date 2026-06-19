// ============================================================================
// Capacity Platform — print-via-popup PDF exporter
// ----------------------------------------------------------------------------
// Same pattern as IncidentExportReport's exportPDF: opens a new window with
// a styled HTML report, then triggers window.print so the user can save as
// PDF (or actually print). No external library required.
// ============================================================================

const esc = (raw: unknown): string => {
  if (raw === null || raw === undefined) return "";
  const s = typeof raw === "string" ? raw : String(raw);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export interface PdfSection {
  title?: string;
  /** Pre-built table HTML or paragraph HTML. NOT escaped — caller's
   *  responsibility to sanitise table cell values. */
  bodyHtml: string;
}

export interface PdfDoc {
  title: string;
  /** Optional caption shown directly under the title. */
  subtitle?: string;
  sections: PdfSection[];
}

export const buildSimpleTable = <T>(
  rows: T[],
  columns: Array<{ header: string; accessor: (row: T) => unknown }>
): string => {
  if (rows.length === 0)
    return `<p><em>No rows.</em></p>`;
  const header = columns.map((c) => `<th>${esc(c.header)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td>${esc(c.accessor(r))}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<table>
    <thead><tr>${header}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
};

export const exportPdf = (doc: PdfDoc): void => {
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Allow pop-ups for this site to export the PDF.");
  }
  const sectionHtml = doc.sections
    .map(
      (s) =>
        `<section>${
          s.title ? `<h2>${esc(s.title)}</h2>` : ""
        }${s.bodyHtml}</section>`
    )
    .join("");

  win.document.write(`<!DOCTYPE html><html><head>
    <title>${esc(doc.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color:#111; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 13px; margin: 18px 0 6px; }
      .meta { color:#666; margin-bottom: 16px; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; white-space: nowrap; }
      th { background: #f2f2f2; font-weight: bold; }
      tr:nth-child(even) { background: #fafafa; }
      section { page-break-inside: avoid; margin-bottom: 12px; }
    </style>
  </head><body>
    <h1>${esc(doc.title)}</h1>
    ${doc.subtitle ? `<p class="meta">${esc(doc.subtitle)}</p>` : ""}
    ${sectionHtml}
  </body></html>`);

  win.document.close();

  const triggerPrint = () => win.print();
  if (win.document.readyState === "complete") {
    setTimeout(triggerPrint, 50);
  } else {
    win.addEventListener("load", triggerPrint, { once: true });
  }
};
