import { supabase } from "@/integrations/supabase/client";
import { LeaveApplication, LeaveApplicationAttachment } from "@/lib/leave-service";
import { TimesheetIntegrationService } from "./timesheet-integration-service";

export interface CreateLeaveApplicationData {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface UpdateLeaveApplicationData {
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  manager_comments?: string;
  approved_by?: string;
  approved_at?: string;
}

export class LeaveApplicationService {
  /**
   * Create a new leave application
   */
  static async create(applicationData: CreateLeaveApplicationData): Promise<LeaveApplication> {
    try {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Calculate business days
      const businessDays = await this.calculateBusinessDays(
        applicationData.start_date,
        applicationData.end_date
      );

      const { data, error } = await supabase
        .from('leave_applications')
        .insert({
          ...applicationData,
          user_id: user.id,
          business_days_count: businessDays,
        })
        .select(`
          *,
          leave_type:leave_types(*),
          user:profiles!leave_applications_user_id_fkey(full_name, email)
        `)
        .single();

      if (error) {
        console.error('Error creating leave application:', error);
        throw error;
      }

      const application = {
        ...data,
        user_full_name: data.user?.full_name,
        user_email: data.user?.email,
      };

      // Send notification to admins
      try {
        await this.notifyAdminsOfNewApplication(application);
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
      }

      return application;
    } catch (error) {
      console.error('Error in LeaveApplicationService.create:', error);
      throw error;
    }
  }

  /**
   * Create a leave application on behalf of an employee (admin only)
   * This auto-approves the leave and locks the timesheet dates
   */
  static async createOnBehalfOf(
    targetUserId: string,
    applicationData: CreateLeaveApplicationData
  ): Promise<LeaveApplication> {
    try {
      // Get the authenticated admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check for existing timesheet entries on these dates
      const existingEntries = await TimesheetIntegrationService.checkExistingEntries(
        targetUserId,
        applicationData.start_date,
        applicationData.end_date
      );

      if (existingEntries.hasEntries) {
        throw new Error(
          `Cannot submit leave: Employee has ${existingEntries.entriesCount} timesheet entries during this period. ` +
          `Conflicting dates: ${existingEntries.conflictDates.join(', ')}`
        );
      }

      // Calculate business days
      const businessDays = await this.calculateBusinessDays(
        applicationData.start_date,
        applicationData.end_date
      );

      // Create leave application with auto-approved status
      const { data, error } = await supabase
        .from('leave_applications')
        .insert({
          ...applicationData,
          user_id: targetUserId,
          business_days_count: businessDays,
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          manager_comments: 'Submitted by admin on behalf of employee'
        })
        .select(`
          *,
          leave_type:leave_types(*),
          user:profiles!leave_applications_user_id_fkey(full_name, email)
        `)
        .single();

      if (error) {
        console.error('Error creating leave application on behalf:', error);
        throw error;
      }

      const application = {
        ...data,
        user_full_name: data.user?.full_name,
        user_email: data.user?.email,
      };

      // Lock the timesheet dates
      try {
        await TimesheetIntegrationService.lockLeaveDates(
          targetUserId,
          applicationData.start_date,
          applicationData.end_date,
          application.id
        );
      } catch (lockError) {
        console.error('Error locking leave dates:', lockError);
        // Don't throw - leave is still approved, just log the error
      }

      // Notify the employee
      try {
        await this.notifyApplicantOfDecision({
          ...application,
          approved_by_name: 'Admin'
        });
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
      }

      return application;
    } catch (error) {
      console.error('Error in LeaveApplicationService.createOnBehalfOf:', error);
      throw error;
    }
  }

  /**
   * Update an existing leave application
   */
  static async update(
    applicationId: string,
    updates: UpdateLeaveApplicationData
  ): Promise<LeaveApplication> {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .update(updates)
        .eq('id', applicationId)
        .select(`
          *,
          leave_type:leave_types(*),
          user:profiles!leave_applications_user_id_fkey(full_name, email),
          approved_by_profile:profiles!leave_applications_approved_by_fkey(full_name)
        `)
        .single();

      if (error) {
        console.error('Error updating leave application:', error);
        throw error;
      }

      const application = {
        ...data,
        user_full_name: data.user?.full_name,
        user_email: data.user?.email,
        approved_by_name: data.approved_by_profile?.full_name,
      };

      // Send notification if status changed
      if (updates.status && ['approved', 'rejected'].includes(updates.status)) {
        try {
          await this.notifyApplicantOfDecision(application);
        } catch (notificationError) {
          console.warn('Failed to send notification:', notificationError);
        }
      }

      return application;
    } catch (error) {
      console.error('Error in LeaveApplicationService.update:', error);
      throw error;
    }
  }

  /**
   * Fetch leave applications with filters
   */
  static async fetch(options: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<LeaveApplication[]> {
    try {
      let query = supabase
        .from('leave_applications')
        .select(`
          *,
          leave_type:leave_types(*),
          user:profiles!leave_applications_user_id_fkey(full_name, email),
          approved_by_profile:profiles!leave_applications_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.startDate) {
        query = query.gte('start_date', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('end_date', options.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leave applications:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        user_full_name: item.user?.full_name,
        user_email: item.user?.email,
        approved_by_name: item.approved_by_profile?.full_name,
      }));
    } catch (error) {
      console.error('Error in LeaveApplicationService.fetch:', error);
      throw error;
    }
  }

  /**
   * Approve a leave application
   */
  static async approve(
    applicationId: string,
    managerComments?: string
  ): Promise<LeaveApplication> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      return await this.update(applicationId, {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        manager_comments: managerComments,
      });
    } catch (error) {
      console.error('Error in LeaveApplicationService.approve:', error);
      throw error;
    }
  }

  /**
   * Reject a leave application
   */
  static async reject(
    applicationId: string,
    managerComments: string
  ): Promise<LeaveApplication> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      return await this.update(applicationId, {
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        manager_comments: managerComments,
      });
    } catch (error) {
      console.error('Error in LeaveApplicationService.reject:', error);
      throw error;
    }
  }

  /**
   * Cancel a leave application
   */
  static async cancel(applicationId: string): Promise<LeaveApplication> {
    try {
      return await this.update(applicationId, { status: 'cancelled' });
    } catch (error) {
      console.error('Error in LeaveApplicationService.cancel:', error);
      throw error;
    }
  }

  /**
   * Calculate business days between two dates
   */
  private static async calculateBusinessDays(
    startDate: string,
    endDate: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_business_days', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) {
        console.error('Error calculating business days:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in calculateBusinessDays:', error);
      throw error;
    }
  }

  /**
   * Send notification to admins about new leave application
   */
  private static async notifyAdminsOfNewApplication(application: LeaveApplication): Promise<void> {
    try {
      await supabase.functions.invoke('send-leave-notifications', {
        body: {
          type: 'new_leave_application',
          data: {
            applicant_name: application.user_full_name,
            applicant_email: application.user_email,
            leave_type: application.leave_type?.name,
            start_date: application.start_date,
            end_date: application.end_date,
            business_days_count: application.business_days_count,
            reason: application.reason,
            application_id: application.id,
          },
        },
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to applicant about decision
   */
  private static async notifyApplicantOfDecision(application: LeaveApplication): Promise<void> {
    try {
      await supabase.functions.invoke('send-leave-notifications', {
        body: {
          type: 'leave_decision',
          data: {
            applicant_email: application.user_email,
            applicant_name: application.user_full_name,
            leave_type: application.leave_type?.name,
            start_date: application.start_date,
            end_date: application.end_date,
            status: application.status,
            manager_comments: application.manager_comments,
            approved_by_name: application.approved_by_name,
          },
        },
      });
    } catch (error) {
      console.error('Error sending applicant notification:', error);
      throw error;
    }
  }
}