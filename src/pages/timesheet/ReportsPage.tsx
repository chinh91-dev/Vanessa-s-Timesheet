
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportCharts from "@/components/reports/ReportCharts";
import ReportDataTable from "@/components/reports/ReportDataTable";
import AuditLogsTable from "@/components/reports/AuditLogsTable";
import TimesheetLockManager from "@/components/reports/TimesheetLockManager";
import ExpenseReportCharts from "@/components/reports/ExpenseReportCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download, Lock } from "lucide-react";
import { TimesheetEntry, Project, fetchReportData } from "@/lib/timesheet-service";
import { Contract } from "@/lib/contract-service";
import { Customer } from "@/lib/customer-service";
import { UserWithRole } from "@/lib/user-service";
import { AuditLogEntry, fetchAuditLogs } from "@/lib/audit/audit-service";
import { getExpenseStatistics } from "@/lib/expense-service";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils";

export type ReportFiltersType = {
  startDate: Date;
  endDate: Date;
  customerId: string | null;
  contractId: string | null;
  projectId: string | null;
  userId: string | null;
  includeProject: boolean;
  includeContract: boolean;
  includeEmployeeIds: boolean;
  reportType: 'timesheet' | 'audit' | 'expenses';
  actionType?: string | null;
};

const ReportsPage = () => {
  const { user, userRole, loading } = useAuth();
  const userIsAdmin = userRole === 'admin';

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="container mx-auto px-2 md:px-4">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-muted rounded" />
              <div className="h-4 w-64 bg-muted rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 bg-muted rounded" />
              <div className="h-9 w-20 bg-muted rounded" />
            </div>
          </div>
          <div className="h-10 w-80 bg-muted rounded" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  // Return proper UI if user is not admin
  if (!userIsAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">You do not have access to this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<TimesheetEntry[]>([]);
  const [auditData, setAuditData] = useState<AuditLogEntry[]>([]);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filters, setFilters] = useState<ReportFiltersType>({
    startDate: new Date(new Date().setDate(1)), // First day of current month
    endDate: new Date(),
    customerId: null,
    contractId: null,
    projectId: null,
    userId: null,
    includeProject: false,
    includeContract: false,
    includeEmployeeIds: false,
    reportType: 'timesheet',
    actionType: null
  });

  // Load expense data when component mounts
  useEffect(() => {
    const loadExpenseData = async () => {
      if (!user) return;
      
      setIsLoadingExpenses(true);
      try {
        const data = await getExpenseStatistics();
        setExpenseData(data);
      } catch (error) {
        console.error("Error loading expense data:", error);
        toast({
          title: "Error loading expense data",
          description: error instanceof Error ? error.message : "Failed to load expense statistics",
          variant: "destructive"
        });
      } finally {
        setIsLoadingExpenses(false);
      }
    };

    loadExpenseData();
  }, [user]);

  // Check if export is available (data has been generated)
  const isExportDisabled = () => {
    if (filters.reportType === 'timesheet') return reportData.length === 0;
    if (filters.reportType === 'audit') return auditData.length === 0;
    return true;
  };

  const handleExportCSV = () => {
    try {
      if (filters.reportType === 'timesheet') {
        exportToCSV(reportData, projects, contracts, users, filters, `timesheet-report-${formatDate(new Date())}`);
      } else {
        // TODO: Implement audit logs CSV export
        toast({
          title: "Feature coming soon",
          description: "Audit logs CSV export will be available soon"
        });
        return;
      }
      toast({
        title: "Export successful",
        description: "The report has been exported to CSV"
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "There was an error exporting the report",
        variant: "destructive"
      });
    }
  };

  const handleExportExcel = () => {
    try {
      if (filters.reportType === 'timesheet') {
        exportToExcel(reportData, projects, contracts, users, filters, `timesheet-report-${formatDate(new Date())}`);
      } else {
        // TODO: Implement audit logs Excel export
        toast({
          title: "Feature coming soon",
          description: "Audit logs Excel export will be available soon"
        });
        return;
      }
      toast({
        title: "Export successful",
        description: "The report has been exported to Excel"
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "There was an error exporting the report",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = () => {
    try {
      if (filters.reportType === 'timesheet') {
        exportToPDF(reportData, projects, contracts, users, filters, `timesheet-report-${formatDate(new Date())}`);
      } else {
        // TODO: Implement audit logs PDF export
        toast({
          title: "Feature coming soon",
          description: "Audit logs PDF export will be available soon"
        });
        return;
      }
      toast({
        title: "Export successful",
        description: "The report has been exported to PDF"
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "There was an error exporting the report",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-2 md:px-4">
      <div className="mb-4 md:mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Reports</h1>
          <p className="text-gray-600 text-sm md:text-base">Generate reports and manage timesheet locks</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExportCSV} 
            disabled={isExportDisabled()}
            title={isExportDisabled() ? "Generate a report first to enable export" : "Export to CSV"}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          
          <Button 
            size="sm" 
            variant="default" 
            onClick={handleExportPDF} 
            disabled={isExportDisabled()}
            title={isExportDisabled() ? "Generate a report first to enable export" : "Export to PDF"}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {isExportDisabled() && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            💡 Generate a report using the filters below to enable export options.
          </p>
        </div>
      )}

      <Tabs defaultValue="reports" className="w-full">
        <TabsList>
          <TabsTrigger value="reports">Time Reports</TabsTrigger>
          <TabsTrigger value="expenses">Expense Reports</TabsTrigger>
          
          <TabsTrigger value="locks" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Timesheet Locks
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                {filters.reportType === 'timesheet' 
                  ? 'Create custom timesheet reports for your team' 
                  : 'View comprehensive audit logs of all user actions including deletions'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportFilters 
                filters={filters} 
                setFilters={setFilters} 
                setReportData={setReportData} 
                setAuditData={setAuditData}
                setProjects={setProjects} 
                setContracts={setContracts} 
                setCustomers={setCustomers} 
                setUsers={setUsers} 
                setIsLoading={setIsLoading} 
              />
              
              <Separator className="my-6" />
              
              {filters.reportType === 'timesheet' ? (
                <Tabs defaultValue="visual" className="w-full">
                  <TabsList>
                    <TabsTrigger value="visual">Visual Reports</TabsTrigger>
                    <TabsTrigger value="tabular">Tabular Data</TabsTrigger>
                  </TabsList>
                  <TabsContent value="visual" className="mt-4">
                    <ReportCharts reportData={reportData} projects={projects} users={users} isLoading={isLoading} />
                  </TabsContent>
                  <TabsContent value="tabular" className="mt-4">
                    <ReportDataTable reportData={reportData} projects={projects} contracts={contracts} users={users} filters={filters} isLoading={isLoading} />
                  </TabsContent>
                </Tabs>
              ) : filters.reportType === 'audit' ? (
                <AuditLogsTable auditData={auditData} users={users} isLoading={isLoading} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Reports</CardTitle>
              <CardDescription>
                Comprehensive expense analytics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingExpenses ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Loading expense data...</p>
                </div>
              ) : expenseData ? (
                <ExpenseReportCharts data={expenseData} />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No expense data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        
        <TabsContent value="locks" className="mt-4">
          <TimesheetLockManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
