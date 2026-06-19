/**
 * HTML Generation Utilities
 *
 * Common utilities for generating HTML content for exports,
 * reducing duplication in export services.
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create HTML table from rows
 *
 * @param headers - Array of column headers
 * @param rows - 2D array of cell values
 * @param options - Optional formatting options
 */
export function htmlTableFromRows(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options?: {
    className?: string;
    headerClassName?: string;
    rowClassName?: string;
    cellClassName?: string;
    escapeHtml?: boolean;
  }
): string {
  const {
    className = '',
    headerClassName = '',
    rowClassName = '',
    cellClassName = '',
    escapeHtml: shouldEscape = true,
  } = options || {};

  const escape = shouldEscape ? escapeHtml : (text: string) => text;

  const headerRow = `<tr class="${headerClassName}">${headers
    .map((h) => `<th>${escape(String(h))}</th>`)
    .join('')}</tr>`;

  const bodyRows = rows
    .map(
      (row) =>
        `<tr class="${rowClassName}">${row
          .map((cell) => `<td class="${cellClassName}">${escape(String(cell ?? ''))}</td>`)
          .join('')}</tr>`
    )
    .join('');

  return `<table class="${className}">
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

/**
 * Create HTML table from objects
 *
 * @param data - Array of objects
 * @param columns - Column definitions
 */
export function htmlTableFromObjects<T extends Record<string, unknown>>(
  data: T[],
  columns: Array<{
    key: keyof T;
    header: string;
    formatter?: (value: unknown) => string;
  }>,
  options?: Parameters<typeof htmlTableFromRows>[2]
): string {
  const headers = columns.map((col) => col.header);

  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      return col.formatter ? col.formatter(value) : String(value ?? '');
    })
  );

  return htmlTableFromRows(headers, rows, options);
}

/**
 * Create basic HTML document wrapper
 */
export function wrapInHtmlDocument(
  content: string,
  options?: {
    title?: string;
    styles?: string;
    lang?: string;
  }
): string {
  const { title = 'Document', styles = '', lang = 'en' } = options || {};

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    ${styles}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

/**
 * Create HTML list from array
 */
export function htmlListFromArray(
  items: string[],
  options?: {
    ordered?: boolean;
    className?: string;
    itemClassName?: string;
  }
): string {
  const { ordered = false, className = '', itemClassName = '' } = options || {};
  const tag = ordered ? 'ol' : 'ul';

  const listItems = items.map((item) => `<li class="${itemClassName}">${escapeHtml(item)}</li>`).join('');

  return `<${tag} class="${className}">${listItems}</${tag}>`;
}

/**
 * Create HTML definition list
 */
export function htmlDefinitionList(
  items: Array<{ term: string; definition: string }>,
  className?: string
): string {
  const definitions = items
    .map(
      (item) => `
    <dt>${escapeHtml(item.term)}</dt>
    <dd>${escapeHtml(item.definition)}</dd>
  `
    )
    .join('');

  return `<dl class="${className || ''}">${definitions}</dl>`;
}

/**
 * Create HTML heading
 */
export function htmlHeading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1, className?: string): string {
  return `<h${level} class="${className || ''}">${escapeHtml(text)}</h${level}>`;
}

/**
 * Create HTML paragraph
 */
export function htmlParagraph(text: string, className?: string): string {
  return `<p class="${className || ''}">${escapeHtml(text)}</p>`;
}

/**
 * Create HTML div
 */
export function htmlDiv(content: string, className?: string): string {
  return `<div class="${className || ''}">${content}</div>`;
}

/**
 * Create HTML section with heading and content
 */
export function htmlSection(
  heading: string,
  content: string,
  options?: {
    headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    className?: string;
    headingClassName?: string;
  }
): string {
  const { headingLevel = 2, className = '', headingClassName = '' } = options || {};

  return htmlDiv(
    htmlHeading(heading, headingLevel, headingClassName) + content,
    className
  );
}

/**
 * Format date for HTML display
 */
export function formatDateForHtml(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format datetime for HTML display
 */
export function formatDateTimeForHtml(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency for HTML display
 */
export function formatCurrencyForHtml(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format percentage for HTML display
 */
export function formatPercentageForHtml(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
