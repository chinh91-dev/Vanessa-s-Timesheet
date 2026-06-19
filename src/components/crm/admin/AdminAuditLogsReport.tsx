import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AuditLogsTable from "@/components/reports/AuditLogsTable";
import { supabase } from "@/integrations/supabase/client";
import { DateRangeType } from "@/lib/crm/financial-year-utils";
import { format } from "date-fns";
import { Shield } from "lucide-react";

interface AdminAuditLogsReportProps {
  financialYear: DateRangeType;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_name: string | null;
  description: string | null;
  details: any;
  created_at: string;
}

export const AdminAuditLogsReport = ({
  financialYear,
}: AdminAuditLogsReportProps) => {
  const [auditData, setAuditData] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminAuditLogs = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd");

        const { data: auditLogs, error } = await supabase.rpc(
          "get_audit_logs_direct",
          {
            p_start_date: startDate,
            p_end_date: endDate,
            p_user_id: null,
          }
        );

        if (error) {
          // Handle permission denied gracefully
          if (error.message?.includes('Access denied')) {
            console.warn("User doesn't have permission to view admin audit logs");
          } else {
            console.error("Error fetching admin audit logs:", error);
          }
          setAuditData([]);
        } else {
          // Filter for admin-specific actions
          const adminActions = [
            "pipeline_stage_created",
            "pipeline_stage_updated",
            "pipeline_stage_deleted",
            "service_created",
            "service_updated",
            "service_archived",
            "user_permission_changed",
            "bulk_import_executed",
            "records_merged",
            "integration_configured",
            "system_setting_changed",
          ];

          const filteredLogs = auditLogs?.filter((log: AuditLog) =>
            adminActions.includes(log.action)
          ) || [];

          setAuditData(filteredLogs);
        }

        // Fetch users for display
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name, email");
        setUsers(usersData || []);
      } catch (error) {
        console.error("Error in fetchAdminAuditLogs:", error);
        setAuditData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminAuditLogs();
  }, [financialYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Audit Logs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Administrative actions and system changes for{" "}
          {format(financialYear.from, "d MMM yyyy")} -{" "}
          {format(financialYear.to, "d MMM yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        <AuditLogsTable
          auditData={auditData}
          users={users}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};
