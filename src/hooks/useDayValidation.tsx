import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOptionalWorkScheduleContext } from "@/context/WorkScheduleContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isWeekend } from "@/lib/date-utils";
import { TimesheetIntegrationService } from "@/lib/leave/timesheet-integration-service";
import { isHoliday } from "@/lib/timesheet/validation/holiday-validation-service";
import { useQuery } from "@tanstack/react-query";

export type BlockReason = 'weekend' | 'holiday' | 'leave' | 'schedule' | null;

export interface DayValidationResult {
  isBlocked: boolean;
  blockReason: BlockReason;
  message?: string;
  details?: {
    holidayName?: string;
    leaveType?: string;
  };
}

export interface DayStatus {
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isOnLeave: boolean;
  leaveType?: string;
  hasSpecificHolidayPermission: boolean;
}

interface UseDayValidationReturn {
  // Consolidated validation function
  validateDay: (date: Date) => Promise<DayValidationResult>;
  
  // Status check (for UI indicators)
  getDayStatus: (date: Date) => Promise<DayStatus>;
  
  // Permissions (for conditional rendering)
  canCreateWeekendEntries: boolean;
  canCreateHolidayEntries: boolean;
  isAdmin: boolean;
  
  // Loading state
  loading: boolean;
}

export const useDayValidation = (userId?: string): UseDayValidationReturn => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  // Try to get data from context first (eliminates duplicate queries)
  const contextData = useOptionalWorkScheduleContext();
  const isCurrentUser = targetUserId === user?.id;
  
  // Only query if we're looking at a different user than the context provides
  const needsDirectQuery = !isCurrentUser || !contextData;
  
  // Fallback query only when context doesn't have the data we need
  const { data: directSchedule, isLoading: directLoading } = useQuery({
    queryKey: ["work-schedule-unified", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data, error } = await supabase
        .from("work_schedules")
        .select("allow_weekend_entries, allow_holiday_entries")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching work schedule permissions:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!targetUserId && needsDirectQuery,
    staleTime: 30000,
  });

  // Use context data when available for current user, otherwise use direct query
  const workSchedule = isCurrentUser && contextData 
    ? contextData.workScheduleData 
    : directSchedule;
  
  // Derive admin status from context or auth
  const isAdmin = contextData?.isAdmin ?? false;
  const loading = needsDirectQuery ? directLoading : (contextData?.loading ?? false);
  
  // Derived permission values
  const canCreateWeekendEntries = isAdmin || (workSchedule?.allow_weekend_entries ?? false);
  const canCreateHolidayEntries = isAdmin || (workSchedule?.allow_holiday_entries ?? false);

  // Check specific holiday permission for a date
  const checkSpecificHolidayPermission = useCallback(async (date: Date): Promise<boolean> => {
    if (!targetUserId) return false;
    
    try {
      const dateStr = formatDate(date);
      
      // Check if this date is a holiday
      const { data: holiday } = await supabase
        .from("public_holidays")
        .select("id")
        .eq("date", dateStr)
        .maybeSingle();
      
      if (!holiday) return false;
      
      // Check if user has specific permission for this holiday
      const { data: permission } = await supabase
        .from("user_holiday_permissions")
        .select("is_allowed")
        .eq("user_id", targetUserId)
        .eq("holiday_id", holiday.id)
        .maybeSingle();
      
      return permission?.is_allowed === true;
    } catch (error) {
      console.error("Error checking specific holiday permission:", error);
      return false;
    }
  }, [targetUserId]);

  // Get day status (for UI indicators like badges)
  const getDayStatus = useCallback(async (date: Date): Promise<DayStatus> => {
    const isWeekendDay = isWeekend(date);
    
    // Check holiday status
    const holidayResult = await isHoliday(date);
    const isHolidayDay = holidayResult.isHoliday;
    const holidayName = holidayResult.holidayName;
    
    // Check leave status
    let isOnLeave = false;
    let leaveType: string | undefined;
    
    if (targetUserId) {
      try {
        const formattedDate = formatDate(date);
        const leaveCheck = await TimesheetIntegrationService.checkApprovedLeaveOnDate(targetUserId, formattedDate);
        isOnLeave = leaveCheck.hasLeave;
        leaveType = leaveCheck.leaveType;
      } catch (error) {
        console.error("Error checking leave status:", error);
      }
    }
    
    // Check specific holiday permission
    let hasSpecificHolidayPermission = false;
    if (isHolidayDay) {
      hasSpecificHolidayPermission = await checkSpecificHolidayPermission(date);
    }
    
    return {
      isWeekend: isWeekendDay,
      isHoliday: isHolidayDay,
      holidayName,
      isOnLeave,
      leaveType,
      hasSpecificHolidayPermission,
    };
  }, [targetUserId, checkSpecificHolidayPermission]);

  // Consolidated validation function
  const validateDay = useCallback(async (date: Date): Promise<DayValidationResult> => {
    // 1. Check leave first (highest priority block)
    if (targetUserId) {
      try {
        const formattedDate = formatDate(date);
        const leaveCheck = await TimesheetIntegrationService.checkApprovedLeaveOnDate(targetUserId, formattedDate);
        
        if (leaveCheck.hasLeave) {
          return {
            isBlocked: true,
            blockReason: 'leave',
            message: `On approved ${leaveCheck.leaveType || 'leave'}`,
            details: { leaveType: leaveCheck.leaveType },
          };
        }
      } catch (error) {
        console.error("Error checking leave status:", error);
      }
    }

    // 2. Check holiday
    const holidayResult = await isHoliday(date);
    if (holidayResult.isHoliday) {
      // Check if user has permission (admin, global, or specific)
      const hasSpecificPermission = await checkSpecificHolidayPermission(date);
      
      if (!isAdmin && !canCreateHolidayEntries && !hasSpecificPermission) {
        return {
          isBlocked: true,
          blockReason: 'holiday',
          message: `Holiday: ${holidayResult.holidayName || 'Public holiday'}`,
          details: { holidayName: holidayResult.holidayName },
        };
      }
    }

    // 3. Check weekend
    if (isWeekend(date)) {
      if (!canCreateWeekendEntries) {
        return {
          isBlocked: true,
          blockReason: 'weekend',
          message: "Weekend entries are not allowed. Contact your administrator for approval.",
        };
      }
    }

    // Not blocked
    return {
      isBlocked: false,
      blockReason: null,
    };
  }, [targetUserId, isAdmin, canCreateWeekendEntries, canCreateHolidayEntries, checkSpecificHolidayPermission]);

  return {
    validateDay,
    getDayStatus,
    canCreateWeekendEntries,
    canCreateHolidayEntries,
    isAdmin,
    loading,
  };
};
