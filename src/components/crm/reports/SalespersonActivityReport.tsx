import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { Activity, TrendingUp, Users, BarChart3 } from "lucide-react";
import { PerformanceDateRangeSelector, DateRangeType } from "./PerformanceDateRangeSelector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

interface SalespersonActivity {
  userId: string;
  userName: string;
  totalActions: number;
  actionBreakdown: { action: string; count: number; label: string }[];
  recentActivities: AuditLog[];
}

const CRM_ACTIONS = [
  "deal_created",
  "deal_updated",
  "deal_stage_changed",
  "deal_won",
  "deal_lost",
  "contact_created",
  "contact_updated",
  "contact_qualified",
  "lead_created",
  "lead_qualified",
  "lead_converted",
  "account_created",
  "account_updated",
  "task_created",
  "task_updated",
  "task_completed",
  "meeting_created",
  "meeting_updated",
  "activity_logged",
  "service_added",
  "service_updated",
];

const ACTION_LABELS: Record<string, string> = {
  deal_created: "Deals Created",
  deal_updated: "Deals Updated",
  deal_stage_changed: "Stage Changes",
  deal_won: "Deals Won",
  deal_lost: "Deals Lost",
  contact_created: "Contacts Created",
  contact_updated: "Contacts Updated",
  contact_qualified: "Contacts Qualified",
  lead_created: "Leads Created",
  lead_qualified: "Leads Qualified",
  lead_converted: "Leads Converted",
  account_created: "Accounts Created",
  account_updated: "Accounts Updated",
  task_created: "Tasks Created",
  task_updated: "Tasks Updated",
  task_completed: "Tasks Completed",
  meeting_created: "Meetings Created",
  meeting_updated: "Meetings Updated",
  activity_logged: "Activities Logged",
  service_added: "Services Added",
  service_updated: "Services Updated",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface SalespersonActivityReportProps {
  className?: string;
}

export const SalespersonActivityReport = forwardRef<any, SalespersonActivityReportProps>(
  ({ className }, ref) => {
    const [dateRange, setDateRange] = useState<DateRangeType>({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    });
    const [activities, setActivities] = useState<SalespersonActivity[]>([]);
    const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useImperativeHandle(ref, () => ({
      getExportData: () => ({
        dateRange: {
          from: format(dateRange.from, "yyyy-MM-dd"),
          to: format(dateRange.to, "yyyy-MM-dd"),
        },
        activities,
        allLogs,
      }),
    }));

    useEffect(() => {
      const fetchActivityData = async () => {
        setIsLoading(true);
        try {
          const startDate = format(dateRange.from, "yyyy-MM-dd");
          const endDate = format(dateRange.to, "yyyy-MM-dd");

          const { data: auditLogs, error } = await supabase.rpc(
            "get_audit_logs_direct",
            {
              p_start_date: startDate,
              p_end_date: endDate,
              p_user_id: null,
            }
          );

          if (error) {
            console.error("Error fetching audit logs:", error);
            setActivities([]);
            setAllLogs([]);
            return;
          }

          // Filter for CRM actions only
          const crmLogs =
            auditLogs?.filter((log: AuditLog) =>
              CRM_ACTIONS.includes(log.action)
            ) || [];

          setAllLogs(crmLogs);

          // Group by user
          const userMap = new Map<string, SalespersonActivity>();

          crmLogs.forEach((log: AuditLog) => {
            if (!userMap.has(log.user_id)) {
              userMap.set(log.user_id, {
                userId: log.user_id,
                userName: log.user_name || "Unknown User",
                totalActions: 0,
                actionBreakdown: [],
                recentActivities: [],
              });
            }

            const userActivity = userMap.get(log.user_id)!;
            userActivity.totalActions++;
            userActivity.recentActivities.push(log);

            // Update action breakdown
            const existingAction = userActivity.actionBreakdown.find(
              (a) => a.action === log.action
            );
            if (existingAction) {
              existingAction.count++;
            } else {
              userActivity.actionBreakdown.push({
                action: log.action,
                count: 1,
                label: ACTION_LABELS[log.action] || log.action,
              });
            }
          });

          // Sort by total actions descending
          const sortedActivities = Array.from(userMap.values()).sort(
            (a, b) => b.totalActions - a.totalActions
          );

          // Sort action breakdowns by count
          sortedActivities.forEach((activity) => {
            activity.actionBreakdown.sort((a, b) => b.count - a.count);
            activity.recentActivities.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );
          });

          setActivities(sortedActivities);
        } catch (error) {
          console.error("Error in fetchActivityData:", error);
          setActivities([]);
          setAllLogs([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchActivityData();
    }, [dateRange]);

    const totalActions = activities.reduce((sum, a) => sum + a.totalActions, 0);
    const mostActiveUser = activities[0];

    // Prepare chart data
    const chartData = activities.slice(0, 10).map((activity) => ({
      name: activity.userName.split(" ")[0],
      fullName: activity.userName,
      actions: activity.totalActions,
    }));

    // Action type summary across all users
    const actionSummary = new Map<string, number>();
    allLogs.forEach((log) => {
      actionSummary.set(log.action, (actionSummary.get(log.action) || 0) + 1);
    });
    const topActions = Array.from(actionSummary.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return (
      <div className={className}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Salesperson Performance Report
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track CRM activity and updates by salesperson
            </p>
          </CardHeader>
          <CardContent>
            <PerformanceDateRangeSelector
              value={dateRange}
              onChange={setDateRange}
            />
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Actions
                      </p>
                      <p className="text-2xl font-bold">{totalActions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <Users className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Active Users
                      </p>
                      <p className="text-2xl font-bold">{activities.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/10">
                      <BarChart3 className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Most Active
                      </p>
                      <p className="text-lg font-bold truncate">
                        {mostActiveUser?.userName || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Actions Summary */}
            {topActions.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Top Action Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {topActions.map(([action, count]) => (
                      <Badge
                        key={action}
                        variant="secondary"
                        className="text-sm py-1 px-3"
                      >
                        {ACTION_LABELS[action] || action}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Actions by Salesperson
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg shadow-lg p-3">
                                  <p className="font-medium">{data.fullName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {data.actions} actions
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="actions" radius={[0, 4, 4, 0]}>
                          {chartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Details</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No CRM activity found for the selected period.</p>
                    <p className="text-sm mt-1">
                      Try selecting a different date range.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activities.map((activity) => (
                      <div
                        key={activity.userId}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-semibold text-primary">
                                {activity.userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">
                                {activity.userName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {activity.totalActions} total actions
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {activity.actionBreakdown.slice(0, 3).map((ab) => (
                              <Badge
                                key={ab.action}
                                variant="outline"
                                className="text-xs"
                              >
                                {ab.label}: {ab.count}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {activity.recentActivities.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activity.recentActivities
                                .slice(0, 5)
                                .map((log) => (
                                  <TableRow key={log.id}>
                                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                      {format(
                                        new Date(log.created_at),
                                        "HH:mm"
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="text-xs">
                                        {ACTION_LABELS[log.action] || log.action}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {log.entity_name || "-"}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                      {log.description || "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        )}
                        {activity.recentActivities.length > 5 && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            +{activity.recentActivities.length - 5} more
                            activities
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }
);

SalespersonActivityReport.displayName = "SalespersonActivityReport";
