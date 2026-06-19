import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AverageTimeInStageReportProps {
  financialYear: DateRangeType;
}

interface StageTimeData {
  stageName: string;
  stageOrder: number;
  avgDays: number;
  avgMinutes: number;
  dealCount: number;
  bySalesperson?: { [key: string]: { avgDays: number; count: number } };
}

interface SalespersonTimeData {
  id: string;
  name: string;
  avgDays: number;
  dealCount: number;
}

interface TimeMetrics {
  byStage: StageTimeData[];
  bySalesperson: SalespersonTimeData[];
  totalDealsTracked: number;
  hasData: boolean;
}

export const AverageTimeInStageReport = forwardRef<any, AverageTimeInStageReportProps>(({
  financialYear,
}, ref) => {
  const [metrics, setMetrics] = useState<TimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => metrics
  }));

  useEffect(() => {
    const fetchTimeMetrics = async () => {
      setIsLoading(true);
      try {
        // Fetch stage history data within the FY
        const { data: stageHistory, error } = await supabase
          .from("deal_stage_history")
          .select(`
            id,
            deal_id,
            to_stage_id,
            duration_minutes,
            changed_at,
            deal:deal_id(owner_id, owner:owner_id(id, full_name))
          `)
          .not("duration_minutes", "is", null)
          .gte("changed_at", format(financialYear.from, "yyyy-MM-dd"))
          .lte("changed_at", format(financialYear.to, "yyyy-MM-dd'T'23:59:59"));

        if (error) {
          // Table might not exist yet
          console.error("Error fetching stage history:", error);
          setMetrics({
            byStage: [],
            bySalesperson: [],
            totalDealsTracked: 0,
            hasData: false,
          });
          setIsLoading(false);
          return;
        }

        if (!stageHistory || stageHistory.length === 0) {
          setMetrics({
            byStage: [],
            bySalesperson: [],
            totalDealsTracked: 0,
            hasData: false,
          });
          setIsLoading(false);
          return;
        }

        // Get pipeline stages for names
        const stageIds = [...new Set(stageHistory.map(h => h.to_stage_id))];
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("id, name, stage_order")
          .in("id", stageIds);

        const stageMap: { [key: string]: { name: string; order: number } } = {};
        stages?.forEach(s => {
          stageMap[s.id] = { name: s.name, order: s.stage_order };
        });

        // Calculate average time by stage
        const byStageMap: { [key: string]: { minutes: number[]; bySalesperson: { [key: string]: number[] } } } = {};
        const bySalespersonMap: { [key: string]: { name: string; minutes: number[] } } = {};

        stageHistory.forEach((h: any) => {
          const stageId = h.to_stage_id;
          const minutes = h.duration_minutes;
          const ownerId = h.deal?.owner?.id || 'unknown';
          const ownerName = h.deal?.owner?.full_name || 'Unknown';

          if (!byStageMap[stageId]) {
            byStageMap[stageId] = { minutes: [], bySalesperson: {} };
          }
          byStageMap[stageId].minutes.push(minutes);

          // Track by salesperson within stage
          if (!byStageMap[stageId].bySalesperson[ownerId]) {
            byStageMap[stageId].bySalesperson[ownerId] = [];
          }
          byStageMap[stageId].bySalesperson[ownerId].push(minutes);

          // Overall by salesperson
          if (!bySalespersonMap[ownerId]) {
            bySalespersonMap[ownerId] = { name: ownerName, minutes: [] };
          }
          bySalespersonMap[ownerId].minutes.push(minutes);
        });

        const byStage = Object.entries(byStageMap).map(([stageId, data]) => {
          const avgMinutes = data.minutes.reduce((a, b) => a + b, 0) / data.minutes.length;
          const bySalesperson: { [key: string]: { avgDays: number; count: number } } = {};
          
          Object.entries(data.bySalesperson).forEach(([spId, mins]) => {
            const avgMins = mins.reduce((a, b) => a + b, 0) / mins.length;
            bySalesperson[spId] = {
              avgDays: avgMins / (60 * 24),
              count: mins.length,
            };
          });

          return {
            stageName: stageMap[stageId]?.name || 'Unknown',
            stageOrder: stageMap[stageId]?.order || 999,
            avgDays: avgMinutes / (60 * 24),
            avgMinutes,
            dealCount: data.minutes.length,
            bySalesperson,
          };
        }).sort((a, b) => a.stageOrder - b.stageOrder);

        const bySalesperson = Object.entries(bySalespersonMap).map(([id, data]) => ({
          id,
          name: data.name,
          avgDays: (data.minutes.reduce((a, b) => a + b, 0) / data.minutes.length) / (60 * 24),
          dealCount: data.minutes.length,
        }));

        const uniqueDeals = new Set(stageHistory.map(h => h.deal_id));

        setMetrics({
          byStage,
          bySalesperson,
          totalDealsTracked: uniqueDeals.size,
          hasData: true,
        });
      } catch (error) {
        console.error("Error calculating time metrics:", error);
        setMetrics({
          byStage: [],
          bySalesperson: [],
          totalDealsTracked: 0,
          hasData: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeMetrics();
  }, [financialYear]);

  const formatDays = (days: number) => {
    if (days < 1) {
      const hours = days * 24;
      return `${hours.toFixed(2)} hrs`;
    }
    return `${days.toFixed(2)} days`;
  };

  const getBottleneckColor = (avgDays: number, maxDays: number) => {
    const ratio = avgDays / maxDays;
    if (ratio > 0.8) return "hsl(var(--destructive))";
    if (ratio > 0.5) return "hsl(var(--warning, 38 92% 50%))";
    return "hsl(var(--primary))";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Average Time in Stage</CardTitle>
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

  const maxDays = Math.max(...(metrics?.byStage.map(s => s.avgDays) || [1]));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Average Time in Stage - {getAustralianFYLabel(financialYear.from)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Identify pipeline bottlenecks and improve sales velocity
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!metrics?.hasData && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No stage transition data available yet. This report will populate as deals move between pipeline stages.
              Historical data is tracked from when the deal_stage_history table was created.
            </AlertDescription>
          </Alert>
        )}

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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    Deals Tracked
                  </div>
                  <p className="text-3xl font-bold">{metrics?.totalDealsTracked || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Slowest Stage</div>
                  {metrics?.byStage && metrics.byStage.length > 0 ? (
                    <>
                      <p className="text-xl font-bold">{metrics.byStage.reduce((a, b) => a.avgDays > b.avgDays ? a : b).stageName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDays(Math.max(...metrics.byStage.map(s => s.avgDays)))} avg
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No data</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Fastest Stage</div>
                  {metrics?.byStage && metrics.byStage.length > 0 ? (
                    <>
                      <p className="text-xl font-bold">{metrics.byStage.reduce((a, b) => a.avgDays < b.avgDays ? a : b).stageName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDays(Math.min(...metrics.byStage.map(s => s.avgDays)))} avg
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stage Time Chart */}
            {metrics?.byStage && metrics.byStage.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Average Time per Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      avgDays: {
                        label: "Days",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={metrics.byStage} 
                        layout="vertical"
                        margin={{ left: 20, right: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number" 
                          className="text-xs"
                          tick={{ fill: "hsl(var(--foreground))" }}
                          tickFormatter={(value) => `${value.toFixed(2)}d`}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="stageName" 
                          className="text-xs"
                          tick={{ fill: "hsl(var(--foreground))" }}
                          width={120}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [formatDays(value), "Average"]}
                        />
                        <Bar dataKey="avgDays" radius={[0, 8, 8, 0]}>
                          {metrics.byStage.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getBottleneckColor(entry.avgDays, maxDays)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Stage Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stage Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.byStage.map((stage) => (
                    <div key={stage.stageName} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{stage.stageName}</p>
                          <p className="text-sm text-muted-foreground">
                            {stage.dealCount} transitions tracked
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={stage.avgDays === maxDays ? "destructive" : "secondary"}
                            className="text-sm"
                          >
                            {formatDays(stage.avgDays)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!metrics?.byStage || metrics.byStage.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">No stage transition data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tabular">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Average Time by Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Stage</th>
                          <th className="text-right p-2">Avg Time</th>
                          <th className="text-right p-2">Transitions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.byStage.map((stage) => (
                          <tr key={stage.stageName} className="border-b">
                            <td className="p-2">{stage.stageName}</td>
                            <td className="text-right p-2">{formatDays(stage.avgDays)}</td>
                            <td className="text-right p-2">{stage.dealCount}</td>
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
