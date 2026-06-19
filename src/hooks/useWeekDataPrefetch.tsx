import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";
import { fetchTimesheetEntries } from "@/lib/timesheet-service";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for prefetching adjacent week data for instant navigation
 */
export const useWeekDataPrefetch = (userId: string, currentWeekStart: Date) => {
  const queryClient = useQueryClient();

  /**
   * Prefetch data for the previous week
   */
  const prefetchPreviousWeek = useCallback(async () => {
    if (!userId) return;
    
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
    
    const weekStartStr = formatDate(prevWeekStart);
    const weekEndStr = formatDate(prevWeekEnd);
    
    // Prefetch entries
    await queryClient.prefetchQuery({
      queryKey: ['timesheet-entries', userId, weekStartStr, weekEndStr],
      queryFn: () => fetchTimesheetEntries(prevWeekStart, prevWeekEnd, { forceUserId: userId }),
      staleTime: 5 * 60 * 1000,
    });
    
    // Prefetch week validation batch
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(prevWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    
    await queryClient.prefetchQuery({
      queryKey: ['week-validation-batch', userId, weekStartStr],
      queryFn: async () => {
        // Batch leave check
        const { data: leaveData } = await supabase
          .from('leave_applications')
          .select('start_date, end_date, leave_type:leave_types(name)')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .lte('start_date', weekEndStr)
          .gte('end_date', weekStartStr);
        
        // Batch holiday check
        const dateStrings = weekDates.map(formatDate);
        const { data: holidayData } = await supabase
          .from('public_holidays')
          .select('date, name')
          .in('date', dateStrings)
          .eq('state', 'VIC');
        
        return { leaveData, holidayData };
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [userId, currentWeekStart, queryClient]);

  /**
   * Prefetch data for the next week
   */
  const prefetchNextWeek = useCallback(async () => {
    if (!userId) return;
    
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    
    const weekStartStr = formatDate(nextWeekStart);
    const weekEndStr = formatDate(nextWeekEnd);
    
    // Prefetch entries
    await queryClient.prefetchQuery({
      queryKey: ['timesheet-entries', userId, weekStartStr, weekEndStr],
      queryFn: () => fetchTimesheetEntries(nextWeekStart, nextWeekEnd, { forceUserId: userId }),
      staleTime: 5 * 60 * 1000,
    });
    
    // Prefetch week validation batch
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(nextWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    
    await queryClient.prefetchQuery({
      queryKey: ['week-validation-batch', userId, weekStartStr],
      queryFn: async () => {
        // Batch leave check
        const { data: leaveData } = await supabase
          .from('leave_applications')
          .select('start_date, end_date, leave_type:leave_types(name)')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .lte('start_date', weekEndStr)
          .gte('end_date', weekStartStr);
        
        // Batch holiday check
        const dateStrings = weekDates.map(formatDate);
        const { data: holidayData } = await supabase
          .from('public_holidays')
          .select('date, name')
          .in('date', dateStrings)
          .eq('state', 'VIC');
        
        return { leaveData, holidayData };
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [userId, currentWeekStart, queryClient]);

  /**
   * Prefetch both adjacent weeks (call on component mount or idle)
   */
  const prefetchAdjacentWeeks = useCallback(async () => {
    await Promise.all([
      prefetchPreviousWeek(),
      prefetchNextWeek(),
    ]);
  }, [prefetchPreviousWeek, prefetchNextWeek]);

  return {
    prefetchPreviousWeek,
    prefetchNextWeek,
    prefetchAdjacentWeeks,
  };
};
