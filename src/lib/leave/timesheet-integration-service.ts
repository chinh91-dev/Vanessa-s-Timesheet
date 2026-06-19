import { supabase } from "@/integrations/supabase/client";
import { getMondayFirstDayOfWeek } from "@/lib/date-utils";

export interface TimesheetLockInfo {
  isLocked: boolean;
  lockReason: string | null;
  lockType: 'manual' | 'leave' | 'none';
  lockedUntil: string | null;
  canOverride: boolean;
}

export interface LeaveValidationResult {
  canLog: boolean;
  reason: string;
  isHoliday: boolean;
  isLeaveDay: boolean;
  isWeekend: boolean;
}

export class TimesheetIntegrationService {
  /**
   * Check if a date is locked for timesheet entries
   */
  static async checkDateLock(
    userId: string,
    entryDate: string
  ): Promise<TimesheetLockInfo> {
    try {
      // Get work schedule and lock information
      const { data: workSchedule, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching work schedule:', error);
        return {
          isLocked: false,
          lockReason: null,
          lockType: 'none',
          lockedUntil: null,
          canOverride: false,
        };
      }

      if (!workSchedule) {
        return {
          isLocked: false,
          lockReason: null,
          lockType: 'none',
          lockedUntil: null,
          canOverride: false,
        };
      }

      const entryDateObj = new Date(entryDate);
      const lockedUntilDate = workSchedule.locked_until_date ? new Date(workSchedule.locked_until_date) : null;

      const isLocked = lockedUntilDate && entryDateObj <= lockedUntilDate;

      if (!isLocked) {
        return {
          isLocked: false,
          lockReason: null,
          lockType: 'none',
          lockedUntil: null,
          canOverride: false,
        };
      }

      // Determine lock type based on reason
      const lockType = workSchedule.lock_reason?.includes('Leave Application') 
        ? 'leave' 
        : 'manual';

      // Check if user can override (admin only for most cases)
      const { getUserRole } = await import('@/utils/roles');
      const userRole = await getUserRole(userId);
      const canOverride = userRole === 'admin';

      return {
        isLocked: true,
        lockReason: workSchedule.lock_reason,
        lockType,
        lockedUntil: workSchedule.locked_until_date,
        canOverride,
      };
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.checkDateLock:', error);
      return {
        isLocked: false,
        lockReason: null,
        lockType: 'none',
        lockedUntil: null,
        canOverride: false,
      };
    }
  }

  /**
   * Check if user has approved leave on a specific date
   */
  static async checkApprovedLeaveOnDate(
    userId: string,
    entryDate: string
  ): Promise<{ hasLeave: boolean; leaveType?: string }> {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          id,
          leave_type:leave_types(name)
        `)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', entryDate)
        .gte('end_date', entryDate)
        .limit(1);

      if (error) {
        console.error('Error checking approved leave:', error);
        return { hasLeave: false };
      }

      if (!data?.length) {
        return { hasLeave: false };
      }

      return {
        hasLeave: true,
        leaveType: (data[0].leave_type as any)?.name || 'Leave'
      };
    } catch (error) {
      console.error('Error in checkApprovedLeaveOnDate:', error);
      return { hasLeave: false };
    }
  }

  /**
   * Batch check if user has approved leave for a date range (ONE query)
   * Returns a Map of date strings to leave info
   */
  static async batchCheckLeaveForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Map<string, { hasLeave: boolean; leaveType?: string }>> {
    const result = new Map<string, { hasLeave: boolean; leaveType?: string }>();
    
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          start_date,
          end_date,
          leave_type:leave_types(name)
        `)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', endDate)
        .gte('end_date', startDate);
      
      if (error) {
        console.error('Error batch checking leave:', error);
        return result;
      }
      
      if (!data?.length) {
        return result;
      }
      
      // Expand leave periods into individual dates
      for (const leave of data) {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        const current = new Date(leaveStart);
        
        while (current <= leaveEnd) {
          const dateStr = current.toLocaleDateString('en-CA');
          result.set(dateStr, {
            hasLeave: true,
            leaveType: (leave.leave_type as any)?.name || 'Leave'
          });
          current.setDate(current.getDate() + 1);
        }
      }
    } catch (error) {
      console.error('Error in batchCheckLeaveForDateRange:', error);
    }
    
    return result;
  }

  /**
   * Validate if user can log time on a specific date
   */
  static async validateTimesheetEntry(
    userId: string,
    entryDate: string
  ): Promise<LeaveValidationResult> {
    try {
      // Check for approved leave on this date first (direct check)
      const leaveCheck = await this.checkApprovedLeaveOnDate(userId, entryDate);
      if (leaveCheck.hasLeave) {
        return {
          canLog: false,
          reason: `This date is blocked due to approved ${leaveCheck.leaveType}`,
          isHoliday: false,
          isLeaveDay: true,
          isWeekend: false,
        };
      }

      // Check for manual locks
      const lockInfo = await this.checkDateLock(userId, entryDate);

      // Check if it's a weekend using Monday=0 system
      const entryDateObj = new Date(entryDate);
      const mondayDay = getMondayFirstDayOfWeek(entryDateObj);
      const isWeekend = mondayDay === 5 || mondayDay === 6; // Saturday=5, Sunday=6 in Monday=0 system

      // Check work schedule preferences
      const { data: workSchedule } = await supabase
        .from('work_schedules')
        .select('allow_weekend_entries, allow_holiday_entries')
        .eq('user_id', userId)
        .single();

      if (isWeekend && !workSchedule?.allow_weekend_entries) {
        return {
          canLog: false,
          reason: 'Weekend entries are not allowed',
          isHoliday: false,
          isLeaveDay: false,
          isWeekend: true,
        };
      }

      // Check if it's a public holiday
      const { data: holidayCheck, error: holidayError } = await supabase.rpc(
        'check_user_holiday_permission',
        {
          p_user_id: userId,
          p_holiday_date: entryDate,
        }
      );

      if (holidayError) {
        console.error('Error checking holiday permission:', holidayError);
      }

      const holidayResult = holidayCheck?.[0];
      if (holidayResult && !holidayResult.is_allowed) {
        return {
          canLog: false,
          reason: holidayResult.message || 'Holiday entries are not allowed',
          isHoliday: true,
          isLeaveDay: false,
          isWeekend,
        };
      }

      // Check if there's manual lock
      if (lockInfo.isLocked && lockInfo.lockType === 'manual') {
        return {
          canLog: false,
          reason: lockInfo.lockReason || 'This date is manually locked',
          isHoliday: holidayResult?.holiday_name ? true : false,
          isLeaveDay: false,
          isWeekend,
        };
      }

      return {
        canLog: true,
        reason: 'Entry allowed',
        isHoliday: holidayResult?.holiday_name ? true : false,
        isLeaveDay: false,
        isWeekend,
      };
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.validateTimesheetEntry:', error);
      return {
        canLog: false,
        reason: 'Error validating entry',
        isHoliday: false,
        isLeaveDay: false,
        isWeekend: false,
      };
    }
  }

  /**
   * Lock dates for approved leave
   */
  static async lockLeaveDates(
    userId: string,
    startDate: string,
    endDate: string,
    applicationId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('lock_leave_dates', {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_application_id: applicationId,
      });

      if (error) {
        console.error('Error locking leave dates:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.lockLeaveDates:', error);
      throw error;
    }
  }

  /**
   * Unlock dates when leave is cancelled/rejected
   */
  static async unlockLeaveDates(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('unlock_leave_dates', {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error('Error unlocking leave dates:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.unlockLeaveDates:', error);
      throw error;
    }
  }

  /**
   * Check if there are existing timesheet entries on leave dates
   */
  static async checkExistingEntries(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    hasEntries: boolean;
    entriesCount: number;
    conflictDates: string[];
  }> {
    try {
      const { data: entries, error } = await supabase
        .from('timesheet_entries')
        .select('entry_date, hours_logged')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) {
        console.error('Error checking existing entries:', error);
        throw error;
      }

      const conflictDates = entries?.map(entry => entry.entry_date) || [];

      return {
        hasEntries: (entries?.length || 0) > 0,
        entriesCount: entries?.length || 0,
        conflictDates,
      };
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.checkExistingEntries:', error);
      return {
        hasEntries: false,
        entriesCount: 0,
        conflictDates: [],
      };
    }
  }

  /**
   * Get lock status for multiple dates
   */
  static async getLockStatusForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, TimesheetLockInfo>> {
    try {
      const result: Record<string, TimesheetLockInfo> = {};
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toLocaleDateString('en-CA');
        result[dateStr] = await this.checkDateLock(userId, dateStr);
      }

      return result;
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.getLockStatusForDateRange:', error);
      return {};
    }
  }

  /**
   * Enhanced lock reason formatting
   */
  static formatLockReason(lockReason: string | null, lockType: 'manual' | 'leave' | 'none'): string {
    if (!lockReason) {
      return 'Date is locked';
    }

    if (lockType === 'leave') {
      // Extract application ID if present
      const match = lockReason.match(/Leave Application \(ID: ([^)]+)\)/);
      if (match) {
        return `Locked due to approved leave (Application: ${match[1]})`;
      }
      return 'Locked due to approved leave';
    }

    return lockReason;
  }

  /**
   * Manual lock management
   */
  static async setManualLock(
    userId: string,
    lockUntilDate: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('work_schedules')
        .update({
          locked_until_date: lockUntilDate,
          lock_reason: reason,
          locked_at: new Date().toISOString(),
          locked_by: userId,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error setting manual lock:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.setManualLock:', error);
      throw error;
    }
  }

  /**
   * Remove manual lock
   */
  static async removeManualLock(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('work_schedules')
        .update({
          locked_until_date: null,
          lock_reason: null,
          locked_at: null,
          locked_by: null,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing manual lock:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in TimesheetIntegrationService.removeManualLock:', error);
      throw error;
    }
  }
}