import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/date-utils";

interface UserProfile {
  id: string;
  employment_type?: string;
  default_monday_office?: boolean;
  default_tuesday_office?: boolean;
  default_wednesday_office?: boolean;
  default_thursday_office?: boolean;
  default_friday_office?: boolean;
}

interface WeeklySchedule {
  user_id: string;
  week_start_date: string;
  monday_working: boolean;
  tuesday_working: boolean;
  wednesday_working: boolean;
  thursday_working: boolean;
  friday_working: boolean;
  saturday_working: boolean;
  sunday_working: boolean;
}

/**
 * Generate default working days based on user's office day template
 * 
 * Logic priority:
 * 1. If template is configured (any employment type) → use template
 * 2. If no template and full-time/fixed-term → Mon-Fri
 * 3. If no template and part-time/casual/temporary → 0 days
 */
export const generateDefaultWorkingDaysFromProfile = (profile: UserProfile): Omit<WeeklySchedule, 'user_id' | 'week_start_date'> => {
  // First, check if user has a template configured (works for ANY employment type)
  const hasTemplate = profile.default_monday_office || 
                     profile.default_tuesday_office || 
                     profile.default_wednesday_office || 
                     profile.default_thursday_office || 
                     profile.default_friday_office;

  // If template exists, use it regardless of employment type
  if (hasTemplate) {
    return {
      monday_working: profile.default_monday_office || false,
      tuesday_working: profile.default_tuesday_office || false,
      wednesday_working: profile.default_wednesday_office || false,
      thursday_working: profile.default_thursday_office || false,
      friday_working: profile.default_friday_office || false,
      saturday_working: false,
      sunday_working: false,
    };
  }

  // No template - use employment type defaults
  // Full-time and fixed-term: Mon-Fri
  if (profile.employment_type === 'full-time' || profile.employment_type === 'fixed-term') {
    return {
      monday_working: true,
      tuesday_working: true,
      wednesday_working: true,
      thursday_working: true,
      friday_working: true,
      saturday_working: false,
      sunday_working: false,
    };
  }

  // Part-time, casual, temporary, or unknown: 0 days until template set
  return {
    monday_working: false,
    tuesday_working: false,
    wednesday_working: false,
    thursday_working: false,
    friday_working: false,
    saturday_working: false,
    sunday_working: false,
  };
};

/**
 * Check if a weekly schedule matches the user's default office day template
 */
export const scheduleMatchesProfile = (schedule: WeeklySchedule, profile: UserProfile): boolean => {
  const defaultWorkingDays = generateDefaultWorkingDaysFromProfile(profile);
  
  return schedule.monday_working === defaultWorkingDays.monday_working &&
         schedule.tuesday_working === defaultWorkingDays.tuesday_working &&
         schedule.wednesday_working === defaultWorkingDays.wednesday_working &&
         schedule.thursday_working === defaultWorkingDays.thursday_working &&
         schedule.friday_working === defaultWorkingDays.friday_working &&
         schedule.saturday_working === defaultWorkingDays.saturday_working &&
         schedule.sunday_working === defaultWorkingDays.sunday_working;
};

/**
 * Sync weekly schedules with user profiles for a specific week
 */
export const syncWeeklySchedulesWithProfiles = async (weekStartDate: Date, userIds?: string[]): Promise<{
  synced: number;
  skipped: number;
  errors: number;
}> => {
  try {
    const formattedDate = formatDate(weekStartDate);
    
    // Fetch user profiles
    let profileQuery = supabase
      .from('profiles')
      .select('id, employment_type, default_monday_office, default_tuesday_office, default_wednesday_office, default_thursday_office, default_friday_office');
    
    if (userIds && userIds.length > 0) {
      profileQuery = profileQuery.in('id', userIds);
    }
    
    const { data: profiles, error: profileError } = await profileQuery;
    
    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return { synced: 0, skipped: 0, errors: 0 };
    }

    // Fetch existing weekly schedules for this week
    const { data: existingSchedules, error: scheduleError } = await supabase
      .from('weekly_work_schedules')
      .select('user_id, week_start_date, monday_working, tuesday_working, wednesday_working, thursday_working, friday_working, saturday_working, sunday_working')
      .eq('week_start_date', formattedDate)
      .in('user_id', profiles.map(p => p.id));

    if (scheduleError) {
      throw new Error(`Failed to fetch existing schedules: ${scheduleError.message}`);
    }

    const existingScheduleMap = new Map<string, WeeklySchedule>();
    (existingSchedules || []).forEach(schedule => {
      existingScheduleMap.set(schedule.user_id, schedule as WeeklySchedule);
    });

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    // Get current user for created_by field
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    for (const profile of profiles) {
      try {
        const existingSchedule = existingScheduleMap.get(profile.id);
        const defaultWorkingDays = generateDefaultWorkingDaysFromProfile(profile);

        // Skip if existing schedule already matches profile
        if (existingSchedule && scheduleMatchesProfile(existingSchedule, profile)) {
          skipped++;
          continue;
        }

        // Create or update the schedule
        const { error: upsertError } = await supabase
          .from('weekly_work_schedules')
          .upsert({
            user_id: profile.id,
            week_start_date: formattedDate,
            created_by: currentUser.id,
            updated_at: new Date().toISOString(),
            ...defaultWorkingDays
          }, {
            onConflict: 'user_id,week_start_date'
          });

        if (upsertError) {
          console.error(`Error syncing schedule for user ${profile.id}:`, upsertError);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`Error processing user ${profile.id}:`, err);
        errors++;
      }
    }

    return { synced, skipped, errors };
  } catch (error) {
    console.error('Error in syncWeeklySchedulesWithProfiles:', error);
    throw error;
  }
};

/**
 * Initialize a new weekly schedule based on user's profile
 */
export const initializeWeeklyScheduleFromProfile = async (
  userId: string, 
  weekStartDate: Date
): Promise<WeeklySchedule | null> => {
  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, employment_type, default_monday_office, default_tuesday_office, default_wednesday_office, default_thursday_office, default_friday_office')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(`Failed to fetch user profile: ${profileError?.message}`);
    }

    // Generate default working days based on profile
    const defaultWorkingDays = generateDefaultWorkingDaysFromProfile(profile);
    const formattedDate = formatDate(weekStartDate);

    // Get current user for created_by field
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    // Create the schedule
    const { data, error } = await supabase
      .from('weekly_work_schedules')
      .insert({
        user_id: userId,
        week_start_date: formattedDate,
        created_by: currentUser.id,
        ...defaultWorkingDays
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create weekly schedule: ${error.message}`);
    }

    return data as WeeklySchedule;
  } catch (error) {
    console.error('Error in initializeWeeklyScheduleFromProfile:', error);
    throw error;
  }
};

/**
 * Reset all weekly schedules to templates by deleting ALL overrides for EVERY week
 */
export const resetAllWeeklySchedulesToTemplate = async (): Promise<{ deleted: number }> => {
  try {
    // First count how many will be deleted
    const { count, error: countError } = await supabase
      .from('weekly_work_schedules')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw new Error(`Failed to count schedules: ${countError.message}`);
    }
    
    // Delete ALL weekly schedules (no week filter)
    const { error } = await supabase
      .from('weekly_work_schedules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (error) {
      throw new Error(`Failed to delete schedules: ${error.message}`);
    }
    
    return { deleted: count || 0 };
  } catch (error) {
    console.error('Error in resetAllWeeklySchedulesToTemplate:', error);
    throw error;
  }
};