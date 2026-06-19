import React, { useState, useMemo } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentAnalyticsService } from "@/lib/analytics/incident-analytics-service";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Target, Brain } from "lucide-react";
import { useIncidentProjects } from "@/hooks/useIncidents";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface AnalyticsDashboardProps {
  projectId?: string;
}

export function AnalyticsDashboard({ projectId }: AnalyticsDashboardProps) {
  const [selectedProject, setSelectedProject] = useState<string>(projectId || "");
  const [timeRange, setTimeRange] = useState<string>("30");

  const { data: projects } = useIncidentProjects();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', selectedProject],
    queryFn: () => IncidentAnalyticsService.getDashboardSummary(selectedProject || undefined),
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  const { data: trendsData } = useQuery({
    queryKey: ['incident-trends', selectedProject, timeRange],
    queryFn: () => {
      const endDate = todayLocalYMD();
      const startDate = new Date(Date.now() - parseInt(timeRange, 10) * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
      return IncidentAnalyticsService.getIncidentTrends(startDate, endDate, selectedProject || undefined);
    },
    retry: 1,
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ['performance-metrics', selectedProject],
    queryFn: () => IncidentAnalyticsService.getPerformanceMetrics(),
    retry: 1,
  });

  const trendChartData = useMemo(() => {
    if (!trendsData) return [];
    return trendsData.map(trend => ({
      date: new Date(trend.date).toLocaleDateString(),
      new: trend.new_incidents,
      resolved: trend.resolved_incidents,
      avgResolution: trend.avg_resolution_time,
      breaches: trend.sla_breaches
    }));
  }, [trendsData]);

  const patternData = useMemo(() => {
    if (!dashboardData?.patterns) return [];
    return dashboardData.patterns.map((pattern, index) => ({
      name: pattern.pattern_name,
      type: pattern.pattern_type,
      confidence: Math.round(pattern.confidence_score * 100),
      color: COLORS[index % COLORS.length]
    }));
  }, [dashboardData?.patterns]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Advanced insights and intelligence for incident management
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboardData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                  <p className="text-2xl font-bold">{dashboardData.summary.totalIncidents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolution Rate</p>
                  <p className="text-2xl font-bold">{dashboardData.summary.resolutionRate.toFixed(2)}%</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                  <p className="text-2xl font-bold">{dashboardData.summary.avgResolutionTime}h</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SLA Breaches</p>
                  <p className="text-2xl font-bold text-red-500">{dashboardData.summary.totalBreaches}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Incident Volume Trends</CardTitle>
                <CardDescription>
                  Daily incident creation and resolution patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="new" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="New Incidents"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      name="Resolved"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Performance</CardTitle>
                <CardDescription>
                  Resolution time and SLA breach tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="avgResolution" 
                      fill="hsl(var(--primary))" 
                      name="Avg Resolution (h)"
                    />
                    <Bar 
                      dataKey="breaches" 
                      fill="hsl(var(--destructive))" 
                      name="SLA Breaches"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Detected Patterns
                </CardTitle>
                <CardDescription>
                  AI-identified patterns in incident data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {patternData.map((pattern, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: pattern.color }}
                        />
                        <div>
                          <p className="font-medium">{pattern.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {pattern.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getConfidenceColor(pattern.confidence)}`} />
                        <span className="text-sm text-muted-foreground">
                          {pattern.confidence}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {patternData.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No patterns detected yet. More data needed for analysis.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pattern Distribution</CardTitle>
                <CardDescription>
                  Breakdown of pattern types by confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patternData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={patternData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, confidence }) => `${name}: ${confidence}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="confidence"
                      >
                        {patternData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No pattern data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Predictions</CardTitle>
              <CardDescription>
                Forecasted incident volume and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.predictions?.map((prediction) => (
                  <div key={prediction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">
                        {prediction.prediction_type.replace('_', ' ')} Prediction
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Target: {new Date(prediction.target_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{prediction.predicted_value}</p>
                      <Badge variant="outline">
                        {Math.round(prediction.confidence_level * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!dashboardData?.predictions || dashboardData.predictions.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">
                    No predictions available. AI models are learning from your data.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Team and individual performance analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics?.slice(0, 10).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{metric.metric_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {metric.metric_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{metric.metric_value}</p>
                      {metric.percentile_rank && (
                        <p className="text-sm text-muted-foreground">
                          {metric.percentile_rank}th percentile
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {(!performanceMetrics || performanceMetrics.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">
                    No performance metrics available. Metrics are calculated over time.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}