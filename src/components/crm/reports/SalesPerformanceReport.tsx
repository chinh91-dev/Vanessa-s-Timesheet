import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BarChart3, TrendingUp, DollarSign, Target, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface SalesPerformanceReportProps {
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

export const SalesPerformanceReport = forwardRef<any, SalesPerformanceReportProps>(({
  financialYear,
}, ref) => {
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => metrics
  }));

  useEffect(() => {
    const fetchSalesMetrics = async () => {
      setIsLoading(true);
      try {
        // Fetch deals closed (won/lost) within the FY using close_date
        const { data: deals, error } = await supabase
          .from("deals")
          .select("*, pipeline_stage:pipeline_stage_id(is_closed_won, is_closed_lost), owner:owner_id(id, full_name)")
          .gte("close_date", format(financialYear.from, "yyyy-MM-dd"))
          .lte("close_date", format(financialYear.to, "yyyy-MM-dd"))
          .not("close_date", "is", null);

        if (error) {
          console.error("Error fetching deals:", error);
          setMetrics(null);
          return;
        }

        // Calculate metrics
        const wonDeals = deals?.filter((d: any) => d.pipeline_stage?.is_closed_won) || [];
        const lostDeals = deals?.filter((d: any) => d.pipeline_stage?.is_closed_lost) || [];
        const totalDeals = deals?.length || 0;
        const totalRevenue = wonDeals.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const winRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;
        const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

        // Group by month
        const monthlyRevenue: { [key: string]: number } = {};
        wonDeals.forEach((deal: any) => {
          const period = format(new Date(deal.close_date), "MMM yyyy");
          monthlyRevenue[period] = (monthlyRevenue[period] || 0) + (Number(deal.amount) || 0);
        });

        const monthlyRevenueArray = Object.entries(monthlyRevenue).map(([period, revenue]) => ({
          period,
          revenue,
        }));

        // Group by salesperson
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

        const bySalespersonArray = Object.entries(bySalesperson).map(([id, data]) => ({
          id,
          ...data,
        }));

        setMetrics({
          totalRevenue,
          totalDeals,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          winRate,
          avgDealSize,
          monthlyRevenue: monthlyRevenueArray,
          bySalesperson: bySalespersonArray,
        });
      } catch (error) {
        console.error("Error calculating sales metrics:", error);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesMetrics();
  }, [financialYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Sales Performance - {getAustralianFYLabel(financialYear.from)}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue recognized by close_date within the financial year
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual Dashboard</TabsTrigger>
            <TabsTrigger value="tabular">Detailed Data</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ${metrics?.totalRevenue.toLocaleString() || 0}
                  </p>
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
                  <p className="text-2xl font-bold">
                    {metrics?.winRate.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.wonDeals} won / {metrics?.totalDeals} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Avg Deal Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ${metrics?.avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Deals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics?.totalDeals || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.lostDeals} lost
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
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
                    <BarChart data={metrics?.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="period" 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--foreground))" }}
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

            {/* Revenue by Salesperson */}
            {metrics?.bySalesperson && metrics.bySalesperson.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Revenue by Salesperson
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.bySalesperson
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((person) => (
                        <div key={person.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{person.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {person.deals} deals won
                            </p>
                          </div>
                          <p className="text-lg font-bold">
                            ${person.revenue.toLocaleString()}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tabular">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Period</th>
                          <th className="text-right p-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.monthlyRevenue.map((item) => (
                          <tr key={item.period} className="border-b">
                            <td className="p-2">{item.period}</td>
                            <td className="text-right p-2">
                              ${item.revenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-muted/50">
                          <td className="p-2">Total</td>
                          <td className="text-right p-2">
                            ${metrics?.totalRevenue.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {metrics?.bySalesperson && metrics.bySalesperson.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue by Salesperson</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Salesperson</th>
                            <th className="text-right p-2">Deals Won</th>
                            <th className="text-right p-2">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.bySalesperson
                            .sort((a, b) => b.revenue - a.revenue)
                            .map((person) => (
                              <tr key={person.id} className="border-b">
                                <td className="p-2">{person.name}</td>
                                <td className="text-right p-2">{person.deals}</td>
                                <td className="text-right p-2">
                                  ${person.revenue.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
