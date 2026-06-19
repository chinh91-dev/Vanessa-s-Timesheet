import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AuditLogsTable from "@/components/reports/AuditLogsTable";
import { supabase } from "@/integrations/supabase/client";
import { DateRangeType } from "@/lib/crm/financial-year-utils";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

interface CRMAuditLogsReportProps {
  financialYear: DateRangeType;
  userId?: string | null;
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

export const CRMAuditLogsReport = forwardRef<any, CRMAuditLogsReportProps>(({
  financialYear,
  userId,
}, ref) => {
  const { user } = useAuth();
  const [auditData, setAuditData] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => auditData
  }));

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd");

        const { data: auditLogs, error } = await supabase.rpc(
          "get_audit_logs_direct",
          {
            p_start_date: startDate,
            p_end_date: endDate,
            p_user_id: userId || null,
          }
        );

        if (error) {
          // Handle permission denied gracefully
          if (error.message?.includes('Access denied')) {
            console.warn("User doesn't have permission to view these audit logs");
          } else {
            console.error("Error fetching audit logs:", error);
          }
          setAuditData([]);
        } else {
          // Filter for CRM-specific actions
          const crmActions = [
            "lead_created",
            "lead_qualified",
            "lead_converted",
            "lead_lost",
            "deal_created",
            "deal_updated",
            "deal_won",
            "deal_lost",
            "account_created",
            "account_updated",
            "activity_logged",
            "meeting_scheduled",
            "task_created",
            "service_added",
            "service_updated",
          ];

          const filteredLogs = auditLogs?.filter((log: AuditLog) =>
            crmActions.includes(log.action)
          ) || [];

          setAuditData(filteredLogs);
        }

        // Fetch users for display from profiles table
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("is_active", true);
        setUsers(usersData?.map(u => ({ id: u.id, name: u.full_name || u.email, email: u.email })) || []);
      } catch (error) {
        console.error("Error in fetchAuditLogs:", error);
        setAuditData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, [financialYear, userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CRM Audit Logs</CardTitle>
        <p className="text-sm text-muted-foreground">
          All CRM activities and changes for{" "}
          {format(financialYear.from, "d MMM yyyy")} -{" "}
          {format(financialYear.to, "d MMM yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        {!isLoading && auditData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No CRM activity logged yet.</p>
            <p className="text-sm mt-1">Activities will appear here as you create leads, deals, accounts, and tasks.</p>
          </div>
        ) : (
          <AuditLogsTable
            auditData={auditData}
            users={users}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
});
