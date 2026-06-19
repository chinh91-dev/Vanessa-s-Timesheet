import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminApprovalInterface from "@/components/leave/AdminApprovalInterface";
import LeaveHistoryTable from "@/components/leave/LeaveHistoryTable";
import TeamLeaveCalendar from "@/components/leave/TeamLeaveCalendar";
import AdminLeaveSubmissionForm from "@/components/leave/AdminLeaveSubmissionForm";
import { Badge } from "@/components/ui/badge";
import { useLeaveRealtime } from "@/hooks/useLeaveRealtime";

const LeaveManagementPage = () => {
  // Enable real-time updates for leave applications
  useLeaveRealtime();
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">
            Manage leave applications and team calendar
          </p>
        </div>
        <Badge variant="secondary">Admin Only</Badge>
      </div>

      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="submit-for-employee">Submit for Employee</TabsTrigger>
          <TabsTrigger value="calendar">Team Calendar</TabsTrigger>
          <TabsTrigger value="all-history">All Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Leave Applications</CardTitle>
              <CardDescription>
                Review and approve or reject pending leave applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminApprovalInterface />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submit-for-employee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Leave for Employee</CardTitle>
              <CardDescription>
                Submit leave on behalf of any employee. The leave will be automatically approved and timesheet dates will be locked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminLeaveSubmissionForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <TeamLeaveCalendar />
        </TabsContent>

        <TabsContent value="all-history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Leave Applications</CardTitle>
              <CardDescription>
                View all leave applications across the organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveHistoryTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaveManagementPage;