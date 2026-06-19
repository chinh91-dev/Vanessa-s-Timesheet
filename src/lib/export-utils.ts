
import { TimesheetEntry, Project } from "./timesheet-service";
import { Contract } from "./contract-service";
import { User } from "./user-service";
import { formatDateDisplay } from "./date-utils";
import { ReportFiltersType } from "@/pages/timesheet/ReportsPage";
import { escapeHtml } from "@/utils/html-generation.utils";
import { csvRowFromFields, escapeCsvField } from "@/utils/csv-generation.utils";

// Data validation functions
export const validateExportData = (
  reportData: TimesheetEntry[], 
  projects: Project[], 
  users: User[]
): { isValid: boolean; error?: string } => {
  if (!reportData || reportData.length === 0) {
    return { isValid: false, error: "No timesheet data available to export. Please generate a report first." };
  }
  
  if (!projects || projects.length === 0) {
    return { isValid: false, error: "Project data is missing. Please refresh the page and try again." };
  }
  
  if (!users || users.length === 0) {
    return { isValid: false, error: "User data is missing. Please refresh the page and try again." };
  }
  
  return { isValid: true };
};

// Helper functions for data formatting
const formatReportData = (
  reportData: TimesheetEntry[], 
  projects: Project[],
  contracts: Contract[],
  users: User[],
  filters: ReportFiltersType
) => {
  const projectMap = new Map<string, Project>();
  projects.forEach(project => projectMap.set(project.id, project));
  
  const contractMap = new Map<string, Contract>();
  contracts.forEach(contract => contractMap.set(contract.id, contract));
  
  const userMap = new Map<string, User>();
  users.forEach(user => userMap.set(user.id, user));

  return reportData.map(entry => {
    const employee = userMap.get(entry.user_id);
    
    // Use the same logic as ReportDataTable for project/contract names
    const getProjectName = () => {
      if (entry.entry_type === 'project' && entry.project) {
        // Use the project data from RPC response first, fall back to map lookup
        return entry.project.name || projectMap.get(entry.project_id!)?.name || 'Unknown Project';
      } else if (entry.entry_type === 'contract' && entry.contract_id) {
        return 'N/A (Contract Entry)';
      }
      return 'Unknown';
    };

    const getContractName = () => {
      if (entry.entry_type === 'contract' && entry.contract) {
        // Use the contract data from RPC response first, fall back to map lookup
        return entry.contract.name || contractMap.get(entry.contract_id!)?.name || 'Unknown Contract';
      } else if (entry.entry_type === 'project' && entry.project_id) {
        return 'N/A (Project Entry)';
      }
      return 'Unknown';
    };
    
    const baseData = {
      Date: formatDateDisplay(new Date(entry.entry_date)),
      Employee: employee?.full_name || 'Unknown Employee',
    };

    const employeeIdData = filters.includeEmployeeIds ? {
      'Employee ID': employee?.employee_id || '-',
      'Employee Card ID': employee?.employee_card_id || '-'
    } : {};

    const projectData = filters.includeProject ? {
      Project: getProjectName()
    } : {};

    const contractData = filters.includeContract ? {
      Contract: getContractName()
    } : {};

    const remainingData = {
      Hours: entry.hours_logged,
      'Jira Task ID': entry.jira_task_id || '',
      Notes: entry.notes || ''
    };

    return {
      ...baseData,
      ...employeeIdData,
      ...projectData,
      ...contractData,
      ...remainingData
    };
  });
};

// Improved CSV Export with validation
export const exportToCSV = (
  reportData: TimesheetEntry[], 
  projects: Project[],
  contracts: Contract[],
  users: User[],
  filters: ReportFiltersType,
  filename: string
) => {
  console.log("Starting CSV export...");
  
  // Validate data before export
  const validation = validateExportData(reportData, projects, users);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const formattedData = formatReportData(reportData, projects, contracts, users, filters);

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
  
  console.log("CSV export completed successfully");
};

// Improved Excel Export with proper data validation
export const exportToExcel = (
  reportData: TimesheetEntry[], 
  projects: Project[],
  contracts: Contract[],
  users: User[],
  filters: ReportFiltersType,
  filename: string
) => {
  console.log("Starting Excel export...");
  
  // Validate data before export
  const validation = validateExportData(reportData, projects, users);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const formattedData = formatReportData(reportData, projects, contracts, users, filters);
  
  // Calculate total hours
  const totalHours = reportData.reduce((sum, entry) => sum + entry.hours_logged, 0);
  
  // Create total row with proper structure matching the conditional columns
  const totalRow: Record<string, string | number> = { Date: 'TOTAL', Employee: '' };
  if (filters.includeEmployeeIds) {
    totalRow['Employee ID'] = '';
    totalRow['Employee Card ID'] = '';
  }
  if (filters.includeProject) {
    totalRow.Project = '';
  }
  if (filters.includeContract) {
    totalRow.Contract = '';
  }
  totalRow.Hours = totalHours;
  totalRow['Jira Task ID'] = '';
  totalRow.Notes = '';
  
  // Add total row
  formattedData.push(totalRow as any);
  
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
  
  console.log("Excel export completed successfully");
};

// PDF Export with improved error handling
export const exportToPDF = (
  reportData: TimesheetEntry[], 
  projects: Project[],
  contracts: Contract[],
  users: User[],
  filters: ReportFiltersType,
  filename: string
) => {
  console.log("Starting PDF export...");
  
  // Validate data before export
  const validation = validateExportData(reportData, projects, users);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const formattedData = formatReportData(reportData, projects, contracts, users, filters);
  
  // Calculate total hours
  const totalHours = reportData.reduce((sum, entry) => sum + entry.hours_logged, 0);
  
  // Create a printable HTML page
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to export PDF. Check your browser settings and try again.');
  }
  
  // Generate table headers dynamically based on filter settings
  const headerCells = ['Date', 'Employee'];
  if (filters.includeEmployeeIds) {
    headerCells.push('Employee ID', 'Employee Card ID');
  }
  if (filters.includeProject) {
    headerCells.push('Project');
  }
  if (filters.includeContract) {
    headerCells.push('Contract');
  }
  headerCells.push('Hours', 'Jira Task ID', 'Notes');
  
  // Generate data rows
  const dataRows = formattedData.map(row => {
    const cells = Object.values(row).map(value => `<td>${escapeHtml(String(value ?? ''))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  
  // Generate total row with proper structure
  const totalCells = ['Total', ''];
  if (filters.includeEmployeeIds) {
    totalCells.push('', '');
  }
  if (filters.includeProject) {
    totalCells.push('');
  }
  if (filters.includeContract) {
    totalCells.push('');
  }
  totalCells.push(totalHours.toFixed(2), '', '');
  
  // Style and content for the printable page
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(filename)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .report-header { margin-bottom: 20px; }
        .filters { margin-bottom: 20px; color: #666; font-size: 0.9em; }
        .total-row { font-weight: bold; background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>Timesheet Report</h1>
        <div class="filters">
          <p>
            Date Range: ${escapeHtml(formatDateDisplay(filters.startDate))} to ${escapeHtml(formatDateDisplay(filters.endDate))}
            ${filters.projectId ? `| Project: ${escapeHtml(projects.find(p => p.id === filters.projectId)?.name || 'Unknown')}` : ''}
            ${filters.contractId ? `| Contract: ${escapeHtml(contracts.find(c => c.id === filters.contractId)?.name || 'Unknown')}` : ''}
            ${filters.userId ? `| Employee: ${escapeHtml(users.find(u => u.id === filters.userId)?.full_name || 'Unknown')}` : ''}
            ${filters.includeEmployeeIds ? '| Employee IDs: Included' : ''}
          </p>
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
          <tr class="total-row">
            ${totalCells.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}
          </tr>
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

  console.log("PDF export completed successfully");
};
