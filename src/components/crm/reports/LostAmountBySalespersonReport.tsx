import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format, subYears } from "date-fns";
import { TrendingDown, Calendar, Users, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";

interface LostAmountBySalespersonReportProps {
  financialYear: DateRangeType;
}

interface MonthlyLostData {
  period: string;
  amount: number;
  previousYearAmount: number;
  yoyChange: number;
}

interface SalespersonLostData {
  id: string;
  name: string;
  currentYear: number;
  previousYear: number;
  yoyChange: number;
  dealsLost: number;
}

interface LostMetrics {
  totalLost: number;
  totalLostPreviousYear: number;
  yoyChange: number;
  totalDealsLost: number;
  monthlyData: MonthlyLostData[];
  bySalesperson: SalespersonLostData[];
}

type ViewMode = 'monthly' | 'yearly';

export const LostAmountBySalespersonReport = forwardRef<any, LostAmountBySalespersonReportProps>(({
  financialYear,
}, ref) => {
  const [metrics, setMetrics] = useState<LostMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  useImperativeHandle(ref, () => ({
    getExportData: () => ({
      ...metrics,
      viewMode
    })
  }));

  useEffect(() => {
    const fetchLostMetrics = async () => {
      setIsLoading(true);
      try {
        // Define date ranges
        const currentStart = format(financialYear.from, "yyyy-MM-dd");
        const currentEnd = format(financialYear.to, "yyyy-MM-dd");
        const previousStart = format(subYears(financialYear.from, 1), "yyyy-MM-dd");
        const previousEnd = format(subYears(financialYear.to, 1), "yyyy-MM-dd");

        // Fetch current year lost deals
        const { data: currentDeals, error: currentError } = await supabase
          .from("deals")
          .select(`
            id,
            amount,
            contract_value,
            close_date,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(is_closed_lost)
          `)
          .gte("close_date", currentStart)
          .lte("close_date", currentEnd)
          .not("close_date", "is", null);

        // Fetch previous year lost deals
        const { data: previousDeals, error: previousError } = await supabase
          .from("deals")
          .select(`
            id,
            amount,
            contract_value,
            close_date,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(is_closed_lost)
          `)
          .gte("close_date", previousStart)
          .lte("close_date", previousEnd)
          .not("close_date", "is", null);

        if (currentError || previousError) {
          console.error("Error fetching deals:", currentError || previousError);
          setMetrics(null);
          return;
        }

        // Filter for lost deals only
        const currentLost = currentDeals?.filter((d: any) => d.pipeline_stage?.is_closed_lost) || [];
        const previousLost = previousDeals?.filter((d: any) => d.pipeline_stage?.is_closed_lost) || [];

        // Calculate totals
        const totalLost = currentLost.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const totalLostPreviousYear = previousLost.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const yoyChange = totalLostPreviousYear > 0 
          ? ((totalLost - totalLostPreviousYear) / totalLostPreviousYear) * 100 
          : 0;

        // Group by period
        const periodData: { [key: string]: { current: number; previous: number } } = {};
        
        if (viewMode === 'monthly') {
          currentLost.forEach((deal: any) => {
            const period = format(new Date(deal.close_date), "MMM yyyy");
            if (!periodData[period]) periodData[period] = { current: 0, previous: 0 };
            periodData[period].current += Number(deal.amount) || 0;
          });
          previousLost.forEach((deal: any) => {
            const period = format(new Date(deal.close_date), "MMM yyyy");
            if (!periodData[period]) periodData[period] = { current: 0, previous: 0 };
            periodData[period].previous += Number(deal.amount) || 0;
          });
        } else {
          currentLost.forEach((deal: any) => {
            const period = format(new Date(deal.close_date), "yyyy");
            if (!periodData[period]) periodData[period] = { current: 0, previous: 0 };
            periodData[period].current += Number(deal.amount) || 0;
          });
          previousLost.forEach((deal: any) => {
            const period = format(new Date(deal.close_date), "yyyy");
            if (!periodData[period]) periodData[period] = { current: 0, previous: 0 };
            periodData[period].previous += Number(deal.amount) || 0;
          });
        }

        const monthlyData = Object.entries(periodData).map(([period, data]) => ({
          period,
          amount: data.current,
          previousYearAmount: data.previous,
          yoyChange: data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : 0,
        }));

        // Group by salesperson
        const bySalespersonMap: { [key: string]: { name: string; current: number; previous: number; deals: number } } = {};
        
        currentLost.forEach((deal: any) => {
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          if (!bySalespersonMap[ownerId]) {
            bySalespersonMap[ownerId] = { name: ownerName, current: 0, previous: 0, deals: 0 };
          }
          bySalespersonMap[ownerId].current += Number(deal.amount) || 0;
          bySalespersonMap[ownerId].deals++;
        });

        previousLost.forEach((deal: any) => {
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          if (!bySalespersonMap[ownerId]) {
            bySalespersonMap[ownerId] = { name: ownerName, current: 0, previous: 0, deals: 0 };
          }
          bySalespersonMap[ownerId].previous += Number(deal.amount) || 0;
        });

        const bySalesperson = Object.entries(bySalespersonMap).map(([id, data]) => ({
          id,
          name: data.name,
          currentYear: data.current,
          previousYear: data.previous,
          yoyChange: data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : 0,
          dealsLost: data.deals,
        }));

        setMetrics({
          totalLost,
          totalLostPreviousYear,
          yoyChange,
          totalDealsLost: currentLost.length,
          monthlyData,
          bySalesperson,
        });
      } catch (error) {
        console.error("Error calculating lost metrics:", error);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLostMetrics();
  }, [financialYear, viewMode]);

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
          <CardTitle>Lost Amount by Salesperson</CardTitle>
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
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Lost Amount by Salesperson - {getAustralianFYLabel(financialYear.from)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lost deal analysis with Year-over-Year comparison
            </p>
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
            <ToggleGroupItem value="monthly" aria-label="Monthly view" className="gap-1">
              <Calendar className="h-4 w-4" />
              Monthly
            </ToggleGroupItem>
            <ToggleGroupItem value="yearly" aria-label="Yearly view" className="gap-1">
              <Calendar className="h-4 w-4" />
              Yearly
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual Dashboard</TabsTrigger>
            <TabsTrigger value="tabular">Detailed Data</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingDown className="h-4 w-4" />
                    Total Lost (Current)
                  </div>
                  <p className="text-3xl font-bold">${(metrics?.totalLost || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Previous Year</div>
                  <p className="text-3xl font-bold">${(metrics?.totalLostPreviousYear || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">YoY Change</div>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{Math.abs(metrics?.yoyChange || 0).toFixed(2)}%</p>
                    {getYoYBadge(metrics?.yoyChange || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Deals Lost
                  </div>
                  <p className="text-3xl font-bold">{metrics?.totalDealsLost || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Lost Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lost Amount Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Current Year",
                      color: "hsl(var(--destructive))",
                    },
                    previousYearAmount: {
                      label: "Previous Year",
                      color: "hsl(var(--muted-foreground))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={metrics?.monthlyData}>
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
                        formatter={(value: number, name: string) => [
                          `$${value.toLocaleString()}`,
                          name === "amount" ? "Current Year" : "Previous Year"
                        ]}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill="hsl(var(--destructive))" 
                        radius={[4, 4, 0, 0]}
                        name="Current Year"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="previousYearAmount" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        name="Previous Year"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* By Salesperson */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Lost Amount by Salesperson
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.bySalesperson
                    .sort((a, b) => b.currentYear - a.currentYear)
                    .map((person) => (
                      <div key={person.id} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {person.dealsLost} deals lost
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${person.currentYear.toLocaleString()}</p>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-muted-foreground">
                              vs ${person.previousYear.toLocaleString()}
                            </span>
                            {getYoYBadge(person.yoyChange)}
                          </div>
                        </div>
                      </div>
                    ))}
                  {(!metrics?.bySalesperson || metrics.bySalesperson.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">No lost deals in this period</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tabular">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lost Amount by Salesperson</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Salesperson</th>
                          <th className="text-right p-2">Deals Lost</th>
                          <th className="text-right p-2">Current Year</th>
                          <th className="text-right p-2">Previous Year</th>
                          <th className="text-right p-2">YoY Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.bySalesperson
                          .sort((a, b) => b.currentYear - a.currentYear)
                          .map((person) => (
                            <tr key={person.id} className="border-b">
                              <td className="p-2">{person.name}</td>
                              <td className="text-right p-2">{person.dealsLost}</td>
                              <td className="text-right p-2">${person.currentYear.toLocaleString()}</td>
                              <td className="text-right p-2">${person.previousYear.toLocaleString()}</td>
                              <td className="text-right p-2">{getYoYBadge(person.yoyChange)}</td>
                            </tr>
                          ))}
                        <tr className="font-bold bg-muted/50">
                          <td className="p-2">Total</td>
                          <td className="text-right p-2">{metrics?.totalDealsLost || 0}</td>
                          <td className="text-right p-2">${(metrics?.totalLost || 0).toLocaleString()}</td>
                          <td className="text-right p-2">${(metrics?.totalLostPreviousYear || 0).toLocaleString()}</td>
                          <td className="text-right p-2">{getYoYBadge(metrics?.yoyChange || 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{viewMode === 'monthly' ? 'Monthly' : 'Yearly'} Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Period</th>
                          <th className="text-right p-2">Lost Amount</th>
                          <th className="text-right p-2">Previous Year</th>
                          <th className="text-right p-2">YoY Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.monthlyData.map((item) => (
                          <tr key={item.period} className="border-b">
                            <td className="p-2">{item.period}</td>
                            <td className="text-right p-2">${item.amount.toLocaleString()}</td>
                            <td className="text-right p-2">${item.previousYearAmount.toLocaleString()}</td>
                            <td className="text-right p-2">{getYoYBadge(item.yoyChange)}</td>
                          </tr>
                        ))}
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
