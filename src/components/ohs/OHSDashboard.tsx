import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { OHSAnalyticsService, OHSMetrics } from '@/lib/ohs/analytics-service';
import { useToast } from '@/hooks/use-toast';

const OHSDashboard = () => {
  const [metrics, setMetrics] = useState<OHSMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await OHSAnalyticsService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hazards</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.hazards.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge variant={metrics.hazards.highRisk > 0 ? "destructive" : "secondary"} className="mr-2">
                {metrics.hazards.highRisk} High Risk
              </Badge>
              {metrics.hazards.overdue > 0 && (
                <Badge variant="destructive">
                  {metrics.hazards.overdue} Overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspection Compliance</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inspections.complianceRate}%</div>
            <Progress value={metrics.inspections.complianceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.inspections.total} total inspections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Injuries</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.injuries.total}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>LTIFR: {metrics.trends.kpis.ltifr}</span>
              <span>•</span>
              <span>TRIFR: {metrics.trends.kpis.trifr}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.compliance.overallScore}%</div>
            <Progress value={metrics.compliance.overallScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Regulatory compliance score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="hazards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hazards">Hazard Analysis</TabsTrigger>
          <TabsTrigger value="inspections">Inspection Results</TabsTrigger>
          <TabsTrigger value="injuries">Injury Analysis</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
        </TabsList>

        <TabsContent value="hazards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Hazards by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.hazards.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm">{status}</span>
                      <Badge variant={getStatusVariant(status)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.hazards.byRiskLevel).map(([level, count]) => (
                    <div key={level} className="flex justify-between items-center">
                      <span className="text-sm">{level}</span>
                      <Badge variant={getRiskVariant(level)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hazards by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.hazards.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm">{category}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Resolution Time</span>
                      <span>{metrics.hazards.avgResolutionTime} days</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Closure Rate</span>
                      <span>{metrics.trends.kpis.hazardClosureRate}%</span>
                    </div>
                    <Progress value={metrics.trends.kpis.hazardClosureRate} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.inspections.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm">{status}</span>
                      <Badge variant={getInspectionStatusVariant(status)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inspections by Area</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.inspections.bySiteArea).map(([area, count]) => (
                    <div key={area} className="flex justify-between items-center">
                      <span className="text-sm">{area}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Compliance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.inspections.trendsOverTime.slice(-6).map((trend, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{trend.date}</span>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">{trend.compliant} Compliant</Badge>
                        <Badge className="bg-red-100 text-red-800">{trend.nonCompliant} Non-Compliant</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="injuries" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Injuries by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.injuries.bySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <span className="text-sm">{severity}</span>
                      <Badge variant={getSeverityVariant(severity)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Injuries by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.injuries.byLocation).map(([location, count]) => (
                    <div key={location} className="flex justify-between items-center">
                      <span className="text-sm">{location}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Safety Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{metrics.trends.kpis.ltifr}</div>
                    <div className="text-xs text-muted-foreground">LTIFR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{metrics.trends.kpis.trifr}</div>
                    <div className="text-xs text-muted-foreground">TRIFR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{metrics.injuries.nearMisses}</div>
                    <div className="text-xs text-muted-foreground">Near Misses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{metrics.injuries.medicalTreatmentCases}</div>
                    <div className="text-xs text-muted-foreground">Medical Treatment</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Hazard Compliance</span>
                      <span>{metrics.compliance.hazardCompliance}%</span>
                    </div>
                    <Progress value={metrics.compliance.hazardCompliance} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Inspection Compliance</span>
                      <span>{metrics.compliance.inspectionCompliance}%</span>
                    </div>
                    <Progress value={metrics.compliance.inspectionCompliance} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Injury Reporting</span>
                      <span>{metrics.compliance.injuryReportingCompliance}%</span>
                    </div>
                    <Progress value={metrics.compliance.injuryReportingCompliance} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Regulatory Compliance</span>
                      <span>{metrics.compliance.regulatoryCompliance}%</span>
                    </div>
                    <Progress value={metrics.compliance.regulatoryCompliance} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall Compliance Score</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary">{metrics.compliance.overallScore}%</div>
                  <div className="text-muted-foreground">Overall Score</div>
                  <Badge 
                    variant={metrics.compliance.overallScore >= 90 ? "default" : 
                            metrics.compliance.overallScore >= 70 ? "secondary" : "destructive"}
                    className="mt-2"
                  >
                    {metrics.compliance.overallScore >= 90 ? "Excellent" :
                     metrics.compliance.overallScore >= 70 ? "Good" : "Needs Improvement"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions for badge variants
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Closed': return 'default';
    case 'In Progress': return 'secondary';
    case 'Open': return 'destructive';
    default: return 'outline';
  }
};

const getRiskVariant = (level: string) => {
  switch (level) {
    case 'Extreme': return 'destructive';
    case 'High': return 'destructive';
    case 'Medium': return 'secondary';
    case 'Low': return 'outline';
    case 'Very Low': return 'default';
    default: return 'outline';
  }
};

const getInspectionStatusVariant = (status: string) => {
  switch (status) {
    case 'Compliant': return 'default';
    case 'Non-Compliant': return 'destructive';
    case 'Requires Action': return 'secondary';
    default: return 'outline';
  }
};

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'Fatality': return 'destructive';
    case 'Permanent Disability': return 'destructive';
    case 'Lost Time': return 'destructive';
    case 'Medical Treatment': return 'secondary';
    case 'First Aid': return 'outline';
    default: return 'outline';
  }
};

export default OHSDashboard;