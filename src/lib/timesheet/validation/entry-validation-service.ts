
import { TimesheetEntry } from "../types";
import { validateProjectBudget } from "./budget-validation-service";
import { validateSpecificDayEntry } from "./specific-days-validation-service";

export const validateEntryData = async (entry: TimesheetEntry, userId: string): Promise<void> => {
  console.log("=== VALIDATING TIMESHEET ENTRY ===");
  console.log("Entry data:", entry);
  
  // Validate entry type and corresponding ID
  if (entry.entry_type === 'project' && !entry.project_id) {
    throw new Error("Project ID is required for project entries");
  }
  if (entry.entry_type === 'contract' && !entry.contract_id) {
    throw new Error("Contract ID is required for contract entries");
  }

  // Validate that the entry date is allowed based on user's work schedule
  const dateValidation = await validateSpecificDayEntry(userId, entry.entry_date);
  if (!dateValidation.isValid) {
    throw new Error(dateValidation.message || "Entry date is not allowed based on your work schedule");
  }
};

export const validateProjectBudgetForEntry = async (
  entry: TimesheetEntry,
  userId?: string
): Promise<void> => {
  // Only validate budget for project entries
  if (entry.entry_type !== 'project' || !entry.project_id || !entry.hours_logged) {
    return;
  }

  console.log("=== VALIDATING PROJECT BUDGET FOR ENTRY ===");
  console.log("Project ID:", entry.project_id);
  console.log("Hours to add:", entry.hours_logged);
  console.log("Existing entry ID:", entry.id);

  const validation = await validateProjectBudget({
    projectId: entry.project_id,
    hoursToAdd: entry.hours_logged,
    existingEntryId: entry.id,
    userId
  });

  if (!validation.isValid) {
    console.error("Budget validation failed:", validation.message);
    throw new Error(validation.message || "Budget validation failed");
  }

  if (validation.message) {
    console.warn("Budget validation warning:", validation.message);
  }
};
