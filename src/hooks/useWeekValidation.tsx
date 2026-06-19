import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOptionalWorkScheduleContext } from "@/context/WorkScheduleContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isWeekend } from "@/lib/date-utils";

export interface WeekDayStatus {
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isOnLeave: boolean;
  leaveType?: string;
  hasSpecificHolidayPermission: boolean;
}

export interface WeekValidationData {
  leaveMap: Map<string, { hasLeave: boolean; leaveType?: string }>;
  holidayMap: Map<string, { isHoliday: boolean; holidayName?: string }>;
  holidayPermissionMap: Map<string, boolean>;
}

/**
 * Batch fetch all leave applications for a date range in ONE query
 */
async function batchCheckLeaveForWeek(
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
        const dateStr = formatDate(current);
        result.set(dateStr, {
          hasLeave: true,
          leaveType: (leave.leave_type as any)?.name || 'Leave'
        });
        current.setDate(current.getDate() + 1);
      }
    }
  } catch (error) {
    console.error('Error in batchCheckLeaveForWeek:', error);
  }
  
  return result;
}

/**
 * Batch fetch all holidays for a date range in ONE query
 */
async function batchCheckHolidaysForWeek(
  dates: Date[],
  state: string = 'VIC'
): Promise<Map<string, { isHoliday: boolean; holidayName?: string }>> {
  const result = new Map<string, { isHoliday: boolean; holidayName?: string }>();
  const dateStrings = dates.map(formatDate);
  
  // Initialize all dates as non-holidays
  for (const dateStr of dateStrings) {
    result.set(dateStr, { isHoliday: false });
  }
  
  try {
    const { data, error } = await supabase
      .from('public_holidays')
      .select('date, name')
      .in('date', dateStrings)
      .eq('state', state);
    
    if (error) {
      console.error('Error batch checking holidays:', error);
      return result;
    }
    
    if (data) {
      for (const holiday of data) {
        result.set(holiday.date, {
          isHoliday: true,
          holidayName: holiday.name
        });
      }
    }
  } catch (error) {
    console.error('Error in batchCheckHolidaysForWeek:', error);
  }
  
  return result;
}

/**
 * Batch fetch holiday permissions for a user in ONE query
 */
async function batchCheckHolidayPermissions(
  userId: string,
  dates: Date[],
  state: string = 'VIC'
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const dateStrings = dates.map(formatDate);
  
  try {
    // Get all holidays in the date range first
    const { data: holidays, error: holidayError } = await supabase
      .from('public_holidays')
      .select('id, date')
      .in('date', dateStrings)
      .eq('state', state);
    
    if (holidayError || !holidays?.length) {
      return result;
    }
    
    const holidayIds = holidays.map(h => h.id);
    
    // Get user's permissions for these holidays
    const { data: permissions, error: permError } = await supabase
      .from('user_holiday_permissions')
      .select('holiday_id, is_allowed')
      .eq('user_id', userId)
      .in('holiday_id', holidayIds);
    
    if (permError) {
      console.error('Error fetching holiday permissions:', permError);
      return result;
    }
    
    // Create a map of holiday_id -> is_allowed
    const permissionMap = new Map(
      permissions?.map(p => [p.holiday_id, p.is_allowed]) || []
    );
    
    // Map back to dates
    for (const holiday of holidays) {
      result.set(holiday.date, permissionMap.get(holiday.id) === true);
    }
  } catch (error) {
    console.error('Error in batchCheckHolidayPermissions:', error);
  }
  
  return result;
}

/**
 * Hook to batch validate an entire week of dates
 * Replaces 14+ individual API calls with 3 batch queries
 */
export const useWeekValidation = (userId: string, weekDates: Date[]) => {
  const contextData = useOptionalWorkScheduleContext();
  
  // Memoize the week start for stable query key
  const weekStartStr = useMemo(() => {
    if (!weekDates.length) return '';
    return formatDate(weekDates[0]);
  }, [weekDates]);
  
  const dateStrings = useMemo(() => weekDates.map(formatDate), [weekDates]);
  const startDate = dateStrings[0];
  const endDate = dateStrings[dateStrings.length - 1];
  
  // Batch query for all week validation data
  const { data: validationData, isLoading } = useQuery({
    queryKey: ['week-validation-batch', userId, weekStartStr],
    queryFn: async (): Promise<WeekValidationData> => {
      const [leaveMap, holidayMap, holidayPermissionMap] = await Promise.all([
        batchCheckLeaveForWeek(userId, startDate, endDate),
        batchCheckHolidaysForWeek(weekDates),
        batchCheckHolidayPermissions(userId, weekDates),
      ]);
      
      return { leaveMap, holidayMap, holidayPermissionMap };
    },
    enabled: !!userId && weekDates.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Derive permissions from context or defaults
  const isAdmin = contextData?.isAdmin ?? false;
  const canCreateWeekendEntries = isAdmin || (contextData?.canCreateWeekendEntries ?? false);
  const canCreateHolidayEntries = isAdmin || (contextData?.canCreateHolidayEntries ?? false);
  
  /**
   * Get status for a specific date from the batch data
   */
  const getDayStatus = (date: Date): WeekDayStatus => {
    const dateStr = formatDate(date);
    const isWeekendDay = isWeekend(date);
    
    const leaveInfo = validationData?.leaveMap.get(dateStr);
    const holidayInfo = validationData?.holidayMap.get(dateStr);
    const hasSpecificPermission = validationData?.holidayPermissionMap.get(dateStr) ?? false;
    
    return {
      isWeekend: isWeekendDay,
      isHoliday: holidayInfo?.isHoliday ?? false,
      holidayName: holidayInfo?.holidayName,
      isOnLeave: leaveInfo?.hasLeave ?? false,
      leaveType: leaveInfo?.leaveType,
      hasSpecificHolidayPermission: hasSpecificPermission,
    };
  };
  
  /**
   * Validate if a date is blocked
   */
  const isDayBlocked = (date: Date): { isBlocked: boolean; reason?: string } => {
    const status = getDayStatus(date);
    
    // Leave has highest priority
    if (status.isOnLeave) {
      return { isBlocked: true, reason: `On ${status.leaveType || 'leave'}` };
    }
    
    // Holiday check (with permission bypass)
    if (status.isHoliday) {
      const hasPermission = isAdmin || canCreateHolidayEntries || status.hasSpecificHolidayPermission;
      if (!hasPermission) {
        return { isBlocked: true, reason: `Holiday: ${status.holidayName}` };
      }
    }
    
    // Weekend check
    if (status.isWeekend && !canCreateWeekendEntries) {
      return { isBlocked: true, reason: 'Weekend entries not allowed' };
    }
    
    return { isBlocked: false };
  };
  
  return {
    validationData,
    getDayStatus,
    isDayBlocked,
    isLoading,
    isAdmin,
    canCreateWeekendEntries,
    canCreateHolidayEntries,
  };
};
