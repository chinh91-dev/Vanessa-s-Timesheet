
import { startOfWeek, endOfWeek, addDays, subDays, startOfMonth, endOfMonth, subWeeks, subMonths, format, isAfter, isBefore, isSameDay } from "date-fns";

export type DateRangeType = {
  from: Date;
  to: Date;
};

// Add a more flexible type for partial ranges
export type DateRange = {
  from?: Date;
  to?: Date;
};

export type DateRangePreset = {
  label: string;
  value: string;
  range: () => DateRangeType;
};

// Get the current ISO week (Monday to Sunday)
export const getCurrentISOWeek = (): DateRangeType => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  return { from: start, to: end };
};

// Get the previous ISO week
export const getPreviousISOWeek = (): DateRangeType => {
  const now = new Date();
  const lastWeek = subWeeks(now, 1);
  const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
  const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
  return { from: start, to: end };
};

// Get the last 2 weeks
export const getLast2Weeks = (): DateRangeType => {
  const now = new Date();
  const twoWeeksAgo = subWeeks(now, 2);
  const start = startOfWeek(twoWeeksAgo, { weekStartsOn: 1 });
  const end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  return { from: start, to: end };
};

// Get today's range
export const getToday = (): DateRangeType => {
  const now = new Date();
  return { from: now, to: now };
};

// Get yesterday's range
export const getYesterday = (): DateRangeType => {
  const yesterday = subDays(new Date(), 1);
  return { from: yesterday, to: yesterday };
};

// Get current month range
export const getCurrentMonth = (): DateRangeType => {
  const now = new Date();
  return { 
    from: startOfMonth(now), 
    to: endOfMonth(now) 
  };
};

// Get last month range
export const getLastMonth = (): DateRangeType => {
  const lastMonth = subMonths(new Date(), 1);
  return { 
    from: startOfMonth(lastMonth), 
    to: endOfMonth(lastMonth) 
  };
};

// Define all available presets
export const dateRangePresets: DateRangePreset[] = [
  {
    label: "Today",
    value: "today",
    range: getToday,
  },
  {
    label: "Yesterday",
    value: "yesterday",
    range: getYesterday,
  },
  {
    label: "This week",
    value: "this_week",
    range: getCurrentISOWeek,
  },
  {
    label: "Last week",
    value: "last_week",
    range: getPreviousISOWeek,
  },
  {
    label: "Last 2 weeks",
    value: "last_2_weeks",
    range: getLast2Weeks,
  },
  {
    label: "This month",
    value: "this_month",
    range: getCurrentMonth,
  },
  {
    label: "Last month",
    value: "last_month",
    range: getLastMonth,
  },
];

// Format date range for display - updated to handle optional dates
export const formatDateRangeDisplay = (range: DateRange): string => {
  if (!range.from && !range.to) {
    return "Select date range";
  }
  if (!range.to) {
    return format(range.from!, "EEE, d MMM yyyy");
  }
  if (!range.from) {
    return format(range.to, "EEE, d MMM yyyy");
  }
  if (isSameDay(range.from, range.to)) {
    return format(range.from, "EEE, d MMM yyyy");
  }
  return `${format(range.from, "EEE, d MMM yyyy")} – ${format(range.to, "EEE, d MMM yyyy")}`;
};

// Check if a date is in the future
export const isFutureDate = (date: Date): boolean => {
  return isAfter(date, new Date());
};

// Validate date range
export const isValidDateRange = (range: DateRange): boolean => {
  if (!range.from || !range.to) return true; // Allow partial ranges
  return !isAfter(range.from, range.to);
};

// Get next month for dual calendar view
export const getNextMonth = (date: Date): Date => {
  return addDays(date, 32); // Simple way to get next month
};
