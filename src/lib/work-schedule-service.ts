
import { supabase } from "@/integrations/supabase/client";

export interface WorkSchedule {
  id: string;
  user_id: string;
  working_days: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const fetchWorkSchedule = async (userId?: string): Promise<WorkSchedule | null> => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!targetUserId) {
      console.error("No user ID provided for work schedule fetch");
      return null;
    }

    console.log(`Fetching work schedule for user: ${targetUserId}`);
    
    const { data, error } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching work schedule:", error);
      return null;
    }

    console.log(`Work schedule fetched:`, data);
    return data;
  } catch (error) {
    console.error("Error in fetchWorkSchedule:", error);
    return null;
  }
};

export const getDefaultWorkingDays = async (userId: string): Promise<number> => {
  try {
    // Fetch user's employment type from profiles
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("employment_type")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error);
      return 5; // Default fallback
    }

    // Return 3 days for part-time, 5 days for full-time or undefined
    const defaultDays = profile?.employment_type === 'part-time' ? 3 : 5;
    console.log(`Default working days for user ${userId} (${profile?.employment_type}): ${defaultDays}`);
    return defaultDays;
  } catch (error) {
    console.error("Error getting default working days:", error);
    return 5; // Default fallback
  }
};

export const upsertWorkSchedule = async (userId: string, workingDays: number): Promise<WorkSchedule | null> => {
  try {
    console.log(`Upserting work schedule for user ${userId}: ${workingDays} days`);
    
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    const { data, error } = await supabase
      .from("work_schedules")
      .upsert({
        user_id: userId,
        working_days: workingDays,
        created_by: currentUser.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting work schedule:", error);
      throw error;
    }

    console.log(`Work schedule upserted successfully:`, data);
    return data;
  } catch (error) {
    console.error("Error in upsertWorkSchedule:", error);
    throw error;
  }
};

export const migrateLocalStorageToDatabase = async (userId: string): Promise<void> => {
  try {
    // Check if user already has a database record
    const existingSchedule = await fetchWorkSchedule(userId);
    if (existingSchedule) {
      console.log(`User ${userId} already has database work schedule, skipping migration`);
      return;
    }

    // Check for localStorage data
    const localStorageKey = `timesheet-working-days-${userId}`;
    const localData = localStorage.getItem(localStorageKey);
    
    if (localData && !isNaN(parseInt(localData, 10))) {
      const workingDays = parseInt(localData, 10);
      console.log(`Migrating localStorage data for user ${userId}: ${workingDays} days`);
      
      await upsertWorkSchedule(userId, workingDays);
      
      // Clean up localStorage after successful migration
      localStorage.removeItem(localStorageKey);
      console.log(`Migration completed and localStorage cleaned for user ${userId}`);
    } else {
      console.log(`No localStorage data found for user ${userId}, using employment type default`);
      const defaultDays = await getDefaultWorkingDays(userId);
      await upsertWorkSchedule(userId, defaultDays);
    }
  } catch (error) {
    console.error(`Error migrating localStorage to database for user ${userId}:`, error);
  }
};
