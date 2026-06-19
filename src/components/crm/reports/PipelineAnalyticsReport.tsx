import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TrendingUp, Target, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

interface PipelineAnalyticsReportProps {
  financialYear: DateRangeType;
}

interface StageData {
  stage: string;
  count: number;
  value: number;
  weightedValue: number;
  probability: number;
  sortOrder: number;
}

interface PipelineMetrics {
  dealsByStage: StageData[];
  totalDeals: number;
  totalValue: number;
  totalWeightedValue: number;
  bySalesperson: { id: string; name: string; deals: number; value: number }[];
}

export const PipelineAnalyticsReport = forwardRef<any, PipelineAnalyticsReportProps>(({
  financialYear,
}, ref) => {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => metrics
  }));

  useEffect(() => {
    const fetchPipelineMetrics = async () => {
      setIsLoading(true);
      try {
        const { data: deals, error } = await supabase
          .from("deals")
          .select(`
            id,
            amount,
            contract_value,
            created_at,
            owner_id,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(id, name, default_probability, stage_order)
          `)
          .gte("created_at", format(financialYear.from, "yyyy-MM-dd"))
          .lte("created_at", format(financialYear.to, "yyyy-MM-dd'T'23:59:59"));

        if (error) {
          console.error("Error fetching deals:", error);
          setMetrics(null);
          return;
        }

        // Group by stage
        const byStage: { [key: string]: StageData } = {};
        const bySalespersonMap: { [key: string]: { name: string; deals: number; value: number } } = {};
        
        deals?.forEach((deal: any) => {
          const stageName = deal.pipeline_stage?.name || "Unknown";
          const probability = deal.pipeline_stage?.default_probability || 0;
          const sortOrder = deal.pipeline_stage?.stage_order || 999;
          const dealValue = Number(deal.contract_value) || Number(deal.amount) || 0;
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          
          if (!byStage[stageName]) {
            byStage[stageName] = { 
              stage: stageName,
              count: 0, 
              value: 0, 
              probability, 
              sortOrder,
              weightedValue: 0
            };
          }
          byStage[stageName].count++;
          byStage[stageName].value += dealValue;
          byStage[stageName].weightedValue += dealValue * (probability / 100);

          // Overall by salesperson
          if (!bySalespersonMap[ownerId]) {
            bySalespersonMap[ownerId] = { name: ownerName, deals: 0, value: 0 };
          }
          bySalespersonMap[ownerId].deals++;
          bySalespersonMap[ownerId].value += dealValue;
        });

        const dealsByStage = Object.values(byStage)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const bySalesperson = Object.entries(bySalespersonMap).map(([id, data]) => ({
          id,
          ...data,
        }));

        const totalDeals = deals?.length || 0;
        const totalValue = dealsByStage.reduce((sum, s) => sum + s.value, 0);
        const totalWeightedValue = dealsByStage.reduce((sum, s) => sum + s.weightedValue, 0);

        setMetrics({
          dealsByStage,
          totalDeals,
          totalValue,
          totalWeightedValue,
          bySalesperson,
        });
      } catch (error) {
        console.error("Error calculating pipeline metrics:", error);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipelineMetrics();
  }, [financialYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pipeline Analytics - {getAustralianFYLabel(financialYear.from)}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Deals created within the financial year
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                  <p className="text-3xl font-bold">{metrics?.totalDeals || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
                  <p className="text-3xl font-bold">${(metrics?.totalValue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Weighted Value</p>
                  <p className="text-3xl font-bold">${(metrics?.totalWeightedValue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Deals by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.dealsByStage.map((item) => (
                    <div key={item.stage} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.stage}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.count} deals • {item.probability}% probability
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${item.value.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Weighted: ${item.weightedValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!metrics?.dealsByStage || metrics.dealsByStage.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">No deals in this period</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pipeline Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Deals",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={metrics?.dealsByStage} 
                      layout="vertical"
                      margin={{ left: 20, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="stage" 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        width={120}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number, name: string, props: any) => [
                          `${value} deals ($${props.payload.value.toLocaleString()})`,
                          props.payload.stage
                        ]}
                      />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {metrics?.dealsByStage.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`hsl(var(--primary) / ${1 - (index * 0.12)})`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Deals by Salesperson */}
            {metrics?.bySalesperson && metrics.bySalesperson.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pipeline by Salesperson
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.bySalesperson
                      .sort((a, b) => b.value - a.value)
                      .map((person) => (
                        <div key={person.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{person.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {person.deals} deals in pipeline
                            </p>
                          </div>
                          <p className="text-lg font-bold">
                            ${person.value.toLocaleString()}
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
                  <CardTitle className="text-base">Pipeline Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Stage</th>
                          <th className="text-right p-2">Probability</th>
                          <th className="text-right p-2">Count</th>
                          <th className="text-right p-2">Total Value</th>
                          <th className="text-right p-2">Weighted Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.dealsByStage.map((item) => (
                          <tr key={item.stage} className="border-b">
                            <td className="p-2">{item.stage}</td>
                            <td className="text-right p-2">{item.probability}%</td>
                            <td className="text-right p-2">{item.count}</td>
                            <td className="text-right p-2">
                              ${item.value.toLocaleString()}
                            </td>
                            <td className="text-right p-2">
                              ${item.weightedValue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-muted/50">
                          <td className="p-2">Total</td>
                          <td className="text-right p-2">-</td>
                          <td className="text-right p-2">{metrics?.totalDeals || 0}</td>
                          <td className="text-right p-2">${(metrics?.totalValue || 0).toLocaleString()}</td>
                          <td className="text-right p-2">${(metrics?.totalWeightedValue || 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {metrics?.bySalesperson && metrics.bySalesperson.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pipeline by Salesperson</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Salesperson</th>
                            <th className="text-right p-2">Deals</th>
                            <th className="text-right p-2">Pipeline Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.bySalesperson
                            .sort((a, b) => b.value - a.value)
                            .map((person) => (
                              <tr key={person.id} className="border-b">
                                <td className="p-2">{person.name}</td>
                                <td className="text-right p-2">{person.deals}</td>
                                <td className="text-right p-2">
                                  ${person.value.toLocaleString()}
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
