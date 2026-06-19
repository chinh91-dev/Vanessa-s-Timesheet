import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Users, Trophy, TrendingUp, CheckCircle2, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface TeamPerformanceReportProps {
  financialYear: DateRangeType;
}

interface TeamMember {
  userId: string;
  userName: string;
  revenue: number;
  dealsWon: number;
  dealsLost: number;
  winRate: number;
  tasksCompleted: number;
  contactsCreated: number;
}

export const TeamPerformanceReport = forwardRef<any, TeamPerformanceReportProps>(({
  financialYear,
}, ref) => {
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => teamData
  }));

  useEffect(() => {
    const fetchTeamPerformance = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd'T'23:59:59");

        // Fetch all sales users from profiles with user_roles
        const { data: users } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            email
          `)
          .eq("is_active", true);

        if (!users || users.length === 0) {
          setTeamData([]);
          return;
        }

        // Fetch all deals with pipeline stage info for the period
        const { data: allDeals } = await supabase
          .from("deals")
          .select(`
            id,
            owner_id,
            created_by,
            amount,
            contract_value,
            created_at,
            pipeline_stage:pipeline_stage_id(is_closed_won, is_closed_lost)
          `)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        // Fetch all tasks for the period
        const { data: allTasks } = await supabase
          .from("tasks")
          .select("id, assigned_to, status, created_at")
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        // Fetch all contacts for the period
        const { data: allContacts } = await supabase
          .from("contacts")
          .select("id, owner_id, created_at")
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        const teamPerformance: TeamMember[] = [];

        for (const user of users) {
          // Filter deals owned by this user
          const userDeals = allDeals?.filter((d: any) => d.owner_id === user.id || d.created_by === user.id) || [];
          const wonDeals = userDeals.filter((d: any) => d.pipeline_stage?.is_closed_won === true);
          const lostDeals = userDeals.filter((d: any) => d.pipeline_stage?.is_closed_lost === true);
          const closedDeals = wonDeals.length + lostDeals.length;
          
          const revenue = wonDeals.reduce(
            (sum: number, d: any) => sum + (Number(d.contract_value) || Number(d.amount) || 0),
            0
          );
          const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;

          // Filter tasks assigned to this user
          const userTasks = allTasks?.filter((t: any) => t.assigned_to === user.id) || [];
          const tasksCompleted = userTasks.filter((t: any) => t.status === "completed").length;

          // Filter contacts owned by this user
          const userContacts = allContacts?.filter((c: any) => c.owner_id === user.id) || [];
          const contactsCreated = userContacts.length;

          // Only include users with some activity
          if (userDeals.length > 0 || tasksCompleted > 0 || contactsCreated > 0) {
            teamPerformance.push({
              userId: user.id,
              userName: user.full_name || user.email || "Unknown",
              revenue,
              dealsWon: wonDeals.length,
              dealsLost: lostDeals.length,
              winRate,
              tasksCompleted,
              contactsCreated,
            });
          }
        }

        // Sort by revenue descending
        teamPerformance.sort((a, b) => b.revenue - a.revenue);
        setTeamData(teamPerformance);
      } catch (error) {
        console.error("Error fetching team performance:", error);
        setTeamData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamPerformance();
  }, [financialYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Performance - {getAustralianFYLabel(financialYear.from)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          User metrics based on deals, tasks, and contacts
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Leaderboard</TabsTrigger>
            <TabsTrigger value="tabular">Detailed Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            {/* Revenue Comparison Chart */}
            {teamData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Revenue",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="userName" 
                          className="text-xs"
                          tick={{ fill: "hsl(var(--foreground))" }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: "hsl(var(--foreground))" }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="hsl(var(--primary))" 
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Team Member Cards */}
            {teamData.map((member, index) => (
              <Card key={member.userId} className={index === 0 ? "border-primary" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                      <Avatar>
                        <AvatarFallback>{getInitials(member.userName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{member.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.dealsWon} deals won
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        ${member.revenue.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap justify-end">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {member.winRate.toFixed(0)}% win rate
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {member.tasksCompleted} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          {member.contactsCreated} contacts
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {teamData.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No team performance data available for this period
              </div>
            )}
          </TabsContent>

          <TabsContent value="tabular">
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Team Member</th>
                        <th className="text-right p-2">Revenue</th>
                        <th className="text-right p-2">Won</th>
                        <th className="text-right p-2">Lost</th>
                        <th className="text-right p-2">Win Rate</th>
                        <th className="text-right p-2">Tasks Done</th>
                        <th className="text-right p-2">Contacts Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.map((member) => (
                        <tr key={member.userId} className="border-b">
                          <td className="p-2">{member.userName}</td>
                          <td className="text-right p-2">
                            ${member.revenue.toLocaleString()}
                          </td>
                          <td className="text-right p-2">{member.dealsWon}</td>
                          <td className="text-right p-2">{member.dealsLost}</td>
                          <td className="text-right p-2">
                            {member.winRate.toFixed(2)}%
                          </td>
                          <td className="text-right p-2">{member.tasksCompleted}</td>
                          <td className="text-right p-2">{member.contactsCreated}</td>
                        </tr>
                      ))}
                      {teamData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
