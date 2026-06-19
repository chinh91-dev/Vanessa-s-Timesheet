
import { supabase } from "@/integrations/supabase/client";
import { AuditLogEntry, AuditFilters } from "./types";

/**
 * Fetch audit logs using the new direct database function approach
 */
export const fetchAuditLogs = async (filters: AuditFilters): Promise<AuditLogEntry[]> => {
  console.log("Fetching audit logs with filters:", filters);
  
  try {
    const { data, error } = await supabase.rpc('get_audit_logs_direct', {
      p_start_date: filters.startDate.toLocaleDateString('en-CA'),
      p_end_date: filters.endDate.toLocaleDateString('en-CA'),
      p_user_id: filters.userId || null
    });

    if (error) {
      // Handle permission denied gracefully
      if (error.message?.includes('Access denied')) {
        console.warn("User doesn't have permission to view these audit logs");
        return [];
      }
      console.error("Error fetching audit logs:", error);
      throw error;
    }

    console.log("Raw audit data received:", data?.length || 0, "records");

    // Transform the data to match our interface and apply additional filters
    let transformedData = (data || []).map((item: Record<string, unknown>): AuditLogEntry => ({
      id: item.id as string,
      user_id: item.user_id as string,
      user_name: item.user_name as string,
      action: item.action as string,
      entity_name: item.entity_name as string,
      description: item.description as string,
      details: item.details as Record<string, unknown> | null,
      created_at: item.created_at as string
    }));

    // Apply frontend filter for action type
    if (filters.actionType) {
      transformedData = transformedData.filter((item: AuditLogEntry) =>
        item.action === filters.actionType
      );
    }

    console.log("Filtered audit logs:", transformedData.length, "records");
    return transformedData;
  } catch (error) {
    console.error("Error in fetchAuditLogs:", error);
    throw error;
  }
};
