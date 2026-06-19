import { supabase } from "@/integrations/supabase/client";
import { formatDate, getWeekStart, isWeekend, getMondayFirstDayOfWeek } from "@/lib/date-utils";
import { getUserRole } from "@/utils/roles";

export interface SpecificDaysValidationResult {
  isValid: boolean;
  message?: string;
  isWeekendOverride?: boolean;
  isScheduledDay?: boolean;
}

/**
 * Validates if a user can log time on a specific date based on their work schedule
 */
export const validateSpecificDayEntry = async (
  userId: string,
  entryDate: string
): Promise<SpecificDaysValidationResult> => {
  try {
    console.log("=== VALIDATING SPECIFIC DAY ENTRY ===");
    console.log("User ID:", userId);
    console.log("Entry Date:", entryDate);

    // Check if user is admin - admins can bypass work schedule restrictions
    const userRole = await getUserRole(userId);
    const isAdmin = userRole === 'admin';
    console.log("User role:", userRole, "Is admin:", isAdmin);

    if (isAdmin) {
      console.log("Entry allowed - admin override");
      return {
        isValid: true,
        message: "Admin privilege allows all entries"
      };
    }

    const date = new Date(entryDate);
    const weekStart = getWeekStart(date);
    const weekStartStr = formatDate(weekStart);

    // Get the user's weekly work schedule for this week
    const { data: weeklySchedule, error: scheduleError } = await supabase
      .from("weekly_work_schedules")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start_date", weekStartStr)
      .maybeSingle();

    if (scheduleError) {
      console.error("Error fetching weekly schedule:", scheduleError);
      throw scheduleError;
    }

    console.log("Weekly schedule data:", weeklySchedule);

    // If no weekly schedule exists, get the default working days from work_schedules
    let allowedDays: { [key: string]: boolean } = {};
    
    if (weeklySchedule) {
      // Use the correct column names: *_working (boolean) not *_hours
      allowedDays = {
        monday: weeklySchedule.monday_working || false,
        tuesday: weeklySchedule.tuesday_working || false,
        wednesday: weeklySchedule.wednesday_working || false,
        thursday: weeklySchedule.thursday_working || false,
        friday: weeklySchedule.friday_working || false,
        saturday: weeklySchedule.saturday_working || false,
        sunday: weeklySchedule.sunday_working || false,
      };
      console.log("Using weekly schedule override:", allowedDays);
    } else {
      // Fetch work schedule and profile data separately to avoid join ambiguity
      const [workScheduleResult, profileResult] = await Promise.all([
        supabase
          .from("work_schedules")
          .select("working_days")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select(`
            default_monday_office,
            default_tuesday_office,
            default_wednesday_office,
            default_thursday_office,
            default_friday_office
          `)
          .eq("id", userId)
          .maybeSingle()
      ]);

      if (workScheduleResult.error) {
        console.error("Error fetching work schedule:", workScheduleResult.error);
        throw workScheduleResult.error;
      }

      if (profileResult.error) {
        console.error("Error fetching profile:", profileResult.error);
        throw profileResult.error;
      }

      const profile = profileResult.data;
      const workingDays = workScheduleResult.data?.working_days || 5;
      
      console.log("Work schedule working_days:", workingDays);
      console.log("Profile data:", profile);
      
      // Prioritize profile office day configuration over generic working_days count
      if (profile && (
        profile.default_monday_office !== null ||
        profile.default_tuesday_office !== null ||
        profile.default_wednesday_office !== null ||
        profile.default_thursday_office !== null ||
        profile.default_friday_office !== null
      )) {
        // Use profile office day template
        allowedDays = {
          monday: profile.default_monday_office || false,
          tuesday: profile.default_tuesday_office || false,
          wednesday: profile.default_wednesday_office || false,
          thursday: profile.default_thursday_office || false,
          friday: profile.default_friday_office || false,
          saturday: false, // Profile doesn't configure weekends
          sunday: false,   // Profile doesn't configure weekends
        };
        console.log("Using profile office day template:", allowedDays);
      } else {
        // Fall back to generic working_days count (1-5 for Mon-Fri)
        allowedDays = {
          monday: workingDays >= 1,
          tuesday: workingDays >= 2,
          wednesday: workingDays >= 3,
          thursday: workingDays >= 4,
          friday: workingDays >= 5,
          saturday: false, // Default schedule doesn't include weekends
          sunday: false,   // Default schedule doesn't include weekends
        };
        console.log("Using default schedule logic - working_days:", workingDays, "allowed days:", allowedDays);
      }
    }

    // Determine which day of week the entry date is using Monday=0 system
    const dayOfWeek = getMondayFirstDayOfWeek(date); // Monday=0 system
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayName = dayNames[dayOfWeek];

    const isScheduledDay = allowedDays[dayName] === true;
    const isWeekendDay = isWeekend(date);

    console.log("Day of week:", dayName, "(index:", dayOfWeek, ")");
    console.log("Is scheduled day:", isScheduledDay);
    console.log("Is weekend:", isWeekendDay);
    console.log("Allowed days:", allowedDays);

    // Check if it's a scheduled work day
    if (isScheduledDay) {
      console.log("Entry allowed - scheduled work day");
      return {
        isValid: true,
        isScheduledDay: true,
        message: "Scheduled work day"
      };
    }

    // Check weekend permissions if it's a weekend
    if (isWeekendDay) {
      const { data: workSchedule, error: weekendError } = await supabase
        .from("work_schedules")
        .select("allow_weekend_entries")
        .eq("user_id", userId)
        .maybeSingle();

      if (weekendError) {
        console.error("Error checking weekend permissions:", weekendError);
        throw weekendError;
      }

      const canWorkWeekends = workSchedule?.allow_weekend_entries || false;
      
      if (canWorkWeekends) {
        console.log("Entry allowed - weekend override permission");
        return {
          isValid: true,
          isWeekendOverride: true,
          message: "Weekend work permitted"
        };
      } else {
        console.log("Entry blocked - weekend not allowed");
        return {
          isValid: false,
          message: "Weekend entries are not allowed. Contact your administrator for weekend permissions."
        };
      }
    }

    // Not a scheduled day and not a permitted weekend
    console.log("Entry blocked - not a scheduled work day");
    return {
      isValid: false,
      message: "This day is not in your work schedule. You can only log time on scheduled work days."
    };

  } catch (error) {
    console.error("Error in validateSpecificDayEntry:", error);
    return {
      isValid: false,
      message: "Failed to validate entry date. Please try again."
    };
  }
};