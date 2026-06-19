
/**
 * Utility functions for sorting timesheet entries by time
 */

import { TimesheetEntry } from "@/lib/timesheet-service";

/**
 * Parse time string (HH:MM format) to minutes since midnight
 */
export const parseTimeToMinutes = (timeString: string | null): number => {
  if (!timeString) return -1; // Put entries without time at the bottom
  
  // Handle different time formats
  const cleanTime = timeString.trim();
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  
  if (!timeRegex.test(cleanTime)) {
    return -1; // Invalid time format, treat as no time
  }
  
  const [hours, minutes] = cleanTime.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Sort timesheet entries by start time
 * Latest time first (top), earliest time last (bottom)
 * Entries without start_time appear at the bottom
 */
export const sortEntriesByTime = (entries: TimesheetEntry[]): TimesheetEntry[] => {
  return [...entries].sort((a, b) => {
    const timeA = parseTimeToMinutes(a.start_time);
    const timeB = parseTimeToMinutes(b.start_time);
    
    // Entries without time (-1) should be at the bottom
    if (timeA === -1 && timeB === -1) return 0; // Both have no time, maintain order
    if (timeA === -1) return 1; // A has no time, put it after B
    if (timeB === -1) return -1; // B has no time, put A before B
    
    // Both have time - sort in descending order (latest first)
    return timeB - timeA;
  });
};
