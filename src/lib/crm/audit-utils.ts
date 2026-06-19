import { supabase } from "@/integrations/supabase/client";

export interface CRMAuditEventParams {
  action: string;
  entityName: string;
  description: string;
  details?: Record<string, unknown>;
}

/**
 * Logs a CRM audit event to the audit_logs table
 */
export const logCRMAuditEvent = async ({
  action,
  entityName,
  description,
  details = {},
}: CRMAuditEventParams): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    // Get user profile for display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userData.user.id)
      .single();

    const userName = profile?.full_name || profile?.email || "Unknown User";

    await supabase.from("audit_logs").insert({
      user_id: userData.user.id,
      user_name: userName,
      action,
      entity_name: entityName,
      description,
      details,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break main flow
    console.error("Failed to log CRM audit event:", error);
  }
};
