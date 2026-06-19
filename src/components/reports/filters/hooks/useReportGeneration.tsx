
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchReportData } from "@/lib/timesheet-service";
import { fetchAuditLogs, logReportGeneration } from "@/lib/audit/audit-service";
import { toast } from "@/hooks/use-toast";
import { ReportFiltersType } from "@/pages/timesheet/ReportsPage";

interface UseReportGenerationProps {
  filters: ReportFiltersType;
  setReportData: React.Dispatch<React.SetStateAction<any[]>>;
  setAuditData: React.Dispatch<React.SetStateAction<any[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useReportGeneration = ({
  filters,
  setReportData,
  setAuditData,
  setIsLoading
}: UseReportGenerationProps) => {
  const { user } = useAuth();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Improved filter value normalization function
  const normalizeSelectValue = (value: string | undefined): string | null => {
    // Convert any "empty" values to null for proper filtering
    if (!value || value === "" || value === "all" || value === "empty") {
      return null;
    }
    return value;
  };

  const generateReport = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate reports",
        variant: "destructive"
      });
      return;
    }
    
    console.log("=== GENERATING REPORT ===");
    console.log("Current user:", user);
    console.log("Raw filters:", filters);
    
    setIsGeneratingReport(true);
    setIsLoading(true);
    
    try {
      if (filters.reportType === 'timesheet') {
        // Handle timesheet reports with entry type filtering
        const normalizedFilters = {
          userId: normalizeSelectValue(filters.userId),
          projectId: filters.includeProject ? normalizeSelectValue(filters.projectId) : null,
          customerId: normalizeSelectValue(filters.customerId),
          contractId: filters.includeContract ? normalizeSelectValue(filters.contractId) : null,
          includeProjects: filters.includeProject,
          includeContracts: filters.includeContract
        };
        
        console.log("Normalized timesheet filters:", normalizedFilters);
        
        const reportData = await fetchReportData(filters.startDate, filters.endDate, normalizedFilters);
        
        console.log("Timesheet report data received:", reportData);
        setReportData(reportData);
        setAuditData([]); // Clear audit data when generating timesheet report
        
        // Log report generation to audit trail using secure database function
        await logReportGeneration({
          reportType: 'timesheet',
          filters: {
            ...normalizedFilters,
            startDate: filters.startDate.toLocaleDateString('en-CA'),
            endDate: filters.endDate.toLocaleDateString('en-CA'),
            includeProject: filters.includeProject,
            includeContract: filters.includeContract
          },
          resultCount: reportData.length
        });
        
        if (reportData.length === 0) {
          toast({
            title: "No data found",
            description: "No timesheet entries found for the selected criteria. Try adjusting your filters.",
            variant: "default"
          });
        } else {
          toast({
            title: "Report generated successfully",
            description: `Found ${reportData.length} timesheet entries`,
            variant: "default"
          });
        }
      } else if (filters.reportType === 'audit') {
        // Handle audit log reports
        const auditFilters = {
          startDate: filters.startDate,
          endDate: filters.endDate,
          userId: normalizeSelectValue(filters.userId),
          actionType: normalizeSelectValue(filters.actionType)
        };
        
        console.log("Audit log filters:", auditFilters);
        
        const auditData = await fetchAuditLogs(auditFilters);
        
        console.log("Audit log data received:", auditData);
        setAuditData(auditData);
        setReportData([]); // Clear timesheet data when generating audit report
        
        // Log audit report generation to audit trail using secure database function
        await logReportGeneration({
          reportType: 'audit',
          filters: {
            startDate: filters.startDate.toLocaleDateString('en-CA'),
            endDate: filters.endDate.toLocaleDateString('en-CA'),
            userId: normalizeSelectValue(filters.userId),
            actionType: normalizeSelectValue(filters.actionType)
          },
          resultCount: auditData.length
        });
        
        if (auditData.length === 0) {
          toast({
            title: "No audit logs found",
            description: "No audit entries found for the selected criteria. Try adjusting your filters.",
            variant: "default"
          });
        } else {
          toast({
            title: "Audit report generated successfully",
            description: `Found ${auditData.length} audit log entries`,
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error("Error generating report:", error);
      setReportData([]);
      setAuditData([]);
      
      let errorMessage = "There was an error generating the report";
      if (error instanceof Error) {
        if (error.message.includes("Access denied")) {
          errorMessage = "Access denied. Admin role required to generate reports.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Report generation failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
      setIsLoading(false);
    }
  };

  return {
    generateReport,
    isGeneratingReport,
    normalizeSelectValue
  };
};
