import { supabase } from "@/integrations/supabase/client";
import { todayLocalYMD } from "@/lib/date-utils";
import { toLocalYMD } from "@/lib/date-utils";

export interface DailyLocationCheckin {
  id: string;
  user_id: string;
  check_in_date: string;
  planned_location?: string;
  actual_location: string;
  check_in_time: string;
  end_time?: string;
  location_change_reason?: string;
  notes?: string;
  late_checkin: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyLocationStatus {
  planned_location?: string;
  actual_location?: string;
  has_checked_in: boolean;
  is_late_checkin: boolean;
  check_in_time?: string;
  location_changed: boolean;
}

export const getDailyLocationStatus = async (
  userId: string,
  date: string = todayLocalYMD()
): Promise<DailyLocationStatus | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_daily_location_status', {
        p_user_id: userId,
        p_date: date
      });

    if (error) {
      console.error('Error fetching daily location status:', error, {
        userId,
        date,
        errorDetails: error
      });
      return null;
    }

    // Log the raw response for debugging
    console.log('Raw daily location status response:', {
      userId,
      date,
      data,
      dataType: typeof data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : 'not array'
    });

    // Handle both single object and array responses
    let result: DailyLocationStatus;
    if (Array.isArray(data) && data.length > 0) {
      result = data[0] as DailyLocationStatus;
    } else if (!Array.isArray(data) && data) {
      result = data as DailyLocationStatus;
    } else {
      console.warn('No data returned from get_daily_location_status', { userId, date });
      return {
        planned_location: undefined,
        actual_location: undefined,
        has_checked_in: false,
        is_late_checkin: false,
        check_in_time: undefined,
        location_changed: false
      };
    }

    console.log('Processed daily location status:', {
      userId,
      date,
      result,
      plannedLocation: result.planned_location
    });
    
    return result;
  } catch (error) {
    console.error('Error in getDailyLocationStatus:', error, { userId, date });
    return null;
  }
};

export const createDailyCheckin = async (
  userId: string,
  date: string,
  actualLocation: string,
  plannedLocation?: string,
  locationChangeReason?: string,
  notes?: string,
  checkInTime?: string,
  endTime?: string
): Promise<DailyLocationCheckin | null> => {
  try {
    console.log(`📝 Creating daily check-in: ${userId} for ${date} at ${actualLocation}`);
    // Parse time inputs and create proper timestamps
    const checkInDateTime = checkInTime 
      ? new Date(`${date}T${checkInTime}:00`).toISOString()
      : new Date().toISOString();
    
    const endDateTime = endTime 
      ? new Date(`${date}T${endTime}:00`).toISOString()
      : undefined;

    const { data, error } = await supabase
      .from('daily_location_checkins')
      .insert({
        user_id: userId,
        check_in_date: date,
        planned_location: plannedLocation,
        actual_location: actualLocation,
        location_change_reason: locationChangeReason,
        notes: notes,
        check_in_time: checkInDateTime,
        end_time: endDateTime,
        late_checkin: new Date().getHours() >= 10
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating daily check-in:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createDailyCheckin:', error);
    throw error;
  }
};

export const updateDailyCheckin = async (
  checkinId: string,
  actualLocation: string,
  locationChangeReason?: string,
  notes?: string,
  checkInTime?: string,
  endTime?: string,
  date?: string
): Promise<DailyLocationCheckin | null> => {
  try {
    // Parse time inputs and create proper timestamps if provided
    const updateData: {
      actual_location?: string;
      location_change_reason?: string;
      notes?: string;
      updated_at: string;
      check_in_time?: string;
      check_out_time?: string;
      end_time?: string;
    } = {
      actual_location: actualLocation,
      location_change_reason: locationChangeReason,
      notes: notes,
      updated_at: new Date().toISOString(),
    };

    if (checkInTime && date) {
      updateData.check_in_time = new Date(`${date}T${checkInTime}:00`).toISOString();
    }

    if (endTime && date) {
      updateData.end_time = new Date(`${date}T${endTime}:00`).toISOString();
    }

    const { data, error } = await supabase
      .from('daily_location_checkins')
      .update(updateData)
      .eq('id', checkinId)
      .select()
      .single();

    if (error) {
      console.error('Error updating daily check-in:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateDailyCheckin:', error);
    throw error;
  }
};

export const deleteDailyCheckin = async (checkinId: string): Promise<void> => {
  try {
    console.log(`🗑️ Deleting daily check-in: ${checkinId}`);
    
    const { error } = await supabase
      .from('daily_location_checkins')
      .delete()
      .eq('id', checkinId);

    if (error) {
      console.error('Error deleting daily check-in:', error);
      throw error;
    }

    console.log(`✅ Successfully deleted check-in: ${checkinId}`);
  } catch (error) {
    console.error('Error in deleteDailyCheckin:', error);
    throw error;
  }
};

export const getUserCheckins = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyLocationCheckin[]> => {
  try {
    let query = supabase
      .from('daily_location_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false });

    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }

    if (endDate) {
      query = query.lte('check_in_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user check-ins:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserCheckins:', error);
    return [];
  }
};

export const getAllTodayCheckins = async (): Promise<(DailyLocationCheckin & { user_name: string })[]> => {
  try {
    const today = toLocalYMD(new Date());
    console.log(`📅 Fetching today's check-ins for date: ${today}`);
    
    const { data, error } = await supabase
      .from('daily_location_checkins')
      .select(`
        *,
        user:profiles!daily_location_checkins_user_id_fkey(full_name, email)
      `)
      .eq('check_in_date', today)
      .order('check_in_time', { ascending: false });

    if (error) {
      console.error('Error fetching today\'s check-ins:', error);
      throw error;
    }

    return (data || []).map(item => ({
      ...item,
      user_name: item.user?.full_name || item.user?.email || 'Unknown User'
    }));
  } catch (error) {
    console.error('Error in getAllTodayCheckins:', error);
    return [];
  }
};

export const getLocationColor = (location: string): string => {
  const colors = {
    'collins_square': 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    'wfh': 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    'client': 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  };

  const normalizedLocation = location.toLowerCase();
  return colors[normalizedLocation as keyof typeof colors] || 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
};

export const getLocationDisplayName = (location: string): string => {
  const displayNames: Record<string, string> = {
    'collins_square': 'Collins Square',
    'wfh': 'WFH',
    'client': 'Client Site',
  };

  // Handle custom locations
  if (location.startsWith('custom:')) {
    return location.replace('custom:', '');
  }

  return displayNames[location] || location.charAt(0).toUpperCase() + location.slice(1);
};

// Helper function to format date for Australian timezone
const toAustralianDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Australia/Melbourne'
  });
};

export interface DailyLocationStatusSummary {
  confirmed: Array<{
    id: string;
    full_name: string;
    email: string;
    planned_location: string;
    actual_location: string;
    check_in_time: string;
    location_changed: boolean;
    late_checkin: boolean;
  }>;
  notConfirmed: Array<{
    id: string;
    full_name: string;
    email: string;
    planned_location: string;
  }>;
  noSchedule: Array<{
    id: string;
    full_name: string;
    email: string;
  }>;
  reportDate: string;
}

export const getDailyLocationStatusSummary = async (
  date: string = toAustralianDate()
): Promise<DailyLocationStatusSummary> => {
  try {
    console.log(`📊 Fetching daily location status summary for: ${date}`);
    
    // Check if it's a weekend
    const inputDate = new Date(date);
    const dayOfWeek = inputDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    console.log(`Date: ${date}, Day: ${dayOfWeek}, IsWeekend: ${isWeekend}`);
    
    // Fetch all active employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, employment_type')
      .eq('is_active', true)
      .order('full_name');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    console.log(`Found ${employees?.length || 0} active employees`);

    const confirmed: DailyLocationStatusSummary['confirmed'] = [];
    const notConfirmed: DailyLocationStatusSummary['notConfirmed'] = [];
    const noSchedule: DailyLocationStatusSummary['noSchedule'] = [];

    // Check each employee's status
    for (const employee of employees || []) {
      try {
        console.log(`Processing employee: ${employee.full_name} (${employee.id})`);
        
        const { data: statusData, error: statusError } = await supabase
          .rpc('get_daily_location_status', {
            p_user_id: employee.id,
            p_date: date
          });

        if (statusError) {
          console.error(`Error getting status for employee ${employee.id}:`, statusError);
          continue;
        }

        console.log(`Status data for ${employee.full_name}:`, statusData);
        const status = statusData?.[0];
        
        if (!status) {
          console.log(`No status data returned for ${employee.full_name}`);
          noSchedule.push({
            id: employee.id,
            full_name: employee.full_name || 'Unknown',
            email: employee.email || ''
          });
          continue;
        }

        console.log(`Status details for ${employee.full_name}:`, {
          planned_location: status.planned_location,
          has_checked_in: status.has_checked_in,
          actual_location: status.actual_location
        });

        // Check if user has checked in
        if (status.has_checked_in) {
          console.log(`✅ ${employee.full_name} has checked in`);
          confirmed.push({
            id: employee.id,
            full_name: employee.full_name || 'Unknown',
            email: employee.email || '',
            planned_location: status.planned_location || 'Unknown',
            actual_location: status.actual_location || 'Unknown',
            check_in_time: status.check_in_time,
            location_changed: status.location_changed || false,
            late_checkin: status.is_late_checkin || false
          });
        } else if (status.planned_location) {
          // Has planned location but hasn't checked in
          console.log(`⚠️ ${employee.full_name} has planned location (${status.planned_location}) but no check-in`);
          notConfirmed.push({
            id: employee.id,
            full_name: employee.full_name || 'Unknown',
            email: employee.email || '',
            planned_location: status.planned_location
          });
        } else {
          // No planned location - determine if this is expected
          if (isWeekend) {
            console.log(`📅 ${employee.full_name} not scheduled for weekend (expected)`);
          } else {
            console.log(`❓ ${employee.full_name} has no schedule for workday`);
          }
          
          noSchedule.push({
            id: employee.id,
            full_name: employee.full_name || 'Unknown',
            email: employee.email || ''
          });
        }
      } catch (error) {
        console.error(`Error processing employee ${employee.id}:`, error);
        noSchedule.push({
          id: employee.id,
          full_name: employee.full_name || 'Unknown',
          email: employee.email || ''
        });
      }
    }

    const summary = {
      confirmed: confirmed.length,
      notConfirmed: notConfirmed.length,
      noSchedule: noSchedule.length,
      isWeekend
    };

    console.log(`📋 Final status summary for ${date}:`, summary);
    console.log('📋 Not Confirmed users:', notConfirmed.map(u => u.full_name));

    return {
      confirmed,
      notConfirmed,
      noSchedule,
      reportDate: date
    };
  } catch (error) {
    console.error('Error in getDailyLocationStatusSummary:', error);
    return {
      confirmed: [],
      notConfirmed: [],
      noSchedule: [],
      reportDate: date
    };
  }
};