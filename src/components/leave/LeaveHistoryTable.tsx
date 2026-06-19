import React, { useState, useEffect } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Search, Eye, Calendar, X, Download, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import { LeaveApplication, fetchLeaveApplications, cancelLeaveApplication, deleteLeaveApplication, fetchLeaveAttachments, LeaveApplicationAttachment, fetchLeaveTypes } from "@/lib/leave-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  exportLeaveApplicationsToCSV,
  exportLeaveApplicationsToExcel,
  exportLeaveApplicationsToPDF
} from "@/lib/leave-export-utils";

interface LeaveHistoryTableProps {
  userId?: string;
}

const LeaveHistoryTable = ({ userId }: LeaveHistoryTableProps) => {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: "", end: "" });
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, LeaveApplicationAttachment[]>>({});
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const isAdmin = userRole === "admin";

  useEffect(() => {
    const loadApplications = async () => {
      setLoading(true);
      try {
        const [applicationsData, leaveTypesData] = await Promise.all([
          fetchLeaveApplications(userId),
          fetchLeaveTypes()
        ]);
        
        setApplications(applicationsData);
        setFilteredApplications(applicationsData);
        setLeaveTypes(leaveTypesData);
        
        // Extract unique employees for filter (admin only)
        if (isAdmin) {
          const uniqueEmployees = Array.from(
            new Map(
              applicationsData.map(app => [
                app.user_id,
                { id: app.user_id, name: app.user_full_name, email: app.user_email }
              ])
            ).values()
          ).filter(emp => emp.name); // Only include employees with names
          setEmployees(uniqueEmployees);
        }
        
        // Load attachments for each application
        const attachmentsData: Record<string, LeaveApplicationAttachment[]> = {};
        await Promise.all(
          applicationsData.map(async (app) => {
            try {
              const appAttachments = await fetchLeaveAttachments(app.id);
              attachmentsData[app.id] = appAttachments;
            } catch (error) {
              console.error(`Error loading attachments for application ${app.id}:`, error);
              attachmentsData[app.id] = [];
            }
          })
        );
        setAttachments(attachmentsData);
      } catch (error) {
        console.error("Error loading leave applications:", error);
        toast({
          title: "Error",
          description: "Failed to load leave applications. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [userId, toast, isAdmin, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel(`leave-history-${userId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leave_applications" },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    let filtered = applications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.leave_type?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.user_full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Filter by leave type
    if (leaveTypeFilter !== "all") {
      filtered = filtered.filter((app) => app.leave_type_id === leaveTypeFilter);
    }

    // Filter by employee (admin only)
    if (employeeFilter !== "all" && isAdmin) {
      filtered = filtered.filter((app) => app.user_id === employeeFilter);
    }

    // Filter by year
    if (yearFilter !== "all") {
      const year = parseInt(yearFilter, 10);
      filtered = filtered.filter((app) => {
        const appYear = new Date(app.start_date).getFullYear();
        return appYear === year;
      });
    }

    // Filter by date range
    if (dateRangeFilter.start) {
      filtered = filtered.filter((app) => new Date(app.start_date) >= new Date(dateRangeFilter.start));
    }
    if (dateRangeFilter.end) {
      filtered = filtered.filter((app) => new Date(app.end_date) <= new Date(dateRangeFilter.end));
    }

    setFilteredApplications(filtered);
  }, [applications, searchTerm, statusFilter, leaveTypeFilter, employeeFilter, yearFilter, dateRangeFilter, isAdmin]);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      cancelled: "outline",
    };
    return <Badge variant={variants[status as keyof typeof variants] as any}>{status}</Badge>;
  };

  const handleViewAttachment = (attachment: LeaveApplicationAttachment) => {
    window.open(attachment.file_url, '_blank');
  };

  const handleCancelApplication = async (applicationId: string) => {
    try {
      await cancelLeaveApplication(applicationId);
      toast({
        title: "Application Cancelled",
        description: "Your leave application has been cancelled successfully.",
      });
      
      // Refresh applications
      const data = await fetchLeaveApplications(userId);
      setApplications(data);
    } catch (error) {
      console.error("Error cancelling application:", error);
      toast({
        title: "Error",
        description: "Failed to cancel leave application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    try {
      await deleteLeaveApplication(applicationId);
      toast({
        title: "Application Deleted",
        description: "The leave application has been permanently deleted.",
      });
      
      // Refresh applications
      const data = await fetchLeaveApplications(userId);
      setApplications(data);
    } catch (error) {
      console.error("Error deleting application:", error);
      toast({
        title: "Error",
        description: "Failed to delete leave application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (filteredApplications.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please adjust your filters to include some applications.",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(true);
    try {
      const timestamp = todayLocalYMD();
      const filename = `leave-applications-${timestamp}`;

      switch (format) {
        case 'csv':
          await exportLeaveApplicationsToCSV(
            filteredApplications,
            isAdmin,
            filename,
            searchTerm,
            statusFilter
          );
          break;
        case 'excel':
          await exportLeaveApplicationsToExcel(
            filteredApplications,
            isAdmin,
            filename,
            searchTerm,
            statusFilter
          );
          break;
        case 'pdf':
          await exportLeaveApplicationsToPDF(
            filteredApplications,
            isAdmin,
            filename,
            searchTerm,
            statusFilter
          );
          break;
      }

      toast({
        title: "Export Successful",
        description: `Leave applications exported to ${format.toUpperCase()} successfully.`,
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get unique years from applications
  const availableYears = Array.from(
    new Set(
      applications.map(app => new Date(app.start_date).getFullYear())
    )
  ).sort((a, b) => b - a);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setLeaveTypeFilter("all");
    setEmployeeFilter("all");
    setYearFilter("all");
    setDateRangeFilter({ start: "", end: "" });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-4">
        {/* Primary Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Secondary Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leave Types</SelectItem>
              {leaveTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Start Date From</label>
              <Input
                type="date"
                value={dateRangeFilter.start}
                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">End Date To</label>
              <Input
                type="date"
                value={dateRangeFilter.end}
                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
          
          {(searchTerm || statusFilter !== "all" || leaveTypeFilter !== "all" || 
            employeeFilter !== "all" || yearFilter !== "all" || 
            dateRangeFilter.start || dateRangeFilter.end) && (
            <Button variant="outline" onClick={clearFilters} className="whitespace-nowrap">
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Export Section */}
      {filteredApplications.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''} found
            {(searchTerm || statusFilter !== 'all' || leaveTypeFilter !== 'all' || 
              employeeFilter !== 'all' || yearFilter !== 'all' || 
              dateRangeFilter.start || dateRangeFilter.end) && ' (filtered)'}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exportLoading}
            >
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={exportLoading}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={exportLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Leave Applications Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No applications match your current filters."
                  : "No leave applications have been submitted yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Documentation</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Employee</TableHead>}
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.leave_type?.name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(application.start_date), "MMM dd, yyyy")}</div>
                        <div className="text-muted-foreground">
                          to {format(new Date(application.end_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{application.business_days_count}</TableCell>
                    <TableCell>
                      {attachments[application.id]?.length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAttachment(attachments[application.id][0])}
                          className="p-2"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                          {attachments[application.id].length > 1 && (
                            <span className="ml-1 text-xs">({attachments[application.id].length})</span>
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{application.user_full_name}</div>
                          <div className="text-muted-foreground">{application.user_email}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {format(new Date(application.submitted_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Leave Application Details</DialogTitle>
                              <DialogDescription>
                                Application submitted on{" "}
                                {format(new Date(application.submitted_at), "PPP")}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedApplication && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Leave Type</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedApplication.leave_type?.name}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedApplication.status)}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Start Date</label>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(selectedApplication.start_date), "PPP")}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">End Date</label>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(selectedApplication.end_date), "PPP")}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Business Days</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedApplication.business_days_count}
                                    </p>
                                  </div>
                                  {isAdmin && (
                                    <div>
                                      <label className="text-sm font-medium">Employee</label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedApplication.user_full_name}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {selectedApplication.reason && (
                                  <div>
                                    <label className="text-sm font-medium">Reason</label>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {selectedApplication.reason}
                                    </p>
                                  </div>
                                )}
                                {selectedApplication.manager_comments && (
                                  <div>
                                    <label className="text-sm font-medium">Manager Comments</label>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {selectedApplication.manager_comments}
                                    </p>
                                  </div>
                                )}
                                {selectedApplication.approved_at && (
                                  <div>
                                    <label className="text-sm font-medium">
                                      {selectedApplication.status === "approved" ? "Approved" : "Processed"}
                                    </label>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(selectedApplication.approved_at), "PPP")} by{" "}
                                      {selectedApplication.approved_by_name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {application.status === "pending" && !isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelApplication(application.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Leave Application</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete this leave application? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteApplication(application.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveHistoryTable;