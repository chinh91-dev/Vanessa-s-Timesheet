import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchWorkSchedule, upsertWorkSchedule, migrateLocalStorageToDatabase, getDefaultWorkingDays } from "@/lib/work-schedule-service";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useWorkSchedule = (userId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  // Single consolidated query for work schedule - using unified key
  const { data: scheduleData, isLoading: loading, refetch } = useQuery({
    queryKey: ["work-schedule-unified", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      // Migrate localStorage data first
      await migrateLocalStorageToDatabase(targetUserId);
      
      // Fetch from database
      const schedule = await fetchWorkSchedule(targetUserId);
      
      if (schedule) {
        return schedule;
      }
      
      // Get default based on employment type
      const defaultDays = await getDefaultWorkingDays(targetUserId);
      return { working_days: defaultDays };
    },
    enabled: !!targetUserId,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });

  const workingDays = scheduleData?.working_days ?? 5;
  const workScheduleData = scheduleData ?? null;
  const weeklyTarget = workingDays * 8;

  // Update working days in database
  const updateWorkingDays = useCallback(async (days: number) => {
    if (!targetUserId) {
      console.error("No user ID available for updating work schedule");
      return;
    }

    if (days < 0 || days > 7 || isNaN(days)) {
      console.error("Invalid working days value:", days);
      return;
    }

    try {
      console.log(`Updating work schedule for user ${targetUserId}: ${days} days`);
      
      await upsertWorkSchedule(targetUserId, days);
      
      // Keep localStorage in sync as backup
      const localStorageKey = targetUserId === user?.id 
        ? "timesheet-working-days" 
        : `timesheet-working-days-${targetUserId}`;
      localStorage.setItem(localStorageKey, days.toString());
      
      // Invalidate unified query key
      queryClient.invalidateQueries({ queryKey: ["work-schedule-unified", targetUserId] });
      
      if (targetUserId === user?.id) {
        toast({
          title: "Work Schedule Updated",
          description: `Your work schedule has been updated to ${days} days per week.`,
        });
      }
    } catch (err) {
      console.error("Error updating work schedule:", err);
      toast({
        title: "Error",
        description: "Failed to update work schedule. Please try again.",
        variant: "destructive",
      });
    }
  }, [targetUserId, user?.id, queryClient]);

  const reload = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    workingDays,
    workScheduleData,
    weeklyTarget,
    updateWorkingDays,
    loading,
    error: null,
    reload,
  };
};
