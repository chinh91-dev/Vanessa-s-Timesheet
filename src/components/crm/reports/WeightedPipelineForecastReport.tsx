import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeType } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TrendingUp, DollarSign, Target, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/crm/formatting";
import { usePipelineStages } from "@/hooks/crm/usePipelineStages";

interface WeightedPipelineForecastReportProps {
  financialYear: DateRangeType;
}

interface StageMetrics {
  stage_id: string;
  stage_name: string;
  probability: number;
  deal_count: number;
  total_amount: number;
  weighted_amount: number;
}

interface ForecastData {
  stages: StageMetrics[];
  totalDeals: number;
  totalPipelineValue: number;
  totalWeightedValue: number;
}

export const WeightedPipelineForecastReport = forwardRef<any, WeightedPipelineForecastReportProps>(({
  financialYear,
}, ref) => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  
  const { data: stages } = usePipelineStages();

  useImperativeHandle(ref, () => ({
    getExportData: () => forecastData
  }));

  useEffect(() => {
    const fetchForecastData = async () => {
      setIsLoading(true);
      try {
        // Build query for deals with close_date in FY range
        let query = supabase
          .from("deals")
          .select(`
            id,
            name,
            amount,
            close_date,
            owner_id,
            pipeline_stage_id,
            pipeline_stage:pipeline_stage_id(id, name, default_probability),
            owner:owner_id(id, full_name)
          `)
          .gte("close_date", format(financialYear.from, "yyyy-MM-dd"))
          .lte("close_date", format(financialYear.to, "yyyy-MM-dd"))
          .not("pipeline_stage_id", "is", null);

        // Apply filters
        if (selectedOwner !== "all") {
          query = query.eq("owner_id", selectedOwner);
        }
        if (selectedStage !== "all") {
          query = query.eq("pipeline_stage_id", selectedStage);
        }

        const { data: deals, error } = await query;

        if (error) {
          console.error("Error fetching deals:", error);
          setForecastData(null);
          return;
        }

        // Extract unique owners for filter
        const uniqueOwners = Array.from(
          new Map(
            deals
              ?.filter((d: any) => d.owner)
              .map((d: any) => [d.owner.id, { id: d.owner.id, name: d.owner.full_name }])
          ).values()
        );
        setOwners(uniqueOwners);

        // Group by stage and calculate metrics
        const stageMap = new Map<string, StageMetrics>();
        
        deals?.forEach((deal: any) => {
          const stageId = deal.pipeline_stage_id;
          const stageName = deal.pipeline_stage?.name || "Unknown Stage";
          const probability = deal.pipeline_stage?.default_probability || 0;
          const amount = deal.amount || 0;
          const weightedAmount = amount * (probability / 100);

          if (!stageMap.has(stageId)) {
            stageMap.set(stageId, {
              stage_id: stageId,
              stage_name: stageName,
              probability,
              deal_count: 0,
              total_amount: 0,
              weighted_amount: 0,
            });
          }

          const metrics = stageMap.get(stageId)!;
          metrics.deal_count += 1;
          metrics.total_amount += amount;
          metrics.weighted_amount += weightedAmount;
        });

        const stageMetrics = Array.from(stageMap.values()).sort((a, b) => 
          b.total_amount - a.total_amount
        );

        const totalDeals = deals?.length || 0;
        const totalPipelineValue = stageMetrics.reduce((sum, s) => sum + s.total_amount, 0);
        const totalWeightedValue = stageMetrics.reduce((sum, s) => sum + s.weighted_amount, 0);

        setForecastData({
          stages: stageMetrics,
          totalDeals,
          totalPipelineValue,
          totalWeightedValue,
        });
      } catch (error) {
        console.error("Error calculating forecast:", error);
        setForecastData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecastData();
  }, [financialYear, selectedOwner, selectedStage]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weighted Pipeline Forecast</CardTitle>
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
          <Target className="h-5 w-5" />
          Weighted Pipeline Forecast
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pipeline forecast weighted by stage probability for deals closing in FY
        </p>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filter by Owner</label>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger>
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filter by Stage</label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages?.filter(s => s.is_active).map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="visual">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual Dashboard</TabsTrigger>
            <TabsTrigger value="tabular">Detailed Data</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Total Deals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {forecastData?.totalDeals || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Pipeline Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(forecastData?.totalPipelineValue || 0)}
                  </p>
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
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(forecastData?.totalWeightedValue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {forecastData?.totalPipelineValue 
                      ? `${((forecastData.totalWeightedValue / forecastData.totalPipelineValue) * 100).toFixed(2)}% of pipeline`
                      : "0% of pipeline"
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Forecast by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forecastData?.stages.map((stage) => (
                    <div key={stage.stage_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{stage.stage_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {stage.deal_count} {stage.deal_count === 1 ? "deal" : "deals"} • {stage.probability}% probability
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(stage.total_amount)}</p>
                          <p className="text-sm text-primary font-medium">
                            {formatCurrency(stage.weighted_amount)} weighted
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{
                            width: `${forecastData.totalPipelineValue > 0 
                              ? (stage.total_amount / forecastData.totalPipelineValue) * 100 
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tabular">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Forecast Data Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Stage</th>
                        <th className="text-center p-2">Deals</th>
                        <th className="text-right p-2">Total Amount</th>
                        <th className="text-center p-2">Probability</th>
                        <th className="text-right p-2">Weighted Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData?.stages.map((stage) => (
                        <tr key={stage.stage_id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{stage.stage_name}</td>
                          <td className="text-center p-2">{stage.deal_count}</td>
                          <td className="text-right p-2">{formatCurrency(stage.total_amount)}</td>
                          <td className="text-center p-2">{stage.probability}%</td>
                          <td className="text-right p-2 font-semibold text-primary">
                            {formatCurrency(stage.weighted_amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-muted/50">
                        <td className="p-2">Total</td>
                        <td className="text-center p-2">{forecastData?.totalDeals}</td>
                        <td className="text-right p-2">{formatCurrency(forecastData?.totalPipelineValue || 0)}</td>
                        <td className="text-center p-2">-</td>
                        <td className="text-right p-2 text-primary">
                          {formatCurrency(forecastData?.totalWeightedValue || 0)}
                        </td>
                      </tr>
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
