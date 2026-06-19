
import { supabase } from "@/integrations/supabase/client";
import { TimesheetEntry } from "../types";
import { isAdmin } from "@/utils/roles";

export const duplicateTimesheetEntry = async (entryId: string): Promise<TimesheetEntry> => {
  try {
    console.log(`Duplicating entry ${entryId}`);
    
    // Get current user and check admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const userIsAdmin = await isAdmin(user);
    
    // First get the original entry - RLS will ensure appropriate access
    const { data: originalEntry, error: fetchError } = await supabase
      .from("timesheet_entries")
      .select("*")
      .eq("id", entryId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching original entry:", fetchError);
      throw fetchError;
    }
    
    if (!originalEntry) {
      throw new Error("Original entry not found or access denied");
    }
    
    // For admin users, preserve the original user_id for duplicating other users' entries
    // For regular users, the trigger will set it to their own user_id
    const newEntryData = {
      entry_type: originalEntry.entry_type,
      project_id: originalEntry.project_id,
      contract_id: originalEntry.contract_id,
      entry_date: originalEntry.entry_date,
      hours_logged: originalEntry.hours_logged,
      notes: originalEntry.notes || null,
      jira_task_id: originalEntry.jira_task_id,
      start_time: originalEntry.start_time,
      end_time: originalEntry.end_time,
      // Only set user_id if admin is duplicating another user's entry
      ...(userIsAdmin && originalEntry.user_id !== user.id ? { user_id: originalEntry.user_id } : {})
    };
    
    console.log("Creating duplicate entry:", newEntryData);
    
    const { data: newEntry, error: insertError } = await supabase
      .from("timesheet_entries")
      .insert(newEntryData)
      .select();
      
    if (insertError) {
      console.error("Error creating duplicate entry:", insertError);
      throw insertError;
    }
    
    console.log("Duplicate entry created:", newEntry?.[0]);
    
    return newEntry?.[0] as TimesheetEntry;
  } catch (error) {
    console.error("Error in duplicateTimesheetEntry:", error);
    throw error;
  }
};
