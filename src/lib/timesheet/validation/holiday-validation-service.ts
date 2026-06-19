import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/date-utils";
import { tryServiceOperation, logServiceError, validateRequiredParams } from "@/utils/service-error-handler";

export interface HolidayValidationResult {
  isValid: boolean;
  message?: string;
  holidayName?: string;
}

export interface HolidayCheckResult {
  isHoliday: boolean;
  holidayName?: string;
}

/**
 * Server-side holiday validation with enhanced granular permissions
 * @param entryDate - The date to validate
 * @param userId - Optional user ID to check permissions for (defaults to authenticated user)
 */
export const validateHolidayEntry = async (entryDate: string, userId?: string): Promise<HolidayValidationResult> => {
  return tryServiceOperation(
    async () => {
      validateRequiredParams({ entryDate }, 'validateHolidayEntry');

      const date = new Date(entryDate);
      console.log(`🔍 [HOLIDAY-DEBUG] validateHolidayEntry called with:`, {
        entryDate,
        passedUserId: userId,
        parsedDate: date.toDateString(),
        formattedDate: formatDate(date)
      });

      // Determine target user ID
      let targetUserId = userId;
      if (!targetUserId) {
        // Fall back to authenticated user if no userId provided
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          logServiceError('validateHolidayEntry', authError || new Error('User not authenticated'));
          console.log(`🔍 [HOLIDAY-DEBUG] No userId passed, auth failed`);
          return { isValid: false, message: "Authentication required" };
        }
        targetUserId = user.id;
        console.log(`🔍 [HOLIDAY-DEBUG] No userId passed, using logged-in user: ${targetUserId}`);
      } else {
        console.log(`🔍 [HOLIDAY-DEBUG] Using passed userId: ${targetUserId}`);
      }

      const formattedDate = formatDate(date);
      console.log(`🔍 [HOLIDAY-DEBUG] Calling RPC check_user_holiday_permission with:`, {
        p_user_id: targetUserId,
        p_holiday_date: formattedDate,
        p_target_state: 'VIC'
      });

      // Use the new enhanced holiday permission checking function
      const { data: permissionResult, error: permissionError } = await supabase.rpc(
        'check_user_holiday_permission',
        {
          p_user_id: targetUserId,
          p_holiday_date: formattedDate,
          p_target_state: 'VIC'
        }
      );

      console.log(`🔍 [HOLIDAY-DEBUG] RPC response:`, {
        data: permissionResult,
        error: permissionError
      });

      if (permissionError) {
        logServiceError('validateHolidayEntry', permissionError, { userId: targetUserId, date: entryDate });
        console.log(`🔍 [HOLIDAY-DEBUG] RPC error, failing OPEN (allowing entry)`);
        return { isValid: true }; // Fail open - allow entry if we can't check
      }

      // The function returns an array with one result
      const result = permissionResult?.[0];
      if (!result) {
        console.log(`🔍 [HOLIDAY-DEBUG] No result from RPC, allowing entry (not a holiday)`);
        return { isValid: true }; // No holiday data, allow entry
      }

      console.log(`🔍 [HOLIDAY-DEBUG] Final result:`, {
        is_allowed: result.is_allowed,
        message: result.message,
        holiday_name: result.holiday_name,
        permission_source: result.permission_source
      });

      return {
        isValid: result.is_allowed,
        message: result.message,
        holidayName: result.holiday_name
      };
    },
    {
      context: 'validateHolidayEntry',
      fallbackValue: { isValid: false, message: "Error validating holiday entry" }
    }
  );
};

/**
 * Client-side helper to check if a date is a holiday (for UI indicators)
 */
export const isHoliday = async (date: Date): Promise<HolidayCheckResult> => {
  return tryServiceOperation(
    async () => {
      const { data: isHolidayResult, error } = await supabase.rpc('is_public_holiday', {
        entry_date: formatDate(date),
        target_state: 'VIC'
      });

      if (error || !isHolidayResult) {
        return { isHoliday: false };
      }

      // Get holiday name if it is a holiday
      const { data: holidayName } = await supabase.rpc('get_public_holiday_name', {
        entry_date: formatDate(date),
        target_state: 'VIC'
      });

      return {
        isHoliday: true,
        holidayName: holidayName || undefined
      };
    },
    {
      context: 'isHoliday',
      fallbackValue: { isHoliday: false }
    }
  );
};
