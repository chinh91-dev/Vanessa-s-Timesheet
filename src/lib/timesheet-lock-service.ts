
import { supabase } from "@/integrations/supabase/client";

export interface TimesheetLockStatus {
  totalUsersLocked: number;
  earliestLockDate: string | null;
  latestLockDate: string | null;
  mostCommonReason: string | null;
}

export interface UserLockInfo {
  userId: string;
  fullName: string;
  email: string;
  lockedUntilDate: string | null;
  lockReason: string | null;
  lockedAt: string | null;
  lockedByName: string | null;
}

export const getGlobalLockStatus = async (): Promise<TimesheetLockStatus> => {
  try {
    const { data, error } = await supabase.rpc('get_global_lock_status');
    
    if (error) {
      console.error('Error fetching global lock status:', error);
      throw error;
    }

    const result = data?.[0] || {};
    return {
      totalUsersLocked: result.total_users_locked || 0,
      earliestLockDate: result.earliest_lock_date || null,
      latestLockDate: result.latest_lock_date || null,
      mostCommonReason: result.most_common_reason || null
    };
  } catch (error) {
    console.error('Error in getGlobalLockStatus:', error);
    throw error;
  }
};

export const lockTimesheetsGlobally = async (
  lockUntilDate: string,
  reason: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('work_schedules')
      .update({
        locked_until_date: lockUntilDate,
        lock_reason: reason,
        locked_at: new Date().toISOString(),
        locked_by: user.id
      })
      .not('user_id', 'is', null); // Fixed: Changed from .neq('user_id', 'null') to properly check for non-null UUIDs

    if (error) {
      console.error('Error locking timesheets globally:', error);
      throw error;
    }

    console.log('Timesheets locked globally until:', lockUntilDate);
  } catch (error) {
    console.error('Error in lockTimesheetsGlobally:', error);
    throw error;
  }
};

export const unlockTimesheetsGlobally = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('work_schedules')
      .update({
        locked_until_date: null,
        lock_reason: null,
        locked_at: null,
        locked_by: null
      })
      .not('locked_until_date', 'is', null); // Only update locked schedules

    if (error) {
      console.error('Error unlocking timesheets globally:', error);
      throw error;
    }

    console.log('All timesheets unlocked');
  } catch (error) {
    console.error('Error in unlockTimesheetsGlobally:', error);
    throw error;
  }
};

export const getUsersLockInfo = async (): Promise<UserLockInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('work_schedules')
      .select(`
        user_id,
        locked_until_date,
        lock_reason,
        locked_at,
        locked_by,
        profiles!work_schedules_user_id_fkey(full_name, email),
        locked_by_profile:profiles!work_schedules_locked_by_fkey(full_name)
      `)
      .not('locked_until_date', 'is', null);

    if (error) {
      console.error('Error fetching users lock info:', error);
      throw error;
    }

    return (data || []).map((item: Record<string, unknown>): UserLockInfo => ({
      userId: item.user_id as string,
      fullName: (item as { profiles?: { full_name?: string } }).profiles?.full_name || 'Unknown User',
      email: (item as { profiles?: { email?: string } }).profiles?.email || '',
      lockedUntilDate: item.locked_until_date as string | null,
      lockReason: item.lock_reason as string | null,
      lockedAt: item.locked_at as string | null,
      lockedByName: (item as { locked_by_profile?: { full_name?: string } }).locked_by_profile?.full_name || 'Unknown'
    }));
  } catch (error) {
    console.error('Error in getUsersLockInfo:', error);
    throw error;
  }
};

export const isDateLockedForUser = async (
  userId: string,
  entryDate: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_date_locked_for_user', {
      p_user_id: userId,
      entry_date: entryDate
    });

    if (error) {
      console.error('Error checking date lock for user:', error);
      throw error;
    }

    return data || false;
  } catch (error) {
    console.error('Error in isDateLockedForUser:', error);
    return false;
  }
};
