import { DateRangeType, getAustralianFYLabel } from "./financial-year-utils";
import { format } from "date-fns";
import { escapeHtml } from "@/utils/html-generation.utils";
import { csvRowFromFields } from "@/utils/csv-generation.utils";

// Sales Performance Export
export const exportSalesPerformance = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Sales_Performance_${fyLabel.replace(/\s+/g, '_')}`;

  if (exportFormat === 'csv') {
    exportSalesPerformanceCSV(data, filename, fyLabel);
  } else if (exportFormat === 'excel') {
    exportSalesPerformanceExcel(data, filename, fyLabel);
  } else if (exportFormat === 'pdf') {
    exportSalesPerformancePDF(data, filename, fyLabel);
  }
};

const exportSalesPerformanceCSV = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Month', 'Revenue', 'Deals Won', 'Deals Lost', 'Win Rate'];
  const rows = data.monthlyRevenue?.map((item: any) => [
    item.month,
    `$${item.revenue.toLocaleString()}`,
    item.dealsWon || 0,
    item.dealsLost || 0,
    `${item.winRate || 0}%`
  ]) || [];

  const csvContent = [
    [`Sales Performance Report - ${fyLabel}`],
    [],
    headers,
    ...rows,
    [],
    ['Total Revenue', `$${data.totalRevenue?.toLocaleString() || 0}`],
    ['Total Deals Won', data.dealsWon || 0],
    ['Total Deals Lost', data.dealsLost || 0],
    ['Overall Win Rate', `${data.winRate || 0}%`]
  ].map(row => csvRowFromFields(row)).join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

const exportSalesPerformanceExcel = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Month', 'Revenue', 'Deals Won', 'Deals Lost', 'Win Rate'];
  const rows = data.monthlyRevenue?.map((item: any) => [
    item.month,
    `$${item.revenue.toLocaleString()}`,
    item.dealsWon || 0,
    item.dealsLost || 0,
    `${item.winRate || 0}%`
  ]) || [];

  const content = [
    [`Sales Performance Report - ${fyLabel}`],
    [],
    headers.join('\t'),
    ...rows.map(row => row.join('\t')),
    [],
    ['Total Revenue', `$${data.totalRevenue?.toLocaleString() || 0}`].join('\t'),
    ['Total Deals Won', data.dealsWon || 0].join('\t'),
    ['Total Deals Lost', data.dealsLost || 0].join('\t'),
    ['Overall Win Rate', `${data.winRate || 0}%`].join('\t')
  ].join('\n');

  downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

const exportSalesPerformancePDF = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Month', 'Revenue', 'Deals Won', 'Deals Lost', 'Win Rate'];
  const rows = data.monthlyRevenue?.map((item: any) => [
    item.month,
    `$${item.revenue.toLocaleString()}`,
    item.dealsWon || 0,
    item.dealsLost || 0,
    `${item.winRate || 0}%`
  ]) || [];

  const htmlContent = generatePDFHTML(
    `Sales Performance Report - ${fyLabel}`,
    headers,
    rows,
    [
      ['Total Revenue', `$${data.totalRevenue?.toLocaleString() || 0}`],
      ['Total Deals Won', data.dealsWon || 0],
      ['Total Deals Lost', data.dealsLost || 0],
      ['Overall Win Rate', `${data.winRate || 0}%`]
    ]
  );

  printPDF(htmlContent, filename);
};

// Pipeline Analytics Export
export const exportPipelineAnalytics = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Pipeline_Analytics_${fyLabel.replace(/\s+/g, '_')}`;

  if (exportFormat === 'csv') {
    exportPipelineAnalyticsCSV(data, filename, fyLabel);
  } else if (exportFormat === 'excel') {
    exportPipelineAnalyticsExcel(data, filename, fyLabel);
  } else if (exportFormat === 'pdf') {
    exportPipelineAnalyticsPDF(data, filename, fyLabel);
  }
};

const exportPipelineAnalyticsCSV = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Stage', 'Count', 'Total Value'];
  const rows = data.opportunitiesByStage?.map((item: any) => [
    item.stage,
    item.count,
    `$${item.value.toLocaleString()}`
  ]) || [];

  const csvContent = [
    [`Pipeline Analytics Report - ${fyLabel}`],
    [],
    headers,
    ...rows
  ].map(row => csvRowFromFields(row)).join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

const exportPipelineAnalyticsExcel = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Stage', 'Count', 'Total Value'];
  const rows = data.opportunitiesByStage?.map((item: any) => [
    item.stage,
    item.count,
    `$${item.value.toLocaleString()}`
  ]) || [];

  const content = [
    [`Pipeline Analytics Report - ${fyLabel}`],
    [],
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');

  downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

const exportPipelineAnalyticsPDF = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Stage', 'Count', 'Total Value'];
  const rows = data.opportunitiesByStage?.map((item: any) => [
    item.stage,
    item.count,
    `$${item.value.toLocaleString()}`
  ]) || [];

  const htmlContent = generatePDFHTML(
    `Pipeline Analytics Report - ${fyLabel}`,
    headers,
    rows
  );

  printPDF(htmlContent, filename);
};

// Weighted Pipeline Forecast Export
export const exportWeightedForecast = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Weighted_Forecast_${fyLabel.replace(/\s+/g, '_')}`;

  if (exportFormat === 'csv') {
    exportWeightedForecastCSV(data, filename, fyLabel);
  } else if (exportFormat === 'excel') {
    exportWeightedForecastExcel(data, filename, fyLabel);
  } else if (exportFormat === 'pdf') {
    exportWeightedForecastPDF(data, filename, fyLabel);
  }
};

const exportWeightedForecastCSV = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Stage', 'Deal Count', 'Total Amount', 'Probability %', 'Weighted Amount'];
  const rows = data?.stages?.map((stage: any) => [
    stage.stage_name,
    stage.deal_count,
    `$${stage.total_amount.toLocaleString()}`,
    `${stage.probability}%`,
    `$${stage.weighted_amount.toLocaleString()}`
  ]) || [];

  const csvContent = [
    [`Weighted Pipeline Forecast - ${fyLabel}`],
    [],
    ['Total Deals', data?.totalDeals || 0],
    ['Total Pipeline Value', `$${data?.totalPipelineValue?.toLocaleString() || 0}`],
    ['Weighted Forecast', `$${data?.totalWeightedValue?.toLocaleString() || 0}`],
    [],
    headers,
    ...rows
  ].map(row => csvRowFromFields(row)).join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

const exportWeightedForecastExcel = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Stage', 'Deal Count', 'Total Amount', 'Probability %', 'Weighted Amount'];
  const rows = data?.stages?.map((stage: any) => [
    stage.stage_name,
    stage.deal_count,
    `$${stage.total_amount.toLocaleString()}`,
    `${stage.probability}%`,
    `$${stage.weighted_amount.toLocaleString()}`
  ]) || [];

  const content = [
    [`Weighted Pipeline Forecast - ${fyLabel}`],
    [],
    ['Total Deals', data?.totalDeals || 0].join('\t'),
    ['Total Pipeline Value', `$${data?.totalPipelineValue?.toLocaleString() || 0}`].join('\t'),
    ['Weighted Forecast', `$${data?.totalWeightedValue?.toLocaleString() || 0}`].join('\t'),
    [],
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');

  downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

const exportWeightedForecastPDF = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Stage', 'Deal Count', 'Total Amount', 'Probability %', 'Weighted Amount'];
  const rows = data?.stages?.map((stage: any) => [
    stage.stage_name,
    stage.deal_count,
    `$${stage.total_amount.toLocaleString()}`,
    `${stage.probability}%`,
    `$${stage.weighted_amount.toLocaleString()}`
  ]) || [];

  const htmlContent = generatePDFHTML(
    `Weighted Pipeline Forecast - ${fyLabel}`,
    headers,
    rows,
    [
      ['Total Deals', data?.totalDeals || 0],
      ['Total Pipeline Value', `$${data?.totalPipelineValue?.toLocaleString() || 0}`],
      ['Weighted Forecast', `$${data?.totalWeightedValue?.toLocaleString() || 0}`]
    ]
  );

  printPDF(htmlContent, filename);
};

// Activities Report Export
export const exportActivitiesReport = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Activities_Report_${fyLabel.replace(/\s+/g, '_')}`;

  if (exportFormat === 'csv') {
    exportActivitiesReportCSV(data, filename, fyLabel);
  } else if (exportFormat === 'excel') {
    exportActivitiesReportExcel(data, filename, fyLabel);
  } else if (exportFormat === 'pdf') {
    exportActivitiesReportPDF(data, filename, fyLabel);
  }
};

const exportActivitiesReportCSV = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Activity Type', 'Count'];
  const rows = data.byType?.map((item: any) => [
    item.type,
    item.count
  ]) || [];

  const csvContent = [
    [`Activities Report - ${fyLabel}`],
    [],
    ['Total Activities', data.totalActivities || 0],
    [],
    headers,
    ...rows,
    [],
    ['Activities by Team Member'],
    ['Team Member', 'Count'],
    ...(data.byUser?.map((item: any) => [item.userName, item.count]) || [])
  ].map(row => csvRowFromFields(row)).join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

const exportActivitiesReportExcel = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Activity Type', 'Count'];
  const rows = data.byType?.map((item: any) => [
    item.type,
    item.count
  ]) || [];

  const content = [
    [`Activities Report - ${fyLabel}`],
    [],
    ['Total Activities', data.totalActivities || 0].join('\t'),
    [],
    headers.join('\t'),
    ...rows.map(row => row.join('\t')),
    [],
    ['Activities by Team Member'],
    ['Team Member', 'Count'].join('\t'),
    ...(data.byUser?.map((item: any) => [item.userName, item.count].join('\t')) || [])
  ].join('\n');

  downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

const exportActivitiesReportPDF = (data: any, filename: string, fyLabel: string) => {
  const headers = ['Activity Type', 'Count'];
  const rows = data.byType?.map((item: any) => [
    item.type,
    item.count
  ]) || [];

  const userHeaders = ['Team Member', 'Count'];
  const userRows = data.byUser?.map((item: any) => [
    item.userName,
    item.count
  ]) || [];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
        .summary { margin: 20px 0; padding: 10px; background: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>Activities Report - ${fyLabel}</h1>
      <div class="summary">
        <strong>Total Activities:</strong> ${data.totalActivities || 0}
      </div>
      <h2>Activities by Type</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <h2>Activities by Team Member</h2>
      <table>
        <thead>
          <tr>${userHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${userRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printPDF(htmlContent, filename);
};

// Team Performance Export
export const exportTeamPerformance = (
  data: any[],
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Team_Performance_${fyLabel.replace(/\s+/g, '_')}`;

  if (exportFormat === 'csv') {
    exportTeamPerformanceCSV(data, filename, fyLabel);
  } else if (exportFormat === 'excel') {
    exportTeamPerformanceExcel(data, filename, fyLabel);
  } else if (exportFormat === 'pdf') {
    exportTeamPerformancePDF(data, filename, fyLabel);
  }
};

const exportTeamPerformanceCSV = (data: any[], filename: string, fyLabel: string) => {
  const headers = ['Team Member', 'Revenue', 'Deals Won', 'Deals Lost', 'Win Rate', 'Activities'];
  const rows = data.map(member => [
    member.name,
    `$${member.revenue.toLocaleString()}`,
    member.dealsWon,
    member.dealsLost,
    `${member.winRate}%`,
    member.activities
  ]);

  const csvContent = [
    [`Team Performance Report - ${fyLabel}`],
    [],
    headers,
    ...rows
  ].map(row => csvRowFromFields(row)).join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

const exportTeamPerformanceExcel = (data: any[], filename: string, fyLabel: string) => {
  const headers = ['Team Member', 'Revenue', 'Deals Won', 'Deals Lost', 'Win Rate', 'Activities'];
  const rows = data.map(member => [
    member.name,
    `$${member.revenue.toLocaleString()}`,
    member.dealsWon,
    member.dealsLost,
    `${member.winRate}%`,
    member.activities
  ]);

  const content = [
    [`Team Performance Report - ${fyLabel}`],
    [],
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');

  downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

const exportTeamPerformancePDF = (data: any[], filename: string, fyLabel: string) => {
  const headers = ['Team Member', 'Revenue', 'Deals Won', 'Deals Lost', 'Win Rate', 'Activities'];
  const rows = data.map(member => [
    member.name,
    `$${member.revenue.toLocaleString()}`,
    member.dealsWon,
    member.dealsLost,
    `${member.winRate}%`,
    member.activities
  ]);

  const htmlContent = generatePDFHTML(
    `Team Performance Report - ${fyLabel}`,
    headers,
    rows
  );

  printPDF(htmlContent, filename);
};

// Audit Logs Export
export const exportAuditLogs = (
  logs: any[],
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `CRM_Audit_Logs_${fyLabel.replace(/\s+/g, '_')}`;

  if (exportFormat === 'csv') {
    exportAuditLogsCSV(logs, filename, fyLabel);
  } else if (exportFormat === 'excel') {
    exportAuditLogsExcel(logs, filename, fyLabel);
  } else if (exportFormat === 'pdf') {
    exportAuditLogsPDF(logs, filename, fyLabel);
  }
};

const exportAuditLogsCSV = (logs: any[], filename: string, fyLabel: string) => {
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'];
  const rows = logs.map(log => [
    format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss'),
    log.user_name || 'Unknown',
    log.action_type,
    log.entity_type || '',
    log.entity_id || '',
    log.details || ''
  ]);

  const csvContent = [
    [`CRM Audit Logs - ${fyLabel}`],
    [],
    headers,
    ...rows
  ].map(row => csvRowFromFields(row)).join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

const exportAuditLogsExcel = (logs: any[], filename: string, fyLabel: string) => {
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'];
  const rows = logs.map(log => [
    format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss'),
    log.user_name || 'Unknown',
    log.action_type,
    log.entity_type || '',
    log.entity_id || '',
    log.details || ''
  ]);

  const content = [
    [`CRM Audit Logs - ${fyLabel}`],
    [],
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');

  downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

const exportAuditLogsPDF = (logs: any[], filename: string, fyLabel: string) => {
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID'];
  const rows = logs.map(log => [
    format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm'),
    log.user_name || 'Unknown',
    log.action_type,
    log.entity_type || '',
    log.entity_id || ''
  ]);

  const htmlContent = generatePDFHTML(
    `CRM Audit Logs - ${fyLabel}`,
    headers,
    rows
  );

  printPDF(htmlContent, filename);
};

// Qualified Deals Export
export const exportQualifiedDeals = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Qualified_Deals_${fyLabel.replace(/\s+/g, '_')}`;
  const headers = ['Salesperson', 'Total Qualified', 'First-Time Qualified', 'Total Value'];
  const rows = data?.bySalesperson?.map((p: any) => [
    p.name, p.qualified, p.firstTimeQualified, `$${p.totalValue.toLocaleString()}`
  ]) || [];

  if (exportFormat === 'csv') {
    const csvContent = [[`Qualified Deals Report - ${fyLabel}`], [], headers, ...rows].map(r => csvRowFromFields(r)).join('\n');
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  } else if (exportFormat === 'excel') {
    const content = [[`Qualified Deals Report - ${fyLabel}`], [], headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  } else {
    printPDF(generatePDFHTML(`Qualified Deals Report - ${fyLabel}`, headers, rows), filename);
  }
};

// Lost Amount Export
export const exportLostAmount = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Lost_Amount_${fyLabel.replace(/\s+/g, '_')}`;
  const headers = ['Salesperson', 'Deals Lost', 'Current Year', 'Previous Year', 'YoY Change'];
  const rows = data?.bySalesperson?.map((p: any) => [
    p.name, p.dealsLost, `$${p.currentYear.toLocaleString()}`, `$${p.previousYear.toLocaleString()}`, `${p.yoyChange.toFixed(2)}%`
  ]) || [];

  if (exportFormat === 'csv') {
    const csvContent = [[`Lost Amount Report - ${fyLabel}`], [], headers, ...rows].map(r => csvRowFromFields(r)).join('\n');
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  } else if (exportFormat === 'excel') {
    const content = [[`Lost Amount Report - ${fyLabel}`], [], headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  } else {
    printPDF(generatePDFHTML(`Lost Amount Report - ${fyLabel}`, headers, rows), filename);
  }
};

// Average Time in Stage Export
export const exportAverageTimeInStage = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Time_In_Stage_${fyLabel.replace(/\s+/g, '_')}`;
  const headers = ['Stage', 'Avg Days', 'Transitions'];
  const rows = data?.byStage?.map((s: any) => [s.stageName, s.avgDays.toFixed(2), s.dealCount]) || [];

  if (exportFormat === 'csv') {
    const csvContent = [[`Average Time in Stage - ${fyLabel}`], [], headers, ...rows].map(r => csvRowFromFields(r)).join('\n');
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  } else if (exportFormat === 'excel') {
    const content = [[`Average Time in Stage - ${fyLabel}`], [], headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  } else {
    printPDF(generatePDFHTML(`Average Time in Stage - ${fyLabel}`, headers, rows), filename);
  }
};

// Contact Conversion Export
export const exportContactConversion = (
  data: any,
  financialYear: DateRangeType,
  exportFormat: 'csv' | 'excel' | 'pdf'
) => {
  const fyLabel = getAustralianFYLabel(financialYear.from);
  const filename = `Contact_Conversion_${fyLabel.replace(/\s+/g, '_')}`;
  const headers = ['Stage', 'Count', 'Conversion Rate'];
  const rows = [
    ['Contacts Created', data?.contactsCreated || 0, '-'],
    ['Deals Created', data?.dealsCreated || 0, `${data?.contactToDealRate?.toFixed(2) || 0}%`],
    ['Qualified', data?.qualifiedDeals || 0, `${data?.dealToQualifiedRate?.toFixed(2) || 0}%`],
    ['Won', data?.wonDeals || 0, `${data?.qualifiedToWonRate?.toFixed(2) || 0}%`],
  ];

  if (exportFormat === 'csv') {
    const csvContent = [[`Contact Conversion Report - ${fyLabel}`], [], headers, ...rows].map(r => csvRowFromFields(r)).join('\n');
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  } else if (exportFormat === 'excel') {
    const content = [[`Contact Conversion Report - ${fyLabel}`], [], headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    downloadFile('\uFEFF' + content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  } else {
    printPDF(generatePDFHTML(`Contact Conversion Report - ${fyLabel}`, headers, rows), filename);
  }
};

// Helper Functions
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const generatePDFHTML = (
  title: string,
  headers: string[],
  rows: any[][],
  summaryRows?: string[][]
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { margin: 20px 0; padding: 15px; background: #f0f0f0; border-left: 4px solid #333; }
        .summary table { margin: 10px 0; }
        .summary td { border: none; padding: 5px; }
        @media print {
          body { padding: 10px; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${escapeHtml(String(h ?? ''))}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      ${summaryRows ? `
        <div class="summary">
          <strong>Summary</strong>
          <table>
            ${summaryRows.map(row => `<tr><td><strong>${escapeHtml(String(row[0] ?? ''))}:</strong></td><td>${escapeHtml(String(row[1] ?? ''))}</td></tr>`).join('')}
          </table>
        </div>
      ` : ''}
    </body>
    </html>
  `;
};

const printPDF = (htmlContent: string, filename: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Drive print off the window's load event so large datasets that
    // take longer than the previous fixed 250ms timeout to layout still
    // print correctly. Falls back to a short delay if the load event
    // has already fired by the time we reach this line.
    const triggerPrint = () => printWindow.print();
    if (printWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 50);
    } else {
      printWindow.addEventListener('load', triggerPrint, { once: true });
    }
  }
};
