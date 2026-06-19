import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format, subYears } from "date-fns";
import { 
  BarChart3, TrendingUp, DollarSign, Target, Users, Trophy, 
  UserCheck, TrendingDown, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronRight 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface SalesOverviewReportProps {
  financialYear: DateRangeType;
}

interface SalesMetrics {
  totalRevenue: number;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  avgDealSize: number;
  monthlyRevenue: { period: string; revenue: number }[];
  bySalesperson: { id: string; name: string; revenue: number; deals: number }[];
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

interface QualifiedMetrics {
  totalQualified: number;
  totalFirstTimeQualified: number;
  bySalesperson: {
    id: string;
    name: string;
    qualified: number;
    firstTimeQualified: number;
    totalValue: number;
  }[];
}

interface LostMetrics {
  totalLost: number;
  totalLostPreviousYear: number;
  yoyChange: number;
  totalDealsLost: number;
  bySalesperson: {
    id: string;
    name: string;
    currentYear: number;
    previousYear: number;
    yoyChange: number;
    dealsLost: number;
  }[];
}

export const SalesOverviewReport = forwardRef<any, SalesOverviewReportProps>(({
  financialYear,
}, ref) => {
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [qualifiedMetrics, setQualifiedMetrics] = useState<QualifiedMetrics | null>(null);
  const [lostMetrics, setLostMetrics] = useState<LostMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [salesOpen, setSalesOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(true);
  const [qualifiedOpen, setQualifiedOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    getExportData: () => ({
      sales: salesMetrics,
      team: teamData,
      qualified: qualifiedMetrics,
      lost: lostMetrics,
    })
  }));

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd'T'23:59:59");
        const previousStart = format(subYears(financialYear.from, 1), "yyyy-MM-dd");
        const previousEnd = format(subYears(financialYear.to, 1), "yyyy-MM-dd");

        // Fetch all deals for the period (including primary_contact_id for first-time qualified tracking)
        const { data: deals } = await supabase
          .from("deals")
          .select(`
            id,
            amount,
            contract_value,
            close_date,
            created_at,
            primary_contact_id,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(id, name, is_closed_won, is_closed_lost, default_probability)
          `)
          .or(`close_date.gte.${startDate},created_at.gte.${startDate}`)
          .or(`close_date.lte.${endDate},created_at.lte.${endDate}`);

        // Previous year deals for YoY
        const { data: previousDeals } = await supabase
          .from("deals")
          .select(`
            id,
            amount,
            close_date,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(is_closed_lost)
          `)
          .gte("close_date", previousStart)
          .lte("close_date", previousEnd)
          .not("close_date", "is", null);

        // Fetch tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, assigned_to, status")
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        // Fetch contacts
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, owner_id")
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        // Get qualified stage
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("id, name")
          .ilike("name", "%qualified%");
        const qualifiedStageIds = stages?.map(s => s.id) || [];

        // ========== SALES METRICS ==========
        const closedDeals = deals?.filter((d: any) => 
          d.close_date && 
          d.close_date >= startDate && 
          d.close_date <= endDate
        ) || [];
        const wonDeals = closedDeals.filter((d: any) => d.pipeline_stage?.is_closed_won);
        const lostDeals = closedDeals.filter((d: any) => d.pipeline_stage?.is_closed_lost);
        const totalRevenue = wonDeals.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;
        const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

        // Monthly revenue
        const monthlyRevenue: { [key: string]: number } = {};
        wonDeals.forEach((deal: any) => {
          const period = format(new Date(deal.close_date), "MMM yyyy");
          monthlyRevenue[period] = (monthlyRevenue[period] || 0) + (Number(deal.amount) || 0);
        });

        // Revenue by salesperson
        const bySalesperson: { [key: string]: { name: string; revenue: number; deals: number } } = {};
        wonDeals.forEach((deal: any) => {
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          if (!bySalesperson[ownerId]) {
            bySalesperson[ownerId] = { name: ownerName, revenue: 0, deals: 0 };
          }
          bySalesperson[ownerId].revenue += Number(deal.amount) || 0;
          bySalesperson[ownerId].deals += 1;
        });

        setSalesMetrics({
          totalRevenue,
          totalDeals: closedDeals.length,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          winRate,
          avgDealSize,
          monthlyRevenue: Object.entries(monthlyRevenue).map(([period, revenue]) => ({ period, revenue })),
          bySalesperson: Object.entries(bySalesperson).map(([id, data]) => ({ id, ...data })),
        });

        // ========== TEAM PERFORMANCE ==========
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("is_active", true);

        const teamPerformance: TeamMember[] = [];
        if (users) {
          for (const user of users) {
            const userWonDeals = wonDeals.filter((d: any) => d.owner?.id === user.id);
            const userLostDeals = lostDeals.filter((d: any) => d.owner?.id === user.id);
            const userClosedDeals = userWonDeals.length + userLostDeals.length;
            const revenue = userWonDeals.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
            const userWinRate = userClosedDeals > 0 ? (userWonDeals.length / userClosedDeals) * 100 : 0;
            
            const userTasks = tasks?.filter((t: any) => t.assigned_to === user.id) || [];
            const tasksCompleted = userTasks.filter((t: any) => t.status === "completed").length;
            
            const userContacts = contacts?.filter((c: any) => c.owner_id === user.id) || [];
            const contactsCreated = userContacts.length;

            if (userWonDeals.length > 0 || tasksCompleted > 0 || contactsCreated > 0) {
              teamPerformance.push({
                userId: user.id,
                userName: user.full_name || user.email || "Unknown",
                revenue,
                dealsWon: userWonDeals.length,
                dealsLost: userLostDeals.length,
                winRate: userWinRate,
                tasksCompleted,
                contactsCreated,
              });
            }
          }
        }
        teamPerformance.sort((a, b) => b.revenue - a.revenue);
        setTeamData(teamPerformance);

        // ========== QUALIFIED DEALS (with First-Time tracking) ==========
        const qualifiedDeals = deals?.filter((d: any) => 
          qualifiedStageIds.includes(d.pipeline_stage?.id)
        ) || [];

        // Fetch existing customer names for first-time qualified check
        const { data: existingCustomers } = await supabase
          .from("customers")
          .select("name");

        const existingCustomerNames = new Set(
          existingCustomers?.map(c => c.name?.toLowerCase().trim()).filter(Boolean) || []
        );

        // Get contact IDs from qualified deals for first-time tracking
        const qualifiedContactIds = [...new Set(
          qualifiedDeals?.filter((d: any) => d.primary_contact_id).map((d: any) => d.primary_contact_id)
        )];

        let contactCompanyNames: { [key: string]: string } = {};
        let contactFirstDeal: { [key: string]: string } = {};

        if (qualifiedContactIds.length > 0) {
          // Fetch contact company names
          const { data: contactsData } = await supabase
            .from("contacts")
            .select("id, company_name")
            .in("id", qualifiedContactIds);

          contactsData?.forEach((c: any) => {
            if (c.company_name) {
              contactCompanyNames[c.id] = c.company_name;
            }
          });

          // Find first deal for each contact (to determine first-time qualification)
          const { data: allContactDeals } = await supabase
            .from("deals")
            .select("id, primary_contact_id, created_at")
            .in("primary_contact_id", qualifiedContactIds)
            .order("created_at", { ascending: true });

          allContactDeals?.forEach((d: any) => {
            if (d.primary_contact_id && !contactFirstDeal[d.primary_contact_id]) {
              contactFirstDeal[d.primary_contact_id] = d.id;
            }
          });
        }

        // Calculate qualified metrics with first-time tracking
        let totalFirstTimeQualified = 0;
        const qualifiedBySalesperson: { [key: string]: { name: string; qualified: number; firstTimeQualified: number; totalValue: number } } = {};
        
        qualifiedDeals.forEach((deal: any) => {
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          const dealValue = Number(deal.contract_value) || Number(deal.amount) || 0;
          
          if (!qualifiedBySalesperson[ownerId]) {
            qualifiedBySalesperson[ownerId] = { name: ownerName, qualified: 0, firstTimeQualified: 0, totalValue: 0 };
          }
          qualifiedBySalesperson[ownerId].qualified++;
          qualifiedBySalesperson[ownerId].totalValue += dealValue;

          // Check if first-time qualified (new prospect, not existing customer)
          const contactId = deal.primary_contact_id;
          if (contactId && contactFirstDeal[contactId] === deal.id) {
            const companyName = contactCompanyNames[contactId];
            const isExistingCustomer = companyName && 
              existingCustomerNames.has(companyName.toLowerCase().trim());
            
            if (!isExistingCustomer) {
              qualifiedBySalesperson[ownerId].firstTimeQualified++;
              totalFirstTimeQualified++;
            }
          }
        });

        setQualifiedMetrics({
          totalQualified: qualifiedDeals.length,
          totalFirstTimeQualified,
          bySalesperson: Object.entries(qualifiedBySalesperson).map(([id, data]) => ({ id, ...data })),
        });

        // ========== LOST DEALS ==========
        const previousLost = previousDeals?.filter((d: any) => d.pipeline_stage?.is_closed_lost) || [];
        const totalLost = lostDeals.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const totalLostPreviousYear = previousLost.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const yoyChange = totalLostPreviousYear > 0 ? ((totalLost - totalLostPreviousYear) / totalLostPreviousYear) * 100 : 0;

        const lostBySalespersonMap: { [key: string]: { name: string; current: number; previous: number; deals: number } } = {};
        lostDeals.forEach((deal: any) => {
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          if (!lostBySalespersonMap[ownerId]) {
            lostBySalespersonMap[ownerId] = { name: ownerName, current: 0, previous: 0, deals: 0 };
          }
          lostBySalespersonMap[ownerId].current += Number(deal.amount) || 0;
          lostBySalespersonMap[ownerId].deals++;
        });
        previousLost.forEach((deal: any) => {
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          if (!lostBySalespersonMap[ownerId]) {
            lostBySalespersonMap[ownerId] = { name: ownerName, current: 0, previous: 0, deals: 0 };
          }
          lostBySalespersonMap[ownerId].previous += Number(deal.amount) || 0;
        });

        setLostMetrics({
          totalLost,
          totalLostPreviousYear,
          yoyChange,
          totalDealsLost: lostDeals.length,
          bySalesperson: Object.entries(lostBySalespersonMap).map(([id, data]) => ({
            id,
            name: data.name,
            currentYear: data.current,
            previousYear: data.previous,
            yoyChange: data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : 0,
            dealsLost: data.deals,
          })),
        });

      } catch (error) {
        console.error("Error fetching sales overview data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [financialYear]);

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getYoYBadge = (change: number) => {
    if (change > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <ArrowUp className="h-3 w-3" />
          {change.toFixed(2)}%
        </Badge>
      );
    } else if (change < 0) {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200">
          <ArrowDown className="h-3 w-3" />
          {Math.abs(change).toFixed(2)}%
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Minus className="h-3 w-3" />
        0%
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
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

  return (
    <div className="space-y-4">
      {/* Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${salesMetrics?.totalRevenue.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{salesMetrics?.winRate.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">{salesMetrics?.wonDeals} won / {salesMetrics?.totalDeals} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Qualified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{qualifiedMetrics?.totalQualified || 0}</p>
            <p className="text-xs text-muted-foreground">
              {qualifiedMetrics?.totalFirstTimeQualified || 0} first-time (new prospects)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Lost Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(lostMetrics?.totalLost || 0).toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1">
              {getYoYBadge(lostMetrics?.yoyChange || 0)}
              <span className="text-xs text-muted-foreground">YoY</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Performance Section */}
      <Collapsible open={salesOpen} onOpenChange={setSalesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Performance - {getAustralianFYLabel(financialYear.from)}
                </span>
                {salesOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Revenue Chart */}
              {salesMetrics?.monthlyRevenue && salesMetrics.monthlyRevenue.length > 0 && (
                <ChartContainer
                  config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesMetrics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}

              {/* Revenue by Salesperson */}
              {salesMetrics?.bySalesperson && salesMetrics.bySalesperson.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Revenue by Salesperson
                  </h4>
                  {salesMetrics.bySalesperson.sort((a, b) => b.revenue - a.revenue).map((person) => (
                    <div key={person.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.deals} deals won</p>
                      </div>
                      <p className="text-lg font-bold">${person.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Team Leaderboard Section */}
      <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Team Leaderboard
                </span>
                {teamOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {teamData.length > 0 ? (
                <div className="space-y-4">
                  {teamData.slice(0, 5).map((member, index) => (
                    <div key={member.userId} className={`flex items-center gap-4 p-3 rounded-lg ${index === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
                      <div className="flex items-center gap-3 flex-1">
                        {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                        <Avatar>
                          <AvatarFallback>{getInitials(member.userName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{member.userName}</p>
                          <p className="text-sm text-muted-foreground">{member.dealsWon} deals won</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${member.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{member.winRate.toFixed(0)}% win rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No team data available</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Qualified Deals Section */}
      <Collapsible open={qualifiedOpen} onOpenChange={setQualifiedOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Qualified Deals ({qualifiedMetrics?.totalQualified || 0})
                </span>
                {qualifiedOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {qualifiedMetrics?.bySalesperson && qualifiedMetrics.bySalesperson.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {qualifiedMetrics.bySalesperson.sort((a, b) => b.qualified - a.qualified).map((person) => (
                    <Card key={person.id}>
                      <CardContent className="pt-4">
                        <p className="font-medium">{person.name}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Qualified</span>
                            <span className="font-bold">{person.qualified}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">First-Time</span>
                            <span className="font-bold">{person.firstTimeQualified}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Value</span>
                            <span className="font-bold">${person.totalValue.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No qualified deals in this period</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Lost Deals Section */}
      <Collapsible open={lostOpen} onOpenChange={setLostOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Lost Analysis (${(lostMetrics?.totalLost || 0).toLocaleString()})
                  {getYoYBadge(lostMetrics?.yoyChange || 0)}
                </span>
                {lostOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Current Year</p>
                    <p className="text-2xl font-bold">${(lostMetrics?.totalLost || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Previous Year</p>
                    <p className="text-2xl font-bold">${(lostMetrics?.totalLostPreviousYear || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Deals Lost</p>
                    <p className="text-2xl font-bold">{lostMetrics?.totalDealsLost || 0}</p>
                  </CardContent>
                </Card>
              </div>
              {lostMetrics?.bySalesperson && lostMetrics.bySalesperson.length > 0 && (
                <div className="space-y-3">
                  {lostMetrics.bySalesperson.sort((a, b) => b.currentYear - a.currentYear).map((person) => (
                    <div key={person.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.dealsLost} deals lost</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${person.currentYear.toLocaleString()}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">vs ${person.previousYear.toLocaleString()}</span>
                          {getYoYBadge(person.yoyChange)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});
