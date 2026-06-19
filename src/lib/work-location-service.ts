import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";
import { getMondayFirstDayOfWeek, getWeekStart, toLocalYMD } from "@/lib/date-utils";

export interface WorkLocationEntry {
  id: string;
  user_id: string;
  week_start_date: string;
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
  user_full_name?: string;
  user_email?: string;
}

export interface WorkLocationCalendarEvent {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  location: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

// Helper function to validate and correct week start dates
const validateAndCorrectWeekStart = (weekStartDate: string): string => {
  const providedDate = new Date(weekStartDate);
  const correctWeekStart = getWeekStart(providedDate);
  const correctWeekStartStr = toLocalYMD(correctWeekStart);
  
  if (weekStartDate !== correctWeekStartStr) {
    console.warn(`⚠️  Week start date correction: ${weekStartDate} → ${correctWeekStartStr}`);
    return correctWeekStartStr;
  }
  
  return weekStartDate;
};

export const fetchWorkLocationEntries = async (
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<WorkLocationEntry[]> => {
  let query = supabase
    .from('weekly_work_schedules')
    .select(`
      *,
      user:profiles!weekly_work_schedules_user_id_fkey(full_name, email)
    `)
    .order('week_start_date', { ascending: false });

  if (startDate) {
    query = query.gte('week_start_date', startDate);
  }
  
  if (endDate) {
    query = query.lte('week_start_date', endDate);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching work location entries:', error);
    throw error;
  }

  // Process and correct week start dates for historical entries
  const correctedEntries = (data || []).map(item => {
    const correctedWeekStart = validateAndCorrectWeekStart(item.week_start_date);
    
    return {
      ...item,
      week_start_date: correctedWeekStart, // Use corrected week start
      user_full_name: item.user?.full_name,
      user_email: item.user?.email
    };
  });

  return correctedEntries;
};

export const upsertWorkLocationEntry = async (
  userId: string,
  weekStartDate: string,
  locationData: Partial<WorkLocationEntry>
): Promise<WorkLocationEntry> => {
  const { data, error } = await supabase
    .from('weekly_work_schedules')
    .upsert({
      user_id: userId,
      week_start_date: weekStartDate,
      ...locationData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,week_start_date'
    })
    .select(`
      *,
      user:profiles!weekly_work_schedules_user_id_fkey(full_name, email)
    `)
    .single();

  if (error) {
    console.error('Error upserting work location entry:', error);
    throw error;
  }

  return {
    ...data,
    user_full_name: data.user?.full_name,
    user_email: data.user?.email
  };
};

export const getWorkLocationCalendarEvents = async (
  startDate: string,
  endDate: string
): Promise<WorkLocationCalendarEvent[]> => {
  // Get all three data sources: default schedules, weekly schedules, and daily check-ins
  const [defaultSchedules, weeklyEntries, dailyCheckins] = await Promise.all([
    getDefaultWorkScheduleLocations(startDate, endDate),
    fetchWorkLocationEntries(startDate, endDate),
    getDailyCheckinsForRange(startDate, endDate)
  ]);
  
  const events: WorkLocationCalendarEvent[] = [];
  const eventMap = new Map<string, WorkLocationCalendarEvent>(); // key: userId-date
  const dailyCheckinsMap = new Map<string, WorkLocationCalendarEvent[]>(); // key: userId-date, value: array of events

  // 1. Add events from default work schedules (lowest priority)
  defaultSchedules.forEach(event => {
    const key = `${event.user_id}-${event.date}`;
    eventMap.set(key, event);
  });

  // 2. Add events from weekly schedules (medium priority - override defaults)
  weeklyEntries.forEach(entry => {
    // Check if user has any weekly locations configured
    const hasAnyWeeklyLocation = entry.monday_location || 
                               entry.tuesday_location || 
                               entry.wednesday_location || 
                               entry.thursday_location || 
                               entry.friday_location || 
                               entry.saturday_location || 
                               entry.sunday_location;

    // Skip weekly entries with no locations configured
    if (!hasAnyWeeklyLocation) {
      console.log(`Skipping weekly entry for user ${entry.user_full_name || entry.user_email} - no weekly locations configured`);
      return;
    }

    const weekStart = new Date(entry.week_start_date);
    console.log(`🗓️  Processing weekly entry for ${entry.user_full_name || entry.user_email}:`);
    console.log(`   Week start: ${entry.week_start_date} (${weekStart.toDateString()})`);
    console.log(`   Day of week (Monday=0): ${getMondayFirstDayOfWeek(weekStart)}`);
    console.log(`   Locations: Mon=${entry.monday_location}, Tue=${entry.tuesday_location}, Wed=${entry.wednesday_location}, Thu=${entry.thursday_location}, Fri=${entry.friday_location}`);
    
    // Map each day to the correct location using addDays offset from week start (Monday)
    const dayLocations = [
      { day: 0, location: entry.monday_location },    // Monday is week start + 0 days
      { day: 1, location: entry.tuesday_location },   // Tuesday is week start + 1 days
      { day: 2, location: entry.wednesday_location }, // Wednesday is week start + 2 days
      { day: 3, location: entry.thursday_location },  // Thursday is week start + 3 days
      { day: 4, location: entry.friday_location },    // Friday is week start + 4 days
      { day: 5, location: entry.saturday_location },  // Saturday is week start + 5 days
      { day: 6, location: entry.sunday_location },    // Sunday is week start + 6 days
    ];

    dayLocations.forEach(({ day, location }) => {
      if (location) {
        const eventDate = addDays(weekStart, day);
        const dateStr = toLocalYMD(eventDate);
        
        console.log(`   Day ${day} (${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day]}): ${location} → ${dateStr} (${eventDate.toDateString()})`);
        
        // Only include events within the requested date range
        if (dateStr >= startDate && dateStr <= endDate) {
          const key = `${entry.user_id}-${dateStr}`;
          eventMap.set(key, {
            id: `weekly-${entry.id}-${day}`,
            user_id: entry.user_id,
            user_name: entry.user_full_name || entry.user_email || 'Unknown User',
            date: dateStr,
            location,
            notes: entry.notes
          });
        }
      }
    });
  });

  // 3. Add events from daily check-ins (highest priority - override everything)
  // Group daily checkins by user-date to handle multiple entries per day
  dailyCheckins.forEach(checkin => {
    const key = `${checkin.user_id}-${checkin.check_in_date}`;
    if (!dailyCheckinsMap.has(key)) {
      dailyCheckinsMap.set(key, []);
    }
    
    dailyCheckinsMap.get(key)!.push({
      id: `daily-${checkin.id}`,
      user_id: checkin.user_id,
      user_name: checkin.user_name,
      date: checkin.check_in_date,
      location: checkin.actual_location,
      start_time: checkin.check_in_time,
      end_time: checkin.end_time,
      notes: checkin.notes
    });
  });

  // Now process daily checkins - remove any default/weekly entries that have actual checkins
  for (const [key, checkinEvents] of dailyCheckinsMap.entries()) {
    // Remove the default/weekly event for this key if it exists
    eventMap.delete(key);
    
    // Add all daily checkin events for this user-date
    checkinEvents.forEach(event => {
      events.push(event);
    });
  }

  // Add all remaining events from the map (default/weekly that weren't overridden by daily checkins)
  eventMap.forEach(event => {
    events.push(event);
  });

  // Sort all events by date
  return events.sort((a, b) => a.date.localeCompare(b.date));
};

const getDefaultWorkScheduleLocations = async (
  startDate: string,
  endDate: string
): Promise<WorkLocationCalendarEvent[]> => {
  const { data, error } = await supabase
    .from('work_schedules')
    .select(`
      *,
      user:profiles!work_schedules_user_id_fkey(
        full_name, 
        email,
        default_monday_office,
        default_tuesday_office,
        default_wednesday_office,
        default_thursday_office,
        default_friday_office
      )
    `)
    .gt('working_days', 0); // Only include users with working_days > 0

  if (error) {
    console.error('Error fetching default work schedules:', error);
    return [];
  }

  const events: WorkLocationCalendarEvent[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  console.log("=== DEFAULT WORK SCHEDULE LOCATIONS DEBUG ===");

  data?.forEach(schedule => {
    if (!schedule.user) return;

    console.log(`Processing user: ${schedule.user.full_name || schedule.user.email} (${schedule.user_id})`);
    console.log(`Working days: ${schedule.working_days}`);
    console.log("Office requirements:", {
      monday: schedule.user.default_monday_office,
      tuesday: schedule.user.default_tuesday_office,
      wednesday: schedule.user.default_wednesday_office,
      thursday: schedule.user.default_thursday_office,
      friday: schedule.user.default_friday_office,
    });
    console.log("Default locations:", {
      monday: schedule.default_monday_location,
      tuesday: schedule.default_tuesday_location,
      wednesday: schedule.default_wednesday_location,
      thursday: schedule.default_thursday_location,
      friday: schedule.default_friday_location,
      saturday: schedule.default_saturday_location,
      sunday: schedule.default_sunday_location,
    });

    // Create a map of Monday=0 day (0-6) to location, but only for days where office is required
    const dayLocationMap = new Map();
    
    // Only add location if both location exists AND office is required for that day
    if (schedule.default_monday_location && schedule.user.default_monday_office === true) {
      dayLocationMap.set(0, schedule.default_monday_location);    // Monday = 0
    }
    if (schedule.default_tuesday_location && schedule.user.default_tuesday_office === true) {
      dayLocationMap.set(1, schedule.default_tuesday_location);   // Tuesday = 1
    }
    if (schedule.default_wednesday_location && schedule.user.default_wednesday_office === true) {
      dayLocationMap.set(2, schedule.default_wednesday_location); // Wednesday = 2
    }
    if (schedule.default_thursday_location && schedule.user.default_thursday_office === true) {
      dayLocationMap.set(3, schedule.default_thursday_location);  // Thursday = 3
    }
    if (schedule.default_friday_location && schedule.user.default_friday_office === true) {
      dayLocationMap.set(4, schedule.default_friday_location);    // Friday = 4
    }
    
    // Always include weekend days if they have locations (no office requirement check for weekends)
    if (schedule.default_saturday_location) {
      dayLocationMap.set(5, schedule.default_saturday_location);  // Saturday = 5
    }
    if (schedule.default_sunday_location) {
      dayLocationMap.set(6, schedule.default_sunday_location);    // Sunday = 6
    }

    console.log(`Valid days for ${schedule.user.full_name || schedule.user.email}:`, Array.from(dayLocationMap.keys()).map(day => {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayNames[day];
    }).join(', '));

    // Skip users with no valid location/office combinations
    if (dayLocationMap.size === 0) {
      console.log(`Skipping user ${schedule.user.full_name || schedule.user.email} - no valid location/office day combinations`);
      return;
    }

    // Generate events for each day in the date range
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const mondayDay = getMondayFirstDayOfWeek(currentDate); // Monday=0 system
      const location = dayLocationMap.get(mondayDay);
      
      console.log(`Date: ${toLocalYMD(currentDate)}, Monday Day: ${mondayDay}, Location: ${location}`);
      
      // Only add event if location is defined and not null
      if (location) {
        const dateStr = toLocalYMD(currentDate);
        const event = {
          id: `default-${schedule.id}-${dateStr}`,
          user_id: schedule.user_id,
          user_name: schedule.user.full_name || schedule.user.email || 'Unknown User',
          date: dateStr,
          location: location
        };
        
        console.log("Adding default event:", event);
        events.push(event);
      }
      
      currentDate = addDays(currentDate, 1);
    }
  });

  console.log(`Total default events created: ${events.length}`);
  return events;
};

const getDailyCheckinsForRange = async (startDate: string, endDate: string): Promise<any[]> => {
  console.log(`📅 Fetching daily check-ins for range: ${startDate} to ${endDate}`);
  
  const { data, error } = await supabase
    .from('daily_location_checkins')
    .select(`
      *,
      profiles(full_name, email)
    `)
    .gte('check_in_date', startDate)
    .lte('check_in_date', endDate)
    .order('check_in_date', { ascending: true });

  if (error) {
    console.error('Error fetching daily check-ins:', error);
    return [];
  }

  console.log(`✅ Fetched ${data?.length || 0} daily check-ins for range`);
  
  return (data || []).map(item => ({
    ...item,
    user_name: item.profiles?.full_name || item.profiles?.email || 'Unknown User'
  }));
};

export const getLocationColor = (location: string): string => {
  const colors: Record<string, string> = {
    'collins_square': 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    'wfh': 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    'client': 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  };

  // Handle custom locations
  if (location.startsWith('custom:')) {
    return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
  }

  const normalizedLocation = location.toLowerCase();
  return colors[normalizedLocation] || 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
};