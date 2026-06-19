
import { supabase } from "@/integrations/supabase/client";
import { TimesheetEntry } from "../types";

export const updateTimesheetEntry = async (entry: TimesheetEntry): Promise<TimesheetEntry> => {
  if (!entry.id) {
    throw new Error("Entry ID is required for update");
  }

  console.log("Updating entry:", entry.id, "for user:", entry.user_id);

  // Create update object without id
  const updateData = {
    entry_type: entry.entry_type,
    project_id: entry.project_id || null,
    contract_id: entry.contract_id || null,
    entry_date: entry.entry_date,
    hours_logged: entry.hours_logged,
    notes: entry.notes || "",
    jira_task_id: entry.jira_task_id || "",
    start_time: entry.start_time || "",
    end_time: entry.end_time || "",
    incident_id: entry.incident_id || null, // Link to incident if selected
    user_id: entry.user_id // Include user_id for admin editing - trigger will validate
  };

  console.log("Update data:", updateData);

  const { data, error } = await supabase
    .from("timesheet_entries")
    .update(updateData)
    .eq("id", entry.id)
    .select();

  if (error) {
    console.error("Error updating timesheet entry:", error);
    throw error;
  }

  console.log("Entry updated successfully:", data?.[0]);

  // Return updated entry with preserved related data
  const updatedEntry = data?.[0] as TimesheetEntry;
  if (entry.project) {
    updatedEntry.project = entry.project;
  }
  if (entry.contract) {
    updatedEntry.contract = entry.contract;
  }

  return updatedEntry;
};
