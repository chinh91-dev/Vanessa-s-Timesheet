import { supabase } from "@/integrations/supabase/client";
import { isWeekend } from "@/lib/date-utils";
import { getUserRole } from "@/utils/roles";
import { handleValidation, logServiceError, validateRequiredParams } from "@/utils/service-error-handler";

export interface WeekendValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Server-side weekend validation with admin override
 */
export const validateWeekendEntry = async (entryDate: string): Promise<WeekendValidationResult> => {
  return handleValidation(
    async () => {
      validateRequiredParams({ entryDate }, 'validateWeekendEntry');

      const date = new Date(entryDate);
      console.log(`Server-side weekend validation for date: ${date.toDateString()}`);

      // If it's not a weekend, always allow
      if (!isWeekend(date)) {
        return { isValid: true };
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logServiceError('validateWeekendEntry', authError || new Error('User not authenticated'));
        return { isValid: false, message: "Authentication required" };
      }

      // Check if user is admin - admins can ALWAYS log weekend entries
      const userRole = await getUserRole(user.id);

      // Admin override: admins can always log weekend entries regardless of settings
      if (userRole === 'admin') {
        console.log("Admin override: allowing weekend entry");
        return { isValid: true };
      }

      // For non-admin users, check their weekend permissions
      const { data: workSchedule, error: scheduleError } = await supabase
        .from("work_schedules")
        .select("allow_weekend_entries")
        .eq("user_id", user.id)
        .maybeSingle();

      if (scheduleError) {
        logServiceError('validateWeekendEntry', scheduleError, { userId: user.id });
        return { isValid: false, message: "Error validating weekend permissions" };
      }

      const allowWeekendEntries = workSchedule?.allow_weekend_entries || false;
      console.log(`User weekend permission: ${allowWeekendEntries}`);

      if (!allowWeekendEntries) {
        return {
          isValid: false,
          message: "Weekend entries are not allowed. Please contact your administrator for approval."
        };
      }

      return { isValid: true };
    },
    { context: 'validateWeekendEntry' }
  );
};
