
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useOptionalWorkScheduleContext } from "@/context/WorkScheduleContext";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import { 
  upsertWeeklySchedule, 
  deleteWeeklySchedule, 
  fetchWeeklySchedules,
  getEffectiveSchedule,
  WeeklyScheduleRow 
} from "@/lib/simple-work-schedule-service";

export const useSimpleWeeklySchedule = (userId: string, weekStartDate: Date, employmentType?: string, userProfile?: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekStart = formatDate(weekStartDate);
  
  // Use context data when available to avoid duplicate queries
  const contextData = useOptionalWorkScheduleContext();
  const isCurrentUser = userId === user?.id;
  
  // Get working days from context for current user, or default to 5
  const workingDays = isCurrentUser && contextData 
    ? contextData.workingDays 
    : 5; // Default fallback

  // Query for weekly schedule override
  const { data: weeklySchedules = {}, isLoading: isLoadingWeekly } = useQuery({
    queryKey: ['weeklySchedules', userId, weekStart],
    queryFn: () => fetchWeeklySchedules([userId], weekStart, weekStart),
    enabled: !!userId
  });

  const isLoading = isLoadingWeekly;
  const weeklyOverride = weeklySchedules[userId]?.[0];
  const hasOverride = !!weeklyOverride;
  
  // Check if office days come from user's template
  const hasTemplateOfficeDays = userProfile && (
    userProfile.default_monday_office ||
    userProfile.default_tuesday_office ||
    userProfile.default_wednesday_office ||
    userProfile.default_thursday_office ||
    userProfile.default_friday_office
  );
  
  // Calculate effective days and determine source
  const calculateEffectiveDaysAndSource = () => {
    // If user is full-time or fixed-term, always 5 days
    if (employmentType === 'full-time' || employmentType === 'fixed-term') {
      return { days: 5, source: 'full-time-default' as const };
    }
    
    // For part-time users, check template-based working days from profile
    if (hasTemplateOfficeDays && userProfile) {
      const templateDayCount = [
        userProfile.default_monday_office,
        userProfile.default_tuesday_office,
        userProfile.default_wednesday_office,
        userProfile.default_thursday_office,
        userProfile.default_friday_office
      ].filter(Boolean).length;
      
      // If there's a weekly override, use that
      if (hasOverride) {
        const effectiveDays = getEffectiveSchedule(weeklyOverride).days;
        return { days: effectiveDays, source: 'manual' as const };
      }
      
      // Otherwise, use template day count
      return { days: templateDayCount, source: 'template' as const };
    }
    
    // Fall back to default working days
    const effectiveDays = hasOverride ? getEffectiveSchedule(weeklyOverride).days : workingDays;
    return { days: effectiveDays, source: hasOverride ? 'manual' as const : 'template' as const };
  };

  const { days: effectiveDays, source: calculationSource } = calculateEffectiveDaysAndSource();
  const effectiveHours = effectiveDays * 8;

  // Mutation for updating weekly schedule
  const updateMutation = useMutation({
    mutationFn: ({ days }: { days: number }) => upsertWeeklySchedule(userId, weekStart, days),
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['weeklySchedules'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyWorkSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['workSchedule'] });
      
      toast({
        title: "Schedule Updated",
        description: `Weekly schedule updated to ${variables.days} days.`,
      });
    },
    onError: (error) => {
      console.error("Error updating weekly schedule:", error);
      toast({
        title: "Error",
        description: "Failed to update weekly schedule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting weekly schedule (revert to default)
  const deleteMutation = useMutation({
    mutationFn: () => deleteWeeklySchedule(userId, weekStart),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['weeklySchedules'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyWorkSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['workSchedule'] });
      
      toast({
        title: "Reverted to Default",
        description: `Schedule reverted to default ${workingDays} days.`,
      });
    },
    onError: (error) => {
      console.error("Error deleting weekly schedule:", error);
      toast({
        title: "Error",
        description: "Failed to revert schedule. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateWeeklyDays = (days: number) => {
    updateMutation.mutate({ days });
  };

  const revertToDefault = () => {
    deleteMutation.mutate();
  };

  return {
    effectiveDays,
    effectiveHours,
    hasOverride,
    isLoading,
    updateWeeklyDays,
    revertToDefault,
    isUpdating: updateMutation.isPending,
    isReverting: deleteMutation.isPending,
    isAutoCalculated: calculationSource === 'full-time-default' || calculationSource === 'template',
    calculationSource
  };
};
