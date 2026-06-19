import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  TrendingUp, Target, Users, Layers, DollarSign, Clock, 
  ChevronDown, ChevronRight, AlertTriangle 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/crm/formatting";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PipelineForecastReportProps {
  financialYear: DateRangeType;
}

interface StageData {
  stage: string;
  stageId: string;
  count: number;
  value: number;
  weightedValue: number;
  probability: number;
  sortOrder: number;
}

interface StageTimeData {
  stageName: string;
  avgDays: number;
  avgMinutes: number;
  transitionCount: number;
}

interface PipelineMetrics {
  dealsByStage: StageData[];
  totalDeals: number;
  totalValue: number;
  totalWeightedValue: number;
  bySalesperson: { id: string; name: string; deals: number; value: number }[];
}

interface TimeMetrics {
  byStage: StageTimeData[];
  totalDealsTracked: number;
  slowestStage: string;
  fastestStage: string;
}

export const PipelineForecastReport = forwardRef<any, PipelineForecastReportProps>(({
  financialYear,
}, ref) => {
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null);
  const [timeMetrics, setTimeMetrics] = useState<TimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [forecastOpen, setForecastOpen] = useState(true);
  const [bottleneckOpen, setBottleneckOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    getExportData: () => ({
      pipeline: pipelineMetrics,
      timeInStage: timeMetrics,
    })
  }));

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd'T'23:59:59");

        // Fetch deals with pipeline stage info
        const { data: deals } = await supabase
          .from("deals")
          .select(`
            id,
            amount,
            contract_value,
            close_date,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(id, name, default_probability, stage_order)
          `)
          .gte("close_date", startDate)
          .lte("close_date", endDate)
          .not("pipeline_stage_id", "is", null);

        // Fetch deal stage history for time in stage
        const { data: stageHistory } = await supabase
          .from("deal_stage_history")
          .select(`
            id,
            deal_id,
            to_stage_id,
            duration_minutes,
            changed_at,
            to_stage:to_stage_id(id, name)
          `)
          .gte("changed_at", startDate)
          .lte("changed_at", endDate);

        // ========== PIPELINE METRICS ==========
        const byStage: { [key: string]: StageData } = {};
        const bySalespersonMap: { [key: string]: { name: string; deals: number; value: number } } = {};
        
        deals?.forEach((deal: any) => {
          const stageId = deal.pipeline_stage?.id || 'unknown';
          const stageName = deal.pipeline_stage?.name || "Unknown";
          const probability = deal.pipeline_stage?.default_probability || 0;
          const sortOrder = deal.pipeline_stage?.stage_order || 999;
          const dealValue = Number(deal.contract_value) || Number(deal.amount) || 0;
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          
          if (!byStage[stageId]) {
            byStage[stageId] = { 
              stage: stageName,
              stageId,
              count: 0, 
              value: 0, 
              probability, 
              sortOrder,
              weightedValue: 0
            };
          }
          byStage[stageId].count++;
          byStage[stageId].value += dealValue;
          byStage[stageId].weightedValue += dealValue * (probability / 100);

          if (!bySalespersonMap[ownerId]) {
            bySalespersonMap[ownerId] = { name: ownerName, deals: 0, value: 0 };
          }
          bySalespersonMap[ownerId].deals++;
          bySalespersonMap[ownerId].value += dealValue;
        });

        const dealsByStage = Object.values(byStage).sort((a, b) => a.sortOrder - b.sortOrder);
        const totalDeals = deals?.length || 0;
        const totalValue = dealsByStage.reduce((sum, s) => sum + s.value, 0);
        const totalWeightedValue = dealsByStage.reduce((sum, s) => sum + s.weightedValue, 0);

        setPipelineMetrics({
          dealsByStage,
          totalDeals,
          totalValue,
          totalWeightedValue,
          bySalesperson: Object.entries(bySalespersonMap).map(([id, data]) => ({ id, ...data })),
        });

        // ========== TIME IN STAGE METRICS ==========
        const stageTimeMap: { [key: string]: { stageName: string; totalMinutes: number; count: number } } = {};
        
        stageHistory?.forEach((history: any) => {
          if (history.duration_minutes && history.to_stage) {
            const stageName = history.to_stage.name;
            if (!stageTimeMap[stageName]) {
              stageTimeMap[stageName] = { stageName, totalMinutes: 0, count: 0 };
            }
            stageTimeMap[stageName].totalMinutes += history.duration_minutes;
            stageTimeMap[stageName].count++;
          }
        });

        const byStageTime: StageTimeData[] = Object.values(stageTimeMap).map(data => ({
          stageName: data.stageName,
          avgMinutes: data.count > 0 ? data.totalMinutes / data.count : 0,
          avgDays: data.count > 0 ? (data.totalMinutes / data.count) / (60 * 24) : 0,
          transitionCount: data.count,
        })).sort((a, b) => b.avgDays - a.avgDays);

        const slowestStage = byStageTime.length > 0 ? byStageTime[0].stageName : "N/A";
        const fastestStage = byStageTime.length > 0 ? byStageTime[byStageTime.length - 1].stageName : "N/A";

        setTimeMetrics({
          byStage: byStageTime,
          totalDealsTracked: stageHistory?.length || 0,
          slowestStage,
          fastestStage,
        });

      } catch (error) {
        console.error("Error fetching pipeline data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [financialYear]);

  const formatDays = (days: number) => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours}h`;
    }
    return `${days.toFixed(2)}d`;
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
          <CardTitle>Pipeline & Forecast</CardTitle>
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

  const maxDays = Math.max(...(timeMetrics?.byStage.map(s => s.avgDays) || [1]));

  return (
    <div className="space-y-4">
      {/* Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Total Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pipelineMetrics?.totalDeals || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(pipelineMetrics?.totalValue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Weighted Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(pipelineMetrics?.totalWeightedValue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Slowest Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold truncate">{timeMetrics?.slowestStage || "N/A"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel Section */}
      <Collapsible open={pipelineOpen} onOpenChange={setPipelineOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Pipeline by Stage - {getAustralianFYLabel(financialYear.from)}
                </span>
                {pipelineOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Pipeline Funnel Chart */}
              {pipelineMetrics?.dealsByStage && pipelineMetrics.dealsByStage.length > 0 && (
                <ChartContainer
                  config={{ count: { label: "Deals", color: "hsl(var(--primary))" } }}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={pipelineMetrics.dealsByStage} 
                      layout="vertical"
                      margin={{ left: 20, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} />
                      <YAxis type="category" dataKey="stage" className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} width={120} />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number, name: string, props: any) => [
                          `${value} deals (${formatCurrency(props.payload.value)})`,
                          props.payload.stage
                        ]}
                      />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {pipelineMetrics.dealsByStage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - (index * 0.12)})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}

              {/* Stage Breakdown List */}
              <div className="space-y-3">
                {pipelineMetrics?.dealsByStage.map((item) => (
                  <div key={item.stageId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{item.stage}</p>
                      <p className="text-sm text-muted-foreground">{item.count} deals • {item.probability}% probability</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(item.value)}</p>
                      <p className="text-sm text-primary">Weighted: {formatCurrency(item.weightedValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Forecast Details Section */}
      <Collapsible open={forecastOpen} onOpenChange={setForecastOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weighted Forecast Details
                </span>
                {forecastOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                {pipelineMetrics?.dealsByStage.map((stage) => (
                  <div key={stage.stageId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{stage.stage}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stage.count} {stage.count === 1 ? "deal" : "deals"} • {stage.probability}% probability
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(stage.value)}</p>
                        <p className="text-sm text-primary font-medium">{formatCurrency(stage.weightedValue)} weighted</p>
                      </div>
                    </div>
                    <Progress 
                      value={pipelineMetrics.totalValue > 0 ? (stage.value / pipelineMetrics.totalValue) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>

              {/* Pipeline by Salesperson */}
              {pipelineMetrics?.bySalesperson && pipelineMetrics.bySalesperson.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pipeline by Salesperson
                  </h4>
                  {pipelineMetrics.bySalesperson.sort((a, b) => b.value - a.value).map((person) => (
                    <div key={person.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.deals} deals in pipeline</p>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(person.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bottleneck Analysis Section */}
      <Collapsible open={bottleneckOpen} onOpenChange={setBottleneckOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Average Time in Stage (Bottleneck Analysis)
                </span>
                {bottleneckOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {timeMetrics?.byStage && timeMetrics.byStage.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Deals Tracked</p>
                        <p className="text-2xl font-bold">{timeMetrics.totalDealsTracked}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-destructive/50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          Slowest Stage
                        </p>
                        <p className="text-lg font-bold">{timeMetrics.slowestStage}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-500/50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Fastest Stage</p>
                        <p className="text-lg font-bold">{timeMetrics.fastestStage}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    {timeMetrics.byStage.map((stage) => (
                      <div key={stage.stageName} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{stage.stageName}</span>
                          <span className="text-sm">
                            {formatDays(stage.avgDays)} avg • {stage.transitionCount} transitions
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className="rounded-full h-3 transition-all"
                            style={{
                              width: `${(stage.avgDays / maxDays) * 100}%`,
                              backgroundColor: getBottleneckColor(stage.avgDays, maxDays),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    No stage transition data available for this period. Time tracking requires deal stage history.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});
