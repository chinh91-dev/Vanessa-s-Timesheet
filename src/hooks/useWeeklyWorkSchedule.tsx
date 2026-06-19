
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchWeeklyWorkSchedule, upsertWeeklyWorkSchedule, WeeklyWorkSchedule } from "@/lib/weekly-work-schedule-service";
import { useOptionalWorkScheduleContext } from "@/context/WorkScheduleContext";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useWeeklyWorkSchedule = (userId: string, weekStartDate: Date, workScheduleData?: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyWorkSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use context data when available to avoid duplicate queries
  const contextData = useOptionalWorkScheduleContext();
  const isCurrentUser = userId === user?.id;
  
  // Get working days from context for current user, or default to 5
  const workingDays = isCurrentUser && contextData 
    ? contextData.workingDays 
    : 5; // Default fallback

  // Get stable week start date string for query key
  const weekStartDateString = useMemo(() => weekStartDate.toLocaleDateString('en-CA'), [weekStartDate.getTime()]);

  // Only fetch profile data if we don't have it from context or workScheduleData
  const needsProfileQuery = !workScheduleData && !(isCurrentUser && contextData?.workScheduleData);
  
  // Use context work schedule data when available (avoids duplicate work_schedules query)
  const contextWorkSchedule = isCurrentUser && contextData?.workScheduleData 
    ? contextData.workScheduleData 
    : null;
  
  // Fetch user profile and default work schedule locations with React Query caching
  // Only fetches when context data is not available
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-with-locations-v3', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // If we have context work schedule data, only fetch profile (not work_schedules)
      if (contextWorkSchedule) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('default_monday_office, default_tuesday_office, default_wednesday_office, default_thursday_office, default_friday_office, employment_type')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          return null;
        }
        
        // Use context data for locations
        return {
          ...profileData,
          default_locations: {
            monday: contextWorkSchedule.default_monday_location || null,
            tuesday: contextWorkSchedule.default_tuesday_location || null,
            wednesday: contextWorkSchedule.default_wednesday_location || null,
            thursday: contextWorkSchedule.default_thursday_location || null,
            friday: contextWorkSchedule.default_friday_location || null,
            saturday: contextWorkSchedule.default_saturday_location || null,
            sunday: contextWorkSchedule.default_sunday_location || null,
          }
        };
      }
      
      // Fetch profile data and work schedule separately, then combine
      const [profileResult, workScheduleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('default_monday_office, default_tuesday_office, default_wednesday_office, default_thursday_office, default_friday_office, employment_type')
          .eq('id', userId)
          .single(),
        supabase
          .from('work_schedules')
          .select('default_monday_location, default_tuesday_location, default_wednesday_location, default_thursday_location, default_friday_location, default_saturday_location, default_sunday_location')
          .eq('user_id', userId)
          .single()
      ]);
      
      if (profileResult.error) {
        console.error('Error fetching user profile:', profileResult.error);
        return null;
      }
      
      // Combine the results
      const result = {
        ...profileResult.data,
        default_locations: {
          monday: workScheduleResult.data?.default_monday_location || null,
          tuesday: workScheduleResult.data?.default_tuesday_location || null,
          wednesday: workScheduleResult.data?.default_wednesday_location || null,
          thursday: workScheduleResult.data?.default_thursday_location || null,
          friday: workScheduleResult.data?.default_friday_location || null,
          saturday: workScheduleResult.data?.default_saturday_location || null,
          sunday: workScheduleResult.data?.default_sunday_location || null,
        }
      };
      
      return result;
    },
    enabled: !!userId && needsProfileQuery,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate default daily hours based on employment type and office day template
  // Logic priority:
  // 1. If template is configured (any employment type) → use template
  // 2. If no template and full-time/fixed-term → Mon-Fri
  // 3. If no template and part-time/casual/temporary → 0 days
  const getDefaultDailyHours = (dayIndex: number): number => {
    if (!userProfile) {
      // No profile data - fallback to Mon-Fri for safety
      const defaultWorkingDays = [1, 2, 3, 4, 5]; // Mon-Fri
      return defaultWorkingDays.includes(dayIndex) ? 8 : 0;
    }

    // First, check if user has a template configured (works for ANY employment type)
    const hasTemplate = userProfile.default_monday_office || 
                       userProfile.default_tuesday_office || 
                       userProfile.default_wednesday_office || 
                       userProfile.default_thursday_office || 
                       userProfile.default_friday_office;

    // If template exists, use it regardless of employment type
    if (hasTemplate) {
      const dayMap: Record<number, boolean> = {
        1: userProfile.default_monday_office || false,    // Monday
        2: userProfile.default_tuesday_office || false,   // Tuesday
        3: userProfile.default_wednesday_office || false, // Wednesday
        4: userProfile.default_thursday_office || false,  // Thursday
        5: userProfile.default_friday_office || false,    // Friday
        6: false,  // Saturday
        0: false,  // Sunday
      };
      return dayMap[dayIndex] ? 8 : 0;
    }

    // No template - use employment type defaults
    // Full-time and fixed-term: Mon-Fri
    if (userProfile.employment_type === 'full-time' || userProfile.employment_type === 'fixed-term') {
      const defaultWorkingDays = [1, 2, 3, 4, 5]; // Mon-Fri
      return defaultWorkingDays.includes(dayIndex) ? 8 : 0;
    }

    // Part-time, casual, temporary, or unknown: 0 days until template set
    return 0;
  };

  // Fetch weekly schedule with React Query caching
  const { data: weeklyScheduleData, isLoading: loading } = useQuery({
    queryKey: ['weeklyWorkSchedule', userId, weekStartDateString],
    queryFn: async () => {
      if (!userId) return null;
      console.log(`Fetching weekly work schedule for user ${userId}, week ${weekStartDateString}`);
      return await fetchWeeklyWorkSchedule(userId, weekStartDate);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Sync query data to local state for backward compatibility
  useEffect(() => {
    if (weeklyScheduleData !== undefined) {
      setWeeklySchedule(weeklyScheduleData);
    }
  }, [weeklyScheduleData]);

  // Update weekly schedule
  const updateWeeklySchedule = async (scheduleData: Partial<WeeklyWorkSchedule>) => {
    if (!userId) {
      console.error("No user ID available for updating weekly schedule");
      return;
    }

    try {
      const updatedSchedule = await upsertWeeklyWorkSchedule(userId, weekStartDate, scheduleData);
      setWeeklySchedule(updatedSchedule);

      // Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['weeklyWorkSchedule', userId, weekStartDateString] });

      toast({
        title: "Weekly Schedule Updated",
        description: `Weekly schedule has been updated successfully.`,
      });
    } catch (err) {
      console.error("Error updating weekly schedule:", err);
      setError("Failed to update weekly schedule");

      toast({
        title: "Error",
        description: "Failed to update weekly schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get effective daily hours (from weekly override or default) - convert working days to hours
  const getEffectiveDailyHours = () => {
    if (weeklySchedule) {
      return {
        monday: weeklySchedule.monday_working ? 8 : 0,
        tuesday: weeklySchedule.tuesday_working ? 8 : 0,
        wednesday: weeklySchedule.wednesday_working ? 8 : 0,
        thursday: weeklySchedule.thursday_working ? 8 : 0,
        friday: weeklySchedule.friday_working ? 8 : 0,
        saturday: weeklySchedule.saturday_working ? 8 : 0,
        sunday: weeklySchedule.sunday_working ? 8 : 0,
      };
    }

    // Return default hours based on global working days or user profile template
    return {
      monday: getDefaultDailyHours(1),
      tuesday: getDefaultDailyHours(2),
      wednesday: getDefaultDailyHours(3),
      thursday: getDefaultDailyHours(4),
      friday: getDefaultDailyHours(5),
      saturday: getDefaultDailyHours(6),
      sunday: getDefaultDailyHours(0),
    };
  };

  // Get effective daily schedule (working flags + locations)
  const getEffectiveDailySchedule = () => {
    // Helper function to get default location for a day
    const getDefaultLocation = (day: string): string => {
      // First try to use location data from workScheduleData parameter
      if (workScheduleData) {
        const locationKey = `default_${day}_location`;
        const location = workScheduleData[locationKey];
        if (location) return location;
      }
      
      // Fallback to userProfile locations (from the query)
      if (userProfile?.default_locations) {
        const location = userProfile.default_locations[day as keyof typeof userProfile.default_locations];
        if (location) return location;
      }
      
      // Final fallback - return empty string if no location configured
      return '';
    };

    if (weeklySchedule) {
      return {
        monday: { 
          working: weeklySchedule.monday_working,
          location: weeklySchedule.monday_location || getDefaultLocation('monday')
        },
        tuesday: { 
          working: weeklySchedule.tuesday_working,
          location: weeklySchedule.tuesday_location || getDefaultLocation('tuesday')
        },
        wednesday: { 
          working: weeklySchedule.wednesday_working,
          location: weeklySchedule.wednesday_location || getDefaultLocation('wednesday')
        },
        thursday: { 
          working: weeklySchedule.thursday_working,
          location: weeklySchedule.thursday_location || getDefaultLocation('thursday')
        },
        friday: { 
          working: weeklySchedule.friday_working,
          location: weeklySchedule.friday_location || getDefaultLocation('friday')
        },
        saturday: { 
          working: weeklySchedule.saturday_working,
          location: weeklySchedule.saturday_location || getDefaultLocation('saturday')
        },
        sunday: { 
          working: weeklySchedule.sunday_working,
          location: weeklySchedule.sunday_location || getDefaultLocation('sunday')
        },
      };
    }

    // Return default schedule based on profile or working days
    const defaultSchedule = {} as Record<string, { working: boolean; location: string }>;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayIndexes = [1, 2, 3, 4, 5, 6, 0]; // Map to getDefaultDailyHours indexing

    days.forEach((day, index) => {
      const hours = getDefaultDailyHours(dayIndexes[index]);
      defaultSchedule[day] = {
        working: hours > 0,
        location: hours > 0 ? getDefaultLocation(day) : ''
      };
    });

    return defaultSchedule;
  };

  // NOTE: Realtime subscriptions removed - now handled by React Query refetching
  // and WorkScheduleContext for consolidated updates

  // Check if weekly schedule differs from default template
  const hasWeeklyOverride = useMemo(() => {
    if (!weeklySchedule || !userProfile) return false;
    
    // Compare weekly schedule with user's default template
    const defaultTemplate = {
      monday: userProfile.default_monday_office || false,
      tuesday: userProfile.default_tuesday_office || false,
      wednesday: userProfile.default_wednesday_office || false,
      thursday: userProfile.default_thursday_office || false,
      friday: userProfile.default_friday_office || false,
    };
    
    // For full-time users without templates, default is Mon-Fri
    if (userProfile.employment_type === 'full-time' && 
        !defaultTemplate.monday && !defaultTemplate.tuesday && 
        !defaultTemplate.wednesday && !defaultTemplate.thursday && !defaultTemplate.friday) {
      defaultTemplate.monday = true;
      defaultTemplate.tuesday = true;
      defaultTemplate.wednesday = true;
      defaultTemplate.thursday = true;
      defaultTemplate.friday = true;
    }
    
    // Check if any working day differs from default
    return weeklySchedule.monday_working !== defaultTemplate.monday ||
           weeklySchedule.tuesday_working !== defaultTemplate.tuesday ||
           weeklySchedule.wednesday_working !== defaultTemplate.wednesday ||
           weeklySchedule.thursday_working !== defaultTemplate.thursday ||
           weeklySchedule.friday_working !== defaultTemplate.friday;
  }, [weeklySchedule, userProfile]);

  return {
    weeklySchedule,
    effectiveDailyHours: getEffectiveDailyHours(),
    effectiveDailySchedule: getEffectiveDailySchedule(),
    updateWeeklySchedule,
    loading,
    error,
    reload: () => queryClient.invalidateQueries({ queryKey: ['weeklyWorkSchedule', userId, weekStartDateString] }),
    hasWeeklyOverride,
  };
};
