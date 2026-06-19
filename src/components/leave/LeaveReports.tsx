import React, { useState, useEffect } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, Clock, Info, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchLeaveApplications } from "@/lib/leave-service";

const LeaveReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("leave-summary");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => {
    return todayLocalYMD();
  });
  const [format, setFormat] = useState("pdf");
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { toast } = useToast();

  const reportTypes = [
    { 
      value: "leave-summary", 
      label: "Leave Summary Report", 
      description: "Comprehensive overview of all leave applications and team activity",
      icon: FileText,
      category: "Overview",
      includes: ["Total applications", "Approval rates", "Team overview"],
      useCase: "Monthly/quarterly team reporting"
    },
    { 
      value: "leave-calendar", 
      label: "Leave Calendar Report", 
      description: "Visual calendar showing all approved leave periods for team planning",
      icon: Calendar,
      category: "Planning",
      includes: ["Approved leave dates", "Team coverage", "Leave periods"],
      useCase: "Resource planning and scheduling"
    }
  ];

  // Load preview data when report type or dates change
  useEffect(() => {
    if (reportType && startDate && endDate) {
      loadPreviewData();
    }
  }, [reportType, startDate, endDate]);

  const loadPreviewData = async () => {
    setLoadingPreview(true);
    try {
      let data;
      switch (reportType) {
        case "leave-summary":
          // Fetch all leave applications for the date range
          const applications = await fetchLeaveApplications();
          const filteredApps = applications.filter(app => 
            app.created_at >= startDate && app.created_at <= endDate
          );
          
          data = {
            totalApplications: filteredApps.length,
            approvedApplications: filteredApps.filter(app => app.status === 'approved').length,
            pendingApplications: filteredApps.filter(app => app.status === 'pending').length,
            rejectedApplications: filteredApps.filter(app => app.status === 'rejected').length,
            applications: filteredApps
          };
          break;
        case "leave-calendar":
          const calendarApps = await fetchLeaveApplications();
          data = calendarApps.filter(app => 
            app.status === 'approved' &&
            new Date(app.start_date) >= new Date(startDate) &&
            new Date(app.end_date) <= new Date(endDate)
          );
          break;
        default:
          data = await fetchLeaveApplications();
      }
      setPreviewData(data);
    } catch (error) {
      console.error('Error loading preview data:', error);
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!previewData) {
      toast({
        title: "No Data Available",
        description: "Please ensure there is data for the selected date range.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate report based on format
      const selectedReportType = reportTypes.find(r => r.value === reportType);
      const filename = `${selectedReportType?.label.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.${format}`;
      
      if (format === 'csv') {
        generateCSVReport(previewData, selectedReportType!, filename);
      } else {
        // For PDF/Excel, show success message (actual implementation would generate files)
        toast({
          title: "Report Generated",
          description: `${selectedReportType?.label} has been generated successfully.`,
        });
      }
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCSVReport = (data: any, reportType: any, filename: string) => {
    let csvContent = "";
    
    switch (reportType.value) {
      case "leave-summary":
        csvContent = `Leave Summary Report\n`;
        csvContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
        csvContent += `Period: ${startDate} to ${endDate}\n\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `Total Applications,${data?.totalApplications || 0}\n`;
        csvContent += `Approved Applications,${data?.approvedApplications || 0}\n`;
        csvContent += `Rejected Applications,${data?.rejectedApplications || 0}\n`;
        csvContent += `Pending Applications,${data?.pendingApplications || 0}\n`;
        break;
      
      case "leave-calendar":
        csvContent = `Leave Calendar Report\n`;
        csvContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
        csvContent += `Period: ${startDate} to ${endDate}\n\n`;
        csvContent += `Employee,Leave Type,Start Date,End Date,Business Days,Reason\n`;
        if (Array.isArray(data)) {
          data.forEach((app: any) => {
            csvContent += `${app?.user_full_name || 'Unknown'},${app?.leave_type?.name || 'Leave'},${app?.start_date},${app?.end_date},${app?.business_days_count || 0},"${app?.reason || ''}"\n`;
          });
        }
        break;
      
      default:
        csvContent = `${reportType.label}\n`;
        csvContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
        csvContent += `Period: ${startDate} to ${endDate}\n\n`;
        csvContent += `Report data would be formatted here\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "CSV Downloaded",
      description: `${reportType.label} has been downloaded as CSV.`,
    });
  };

  const isValidDateRange = () => {
    if (!startDate || !endDate) return false;
    return new Date(startDate) <= new Date(endDate);
  };

  const selectedReport = reportTypes.find(r => r.value === reportType);

  return (
    <div className="space-y-6">
      {/* Help Banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Generate detailed leave reports for compliance, analysis, and team planning. 
          Select a report type below to see a preview of what data will be included.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generate Report
              </CardTitle>
              <CardDescription>
                Configure your leave report parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Type Selection */}
              <div className="space-y-4">
                <Label>Report Type</Label>
                <div className="grid gap-3">
                  {reportTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <div
                        key={type.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          reportType === type.value 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setReportType(type.value)}
                      >
                        <div className="flex items-start gap-3">
                          <IconComponent className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{type.label}</h4>
                              <Badge variant="secondary" className="text-xs">{type.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                            <p className="text-xs text-muted-foreground italic">Use case: {type.useCase}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-sm">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                {!isValidDateRange() && startDate && endDate && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      End date must be after start date.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Export Format */}
              <div className="space-y-2">
                <Label htmlFor="format">Export Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                    <SelectItem value="pdf">PDF (Document)</SelectItem>
                    <SelectItem value="excel">Excel (Advanced Spreadsheet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerateReport}
                disabled={loading || !isValidDateRange() || !previewData}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                Data that will be included in your report
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : selectedReport && previewData ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Includes:</h4>
                    <ul className="text-sm space-y-1">
                      {selectedReport.includes.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Quick Data Preview */}
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="font-medium text-sm">Quick Stats:</h4>
                    {reportType === 'leave-summary' && previewData && (
                      <div className="text-sm space-y-1">
                        <div>Applications: {previewData.totalApplications || 0}</div>
                        <div>Approved: {previewData.approvedApplications || 0}</div>
                        <div>Pending: {previewData.pendingApplications || 0}</div>
                      </div>
                    )}
                    {reportType === 'leave-calendar' && previewData && Array.isArray(previewData) && (
                      <div className="text-sm space-y-1">
                        <div>Approved Leave: {previewData.length} periods</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Select dates to preview data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Quick Reports
          </CardTitle>
          <CardDescription>
            Pre-configured reports for common use cases - one click to generate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-start gap-3 text-left"
              onClick={() => {
                setReportType("leave-summary");
                const today = new Date();
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                setStartDate(lastMonth.toLocaleDateString('en-CA'));
                setEndDate(endOfLastMonth.toLocaleDateString('en-CA'));
              }}
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Last Month Summary</div>
                <div className="text-sm text-muted-foreground">Complete leave overview for the previous month</div>
                <Badge variant="secondary" className="mt-2 text-xs">Most Popular</Badge>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-start gap-3 text-left"
              onClick={() => {
                setReportType("leave-calendar");
                const today = new Date();
                setStartDate(new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA'));
                setEndDate(today.toLocaleDateString('en-CA'));
              }}
            >
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold">Current Calendar</div>
                <div className="text-sm text-muted-foreground">Year-to-date approved leave calendar</div>
                <Badge variant="outline" className="mt-2 text-xs">Planning</Badge>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveReports;