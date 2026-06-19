
import { useMemo } from "react";
import { TimesheetEntry } from "@/lib/timesheet-service";
import { useSimpleWeeklySchedule } from "@/hooks/useSimpleWeeklySchedule";
import { useWeekendLock } from "@/hooks/useWeekendLock";
import { formatDate, getWeekStart, isWeekend } from "@/lib/date-utils";

interface WorkingDaysValidationResult {
  daysWorked: number;
  daysAllowed: number;
  daysRemaining: number;
  isAtLimit: boolean;
  canAddToDate: (date: Date) => boolean;
  getValidationMessage: () => string;
}

export const useWorkingDaysValidation = (
  userId: string,
  entries: TimesheetEntry[],
  currentWeekStart: Date
): WorkingDaysValidationResult => {
  const { effectiveDays } = useSimpleWeeklySchedule(userId, currentWeekStart);
  const { canCreateWeekendEntries } = useWeekendLock(userId);

  const validationResult = useMemo(() => {
    // Get unique days that have entries in the current week
    const weekStartStr = formatDate(getWeekStart(currentWeekStart));
    const weekEndStr = formatDate(new Date(getWeekStart(currentWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000));
    
    const daysWithEntries = new Set<string>();
    
    entries.forEach(entry => {
      const entryDateStr = String(entry.entry_date).substring(0, 10);
      if (entryDateStr >= weekStartStr && entryDateStr <= weekEndStr) {
        daysWithEntries.add(entryDateStr);
      }
    });

    // Calculate days worked, excluding weekends if user has weekend permissions
    let daysWorked = daysWithEntries.size;
    if (canCreateWeekendEntries) {
      // Count only non-weekend days toward the limit
      daysWorked = Array.from(daysWithEntries).filter(dateStr => {
        const date = new Date(dateStr);
        return !isWeekend(date);
      }).length;
    }
    const daysAllowed = effectiveDays;
    const daysRemaining = Math.max(0, daysAllowed - daysWorked);
    const isAtLimit = daysWorked >= daysAllowed;

    const canAddToDate = (date: Date): boolean => {
      const dateStr = formatDate(date);
      
      // Always allow adding to days that already have entries
      if (daysWithEntries.has(dateStr)) {
        return true;
      }
      
      // If user has weekend permissions, always allow weekend entries
      if (canCreateWeekendEntries && isWeekend(date)) {
        return true;
      }
      
      // For regular weekdays, only allow if under the limit
      return !isAtLimit;
    };

    const getValidationMessage = (): string => {
      if (daysRemaining > 0) {
        const weekdayMessage = `You can log time for ${daysRemaining} more day${daysRemaining > 1 ? 's' : ''} this week`;
        if (canCreateWeekendEntries) {
          return `${weekdayMessage} (plus weekends if needed)`;
        }
        return weekdayMessage;
      } else if (isAtLimit) {
        const limitMessage = `You've reached your ${daysAllowed}-day limit for this week. You can only edit existing entries or remove entries to free up days.`;
        if (canCreateWeekendEntries) {
          return `${limitMessage} Weekend entries are still available.`;
        }
        return limitMessage;
      }
      return "";
    };

    return {
      daysWorked,
      daysAllowed,
      daysRemaining,
      isAtLimit,
      canAddToDate,
      getValidationMessage,
    };
  }, [entries, effectiveDays, currentWeekStart]);

  return validationResult;
};
