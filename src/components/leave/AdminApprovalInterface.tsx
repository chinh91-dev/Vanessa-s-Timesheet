import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { LeaveApplication, fetchLeaveApplications, approveLeaveApplication, rejectLeaveApplication, fetchLeaveAttachments, LeaveApplicationAttachment } from "@/lib/leave-service";
import { useToast } from "@/hooks/use-toast";
import { storageHelpers } from "@/lib/storage-utils";

const AdminApprovalInterface = () => {
  const [pendingApplications, setPendingApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, LeaveApplicationAttachment[]>>({});
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleViewAttachment = async (attachment: LeaveApplicationAttachment) => {
    setLoadingAttachmentId(attachment.id);
    try {
      const signedUrl = await storageHelpers.leaveAttachments.getSignedUrl(attachment.file_url);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        toast({
          title: "Unable to access file",
          description: "Could not generate access link for this attachment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error viewing attachment:", error);
      toast({
        title: "Error",
        description: "Failed to open attachment.",
        variant: "destructive",
      });
    } finally {
      setLoadingAttachmentId(null);
    }
  };

  useEffect(() => {
    loadPendingApplications();
  }, []);

  const loadPendingApplications = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaveApplications();
      const pendingApps = data.filter(app => app.status === 'pending');
      setPendingApplications(pendingApps);
      
      // Load attachments for each pending application
      const attachmentsData: Record<string, LeaveApplicationAttachment[]> = {};
      await Promise.all(
        pendingApps.map(async (app) => {
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
      toast({
        title: "Error",
        description: "Failed to load pending applications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      await approveLeaveApplication(applicationId, comments[applicationId]);
      toast({
        title: "Application Approved",
        description: "Leave application has been approved successfully.",
      });
      loadPendingApplications();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve application.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!comments[applicationId]) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(applicationId);
    try {
      await rejectLeaveApplication(applicationId, comments[applicationId]);
      toast({
        title: "Application Rejected",
        description: "Leave application has been rejected.",
      });
      loadPendingApplications();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject application.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (pendingApplications.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <h3 className="text-lg font-medium">No Pending Applications</h3>
          <p className="text-muted-foreground">All leave applications have been processed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingApplications.map((application) => (
        <Card key={application.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{application.user_full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{application.user_email}</p>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Leave Type</label>
                <p className="text-sm">{application.leave_type?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <p className="text-sm">{format(new Date(application.start_date), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <p className="text-sm">{format(new Date(application.end_date), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Business Days</label>
                <p className="text-sm">{application.business_days_count}</p>
              </div>
            </div>
            
            {application.reason && (
              <div>
                <label className="text-sm font-medium">Reason</label>
                <p className="text-sm text-muted-foreground">{application.reason}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Documentation</label>
              <div className="mt-1">
                {attachments[application.id]?.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAttachment(attachments[application.id][0])}
                    disabled={loadingAttachmentId === attachments[application.id][0].id}
                    className="p-2"
                  >
                    {loadingAttachmentId === attachments[application.id][0].id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-1" />
                    )}
                    View
                    {attachments[application.id].length > 1 && (
                      <span className="ml-1 text-xs">({attachments[application.id].length})</span>
                    )}
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-sm">None</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Manager Comments</label>
              <Textarea
                placeholder="Add comments (required for rejection)..."
                value={comments[application.id] || ""}
                onChange={(e) => setComments(prev => ({ ...prev, [application.id]: e.target.value }))}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => handleApprove(application.id)}
                disabled={processingId === application.id}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(application.id)}
                disabled={processingId === application.id}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminApprovalInterface;