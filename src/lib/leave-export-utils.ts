import { LeaveApplication } from "./leave-service";
import { formatDateDisplay } from "./date-utils";
import { format } from "date-fns";
import { escapeHtml } from "@/utils/html-generation.utils";
import { csvRowFromFields, escapeCsvField } from "@/utils/csv-generation.utils";

// Data validation for leave applications export
export const validateLeaveExportData = (
  applications: LeaveApplication[]
): { isValid: boolean; error?: string } => {
  if (!applications || applications.length === 0) {
    return { isValid: false, error: "No leave applications available to export." };
  }
  
  return { isValid: true };
};

// Format leave application data for export
const formatLeaveApplicationData = (
  applications: LeaveApplication[],
  isAdmin: boolean,
  searchTerm?: string,
  statusFilter?: string
) => {
  return applications.map(application => {
    const baseData = {
      'Leave Type': application.leave_type?.name || 'Unknown',
      'Start Date': format(new Date(application.start_date), "MMM dd, yyyy"),
      'End Date': format(new Date(application.end_date), "MMM dd, yyyy"),
      'Business Days': application.business_days_count,
      'Status': application.status.charAt(0).toUpperCase() + application.status.slice(1),
    };

    const employeeData = isAdmin ? {
      'Employee Name': application.user_full_name || 'Unknown',
      'Employee Email': application.user_email || 'Unknown',
    } : {};

    const remainingData = {
      'Submitted Date': format(new Date(application.submitted_at), "MMM dd, yyyy"),
      'Reason': application.reason || '',
      'Manager Comments': application.manager_comments || '',
      'Approved By': application.approved_by_name || '',
      'Approved Date': application.approved_at ? format(new Date(application.approved_at), "MMM dd, yyyy") : '',
    };

    return {
      ...baseData,
      ...employeeData,
      ...remainingData
    };
  });
};

// CSV Export for leave applications
export const exportLeaveApplicationsToCSV = (
  applications: LeaveApplication[],
  isAdmin: boolean,
  filename: string,
  searchTerm?: string,
  statusFilter?: string
) => {
  console.log("Starting leave applications CSV export...");
  
  // Validate data before export
  const validation = validateLeaveExportData(applications);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const formattedData = formatLeaveApplicationData(applications, isAdmin, searchTerm, statusFilter);

  // Convert data to CSV format (escape via shared utility, including formula-injection defuse)
  const headerKeys = Object.keys(formattedData[0] || {});
  const headers = headerKeys.map(escapeCsvField).join(',');
  const rows = formattedData.map(row => csvRowFromFields(Object.values(row) as (string | number | null | undefined)[]));
  const csvContent = `${headers}\n${rows.join('\n')}`;

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log("Leave applications CSV export completed successfully");
};

// Excel Export for leave applications
export const exportLeaveApplicationsToExcel = (
  applications: LeaveApplication[],
  isAdmin: boolean,
  filename: string,
  searchTerm?: string,
  statusFilter?: string
) => {
  console.log("Starting leave applications Excel export...");
  
  // Validate data before export
  const validation = validateLeaveExportData(applications);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const formattedData = formatLeaveApplicationData(applications, isAdmin, searchTerm, statusFilter);
  
  // Create Excel-compatible CSV content with BOM for proper UTF-8 encoding
  const BOM = '\uFEFF';
  const headers = Object.keys(formattedData[0] || {}).join('\t'); // Use tabs for better Excel compatibility
  const rows = formattedData.map(row => 
    Object.values(row)
      .map(value => String(value).replace(/\t/g, ' ')) // Replace tabs with spaces
      .join('\t')
  );
  const excelContent = BOM + `${headers}\n${rows.join('\n')}`;

  // Create and download as Excel file
  const blob = new Blob([excelContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log("Leave applications Excel export completed successfully");
};

// PDF Export for leave applications
export const exportLeaveApplicationsToPDF = (
  applications: LeaveApplication[],
  isAdmin: boolean,
  filename: string,
  searchTerm?: string,
  statusFilter?: string
) => {
  console.log("Starting leave applications PDF export...");
  
  // Validate data before export
  const validation = validateLeaveExportData(applications);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const formattedData = formatLeaveApplicationData(applications, isAdmin, searchTerm, statusFilter);
  
  // Create a printable HTML page
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to export PDF. Check your browser settings and try again.');
  }
  
  // Generate table headers dynamically based on admin status
  const headerCells = ['Leave Type', 'Start Date', 'End Date', 'Business Days', 'Status'];
  if (isAdmin) {
    headerCells.push('Employee Name', 'Employee Email');
  }
  headerCells.push('Submitted Date', 'Reason', 'Manager Comments', 'Approved By', 'Approved Date');
  
  // Generate data rows
  const dataRows = formattedData.map(row => {
    const cells = Object.values(row).map(value => `<td>${escapeHtml(String(value ?? ''))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  
  // Generate filter info
  const filterInfo = [];
  if (searchTerm) {
    filterInfo.push(`Search: "${searchTerm}"`);
  }
  if (statusFilter && statusFilter !== 'all') {
    filterInfo.push(`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`);
  }
  const filterText = filterInfo.length > 0 ? `Filters Applied: ${filterInfo.join(', ')}` : 'No filters applied';
  
  // Style and content for the printable page
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(filename)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; word-wrap: break-word; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .report-header { margin-bottom: 20px; }
        .filters { margin-bottom: 20px; color: #666; font-size: 0.9em; }
        .summary { margin-bottom: 20px; color: #666; font-size: 0.9em; }
        @media print {
          body { margin: 10px; }
          table { font-size: 11px; }
          th, td { padding: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>Leave Applications Report</h1>
        <div class="filters">
          <p>${escapeHtml(filterText)}</p>
        </div>
        <div class="summary">
          <p>Total Applications: ${applications.length}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            ${headerCells.map(header => `<th>${escapeHtml(String(header ?? ''))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${dataRows}
        </tbody>
      </table>
    </body>
    </html>
  `);
  
  // Wait for content to load then print
  printWindow.document.close();
  const triggerPrint = () => printWindow.print();
  if (printWindow.document.readyState === 'complete') {
    setTimeout(triggerPrint, 50);
  } else {
    printWindow.addEventListener('load', triggerPrint, { once: true });
  }

  console.log("Leave applications PDF export completed successfully");
};