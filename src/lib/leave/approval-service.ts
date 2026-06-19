import { supabase } from "@/integrations/supabase/client";
import { LeaveApplication } from "@/lib/leave-service";
import { LeaveApplicationService } from "./application-service";
import { TimesheetIntegrationService } from "./timesheet-integration-service";

export interface ApprovalWorkflowData {
  applicationId: string;
  decision: 'approved' | 'rejected';
  comments?: string;
  notifyApplicant?: boolean;
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export class ApprovalService {
  /**
   * Process leave application approval
   */
  static async processApproval(data: ApprovalWorkflowData): Promise<LeaveApplication> {
    try {
      const { applicationId, decision, comments, notifyApplicant = true } = data;

      // Get current user (approver)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user has approval permissions
      const canApprove = await this.canUserApprove(user.id);
      if (!canApprove) {
        throw new Error('You do not have permission to approve leave applications');
      }

      // Get the application details before approval
      const applications = await LeaveApplicationService.fetch();
      const application = applications.find(app => app.id === applicationId);
      
      if (!application) {
        throw new Error('Leave application not found');
      }

      if (application.status !== 'pending') {
        throw new Error('Only pending applications can be approved or rejected');
      }

      // Process the decision
      let updatedApplication: LeaveApplication;

      if (decision === 'approved') {
        // Check for existing timesheet entries
        const existingEntries = await TimesheetIntegrationService.checkExistingEntries(
          application.user_id,
          application.start_date,
          application.end_date
        );

        if (existingEntries.hasEntries) {
          throw new Error(
            `Cannot approve: Employee has ${existingEntries.entriesCount} timesheet entries during this period. ` +
            `Conflicting dates: ${existingEntries.conflictDates.join(', ')}`
          );
        }

        // Approve the application
        updatedApplication = await LeaveApplicationService.approve(applicationId, comments);

        // Lock the dates in timesheet (this is handled by database trigger)
        // But we can also do additional validation here if needed
        
      } else {
        // Reject the application
        updatedApplication = await LeaveApplicationService.reject(applicationId, comments || 'Application rejected');
      }

      // Log detailed approval action
      await this.logDetailedApprovalAction(updatedApplication, decision, user.id, comments);

      return updatedApplication;
    } catch (error) {
      console.error('Error in ApprovalService.processApproval:', error);
      throw error;
    }
  }

  /**
   * Bulk approval/rejection
   */
  static async processBulkApproval(
    applicationIds: string[],
    decision: 'approved' | 'rejected',
    comments?: string
  ): Promise<{
    successful: LeaveApplication[];
    failed: { id: string; error: string }[];
  }> {
    const successful: LeaveApplication[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const applicationId of applicationIds) {
      try {
        const result = await this.processApproval({
          applicationId,
          decision,
          comments,
          notifyApplicant: true,
        });
        successful.push(result);
      } catch (error) {
        failed.push({
          id: applicationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStats(
    filters: {
      startDate?: string;
      endDate?: string;
      approverId?: string;
    } = {}
  ): Promise<ApprovalStats> {
    try {
      let query = supabase
        .from('leave_applications')
        .select('status');

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.approverId) {
        query = query.eq('approved_by', filters.approverId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching approval stats:', error);
        throw error;
      }

      const stats = (data || []).reduce(
        (acc, item) => {
          acc[item.status as keyof ApprovalStats]++;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
      );

      return stats;
    } catch (error) {
      console.error('Error in ApprovalService.getApprovalStats:', error);
      throw error;
    }
  }

  /**
   * Get pending applications for approval
   */
  static async getPendingApplications(
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'created_at' | 'start_date';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    applications: LeaveApplication[];
    total: number;
  }> {
    try {
      const { limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'asc' } = options;

      // Get total count
      const { count, error: countError } = await supabase
        .from('leave_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (countError) {
        console.error('Error counting pending applications:', countError);
        throw countError;
      }

      // Get applications
      const applications = await LeaveApplicationService.fetch({
        status: 'pending',
      });

      // Sort applications
      const sortedApplications = applications.sort((a, b) => {
        const aValue = sortBy === 'created_at' ? new Date(a.created_at) : new Date(a.start_date);
        const bValue = sortBy === 'created_at' ? new Date(b.created_at) : new Date(b.start_date);
        
        if (sortOrder === 'asc') {
          return aValue.getTime() - bValue.getTime();
        } else {
          return bValue.getTime() - aValue.getTime();
        }
      });

      // Apply pagination
      const paginatedApplications = sortedApplications.slice(offset, offset + limit);

      return {
        applications: paginatedApplications,
        total: count || 0,
      };
    } catch (error) {
      console.error('Error in ApprovalService.getPendingApplications:', error);
      throw error;
    }
  }

  /**
   * Check if user can approve leave applications
   */
  static async canUserApprove(userId: string): Promise<boolean> {
    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking user approval permissions:', error);
        return false;
      }

      return userProfile?.role === 'admin';
    } catch (error) {
      console.error('Error in ApprovalService.canUserApprove:', error);
      return false;
    }
  }

  /**
   * Get approval history for an application
   */
  static async getApprovalHistory(applicationId: string): Promise<{
    application: LeaveApplication;
    history: Array<{
      action: string;
      timestamp: string;
      user_name: string;
      comments?: string;
    }>;
  }> {
    try {
      // Get application details
      const applications = await LeaveApplicationService.fetch();
      const application = applications.find(app => app.id === applicationId);

      if (!application) {
        throw new Error('Leave application not found');
      }

      // Get approval history from audit logs
      const { data: auditLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_name', 'Leave Application')
        .like('description', `%${applicationId}%`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching approval history:', error);
        throw error;
      }

      const history = (auditLogs || []).map(log => ({
        action: log.action,
        timestamp: log.created_at,
        user_name: log.user_name || 'System',
        comments: log.details?.manager_comments,
      }));

      return {
        application,
        history,
      };
    } catch (error) {
      console.error('Error in ApprovalService.getApprovalHistory:', error);
      throw error;
    }
  }

  /**
   * Validate approval decision
   */
  static async validateApprovalDecision(
    applicationId: string,
    decision: 'approved' | 'rejected'
  ): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    try {
      const issues: string[] = [];
      const warnings: string[] = [];

      // Get application
      const applications = await LeaveApplicationService.fetch();
      const application = applications.find(app => app.id === applicationId);

      if (!application) {
        issues.push('Leave application not found');
        return { valid: false, issues, warnings };
      }

      if (application.status !== 'pending') {
        issues.push('Only pending applications can be approved or rejected');
      }

      if (decision === 'approved') {
        // Check for past dates
        const startDate = new Date(application.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
          warnings.push('This leave application is for past dates');
        }

        // Check for existing timesheet entries
        const existingEntries = await TimesheetIntegrationService.checkExistingEntries(
          application.user_id,
          application.start_date,
          application.end_date
        );

        if (existingEntries.hasEntries) {
          issues.push(
            `Employee has ${existingEntries.entriesCount} timesheet entries during this period. ` +
            `Please ask the employee to remove entries for: ${existingEntries.conflictDates.join(', ')}`
          );
        }

        // Check leave balance
        // This would require implementing balance checking logic
        // For now, we'll add a warning
        warnings.push('Please verify the employee has sufficient leave balance');
      }

      return {
        valid: issues.length === 0,
        issues,
        warnings,
      };
    } catch (error) {
      console.error('Error in ApprovalService.validateApprovalDecision:', error);
      return {
        valid: false,
        issues: ['Error validating approval decision'],
        warnings: [],
      };
    }
  }

  /**
   * Log approval action for audit trail
   */
  private static async logApprovalAction(
    applicationId: string,
    decision: 'approved' | 'rejected',
    approverId: string,
    comments?: string
  ): Promise<void> {
    try {
      // Get approver name
      const { data: approver } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', approverId)
        .single();

      const approverName = approver?.full_name || approver?.email || 'Unknown';

      // This is typically handled by database triggers,
      // but we can add additional logging here if needed
      console.log(`Leave application ${applicationId} ${decision} by ${approverName}`, {
        comments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging approval action:', error);
      // Don't throw here, as this is just for logging
    }
  }

  /**
   * Log detailed approval action with enhanced context
   */
  private static async logDetailedApprovalAction(
    application: LeaveApplication,
    decision: 'approved' | 'rejected',
    approverId: string,
    comments?: string
  ): Promise<void> {
    try {
      // Get approver details
      const { data: approver } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', approverId)
        .single();

      const approverName = approver?.full_name || approver?.email || 'Unknown';
      const approverRole = approver?.role || 'unknown';

      // Get applicant details
      const { data: applicant } = await supabase
        .from('profiles')
        .select('full_name, email, organization')
        .eq('id', application.user_id)
        .single();

      const applicantName = applicant?.full_name || applicant?.email || 'Unknown';

      // Get leave type details
      const { data: leaveType } = await supabase
        .from('leave_types')
        .select('name')
        .eq('id', application.leave_type_id)
        .single();

      const leaveTypeName = leaveType?.name || 'Unknown Leave Type';

      // Create enhanced audit log entry
      const action = decision === 'approved' ? 'leave_application_approved' : 'leave_application_rejected';
      const description = `${decision === 'approved' ? 'Approved' : 'Rejected'} ${leaveTypeName} application for ${applicantName} from ${application.start_date} to ${application.end_date} (${application.business_days_count} business days)`;

      await supabase
        .from('audit_logs')
        .insert({
          user_id: approverId,
          user_name: approverName,
          action,
          entity_name: 'Leave Application',
          description,
          details: {
            application_id: application.id,
            applicant_id: application.user_id,
            applicant_name: applicantName,
            applicant_organization: applicant?.organization,
            approver_id: approverId,
            approver_name: approverName,
            approver_role: approverRole,
            leave_type_id: application.leave_type_id,
            leave_type_name: leaveTypeName,
            start_date: application.start_date,
            end_date: application.end_date,
            business_days_count: application.business_days_count,
            manager_comments: comments,
            approved_at: application.approved_at,
            decision,
            business_impact: {
              days_affected: application.business_days_count,
              leave_period: `${application.start_date} to ${application.end_date}`
            }
          }
        });
    } catch (error) {
      console.error('Error logging detailed approval action:', error);
      // Don't throw here, as this is just for logging
    }
  }
}