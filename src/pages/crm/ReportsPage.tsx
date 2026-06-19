import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileDown, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canAccessAdminConsole } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";
import { FinancialYearSelector } from "@/components/crm/reports/FinancialYearSelector";
import { SalesOverviewReport } from "@/components/crm/reports/SalesOverviewReport";
import { PipelineForecastReport } from "@/components/crm/reports/PipelineForecastReport";
import { ContactToDealConversionReport } from "@/components/crm/reports/ContactToDealConversionReport";
import { ActivitiesAuditReport } from "@/components/crm/reports/ActivitiesAuditReport";
import { SalespersonActivityReport } from "@/components/crm/reports/SalespersonActivityReport";
import { getCurrentAustralianFY, DateRangeType } from "@/lib/crm/financial-year-utils";
import { toast } from "sonner";

export default function ReportsPage() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [financialYear, setFinancialYear] = useState<DateRangeType>(getCurrentAustralianFY());
  const [activeTab, setActiveTab] = useState("sales");
  
  // Refs to access child component data
  const salesReportRef = useRef<any>(null);
  const pipelineReportRef = useRef<any>(null);
  const conversionReportRef = useRef<any>(null);
  const activitiesReportRef = useRef<any>(null);
  const performanceReportRef = useRef<any>(null);

  useEffect(() => {
    if (!canAccessAdminConsole(userRole)) {
      navigate("/crm");
    }
  }, [userRole, navigate]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    try {
      let data: any = null;
      let reportName = "";

      switch (activeTab) {
        case 'sales':
          if (salesReportRef.current?.getExportData) {
            data = salesReportRef.current.getExportData();
            reportName = "Sales Overview";
          }
          break;
        case 'pipeline':
          if (pipelineReportRef.current?.getExportData) {
            data = pipelineReportRef.current.getExportData();
            reportName = "Pipeline & Forecast";
          }
          break;
        case 'conversion':
          if (conversionReportRef.current?.getExportData) {
            data = conversionReportRef.current.getExportData();
            reportName = "Conversion Funnel";
          }
          break;
        case 'activities':
          if (activitiesReportRef.current?.getExportData) {
            data = activitiesReportRef.current.getExportData();
            reportName = "Activities & Audit";
          }
          break;
        case 'performance':
          if (performanceReportRef.current?.getExportData) {
            data = performanceReportRef.current.getExportData();
            reportName = "Salesperson Performance";
          }
          break;
      }

      if (data) {
        // For now, export as JSON download - can be enhanced with specific formatters
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.replace(/\s+/g, '_')}_${format}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${reportName} exported as ${format.toUpperCase()}`);
      } else {
        toast.error("Report data not available");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              CRM Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive reporting across all CRM activities
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <FileDown className="h-4 w-4" />
                Export Reports
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <FinancialYearSelector
          value={financialYear}
          onChange={setFinancialYear}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="sales">Sales Overview</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline & Forecast</TabsTrigger>
            <TabsTrigger value="conversion">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="activities">Activities & Audit</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-6">
            <SalesOverviewReport ref={salesReportRef} financialYear={financialYear} />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-6">
            <PipelineForecastReport ref={pipelineReportRef} financialYear={financialYear} />
          </TabsContent>

          <TabsContent value="conversion" className="mt-6">
            <ContactToDealConversionReport ref={conversionReportRef} financialYear={financialYear} />
          </TabsContent>

          <TabsContent value="activities" className="mt-6">
            <ActivitiesAuditReport ref={activitiesReportRef} financialYear={financialYear} />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <SalespersonActivityReport ref={performanceReportRef} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
