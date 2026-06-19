
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/date-utils";

export interface WeeklyWorkSchedule {
  id: string;
  user_id: string;
  week_start_date: string;
  monday_working: boolean;
  tuesday_working: boolean;
  wednesday_working: boolean;
  thursday_working: boolean;
  friday_working: boolean;
  saturday_working: boolean;
  sunday_working: boolean;
  monday_location?: string;
  tuesday_location?: string;
  wednesday_location?: string;
  thursday_location?: string;
  friday_location?: string;
  saturday_location?: string;
  sunday_location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const fetchWeeklyWorkSchedule = async (userId: string, weekStartDate: Date): Promise<WeeklyWorkSchedule | null> => {
  try {
    const formattedDate = formatDate(weekStartDate);
    console.log(`Fetching weekly work schedule for user ${userId}, week ${formattedDate}`);
    
    const { data, error } = await supabase
      .from("weekly_work_schedules")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start_date", formattedDate)
      .maybeSingle();

    if (error) {
      console.error("Error fetching weekly work schedule:", error);
      return null;
    }

    console.log(`Weekly work schedule fetched:`, data);
    return data;
  } catch (error) {
    console.error("Error in fetchWeeklyWorkSchedule:", error);
    return null;
  }
};

export const upsertWeeklyWorkSchedule = async (
  userId: string, 
  weekStartDate: Date, 
  scheduleData: Partial<WeeklyWorkSchedule>
): Promise<WeeklyWorkSchedule | null> => {
  try {
    const formattedDate = formatDate(weekStartDate);
    console.log(`Upserting weekly work schedule for user ${userId}, week ${formattedDate}:`, scheduleData);
    
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    // If no existing schedule and no explicit working days provided, initialize from profile
    if (!scheduleData.monday_working && !scheduleData.tuesday_working && !scheduleData.wednesday_working && 
        !scheduleData.thursday_working && !scheduleData.friday_working) {
      
      // Check if schedule already exists
      const existing = await fetchWeeklyWorkSchedule(userId, weekStartDate);
      if (!existing) {
        // Initialize from user's profile
        const { generateDefaultWorkingDaysFromProfile } = await import("@/lib/work-schedule-sync-service");
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, employment_type, default_monday_office, default_tuesday_office, default_wednesday_office, default_thursday_office, default_friday_office')
          .eq('id', userId)
          .single();
        
        if (profile) {
          const defaultWorkingDays = generateDefaultWorkingDaysFromProfile(profile);
          scheduleData = { ...defaultWorkingDays, ...scheduleData };
        }
      }
    }

    const { data, error } = await supabase
      .from("weekly_work_schedules")
      .upsert({
        user_id: userId,
        week_start_date: formattedDate,
        created_by: currentUser.id,
        updated_at: new Date().toISOString(),
        ...scheduleData
      }, {
        onConflict: "user_id,week_start_date"
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting weekly work schedule:", error);
      throw error;
    }

    console.log(`Weekly work schedule upserted successfully:`, data);
    return data;
  } catch (error) {
    console.error("Error in upsertWeeklyWorkSchedule:", error);
    throw error;
  }
};

export const deleteWeeklyWorkSchedule = async (userId: string, weekStartDate: Date): Promise<void> => {
  try {
    const formattedDate = formatDate(weekStartDate);
    console.log(`Deleting weekly work schedule for user ${userId}, week ${formattedDate}`);
    
    const { error } = await supabase
      .from("weekly_work_schedules")
      .delete()
      .eq("user_id", userId)
      .eq("week_start_date", formattedDate);

    if (error) {
      console.error("Error deleting weekly work schedule:", error);
      throw error;
    }

    console.log(`Weekly work schedule deleted successfully`);
  } catch (error) {
    console.error("Error in deleteWeeklyWorkSchedule:", error);
    throw error;
  }
};

export const applyTemplateToWeek = async (
  userId: string, 
  weekStartDate: Date, 
  templateDays: Record<string, boolean>,
  templateLocations: Record<string, string>
): Promise<WeeklyWorkSchedule | null> => {
  try {
    console.log(`Applying template to week for user ${userId}:`, { templateDays, templateLocations });
    
    // Create schedule data from template
    const scheduleData: Partial<WeeklyWorkSchedule> = {
      monday_working: templateDays.monday,
      tuesday_working: templateDays.tuesday,
      wednesday_working: templateDays.wednesday,
      thursday_working: templateDays.thursday,
      friday_working: templateDays.friday,
      saturday_working: false,
      sunday_working: false,
      monday_location: templateDays.monday ? templateLocations.monday : null,
      tuesday_location: templateDays.tuesday ? templateLocations.tuesday : null,
      wednesday_location: templateDays.wednesday ? templateLocations.wednesday : null,
      thursday_location: templateDays.thursday ? templateLocations.thursday : null,
      friday_location: templateDays.friday ? templateLocations.friday : null,
      saturday_location: null,
      sunday_location: null,
    };
    
    return await upsertWeeklyWorkSchedule(userId, weekStartDate, scheduleData);
  } catch (error) {
    console.error("Error applying template to week:", error);
    throw error;
  }
};
