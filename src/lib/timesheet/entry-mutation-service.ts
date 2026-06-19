
import { TimesheetEntry } from "./types";
import { validateEntryData } from "./validation/entry-validation-service";
import { createTimesheetEntry } from "./operations/entry-create-service";
import { updateTimesheetEntry } from "./operations/entry-update-service";
import { deleteTimesheetEntry, deleteAllTimesheetEntries } from "./operations/entry-delete-service";
import { duplicateTimesheetEntry } from "./operations/entry-duplicate-service";
import { validateProjectBudget } from "./validation/budget-validation-service";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/utils/roles";

/**
 * Save a timesheet entry with server-side validation.
 * NOTE: Weekend and holiday validation is now handled by hooks (useDayValidation)
 * before the entry reaches this service. This service focuses on:
 * 1. Authentication
 * 2. Basic entry data validation
 * 3. Budget validation (server-side critical check)
 */
export const saveTimesheetEntry = async (entry: TimesheetEntry): Promise<TimesheetEntry> => {
  try {
    console.log("=== STARTING ENTRY SAVE PROCESS ===");
    
    // Step 1: Get current user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error during entry save:", authError);
      throw new Error("Authentication required");
    }

    console.log("=== AUTHENTICATED USER ===", user.id);
    
    // Step 2: Validate basic entry data
    await validateEntryData(entry, user.id);

    // Step 3: Check if user is admin for budget override
    const userIsAdmin = await isAdmin(user);

    // Step 4: Critical budget validation for project entries
    let budgetOverrideUsed = false;
    if (entry.entry_type === 'project' && entry.project_id) {
      console.log("=== BACKEND BUDGET VALIDATION ===");
      
      const targetUserId = entry.user_id || user.id;
      
      const budgetValidation = await validateProjectBudget({
        projectId: entry.project_id,
        hoursToAdd: entry.hours_logged,
        existingEntryId: entry.id,
        userId: targetUserId
      });

      // Block non-admin users from exceeding budget
      if (!budgetValidation.isValid && !userIsAdmin) {
        console.error("BACKEND BLOCKING: Non-admin user attempting to exceed budget");
        throw new Error(budgetValidation.message || "Budget exceeded - entry blocked by server");
      }

      if (!budgetValidation.isValid && userIsAdmin) {
        budgetOverrideUsed = true;
        console.log("Admin budget override being applied");
      }
    }
    
    console.log("All validations passed, proceeding with save");
    
    // Save the entry
    let savedEntry: TimesheetEntry;
    const isUpdate = !!entry.id;
    
    if (isUpdate) {
      savedEntry = await updateTimesheetEntry(entry);
    } else {
      savedEntry = await createTimesheetEntry(entry);
    }

    if (budgetOverrideUsed) {
      console.log("=== BUDGET OVERRIDE OCCURRED ===");
    }

    console.log("=== ENTRY SAVE COMPLETED SUCCESSFULLY ===");
    return savedEntry;
  } catch (error) {
    console.error("Error in saveTimesheetEntry:", error);
    throw error;
  }
};

// Re-export all the other functions
export { duplicateTimesheetEntry, deleteTimesheetEntry, deleteAllTimesheetEntries };
