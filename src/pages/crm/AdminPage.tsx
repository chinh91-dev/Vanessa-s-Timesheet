import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2 } from "lucide-react";
import { canAccessAdminConsole } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";
import { FinancialYearSelector } from "@/components/crm/reports/FinancialYearSelector";
import { PipelineManagementAdmin } from "@/components/crm/admin/PipelineManagementAdmin";
import { AdminAuditLogsReport } from "@/components/crm/admin/AdminAuditLogsReport";
import { getCurrentAustralianFY, DateRangeType } from "@/lib/crm/financial-year-utils";

export default function AdminPage() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [financialYear, setFinancialYear] = useState<DateRangeType>(getCurrentAustralianFY());

  useEffect(() => {
    if (!canAccessAdminConsole(userRole)) {
      navigate("/crm");
    }
  }, [userRole, navigate]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              CRM Admin Console
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure and manage CRM system settings
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-6">
            <PipelineManagementAdmin />
          </TabsContent>

          <TabsContent value="audit" className="mt-6 space-y-6">
            {/* Financial Year Selector for Admin Audit Logs */}
            <FinancialYearSelector
              value={financialYear}
              onChange={setFinancialYear}
            />
            <AdminAuditLogsReport financialYear={financialYear} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
