import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay } from "date-fns";

// AEST timezone helpers
const AEST_TIMEZONE = 'Australia/Melbourne';

// Convert UTC date/time to AEST display format
export const toAESTDisplay = (utcDateTime: string | Date): string => {
  const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  return date.toLocaleString('en-AU', {
    timeZone: AEST_TIMEZONE,
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Convert UTC time to AEST time only
export const toAESTTimeOnly = (utcDateTime: string | Date): string => {
  const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  return date.toLocaleTimeString('en-AU', {
    timeZone: AEST_TIMEZONE,
    hour12: true,
    hour: 'numeric',
    minute: '2-digit'
  });
};

// Convert UTC date to AEST date only
export const toAESTDateOnly = (utcDateTime: string | Date): string => {
  const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  return date.toLocaleDateString('en-AU', {
    timeZone: AEST_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Get current date in AEST timezone
export const getCurrentAESTDate = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: AEST_TIMEZONE }));
};

// Check if date is today in AEST timezone
export const isAESTToday = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const aestNow = getCurrentAESTDate();
  
  // Compare YYYY-MM-DD strings in AEST
  const targetAESTDate = targetDate.toLocaleDateString('en-CA', { timeZone: AEST_TIMEZONE });
  const todayAESTDate = aestNow.toLocaleDateString('en-CA', { timeZone: AEST_TIMEZONE });
  
  return targetAESTDate === todayAESTDate;
};

export const formatDate = (date: Date): string => {
  // Ensure consistent date format YYYY-MM-DD without timezone effects
  return format(date, "yyyy-MM-dd");
};

export const formatDateDisplay = (date: Date): string => {
  return format(date, "d MMM yyyy");
};

export const formatDateShort = (date: Date): string => {
  return format(date, "EEE, d MMM");
};

export const getCurrentWeekDates = (currentDate: Date = new Date()): Date[] => {
  // Modified to always use Monday as the start of the week and Sunday as the end
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start week on Monday
  const end = addDays(start, 6); // End on Sunday (6 days after Monday)
  
  return eachDayOfInterval({ start, end });
};

export const getNextWeek = (currentDate: Date): Date => {
  return addDays(currentDate, 7);
};

export const getPreviousWeek = (currentDate: Date): Date => {
  return addDays(currentDate, -7);
};

export const getNextDay = (currentDate: Date): Date => {
  return addDays(currentDate, 1);
};

export const getPreviousDay = (currentDate: Date): Date => {
  return addDays(currentDate, -1);
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

// Check if a date falls on weekend (Saturday or Sunday)
export const isWeekend = (date: Date): boolean => {
  const dayOfWeek = getMondayFirstDayOfWeek(date);
  return dayOfWeek === 5 || dayOfWeek === 6; // Saturday = 5, Sunday = 6 in Monday=0 system
};

// Convert JavaScript's getDay() (Sunday=0) to Monday=0 system
export const getMondayFirstDayOfWeek = (date: Date): number => {
  const jsDay = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return jsDay === 0 ? 6 : jsDay - 1; // Convert: Sunday=6, Monday=0, ..., Saturday=5
};

// Convert Monday=0 system back to JavaScript's getDay() (Sunday=0)
export const convertToJavaScriptDay = (mondayFirstDay: number): number => {
  return mondayFirstDay === 6 ? 0 : mondayFirstDay + 1;
};

// Helper function to format time (for timer display)
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
};

// Get time difference in hours between two dates
export const getHoursDifference = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  // Round to 2 decimal places
  return Math.round(diffHours * 100) / 100;
};

export const getWeekStart = (date: Date): Date => {
  // Get ISO week Monday (week starts on Monday)
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return monday;
};

// Add holiday checking function
export const isPublicHoliday = (date: Date): boolean => {
  // This is a client-side helper that will be enhanced in later phases
  // For now, it returns false as we'll use the server-side validation
  // In Phase 2, we'll add proper client-side holiday detection
  return false;
};

// Helper to format date as local YYYY-MM-DD (timezone-safe)
export const toLocalYMD = (date: Date): string => {
  // en-CA yields YYYY-MM-DD in local time without timezone conversion
  return date.toLocaleDateString('en-CA');
};

// Helper to format date as local YYYY-MM month bucket (timezone-safe)
export const toLocalYM = (date: Date): string => {
  return format(date, "yyyy-MM");
};

// Local "today" as YYYY-MM-DD. Replaces unsafe `new Date().toISOString().split('T')[0]`
// which returns the UTC date and is wrong near local midnight in non-UTC zones.
export const todayLocalYMD = (): string => toLocalYMD(new Date());

// Helper to format date for holiday API calls
export const formatDateForHolidayAPI = (date: Date): string => {
  return toLocalYMD(date);
};
