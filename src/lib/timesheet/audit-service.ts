
// This file is now simplified since we're using comprehensive database triggers
// The audit trail is automatically generated for all user actions

export interface AuditLogEntry {
  id?: string;
  user_id: string;
  action: 'budget_override' | 'entry_created' | 'entry_updated' | 'entry_deleted';
  entity_type: 'timesheet_entry' | 'project';
  entity_id: string;
  entity_name?: string;
  description: string;
  details: Record<string, any>;
  created_at?: string;
}

/**
 * Log budget override event - simplified for database trigger approach
 * Note: Budget overrides are now tracked through the comprehensive audit system
 */
export const logBudgetOverride = async (
  userId: string,
  projectId: string,
  entryId: string,
  details: {
    hoursAdded: number;
    totalBudget: number;
    hoursUsedBefore: number;
    hoursUsedAfter: number;
    excessHours: number;
  }
): Promise<void> => {
  try {
    console.log("=== BUDGET OVERRIDE LOGGED ===", { userId, projectId, entryId, details });
    // Budget overrides are now tracked through the timesheet entry triggers
    // The database triggers will show the entry creation/update that caused the override
    console.log("Budget override tracking handled by comprehensive audit system");
  } catch (error) {
    console.error("Error in logBudgetOverride:", error);
  }
};

/**
 * Log timesheet entry event - simplified for database trigger approach  
 * Note: Entry events are now automatically tracked by database triggers
 */
export const logEntryEvent = async (
  userId: string,
  action: 'entry_created' | 'entry_updated' | 'entry_deleted',
  entryId: string,
  details: Record<string, any>
): Promise<void> => {
  try {
    console.log("=== TIMESHEET ENTRY EVENT LOGGED ===", { userId, action, entryId, details });
    // Entry events are now tracked through comprehensive database triggers
    // All creates, updates, and deletes are automatically logged
    console.log("Entry event tracking handled by comprehensive audit system");
  } catch (error) {
    console.error("Error in logEntryEvent:", error);
  }
};
