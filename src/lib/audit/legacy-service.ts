/**
 * Legacy audit logging functions - kept for backward compatibility
 * These are no longer needed since we're using comprehensive database triggers
 */

export interface LegacyAuditEntry {
  user_id: string;
  action: string;
  entity_name?: string;
  description?: string;
  details?: Record<string, any>;
}

/**
 * Legacy function - no longer needed but kept for compatibility
 */
export const logAuditEvent = async (entry: LegacyAuditEntry): Promise<void> => {
  // This function is no longer needed since we're using database triggers
  // for comprehensive audit tracking, but keeping it for backward compatibility
  console.log("Legacy audit logging - handled by comprehensive database triggers:", entry);
};
