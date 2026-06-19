import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOptionalWorkScheduleContext } from "@/context/WorkScheduleContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { isWeekend } from "@/lib/date-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface WeekendLockData {
  canLogWeekendHours: boolean;
  allowWeekendEntries: boolean;
  shouldShowWeekendColumns: boolean;
  canCreateWeekendEntries: boolean;
  isWeekendEntry: (date: Date) => boolean;
  validateWeekendEntry: (date: Date) => { isValid: boolean; message?: string };
  updateWeekendPermission: (enabled: boolean) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  refreshPermissions: () => void;
}

export const useWeekendLock = (userId?: string): WeekendLockData => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;
  const isAdmin = userRole === "admin";
  
  // Try to get data from context first (eliminates duplicate queries)
  const contextData = useOptionalWorkScheduleContext();
  const isCurrentUser = targetUserId === user?.id;
  
  // Only query if we need data for a different user than context provides
  const needsDirectQuery = !isCurrentUser || !contextData;
  
  // Fallback query only when context doesn't have the data
  const { data: directSchedule, isLoading: directLoading, refetch } = useQuery({
    queryKey: ["work-schedule-unified", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data, error } = await supabase
        .from("work_schedules")
        .select("allow_weekend_entries")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching weekend permissions:", error);
        return null;
      }

      return data;
    },
    enabled: !!targetUserId && needsDirectQuery,
    staleTime: 30000,
    gcTime: 60000,
  });
  
  // Use context data when available for current user
  const workSchedule = isCurrentUser && contextData 
    ? contextData.workScheduleData 
    : directSchedule;
  
  const loading = needsDirectQuery ? directLoading : (contextData?.loading ?? false);

  const allowWeekendEntries = workSchedule?.allow_weekend_entries ?? false;
  const shouldShowWeekendColumns = allowWeekendEntries;
  const canCreateWeekendEntries = isAdmin || allowWeekendEntries;
  const canLogWeekendHours = shouldShowWeekendColumns;

  // Update weekend permission (admin only)
  const updateWeekendPermission = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!isAdmin || !targetUserId) {
      console.error("Unauthorized attempt to update weekend permissions");
      return false;
    }

    try {
      console.log(`Updating weekend permission for ${targetUserId} to: ${enabled}`);
      
      const { error } = await supabase
        .from("work_schedules")
        .upsert({
          user_id: targetUserId,
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

      // Invalidate unified query key only
      queryClient.invalidateQueries({ queryKey: ["work-schedule-unified"] });

      toast({
        title: "Weekend Permissions Updated",
        description: `Weekend entries ${enabled ? 'enabled' : 'disabled'} for user.`,
      });

      return true;
    } catch (error) {
      console.error("Error updating weekend permissions:", error);
      toast({
        title: "Error",
        description: "Failed to update weekend permissions.",
        variant: "destructive",
      });
      return false;
    }
  }, [isAdmin, targetUserId, queryClient]);

  const refreshPermissions = useCallback(() => {
    refetch();
  }, [refetch]);

  const isWeekendEntry = useCallback((date: Date): boolean => {
    return isWeekend(date);
  }, []);

  const validateWeekendEntry = useCallback((date: Date): { isValid: boolean; message?: string } => {
    if (!isWeekend(date)) {
      return { isValid: true };
    }

    if (canCreateWeekendEntries) {
      return { isValid: true };
    }

    return { 
      isValid: false, 
      message: "Weekend entries are not allowed. Please contact your administrator for approval." 
    };
  }, [canCreateWeekendEntries]);

  return {
    canLogWeekendHours,
    allowWeekendEntries,
    shouldShowWeekendColumns,
    canCreateWeekendEntries,
    isWeekendEntry,
    validateWeekendEntry,
    updateWeekendPermission,
    loading,
    error: null,
    refreshPermissions,
  };
};
