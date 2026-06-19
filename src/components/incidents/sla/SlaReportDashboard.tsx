import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import { useIncidentProjects } from "@/hooks/useIncidents";
import { EnhancedSlaService } from "@/lib/enhanced-sla-service";
import { Clock, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function SlaReportDashboard() {
  const slaService = new EnhancedSlaService();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("7");
  
  const { data: projects = [] } = useIncidentProjects();

  const getDateRange = () => {
    const days = parseInt(dateRange, 10);
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  };

  const { data: slaReport, isLoading } = useQuery({
    queryKey: ['sla-breach-report', selectedProject, dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      return await slaService.generateSlaBreachReport(
        startDate,
        endDate,
        selectedProject || undefined
      );
    }
  });

  const { data: escalationHistory = [] } = useQuery({
    queryKey: ['escalation-history'],
    queryFn: () => slaService.getEscalationHistory("")
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Transform data for charts
  const priorityChartData = slaReport?.incidents_by_priority 
    ? Object.entries(slaReport.incidents_by_priority).map(([name, value]) => ({
        name,
        value: value as number
      }))
    : [];

  const projectChartData = slaReport?.incidents_by_project
    ? Object.entries(slaReport.incidents_by_project).map(([name, value]) => ({
        name,
        value: value as number
      }))
    : [];

  const slaComplianceRate = slaReport 
    ? ((slaReport.total_incidents - slaReport.response_breaches - slaReport.resolution_breaches) / slaReport.total_incidents)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">SLA Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor SLA compliance and identify performance trends
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                <p className="text-2xl font-bold">{slaReport?.total_incidents || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SLA Compliance</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPercentage(slaComplianceRate)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Breaches</p>
                <p className="text-2xl font-bold text-red-600">
                  {slaReport?.response_breaches || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolution Breaches</p>
                <p className="text-2xl font-bold text-orange-600">
                  {slaReport?.resolution_breaches || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* SLA Breach Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Breach Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Response SLA Performance</span>
              <span>
                {slaReport ? 
                  `${slaReport.total_incidents - slaReport.response_breaches}/${slaReport.total_incidents} incidents met SLA`
                  : "0/0"
                }
              </span>
            </div>
            <Progress 
              value={slaReport ? ((slaReport.total_incidents - slaReport.response_breaches) / slaReport.total_incidents) * 100 : 0}
              className="h-2"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Resolution SLA Performance</span>
              <span>
                {slaReport ? 
                  `${slaReport.total_incidents - slaReport.resolution_breaches}/${slaReport.total_incidents} incidents met SLA`
                  : "0/0"
                }
              </span>
            </div>
            <Progress 
              value={slaReport ? ((slaReport.total_incidents - slaReport.resolution_breaches) / slaReport.total_incidents) * 100 : 0}
              className="h-2"
            />
          </div>

          {slaReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Average Response Time
                </div>
                <div className="text-lg font-bold">
                  {slaReport.average_response_time ? 
                    `${(slaReport.average_response_time / 60).toFixed(2)}h` :
                    "N/A"
                  }
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Average Resolution Time
                </div>
                <div className="text-lg font-bold">
                  {slaReport.average_resolution_time ? 
                    `${(slaReport.average_resolution_time / 60).toFixed(2)}h` :
                    "N/A"
                  }
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Escalations */}
      {escalationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Escalations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {escalationHistory.slice(0, 5).map((escalation) => (
                <div key={escalation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      Incident #{escalation.incident_id}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {escalation.escalation_reason}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={escalation.notification_sent ? "default" : "secondary"}>
                      {escalation.notification_sent ? "Notified" : "Pending"}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(escalation.triggered_at), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}