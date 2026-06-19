
/**
 * Utility functions for time calculations in timesheet entries
 */

/**
 * Calculate hours between two time strings (HH:MM format)
 */
export const calculateHoursBetweenTimes = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  
  // Parse time strings
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Convert to minutes
  const startTotalMinutes = startHour * 60 + startMinute;
  let endTotalMinutes = endHour * 60 + endMinute;
  
  // Handle overnight shifts (end time is next day)
  if (endTotalMinutes <= startTotalMinutes) {
    endTotalMinutes += 24 * 60; // Add 24 hours in minutes
  }
  
  // Calculate difference in minutes
  const diffMinutes = endTotalMinutes - startTotalMinutes;
  
  // Convert to hours and round to nearest 0.25 (15 minutes)
  const hours = diffMinutes / 60;
  return Math.round(hours * 4) / 4; // Round to nearest quarter hour
};

/**
 * Check if a time string is valid (HH:MM format)
 */
export const isValidTimeString = (timeString: string): boolean => {
  if (!timeString) return false;
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * Format hours as a readable string
 */
export const formatHoursForDisplay = (hours: number): string => {
  if (hours === 0) return '';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${minutes}m`;
};
