
import React from "react";
import { TimesheetEntry, Project } from "@/lib/timesheet-service";
import { Contract } from "@/lib/contract-service";
import { User } from "@/lib/user-service";
import { ReportFiltersType } from "@/pages/timesheet/ReportsPage";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateDisplay } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX, Filter, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportDataTableProps {
  reportData: TimesheetEntry[];
  projects: Project[];
  contracts: Contract[];
  users: User[];
  filters: ReportFiltersType;
  isLoading: boolean;
}

type SortOrder = 'asc' | 'desc' | null;

const ReportDataTable = ({ reportData, projects, contracts, users, filters, isLoading }: ReportDataTableProps) => {
  const [dateSortOrder, setDateSortOrder] = React.useState<SortOrder>(null);

  // Create maps for quick lookups
  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(project => map.set(project.id, project));
    return map;
  }, [projects]);

  const contractMap = React.useMemo(() => {
    const map = new Map<string, Contract>();
    contracts.forEach(contract => map.set(contract.id, contract));
    return map;
  }, [contracts]);
  
  const userMap = React.useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(user => map.set(user.id, user));
    return map;
  }, [users]);

  // Sort data by date when sort order changes
  const sortedReportData = React.useMemo(() => {
    if (!dateSortOrder) return reportData;

    return [...reportData].sort((a, b) => {
      const dateA = new Date(a.entry_date);
      const dateB = new Date(b.entry_date);
      
      if (dateSortOrder === 'asc') {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [reportData, dateSortOrder]);

  // Calculate totals
  const totalHours = React.useMemo(() => {
    return reportData.reduce((sum, entry) => sum + entry.hours_logged, 0);
  }, [reportData]);

  // Handle date column header click
  const handleDateSort = () => {
    if (dateSortOrder === null) {
      setDateSortOrder('asc');
    } else if (dateSortOrder === 'asc') {
      setDateSortOrder('desc');
    } else {
      setDateSortOrder(null);
    }
  };

  // Calculate column count for skeleton and totals row
  const baseColumns = 3; // Date, Employee, Hours
  const projectColumns = filters.includeProject ? 1 : 0;
  const contractColumns = filters.includeContract ? 1 : 0;
  const employeeIdColumns = filters.includeEmployeeIds ? 2 : 0; // Employee ID, Employee Card ID
  const taskColumns = 2; // Jira Task ID, Notes
  const totalColumns = baseColumns + projectColumns + contractColumns + employeeIdColumns + taskColumns;

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              {filters.includeEmployeeIds && <TableHead>Employee ID</TableHead>}
              {filters.includeEmployeeIds && <TableHead>Employee Card ID</TableHead>}
              {filters.includeProject && <TableHead>Project</TableHead>}
              {filters.includeContract && <TableHead>Contract</TableHead>}
              <TableHead>Hours</TableHead>
              <TableHead>Jira Task ID</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                {filters.includeEmployeeIds && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                {filters.includeEmployeeIds && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                {filters.includeProject && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                {filters.includeContract && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Show fallback UI only after attempting fetch and getting no results
  if (reportData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <FileX className="h-12 w-12 text-gray-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No data found</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm">
            No timesheet entries match your current filters. Try adjusting the date range or removing some filters.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
          <Filter className="h-3 w-3" />
          <span>Tip: Use "Generate Report" button to fetch data with your current filters</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="p-0">
                <Button
                  variant="ghost"
                  onClick={handleDateSort}
                  className={cn(
                    "h-12 w-full justify-start font-medium text-muted-foreground hover:text-foreground",
                    dateSortOrder && "text-foreground"
                  )}
                >
                  Date
                  {dateSortOrder === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                  {dateSortOrder === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>Employee</TableHead>
              {filters.includeEmployeeIds && <TableHead>Employee ID</TableHead>}
              {filters.includeEmployeeIds && <TableHead>Employee Card ID</TableHead>}
              {filters.includeProject && <TableHead>Project</TableHead>}
              {filters.includeContract && <TableHead>Contract</TableHead>}
              <TableHead>Hours</TableHead>
              <TableHead>Jira Task ID</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedReportData.map((entry) => {
              const employee = userMap.get(entry.user_id);
              
              // Determine what to show for project/contract columns based on entry type
              const getProjectName = () => {
                if (entry.entry_type === 'project' && entry.project) {
                  // Use the project data from RPC response first, fall back to map lookup
                  return entry.project.name || projectMap.get(entry.project_id!)?.name || 'Unknown Project';
                } else if (entry.entry_type === 'contract' && entry.contract_id) {
                  return '-';
                }
                return 'Unknown';
              };

              const getContractName = () => {
                if (entry.entry_type === 'contract' && entry.contract) {
                  // Use the contract data from RPC response first, fall back to map lookup
                  return entry.contract.name || contractMap.get(entry.contract_id!)?.name || 'Unknown Contract';
                } else if (entry.entry_type === 'project' && entry.project_id) {
                  return '-';
                }
                return 'Unknown';
              };
              
              return (
                <TableRow key={entry.id}>
                  <TableCell>{formatDateDisplay(new Date(entry.entry_date))}</TableCell>
                  <TableCell>{employee?.full_name || 'Unknown Employee'}</TableCell>
                  {filters.includeEmployeeIds && <TableCell>{employee?.employee_id || '-'}</TableCell>}
                  {filters.includeEmployeeIds && <TableCell>{employee?.employee_card_id || '-'}</TableCell>}
                  {filters.includeProject && <TableCell>{getProjectName()}</TableCell>}
                  {filters.includeContract && <TableCell>{getContractName()}</TableCell>}
                  <TableCell>{entry.hours_logged}</TableCell>
                  <TableCell className="max-w-xs truncate">{entry.jira_task_id || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{entry.notes || '-'}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-medium bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell></TableCell>
              {filters.includeEmployeeIds && <TableCell></TableCell>}
              {filters.includeEmployeeIds && <TableCell></TableCell>}
              {filters.includeProject && <TableCell></TableCell>}
              {filters.includeContract && <TableCell></TableCell>}
              <TableCell>{totalHours.toFixed(2)}</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ReportDataTable;
