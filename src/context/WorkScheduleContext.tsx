import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getUserRole } from "@/utils/roles";
import { fetchWorkSchedule, upsertWorkSchedule, migrateLocalStorageToDatabase, getDefaultWorkingDays } from "@/lib/work-schedule-service";

export interface WorkScheduleData {
  allow_weekend_entries: boolean;
  allow_holiday_entries: boolean;
  working_days: number;
  default_monday_location?: string | null;
  default_tuesday_location?: string | null;
  default_wednesday_location?: string | null;
  default_thursday_location?: string | null;
  default_friday_location?: string | null;
  default_saturday_location?: string | null;
  default_sunday_location?: string | null;
}

interface WorkScheduleContextValue {
  // Permissions
  allowWeekendEntries: boolean;
  allowHolidayEntries: boolean;
  canCreateWeekendEntries: boolean;
  canCreateHolidayEntries: boolean;
  
  // Schedule data
  workingDays: number;
  weeklyTarget: number;
  workScheduleData: WorkScheduleData | null;
  
  // User info
  isAdmin: boolean;
  userRole: string;
  userId: string | undefined;
  
  // Actions
  updateWeekendPermission: (userId: string, enabled: boolean) => Promise<boolean>;
  updateWorkingDays: (days: number) => Promise<void>;
  reload: () => void;
  
  // State
  loading: boolean;
  error: string | null;
}

const WorkScheduleContext = createContext<WorkScheduleContextValue | undefined>(undefined);

interface WorkScheduleProviderProps {
  children: React.ReactNode;
  targetUserId?: string; // Optional: for admin viewing another user's schedule
}

export const WorkScheduleProvider: React.FC<WorkScheduleProviderProps> = ({ 
  children, 
  targetUserId 
}) => {
  const { user, userRole: authUserRole } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = targetUserId || user?.id;
  
  const [workingDays, setWorkingDays] = useState<number>(5);
  const [workScheduleData, setWorkScheduleData] = useState<WorkScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Single query for all work schedule data
  const { data: scheduleData, isLoading: scheduleLoading, refetch: refetchSchedule } = useQuery({
    queryKey: ["work-schedule-unified", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      
      // Migrate any localStorage data first
      await migrateLocalStorageToDatabase(effectiveUserId);
      
      const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching work schedule:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!effectiveUserId,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });

  // Query for user role
  const { data: targetUserRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role-unified", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return "employee";
      try {
        return await getUserRole(effectiveUserId);
      } catch (error) {
        console.error("Error fetching user role:", error);
        return "employee";
      }
    },
    enabled: !!effectiveUserId,
    staleTime: 60000, // 1 minute
  });

  // Sync query data to local state
  useEffect(() => {
    if (scheduleData) {
      setWorkingDays(scheduleData.working_days ?? 5);
      setWorkScheduleData(scheduleData as WorkScheduleData);
    } else if (scheduleData === null && !scheduleLoading && effectiveUserId) {
      // No schedule exists, use defaults
      getDefaultWorkingDays(effectiveUserId).then(days => {
        setWorkingDays(days);
      });
      setWorkScheduleData({
        allow_weekend_entries: false,
        allow_holiday_entries: false,
        working_days: 5,
      });
    }
  }, [scheduleData, scheduleLoading, effectiveUserId]);

  // Derived values
  const isAdmin = targetUserRole === 'admin' || authUserRole === 'admin';
  const allowWeekendEntries = workScheduleData?.allow_weekend_entries ?? false;
  const allowHolidayEntries = workScheduleData?.allow_holiday_entries ?? false;
  const canCreateWeekendEntries = isAdmin || allowWeekendEntries;
  const canCreateHolidayEntries = isAdmin || allowHolidayEntries;
  const weeklyTarget = workingDays * 8;

  // Single consolidated realtime subscription
  useEffect(() => {
    if (!effectiveUserId) return;

    console.log(`[WorkScheduleContext] Setting up unified realtime subscription for user ${effectiveUserId}`);

    const channel = supabase
      .channel(`work-schedule-unified-${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_schedules',
          filter: `user_id=eq.${effectiveUserId}`
        },
        (payload) => {
          console.log('[WorkScheduleContext] Realtime update received:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new as WorkScheduleData & { working_days: number };
            
            // Update local state immediately for responsive UI
            if (newData.working_days !== undefined) {
              setWorkingDays(newData.working_days);
            }
            setWorkScheduleData(newData);
            
            // Invalidate React Query cache
            queryClient.invalidateQueries({ queryKey: ["work-schedule-unified", effectiveUserId] });
            
            // Show toast for current user only
            if (effectiveUserId === user?.id && payload.eventType === 'UPDATE') {
              toast({
                title: "Work Schedule Updated",
                description: "Your work schedule has been updated.",
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${effectiveUserId}`
        },
        (payload) => {
          console.log('[WorkScheduleContext] Profile update received:', payload);
          // Invalidate queries to refresh template data
          queryClient.invalidateQueries({ queryKey: ["work-schedule-unified", effectiveUserId] });
        }
      )
      .subscribe();

    return () => {
      console.log(`[WorkScheduleContext] Cleaning up subscription for user ${effectiveUserId}`);
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, user?.id, queryClient]);

  // Update weekend permission (admin only)
  const updateWeekendPermission = useCallback(async (userId: string, enabled: boolean): Promise<boolean> => {
    if (!isAdmin) {
      console.error("Unauthorized attempt to update weekend permissions");
      return false;
    }

    try {
      console.log(`[WorkScheduleContext] Updating weekend permission for ${userId} to: ${enabled}`);
      
      const { error } = await supabase
        .from("work_schedules")
        .upsert({
          user_id: userId,
          allow_weekend_entries: enabled,
          working_days: 5,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error("Database error updating weekend permissions:", error);
        toast({
          title: "Error",
          description: "Failed to update weekend permissions.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Weekend Permissions Updated",
        description: `Weekend entries ${enabled ? 'enabled' : 'disabled'} for user.`,
      });

      return true;
    } catch (error) {
      console.error("Error updating weekend permissions:", error);
      return false;
    }
  }, [isAdmin]);

  // Update working days
  const updateWorkingDays = useCallback(async (days: number) => {
    if (!effectiveUserId) {
      console.error("No user ID available for updating work schedule");
      return;
    }

    if (days < 0 || days > 7 || isNaN(days)) {
      console.error("Invalid working days value:", days);
      return;
    }

    try {
      await upsertWorkSchedule(effectiveUserId, days);
      setWorkingDays(days);
      
      // Keep localStorage in sync as backup
      const localStorageKey = effectiveUserId === user?.id 
        ? "timesheet-working-days" 
        : `timesheet-working-days-${effectiveUserId}`;
      localStorage.setItem(localStorageKey, days.toString());
      
      if (effectiveUserId === user?.id) {
        toast({
          title: "Work Schedule Updated",
          description: `Your work schedule has been updated to ${days} days per week.`,
        });
      }
    } catch (err) {
      console.error("Error updating work schedule:", err);
      setError("Failed to update work schedule");
      
      toast({
        title: "Error",
        description: "Failed to update work schedule. Please try again.",
        variant: "destructive",
      });
    }
  }, [effectiveUserId, user?.id]);

  // Reload function
  const reload = useCallback(() => {
    refetchSchedule();
    queryClient.invalidateQueries({ queryKey: ["work-schedule-unified", effectiveUserId] });
  }, [refetchSchedule, queryClient, effectiveUserId]);

  const value = useMemo(() => ({
    allowWeekendEntries,
    allowHolidayEntries,
    canCreateWeekendEntries,
    canCreateHolidayEntries,
    workingDays,
    weeklyTarget,
    workScheduleData,
    isAdmin,
    userRole: targetUserRole || 'employee',
    userId: effectiveUserId,
    updateWeekendPermission,
    updateWorkingDays,
    reload,
    loading: scheduleLoading || roleLoading,
    error,
  }), [
    allowWeekendEntries,
    allowHolidayEntries,
    canCreateWeekendEntries,
    canCreateHolidayEntries,
    workingDays,
    weeklyTarget,
    workScheduleData,
    isAdmin,
    targetUserRole,
    effectiveUserId,
    updateWeekendPermission,
    updateWorkingDays,
    reload,
    scheduleLoading,
    roleLoading,
    error,
  ]);

  return (
    <WorkScheduleContext.Provider value={value}>
      {children}
    </WorkScheduleContext.Provider>
  );
};

export const useWorkScheduleContext = (): WorkScheduleContextValue => {
  const context = useContext(WorkScheduleContext);
  if (context === undefined) {
    throw new Error("useWorkScheduleContext must be used within a WorkScheduleProvider");
  }
  return context;
};

// Optional hook that doesn't throw if outside provider (for gradual migration)
export const useOptionalWorkScheduleContext = (): WorkScheduleContextValue | null => {
  return useContext(WorkScheduleContext) ?? null;
};
