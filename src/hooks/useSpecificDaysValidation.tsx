import { useMemo } from "react";
import { TimesheetEntry } from "@/lib/timesheet-service";
import { formatDate, getWeekStart, isWeekend, getMondayFirstDayOfWeek } from "@/lib/date-utils";

interface SpecificDaysValidationResult {
  allowedDays: Set<string>;
  canAddToDate: (date: Date) => boolean;
  getValidationMessage: (date: Date) => string;
  isDateAllowed: (date: Date) => boolean;
  getAllowedDaysInWeek: () => string[];
}

// Interface for effective daily hours to avoid hook calls
interface EffectiveDailyHours {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

// Default work schedule (Mon-Fri, 8h each)
const DEFAULT_DAILY_HOURS: EffectiveDailyHours = {
  monday: 8,
  tuesday: 8,
  wednesday: 8,
  thursday: 8,
  friday: 8,
  saturday: 0,
  sunday: 0,
};

/**
 * Validates whether entries can be added to specific days.
 * Now accepts pre-computed data to avoid internal hook calls and reduce API requests.
 * 
 * @param userId - User ID for context
 * @param entries - Current timesheet entries
 * @param currentWeekStart - Start of the week being validated
 * @param effectiveDailyHours - Pre-computed daily hours from parent (optional, uses defaults if not provided)
 * @param canCreateWeekendEntries - Pre-computed weekend permission from parent (optional)
 */
export const useSpecificDaysValidation = (
  userId: string,
  entries: TimesheetEntry[],
  currentWeekStart: Date,
  effectiveDailyHours?: EffectiveDailyHours,
  canCreateWeekendEntries: boolean = false
): SpecificDaysValidationResult => {
  // Use provided data or fall back to defaults - NO internal hook calls
  const dailyHours = effectiveDailyHours || DEFAULT_DAILY_HOURS;

  const validationResult = useMemo(() => {
    // Get allowed days based on the effective daily hours schedule
    const allowedDays = new Set<string>();
    const weekStart = getWeekStart(currentWeekStart);
    
    // Map daily hours to specific dates for the week (Monday=0 system)
    const dayMappings = [
      { dayName: 'monday', hours: dailyHours.monday, dayOffset: 0 },
      { dayName: 'tuesday', hours: dailyHours.tuesday, dayOffset: 1 },
      { dayName: 'wednesday', hours: dailyHours.wednesday, dayOffset: 2 },
      { dayName: 'thursday', hours: dailyHours.thursday, dayOffset: 3 },
      { dayName: 'friday', hours: dailyHours.friday, dayOffset: 4 },
      { dayName: 'saturday', hours: dailyHours.saturday, dayOffset: 5 },
      { dayName: 'sunday', hours: dailyHours.sunday, dayOffset: 6 },
    ];

    dayMappings.forEach(({ dayName, hours, dayOffset }) => {
      if (hours > 0) {
        // Calculate the actual date for this day of the week (Monday=0 system)
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + dayOffset); // Direct offset from Monday
        allowedDays.add(formatDate(dayDate));
      }
    });

    const isDateAllowed = (date: Date): boolean => {
      const dateStr = formatDate(date);
      
      // Always allow if it's an allowed day based on schedule
      if (allowedDays.has(dateStr)) {
        return true;
      }
      
      // Allow weekend entries if user has weekend permissions
      if (canCreateWeekendEntries && isWeekend(date)) {
        return true;
      }
      
      return false;
    };

    const canAddToDate = (date: Date): boolean => {
      const dateStr = formatDate(date);
      
      // Always allow adding to days that already have entries
      const hasExistingEntries = entries.some(entry => {
        const entryDateStr = String(entry.entry_date).substring(0, 10);
        return entryDateStr === dateStr;
      });
      
      if (hasExistingEntries) {
        return true;
      }
      
      return isDateAllowed(date);
    };

    const getValidationMessage = (date: Date): string => {
      const dateStr = formatDate(date);
      const mondayDay = getMondayFirstDayOfWeek(date);
      
      if (isDateAllowed(date)) {
        return "You can log time on this day";
      }
      
      if ((mondayDay === 5 || mondayDay === 6) && !canCreateWeekendEntries) { // Saturday=5, Sunday=6 in Monday=0 system
        return "Weekend entries are not allowed. Contact your administrator for weekend permissions.";
      }
      
      if (!allowedDays.has(dateStr) && !(mondayDay === 5 || mondayDay === 6)) {
        return "This day is not in your work schedule. You can only log time on scheduled work days.";
      }
      
      return "Time entry not allowed for this date";
    };

    const getAllowedDaysInWeek = (): string[] => {
      return Array.from(allowedDays).sort();
    };

    return {
      allowedDays,
      canAddToDate,
      getValidationMessage,
      isDateAllowed,
      getAllowedDaysInWeek,
    };
  }, [dailyHours, entries, currentWeekStart, canCreateWeekendEntries]);

  return validationResult;
};