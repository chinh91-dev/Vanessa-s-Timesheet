import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { ListTodo, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface ActivitiesReportProps {
  financialYear: DateRangeType;
}

interface TaskMetrics {
  totalTasks: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byAssignee: { userName: string; total: number; completed: number; completionRate: number }[];
  avgCompletionDays: number;
}

export const ActivitiesReport = forwardRef<any, ActivitiesReportProps>(({
  financialYear,
}, ref) => {
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => metrics
  }));

  useEffect(() => {
    const fetchTaskMetrics = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd'T'23:59:59");

        // Fetch tasks created within the FY with assignee info
        const { data: tasks, error } = await supabase
          .from("tasks")
          .select(`
            id,
            status,
            priority,
            assigned_to,
            created_at,
            updated_at,
            assignee:assigned_to(id, full_name, email)
          `)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (error) {
          console.error("Error fetching tasks:", error);
          setMetrics(null);
          return;
        }

        const totalTasks = tasks?.length || 0;

        // Group by status
        const byStatus: { [key: string]: number } = {};
        tasks?.forEach((task: any) => {
          const status = task.status || "pending";
          byStatus[status] = (byStatus[status] || 0) + 1;
        });

        const byStatusArray = Object.entries(byStatus).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
          count,
        }));

        // Group by priority
        const byPriority: { [key: string]: number } = {};
        tasks?.forEach((task: any) => {
          const priority = task.priority || "medium";
          byPriority[priority] = (byPriority[priority] || 0) + 1;
        });

        const byPriorityArray = Object.entries(byPriority).map(([priority, count]) => ({
          priority: priority.charAt(0).toUpperCase() + priority.slice(1),
          count,
        }));

        // Group by assignee
        const byAssignee: { [key: string]: { total: number; completed: number; userId: string } } = {};
        tasks?.forEach((task: any) => {
          const userName = task.assignee?.full_name || task.assignee?.email || "Unassigned";
          const userId = task.assigned_to || "unassigned";
          
          if (!byAssignee[userName]) {
            byAssignee[userName] = { total: 0, completed: 0, userId };
          }
          byAssignee[userName].total++;
          if (task.status === "completed") {
            byAssignee[userName].completed++;
          }
        });

        const byAssigneeArray = Object.entries(byAssignee)
          .map(([userName, data]) => ({
            userName,
            total: data.total,
            completed: data.completed,
            completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
          }))
          .sort((a, b) => b.completed - a.completed);

        // Calculate average completion time for completed tasks
        const completedTasks = tasks?.filter((t: any) => t.status === "completed") || [];
        let avgCompletionDays = 0;
        if (completedTasks.length > 0) {
          const totalDays = completedTasks.reduce((sum: number, task: any) => {
            const created = new Date(task.created_at);
            const updated = new Date(task.updated_at);
            return sum + differenceInDays(updated, created);
          }, 0);
          avgCompletionDays = totalDays / completedTasks.length;
        }

        setMetrics({
          totalTasks,
          byStatus: byStatusArray,
          byPriority: byPriorityArray,
          byAssignee: byAssigneeArray,
          avgCompletionDays,
        });
      } catch (error) {
        console.error("Error calculating task metrics:", error);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskMetrics();
  }, [financialYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Activity Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const statusColors: { [key: string]: string } = {
    "Pending": "hsl(var(--chart-1))",
    "In progress": "hsl(var(--chart-2))",
    "Completed": "hsl(var(--chart-3))",
    "Cancelled": "hsl(var(--chart-4))",
  };

  const priorityColors: { [key: string]: string } = {
    "Low": "hsl(var(--chart-3))",
    "Medium": "hsl(var(--chart-2))",
    "High": "hsl(var(--chart-1))",
    "Urgent": "hsl(var(--destructive))",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          Task Activity Report - {getAustralianFYLabel(financialYear.from)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tasks created within the financial year
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual Dashboard</TabsTrigger>
            <TabsTrigger value="tabular">Detailed Data</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                  </div>
                  <p className="text-3xl font-bold">{metrics?.totalTasks || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <p className="text-3xl font-bold">
                    {metrics?.byStatus.find(s => s.status === "Completed")?.count || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Avg Completion</p>
                  </div>
                  <p className="text-3xl font-bold">
                    {metrics?.avgCompletionDays.toFixed(2) || 0} days
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tasks by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      pending: { label: "Pending", color: "hsl(var(--chart-1))" },
                      "in progress": { label: "In Progress", color: "hsl(var(--chart-2))" },
                      completed: { label: "Completed", color: "hsl(var(--chart-3))" },
                      cancelled: { label: "Cancelled", color: "hsl(var(--chart-4))" },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics?.byStatus.map(item => ({ name: item.status, value: item.count }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {metrics?.byStatus.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={statusColors[entry.status] || `hsl(var(--chart-${(index % 5) + 1}))`}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Tasks by Priority */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      low: { label: "Low", color: "hsl(var(--chart-3))" },
                      medium: { label: "Medium", color: "hsl(var(--chart-2))" },
                      high: { label: "High", color: "hsl(var(--chart-1))" },
                      urgent: { label: "Urgent", color: "hsl(var(--destructive))" },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics?.byPriority.map(item => ({ name: item.priority, value: item.count }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {metrics?.byPriority.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={priorityColors[entry.priority] || `hsl(var(--chart-${(index % 5) + 1}))`}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Task Completion by Assignee */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Completion by Team Member</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics?.byAssignee && metrics.byAssignee.length > 0 ? (
                  <ChartContainer
                    config={{
                      completed: { label: "Completed", color: "hsl(var(--chart-3))" },
                      pending: { label: "Pending", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={metrics?.byAssignee.map(a => ({
                          ...a,
                          pending: a.total - a.completed
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fill: "hsl(var(--foreground))" }} />
                        <YAxis 
                          type="category" 
                          dataKey="userName" 
                          tick={{ fill: "hsl(var(--foreground))" }}
                          width={120}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-3))" name="Completed" />
                        <Bar dataKey="pending" stackId="a" fill="hsl(var(--chart-1))" name="Pending" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No assignee data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tabular">
            <div className="space-y-6">
              {/* Status Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Status</th>
                          <th className="text-right p-2">Count</th>
                          <th className="text-right p-2">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.byStatus.map((item) => (
                          <tr key={item.status} className="border-b">
                            <td className="p-2">{item.status}</td>
                            <td className="text-right p-2">{item.count}</td>
                            <td className="text-right p-2">
                              {((item.count / (metrics?.totalTasks || 1)) * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Assignee Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance by Assignee</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Team Member</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Completed</th>
                          <th className="text-right p-2">Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.byAssignee.map((item) => (
                          <tr key={item.userName} className="border-b">
                            <td className="p-2">{item.userName}</td>
                            <td className="text-right p-2">{item.total}</td>
                            <td className="text-right p-2">{item.completed}</td>
                            <td className="text-right p-2">{item.completionRate.toFixed(2)}%</td>
                          </tr>
                        ))}
                        {(!metrics?.byAssignee || metrics.byAssignee.length === 0) && (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-muted-foreground">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
