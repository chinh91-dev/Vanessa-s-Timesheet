import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Calendar, Download, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OHSAnalyticsService } from '@/lib/ohs/analytics-service';
import { OHSWorkflowService } from '@/lib/ohs/workflow-service';
import { useToast } from '@/hooks/use-toast';
import { escapeHtml } from '@/utils/html-generation.utils';
import { csvRowFromFields } from '@/utils/csv-generation.utils';
import { todayLocalYMD } from '@/lib/date-utils';
import { useAuth } from '@/context/AuthContext';

interface ReportFilter {
  dateRange: { start: string; end: string };
  entityType: 'all' | 'hazards' | 'inspections' | 'injuries';
  status: string;
  priority: string;
  site: string;
}

const OHSAdvancedReporting = () => {
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
      end: todayLocalYMD(),
    },
    entityType: 'all',
    status: 'all',
    priority: 'all',
    site: 'all',
  });
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    generateReport();
  }, [filters]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [metrics, complianceReport] = await Promise.all([
        OHSAnalyticsService.getDashboardMetrics(filters.dateRange),
        OHSWorkflowService.generateComplianceReport(filters.dateRange),
      ]);

      setReportData({
        metrics,
        compliance: complianceReport,
        generatedAt: new Date().toISOString(),
        filters: { ...filters },
      });
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!reportData) return;

    try {
      const reportContent = {
        title: 'OHS Advanced Report',
        generatedAt: reportData.generatedAt,
        period: `${filters.dateRange.start} to ${filters.dateRange.end}`,
        filters,
        data: reportData,
      };

      if (format === 'csv') {
        exportToCSV(reportContent);
      } else if (format === 'excel') {
        exportToExcel(reportContent);
      } else {
        exportToPDF(reportContent);
      }

      toast({
        title: "Export Successful",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = (data: any) => {
    const csvData = [];
    
    // Summary data
    csvData.push(['OHS Report Summary']);
    csvData.push(['Generated At', data.generatedAt]);
    csvData.push(['Period', data.period]);
    csvData.push(['']);
    
    // Metrics
    csvData.push(['Metrics']);
    csvData.push(['Total Hazards', data.data.metrics.hazards.total]);
    csvData.push(['Total Inspections', data.data.metrics.inspections.total]);
    csvData.push(['Total Injuries', data.data.metrics.injuries.total]);
    csvData.push(['Overall Compliance', `${data.data.metrics.compliance.overallScore}%`]);
    csvData.push(['']);
    
    // Hazard breakdown
    csvData.push(['Hazard Status Breakdown']);
    Object.entries(data.data.metrics.hazards.byStatus).forEach(([status, count]) => {
      csvData.push([status, count]);
    });

    const csvContent = csvData.map(row => csvRowFromFields(row as (string | number | null | undefined)[])).join('\n');
    downloadFile(csvContent, 'ohs-report.csv', 'text/csv');
  };

  const exportToExcel = (data: any) => {
    // For a real implementation, you'd use a library like xlsx
    // For now, we'll create a structured text format
    const content = JSON.stringify(data, null, 2);
    downloadFile(content, 'ohs-report.json', 'application/json');
  };

  const exportToPDF = (data: any) => {
    const htmlContent = `
      <html>
        <head>
          <title>OHS Advanced Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .metric { display: flex; justify-content: space-between; padding: 5px 0; }
            .chart-section { page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>OHS Advanced Report</h1>
            <p>Generated: ${escapeHtml(new Date(data.generatedAt).toLocaleString())}</p>
            <p>Period: ${escapeHtml(String(data.period ?? ''))}</p>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <div class="metric">
              <span>Overall Compliance Score:</span>
              <span>${data.data.metrics.compliance.overallScore}%</span>
            </div>
            <div class="metric">
              <span>Total Hazards:</span>
              <span>${data.data.metrics.hazards.total}</span>
            </div>
            <div class="metric">
              <span>Total Inspections:</span>
              <span>${data.data.metrics.inspections.total}</span>
            </div>
            <div class="metric">
              <span>Total Injuries:</span>
              <span>${data.data.metrics.injuries.total}</span>
            </div>
          </div>

          <div class="section">
            <h2>Hazard Analysis</h2>
            <table>
              <thead>
                <tr><th>Status</th><th>Count</th></tr>
              </thead>
              <tbody>
                ${Object.entries(data.data.metrics.hazards.byStatus)
                  .map(([status, count]) => `<tr><td>${escapeHtml(String(status))}</td><td>${escapeHtml(String(count ?? ''))}</td></tr>`)
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Key Performance Indicators</h2>
            <div class="metric">
              <span>LTIFR (Lost Time Injury Frequency Rate):</span>
              <span>${data.data.metrics.trends.kpis.ltifr}</span>
            </div>
            <div class="metric">
              <span>TRIFR (Total Recordable Injury Frequency Rate):</span>
              <span>${data.data.metrics.trends.kpis.trifr}</span>
            </div>
            <div class="metric">
              <span>Hazard Closure Rate:</span>
              <span>${data.data.metrics.trends.kpis.hazardClosureRate}%</span>
            </div>
            <div class="metric">
              <span>Inspection Score:</span>
              <span>${data.data.metrics.trends.kpis.inspectionScore}%</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const updateFilter = (key: keyof ReportFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced OHS Reporting</h2>
          <p className="text-muted-foreground">Comprehensive analytics and compliance reporting</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('excel')}>
            <FileText className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DateRangePicker
                value={{
                  from: new Date(filters.dateRange.start),
                  to: new Date(filters.dateRange.end),
                }}
                onChange={(range) => {
                  if (range?.from && range?.to) {
                    updateFilter('dateRange', {
                      start: range.from.toLocaleDateString('en-CA'),
                      end: range.to.toLocaleDateString('en-CA'),
                    });
                  }
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Entity Type</label>
              <Select value={filters.entityType} onValueChange={(value) => updateFilter('entityType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hazards">Hazards</SelectItem>
                  <SelectItem value="inspections">Inspections</SelectItem>
                  <SelectItem value="injuries">Injuries</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority/Risk</label>
              <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Extreme">Extreme Risk</SelectItem>
                  <SelectItem value="High">High Risk</SelectItem>
                  <SelectItem value="Medium">Medium Risk</SelectItem>
                  <SelectItem value="Low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Site Area</label>
              <Select value={filters.site} onValueChange={(value) => updateFilter('site', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  <SelectItem value="Main Building">Main Building</SelectItem>
                  <SelectItem value="Warehouse">Warehouse</SelectItem>
                  <SelectItem value="Production Floor">Production Floor</SelectItem>
                  <SelectItem value="Office Building">Office Building</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={generateReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Executive Summary</TabsTrigger>
            <TabsTrigger value="trends">Trends & Analytics</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="details">Detailed Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overall Compliance</p>
                      <p className="text-3xl font-bold">{reportData.metrics.compliance.overallScore}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                      <p className="text-3xl font-bold">
                        {reportData.metrics.hazards.total + reportData.metrics.injuries.total}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">LTIFR</p>
                      <p className="text-3xl font-bold">{reportData.metrics.trends.kpis.ltifr}</p>
                    </div>
                    <Badge variant={reportData.metrics.trends.kpis.ltifr < 2 ? "default" : "destructive"}>
                      {reportData.metrics.trends.kpis.ltifr < 2 ? "Good" : "High"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Closure Rate</p>
                      <p className="text-3xl font-bold">{reportData.metrics.trends.kpis.hazardClosureRate}%</p>
                    </div>
                    <Badge variant={reportData.metrics.trends.kpis.hazardClosureRate > 80 ? "default" : "secondary"}>
                      {reportData.metrics.trends.kpis.hazardClosureRate > 80 ? "Good" : "Monitor"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Hazard Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(reportData.metrics.hazards.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span>{status}</span>
                        <Badge variant="outline">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Injury Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(reportData.metrics.injuries.bySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex justify-between">
                        <span>{severity}</span>
                        <Badge variant="outline">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Advanced trend charts and analytics would be displayed here</p>
                  <p className="text-sm">Integration with charting libraries like Chart.js or D3.js recommended</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Compliance Scores</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Hazard Compliance</span>
                          <span>{reportData.metrics.compliance.hazardCompliance}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inspection Compliance</span>
                          <span>{reportData.metrics.compliance.inspectionCompliance}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Injury Reporting</span>
                          <span>{reportData.metrics.compliance.injuryReportingCompliance}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Regulatory Compliance</span>
                          <span>{reportData.metrics.compliance.regulatoryCompliance}%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Key Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>High Risk Items</span>
                          <Badge variant="destructive">{reportData.metrics.hazards.highRisk}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Overdue Items</span>
                          <Badge variant="destructive">{reportData.metrics.hazards.overdue}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Resolution</span>
                          <span>{reportData.metrics.hazards.avgResolutionTime} days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Detailed data tables and breakdowns would be displayed here</p>
                  <p className="text-sm">Including filterable tables for hazards, inspections, and injuries</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default OHSAdvancedReporting;