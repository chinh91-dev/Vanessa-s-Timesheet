import { supabase } from "@/integrations/supabase/client";

// Type definitions for work schedule with locations
export interface WorkScheduleWithLocations {
  id: string;
  user_id: string;
  working_days: number;
  allow_weekend_entries: boolean;
  allow_holiday_entries: boolean;
  default_monday_location?: string;
  default_tuesday_location?: string;
  default_wednesday_location?: string;
  default_thursday_location?: string;
  default_friday_location?: string;
  default_saturday_location?: string;
  default_sunday_location?: string;
  locked_until_date?: string;
  lock_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationAssignment {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

// Get work schedule with default locations for a user
export const getWorkScheduleWithLocations = async (userId: string): Promise<WorkScheduleWithLocations | null> => {
  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching work schedule with locations:', error);
    return null;
  }

  return data;
};

// Update default work locations for a user
export const updateDefaultWorkLocations = async (
  userId: string, 
  locations: LocationAssignment,
  workingDays?: number
): Promise<boolean> => {
  // Calculate working days from locations if not provided
  const calculatedWorkingDays = workingDays !== undefined ? workingDays : 
    Object.values(locations).filter(location => location !== null && location !== undefined).length;
  
  const { error } = await supabase
    .from('work_schedules')
    .update({
      default_monday_location: locations.monday || null,
      default_tuesday_location: locations.tuesday || null,
      default_wednesday_location: locations.wednesday || null,
      default_thursday_location: locations.thursday || null,
      default_friday_location: locations.friday || null,
      default_saturday_location: locations.saturday || null,
      default_sunday_location: locations.sunday || null,
      working_days: calculatedWorkingDays,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating default work locations:', error);
    return false;
  }

  return true;
};

// Get weekly work schedule with locations for a specific week
export const getWeeklyWorkScheduleWithLocations = async (
  userId: string, 
  weekStartDate: string
) => {
  const { data, error } = await supabase
    .from('weekly_work_schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching weekly work schedule:', error);
    return null;
  }

  return data;
};

// Update weekly work locations for a specific week
export const updateWeeklyWorkLocations = async (
  userId: string,
  weekStartDate: string,
  locations: LocationAssignment & {
    monday_hours?: number;
    tuesday_hours?: number;
    wednesday_hours?: number;
    thursday_hours?: number;
    friday_hours?: number;
    saturday_hours?: number;
    sunday_hours?: number;
  }
): Promise<boolean> => {
  const { error } = await supabase
    .from('weekly_work_schedules')
    .upsert({
      user_id: userId,
      week_start_date: weekStartDate,
      monday_location: locations.monday || null,
      tuesday_location: locations.tuesday || null,
      wednesday_location: locations.wednesday || null,
      thursday_location: locations.thursday || null,
      friday_location: locations.friday || null,
      saturday_location: locations.saturday || null,
      sunday_location: locations.sunday || null,
      monday_hours: locations.monday_hours ?? 8.0,
      tuesday_hours: locations.tuesday_hours ?? 8.0,
      wednesday_hours: locations.wednesday_hours ?? 8.0,
      thursday_hours: locations.thursday_hours ?? 8.0,
      friday_hours: locations.friday_hours ?? 8.0,
      saturday_hours: locations.saturday_hours ?? 0.0,
      sunday_hours: locations.sunday_hours ?? 0.0,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating weekly work locations:', error);
    return false;
  }

  return true;
};

// Get all users with their work schedules and locations (admin function)
export const getAllUsersWorkScheduleLocations = async () => {
  const { data, error } = await supabase
    .from('work_schedules')
    .select(`
      *,
      profiles!work_schedules_user_id_fkey (
        id,
        full_name,
        email,
        organization,
        employment_type
      )
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching all users work schedules:', error);
    return [];
  }

  return data;
};

// Location helper functions
export const getLocationDisplayName = (location: string): string => {
  const locationMap: Record<string, string> = {
    'collins_square': 'Collins Square',
    'wfh': 'WFH',
    'client': 'Client Site',
  };

  return locationMap[location] || location;
};

export const getLocationOptions = () => [
  { value: 'collins_square', label: 'Collins Square' },
  { value: 'wfh', label: 'WFH' },
  { value: 'client', label: 'Client Site' },
];

export const getLocationColor = (location: string): string => {
  const colorMap: Record<string, string> = {
    'collins_square': 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    'wfh': 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    'client': 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  };

  return colorMap[location] || 'bg-muted text-muted-foreground border-border';
};