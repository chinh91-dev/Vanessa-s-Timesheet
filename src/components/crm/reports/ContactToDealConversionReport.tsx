import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { GitBranch, Users, TrendingUp, ArrowRight, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ContactToDealConversionReportProps {
  financialYear: DateRangeType;
}

interface StageConversion {
  fromStage: string;
  toStage: string;
  count: number;
  rate: number;
}

interface FunnelData {
  name: string;
  value: number;
  fill: string;
}

interface ConversionMetrics {
  dealsCreated: number;
  qualifiedDeals: number;
  proposalDeals: number;
  wonDeals: number;
  dealToQualifiedRate: number;
  qualifiedToProposalRate: number;
  proposalToWonRate: number;
  overallWinRate: number;
  stageConversions: StageConversion[];
  funnelData: FunnelData[];
  bySalesperson: {
    id: string;
    name: string;
    deals: number;
    qualified: number;
    proposal: number;
    won: number;
    winRate: number;
  }[];
}

export const ContactToDealConversionReport = forwardRef<any, ContactToDealConversionReportProps>(({
  financialYear,
}, ref) => {
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => metrics
  }));

  useEffect(() => {
    const fetchConversionMetrics = async () => {
      setIsLoading(true);
      try {
        const startDate = format(financialYear.from, "yyyy-MM-dd");
        const endDate = format(financialYear.to, "yyyy-MM-dd'T'23:59:59");

        // Fetch deals created in period with pipeline stage info
        const { data: deals } = await supabase
          .from("deals")
          .select(`
            id,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(id, name, is_closed_won, stage_order)
          `)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        // Get pipeline stages for stage detection
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("id, name, stage_order, is_closed_won")
          .order("stage_order");

        const qualifiedStage = stages?.find(s => s.name.toLowerCase().includes('qualified'));
        const proposalStage = stages?.find(s => s.name.toLowerCase().includes('proposal'));

        // Calculate metrics
        const dealsCreated = deals?.length || 0;
        
        const qualifiedDeals = deals?.filter((d: any) => {
          if (!d.pipeline_stage) return false;
          return qualifiedStage ? d.pipeline_stage.stage_order >= qualifiedStage.stage_order : false;
        }).length || 0;

        const proposalDeals = deals?.filter((d: any) => {
          if (!d.pipeline_stage) return false;
          return proposalStage ? d.pipeline_stage.stage_order >= proposalStage.stage_order : false;
        }).length || 0;

        const wonDeals = deals?.filter((d: any) => d.pipeline_stage?.is_closed_won).length || 0;

        // Conversion rates
        const dealToQualifiedRate = dealsCreated > 0 ? (qualifiedDeals / dealsCreated) * 100 : 0;
        const qualifiedToProposalRate = qualifiedDeals > 0 ? (proposalDeals / qualifiedDeals) * 100 : 0;
        const proposalToWonRate = proposalDeals > 0 ? (wonDeals / proposalDeals) * 100 : 0;
        const overallWinRate = dealsCreated > 0 ? (wonDeals / dealsCreated) * 100 : 0;

        // Stage-to-stage conversion
        const stageConversions: StageConversion[] = [];
        if (stages && stages.length > 1) {
          for (let i = 0; i < stages.length - 1; i++) {
            const currentStage = stages[i];
            const nextStage = stages[i + 1];
            
            const dealsInCurrent = deals?.filter((d: any) => 
              d.pipeline_stage?.stage_order >= currentStage.stage_order
            ).length || 0;
            
            const dealsInNext = deals?.filter((d: any) => 
              d.pipeline_stage?.stage_order >= nextStage.stage_order
            ).length || 0;

            const rate = dealsInCurrent > 0 ? (dealsInNext / dealsInCurrent) * 100 : 0;

            stageConversions.push({
              fromStage: currentStage.name,
              toStage: nextStage.name,
              count: dealsInNext,
              rate,
            });
          }
        }

        // Funnel data
        const funnelData: FunnelData[] = [
          { name: "All Deals", value: dealsCreated, fill: "hsl(var(--primary))" },
          { name: "Qualified", value: qualifiedDeals, fill: "hsl(var(--primary) / 0.8)" },
          { name: "Proposal", value: proposalDeals, fill: "hsl(var(--primary) / 0.6)" },
          { name: "Won", value: wonDeals, fill: "hsl(var(--chart-2))" },
        ];

        // By salesperson
        const bySalespersonMap: { [key: string]: { 
          name: string; 
          deals: number; 
          qualified: number; 
          proposal: number;
          won: number 
        }} = {};

        deals?.forEach((d: any) => {
          const ownerId = d.owner?.id || 'unknown';
          const ownerName = d.owner?.full_name || 'Unknown';
          if (!bySalespersonMap[ownerId]) {
            bySalespersonMap[ownerId] = { name: ownerName, deals: 0, qualified: 0, proposal: 0, won: 0 };
          }
          bySalespersonMap[ownerId].name = ownerName;
          bySalespersonMap[ownerId].deals++;
          
          if (qualifiedStage && d.pipeline_stage?.stage_order >= qualifiedStage.stage_order) {
            bySalespersonMap[ownerId].qualified++;
          }
          if (proposalStage && d.pipeline_stage?.stage_order >= proposalStage.stage_order) {
            bySalespersonMap[ownerId].proposal++;
          }
          if (d.pipeline_stage?.is_closed_won) {
            bySalespersonMap[ownerId].won++;
          }
        });

        const bySalesperson = Object.entries(bySalespersonMap)
          .filter(([id]) => id !== 'unknown')
          .map(([id, data]) => ({
            id,
            ...data,
            winRate: data.deals > 0 ? (data.won / data.deals) * 100 : 0,
          }));

        setMetrics({
          dealsCreated,
          qualifiedDeals,
          proposalDeals,
          wonDeals,
          dealToQualifiedRate,
          qualifiedToProposalRate,
          proposalToWonRate,
          overallWinRate,
          stageConversions,
          funnelData,
          bySalesperson,
        });
      } catch (error) {
        console.error("Error calculating conversion metrics:", error);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversionMetrics();
  }, [financialYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal Conversion Funnel</CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Deal Conversion Funnel - {getAustralianFYLabel(financialYear.from)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track deal progression and win rates across the sales pipeline
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual Dashboard</TabsTrigger>
            <TabsTrigger value="tabular">Detailed Data</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            {/* Funnel Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    All Deals
                  </div>
                  <p className="text-3xl font-bold">{metrics?.dealsCreated || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Qualified</div>
                  <p className="text-3xl font-bold">{metrics?.qualifiedDeals || 0}</p>
                  <Badge variant="secondary" className="mt-1">
                    {metrics?.dealToQualifiedRate.toFixed(2)}% of deals
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Proposal</div>
                  <p className="text-3xl font-bold">{metrics?.proposalDeals || 0}</p>
                  <Badge variant="secondary" className="mt-1">
                    {metrics?.qualifiedToProposalRate.toFixed(2)}% of qualified
                  </Badge>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Won
                  </div>
                  <p className="text-3xl font-bold text-green-600">{metrics?.wonDeals || 0}</p>
                  <Badge className="mt-1 bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200">
                    {metrics?.overallWinRate.toFixed(2)}% win rate
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversion Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg min-w-[100px]">
                    <p className="text-2xl font-bold">{metrics?.dealsCreated}</p>
                    <p className="text-sm text-muted-foreground">All Deals</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{metrics?.dealToQualifiedRate.toFixed(0)}%</span>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg min-w-[100px]">
                    <p className="text-2xl font-bold">{metrics?.qualifiedDeals}</p>
                    <p className="text-sm text-muted-foreground">Qualified</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{metrics?.qualifiedToProposalRate.toFixed(0)}%</span>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg min-w-[100px]">
                    <p className="text-2xl font-bold">{metrics?.proposalDeals}</p>
                    <p className="text-sm text-muted-foreground">Proposal</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{metrics?.proposalToWonRate.toFixed(0)}%</span>
                  </div>
                  <div className="text-center p-4 bg-green-100 dark:bg-green-950 rounded-lg min-w-[100px]">
                    <p className="text-2xl font-bold text-green-600">{metrics?.wonDeals}</p>
                    <p className="text-sm text-muted-foreground">Won</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Funnel Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: {
                      label: "Count",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={metrics?.funnelData} 
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
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        width={100}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => [value.toLocaleString(), "Count"]}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {metrics?.funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Stage-to-Stage Conversion */}
            {metrics?.stageConversions && metrics.stageConversions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stage-to-Stage Conversion Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.stageConversions.map((conv, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{conv.fromStage} → {conv.toStage}</span>
                          <span className="font-medium">{conv.rate.toFixed(2)}%</span>
                        </div>
                        <Progress value={conv.rate} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* By Salesperson */}
            {metrics?.bySalesperson && metrics.bySalesperson.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Win Rate by Salesperson
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.bySalesperson
                      .sort((a, b) => b.won - a.won)
                      .map((person) => (
                        <div key={person.id} className="border-b pb-3 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{person.name}</p>
                            <Badge variant={person.winRate > 10 ? "default" : "secondary"}>
                              {person.winRate.toFixed(2)}% win rate
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="block text-foreground font-medium">{person.deals}</span>
                              Deals
                            </div>
                            <div>
                              <span className="block text-foreground font-medium">{person.qualified}</span>
                              Qualified
                            </div>
                            <div>
                              <span className="block text-foreground font-medium">{person.proposal}</span>
                              Proposal
                            </div>
                            <div>
                              <span className="block text-green-600 font-medium">{person.won}</span>
                              Won
                            </div>
                          </div>
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
                  <CardTitle className="text-base">Conversion Funnel Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Funnel Step</th>
                          <th className="text-right p-2">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">Deals → Qualified</td>
                          <td className="text-right p-2">{metrics?.dealToQualifiedRate.toFixed(2)}%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">Qualified → Proposal</td>
                          <td className="text-right p-2">{metrics?.qualifiedToProposalRate.toFixed(2)}%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">Proposal → Won</td>
                          <td className="text-right p-2">{metrics?.proposalToWonRate.toFixed(2)}%</td>
                        </tr>
                        <tr className="font-bold bg-muted/50">
                          <td className="p-2">Overall Win Rate</td>
                          <td className="text-right p-2">{metrics?.overallWinRate.toFixed(2)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {metrics?.bySalesperson && metrics.bySalesperson.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Win Rate by Salesperson</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Salesperson</th>
                            <th className="text-right p-2">Deals</th>
                            <th className="text-right p-2">Qualified</th>
                            <th className="text-right p-2">Proposal</th>
                            <th className="text-right p-2">Won</th>
                            <th className="text-right p-2">Win Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.bySalesperson
                            .sort((a, b) => b.won - a.won)
                            .map((person) => (
                              <tr key={person.id} className="border-b">
                                <td className="p-2">{person.name}</td>
                                <td className="text-right p-2">{person.deals}</td>
                                <td className="text-right p-2">{person.qualified}</td>
                                <td className="text-right p-2">{person.proposal}</td>
                                <td className="text-right p-2">{person.won}</td>
                                <td className="text-right p-2">{person.winRate.toFixed(2)}%</td>
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
