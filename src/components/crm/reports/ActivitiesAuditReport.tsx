import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ListChecks, FileText, CheckCircle2, Clock, Users, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import AuditLogsTable from "@/components/reports/AuditLogsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActivitiesAuditReportProps {
  financialYear: DateRangeType;
}

interface TaskMetrics {
  totalTasks: number;
  byStatus: { status: string; count: number; percentage: number }[];
  byPriority: { priority: string; count: number; percentage: number }[];
  byAssignee: { id: string; name: string; total: number; completed: number; completionRate: number }[];
  avgCompletionDays: number;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_name: string | null;
  description: string | null;
  details: any;
  created_at: string;
  user_name: string | null;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

const STATUS_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const PRIORITY_COLORS = [
  "hsl(var(--destructive))",
  "hsl(var(--warning, 38 92% 50%))",
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
];

export const ActivitiesAuditReport = forwardRef<any, ActivitiesAuditReportProps>(({
  financialYear,
}, ref) => {
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [auditData, setAuditData] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("activities");

  useImperativeHandle(ref, () => ({
    getExportData: () => ({
      tasks: taskMetrics,
      auditLogs: auditData,
    })
  }));

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd'T'23:59:59");

        // Fetch tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select(`
            id,
            status,
            priority,
            assigned_to,
            created_at,
            completed_at,
            assignee:assigned_to(id, full_name)
          `)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        // Fetch users
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email");
        
        if (profilesData) {
          setUsers(profilesData);
        }

        // ========== TASK METRICS ==========
        const totalTasks = tasks?.length || 0;
        
        // By Status
        const statusMap: { [key: string]: number } = {};
        tasks?.forEach((t: any) => {
          const status = t.status || "unknown";
          statusMap[status] = (statusMap[status] || 0) + 1;
        });
        const byStatus = Object.entries(statusMap).map(([status, count]) => ({
          status,
          count,
          percentage: totalTasks > 0 ? (count / totalTasks) * 100 : 0,
        }));

        // By Priority
        const priorityMap: { [key: string]: number } = {};
        tasks?.forEach((t: any) => {
          const priority = t.priority || "medium";
          priorityMap[priority] = (priorityMap[priority] || 0) + 1;
        });
        const byPriority = Object.entries(priorityMap).map(([priority, count]) => ({
          priority,
          count,
          percentage: totalTasks > 0 ? (count / totalTasks) * 100 : 0,
        }));

        // By Assignee
        const assigneeMap: { [key: string]: { name: string; total: number; completed: number } } = {};
        tasks?.forEach((t: any) => {
          const assigneeId = t.assigned_to || 'unassigned';
          const assigneeName = t.assignee?.full_name || 'Unassigned';
          if (!assigneeMap[assigneeId]) {
            assigneeMap[assigneeId] = { name: assigneeName, total: 0, completed: 0 };
          }
          assigneeMap[assigneeId].total++;
          if (t.status === "completed") {
            assigneeMap[assigneeId].completed++;
          }
        });
        const byAssignee = Object.entries(assigneeMap).map(([id, data]) => ({
          id,
          ...data,
          completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
        }));

        // Average completion days
        const completedTasks = tasks?.filter((t: any) => t.status === "completed" && t.completed_at) || [];
        let totalDays = 0;
        completedTasks.forEach((t: any) => {
          const created = new Date(t.created_at);
          const completed = new Date(t.completed_at);
          const days = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          totalDays += days;
        });
        const avgCompletionDays = completedTasks.length > 0 ? totalDays / completedTasks.length : 0;

        setTaskMetrics({
          totalTasks,
          byStatus,
          byPriority,
          byAssignee,
          avgCompletionDays,
        });

        // ========== AUDIT LOGS ==========
        const { data: logs } = await supabase
          .rpc("get_audit_logs_direct")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: false })
          .limit(100);

        // Filter for CRM-specific actions
        const crmActions = [
          'deal_created', 'deal_updated', 'deal_deleted', 'deal_stage_changed',
          'contact_created', 'contact_updated', 'contact_deleted', 'contact_qualified', 'contact_disqualified',
          'account_created', 'account_updated', 'account_deleted',
          'task_created', 'task_updated', 'task_deleted', 'task_completed',
          'meeting_created', 'meeting_updated', 'meeting_deleted',
          'proposal_uploaded', 'proposal_signed',
        ];

        const filteredLogs = logs?.filter((log: any) => 
          crmActions.includes(log.action) || 
          log.action.startsWith('deal_') || 
          log.action.startsWith('contact_') ||
          log.action.startsWith('account_') ||
          log.action.startsWith('task_') ||
          log.action.startsWith('meeting_')
        ) || [];

        setAuditData(filteredLogs);

      } catch (error) {
        console.error("Error fetching activities and audit data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [financialYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activities & Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = taskMetrics?.byStatus.find(s => s.status === "completed")?.count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Activities & Audit - {getAustralianFYLabel(financialYear.from)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="activities" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <ListChecks className="h-4 w-4" />
                    Total Tasks
                  </div>
                  <p className="text-3xl font-bold">{taskMetrics?.totalTasks || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Completed
                  </div>
                  <p className="text-3xl font-bold">{completedCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    Avg Completion
                  </div>
                  <p className="text-3xl font-bold">{taskMetrics?.avgCompletionDays.toFixed(2) || 0}d</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tasks by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {taskMetrics?.byStatus && taskMetrics.byStatus.length > 0 ? (
                    <ChartContainer
                      config={{ count: { label: "Count", color: "hsl(var(--primary))" } }}
                      className="h-[200px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskMetrics.byStatus}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ status, percentage }) => `${status} (${percentage.toFixed(0)}%)`}
                          >
                            {taskMetrics.byStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No task data</p>
                  )}
                </CardContent>
              </Card>

              {/* Tasks by Priority */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  {taskMetrics?.byPriority && taskMetrics.byPriority.length > 0 ? (
                    <ChartContainer
                      config={{ count: { label: "Count", color: "hsl(var(--primary))" } }}
                      className="h-[200px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskMetrics.byPriority}
                            dataKey="count"
                            nameKey="priority"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ priority, percentage }) => `${priority} (${percentage.toFixed(0)}%)`}
                          >
                            {taskMetrics.byPriority.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No task data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Task Completion by Assignee */}
            {taskMetrics?.byAssignee && taskMetrics.byAssignee.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Task Completion by Team Member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ completed: { label: "Completed", color: "hsl(var(--chart-2))" } }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskMetrics.byAssignee.sort((a, b) => b.completed - a.completed)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="name" 
                          className="text-xs" 
                          tick={{ fill: "hsl(var(--foreground))" }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number, name: string, props: any) => [
                            `${value} (${props.payload.completionRate.toFixed(0)}% completion rate)`,
                            name === "completed" ? "Completed" : "Total"
                          ]}
                        />
                        <Bar dataKey="completed" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} name="Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  {/* Assignee Table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Team Member</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Completed</th>
                          <th className="text-right p-2">Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskMetrics.byAssignee.sort((a, b) => b.completionRate - a.completionRate).map((person) => (
                          <tr key={person.id} className="border-b">
                            <td className="p-2">{person.name}</td>
                            <td className="text-right p-2">{person.total}</td>
                            <td className="text-right p-2">{person.completed}</td>
                            <td className="text-right p-2">{person.completionRate.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="audit">
            {auditData.length > 0 ? (
              <AuditLogsTable 
                auditData={auditData} 
                users={users} 
                isLoading={false} 
              />
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No CRM activity logged for this period.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
