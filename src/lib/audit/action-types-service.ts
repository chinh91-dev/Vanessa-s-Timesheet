
import { supabase } from "@/integrations/supabase/client";

/**
 * Get all possible action types for filtering - now includes report generation actions
 */
export const getAuditActionTypes = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase.rpc('get_audit_action_types');
    
    if (error) {
      console.error("Error fetching action types:", error);
      // Return comprehensive fallback list if function fails
      return getFallbackActionTypes();
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getAuditActionTypes:", error);
    // Return comprehensive fallback list if there's an error
    return getFallbackActionTypes();
  }
};

const getFallbackActionTypes = (): string[] => {
  return [
    // Timesheet actions
    'entry_created',
    'entry_updated', 
    'entry_deleted',
    'project_created',
    'project_updated',
    'project_deleted',
    'contract_created',
    'contract_updated',
    'contract_deleted',
    'user_assigned',
    'user_unassigned',
    'member_created',
    'member_updated',
    'member_deleted',
    'report_generated',
    'audit_report_generated',
    // Leave application actions
    'leave_application_created',
    'leave_application_updated',
    'leave_application_cancelled',
    'leave_application_approved',
    'leave_application_rejected',
    // Leave balance actions
    'leave_balance_created',
    'leave_balance_updated',
    'leave_balance_deleted',
    // Holiday permission actions
    'holiday_permission_granted',
    'holiday_permission_revoked',
    'holiday_permission_updated',
    // Custom holiday actions
    'custom_holiday_created',
    'custom_holiday_updated',
    'custom_holiday_deleted',
    // Document actions
    'document_uploaded',
    'document_deleted',
    // Incident Management - Core incidents
    'incident_created',
    'incident_updated',
    'incident_deleted',
    // Incident Management - Projects
    'incident_project_created',
    'incident_project_updated',
    'incident_project_deleted',
    // Incident Management - Comments
    'incident_comment_created',
    'incident_comment_updated',
    'incident_comment_deleted',
    // Incident Management - Assignments
    'incident_assignment_created',
    'incident_assignment_updated',
    'incident_team_member_added',
    'incident_team_member_removed',
    'incident_team_member_role_updated',
    // Incident Management - Templates
    'incident_template_created',
    'incident_template_updated',
    'incident_template_deleted',
    // Incident Management - Categories
    'incident_category_created',
    'incident_category_updated',
    'incident_category_deleted',
    // Incident Management - Priorities
    'incident_priority_created',
    'incident_priority_updated',
    'incident_priority_deleted',
    // Incident Management - Escalation Rules
    'escalation_rule_created',
    'escalation_rule_updated',
    'escalation_rule_deleted',
    // Incident Management - Escalation Chains
    'escalation_chain_created',
    'escalation_chain_updated',
    'escalation_chain_deleted',
    // Incident Management - SLA Configs
    'sla_config_created',
    'sla_config_updated',
    'sla_config_deleted',
    // Incident Management - Portal Groups
    'portal_group_created',
    'portal_group_updated',
    'portal_group_deleted',
    // Incident Management - Portal Request Types
    'portal_request_type_created',
    'portal_request_type_updated',
    'portal_request_type_deleted',
    // Incident Management - Auto Assignment Rules
    'auto_assignment_rule_created',
    'auto_assignment_rule_updated',
    'auto_assignment_rule_deleted',
    // Incident Management - Portal Group Request Types
    'portal_group_request_type_added',
    'portal_group_request_type_removed'
  ];
};
