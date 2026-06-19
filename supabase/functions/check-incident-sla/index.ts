import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = "https://xvflgagfwqwfjjrjknby.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZmxnYWdmd3F3ZmpqcmprbmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNTk1NDMsImV4cCI6MjA1OTgzNTU0M30.CT6SZhSf5qZBVCWkXz2nwSInmZedtkLmdKp42PQ6_lo";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// SLA warning threshold (percentage of SLA time elapsed before warning)
const SLA_WARNING_THRESHOLD = 0.8; // 80%

interface IncidentWithSLA {
  id: string;
  incident_number: string;
  title: string;
  status: string;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  assigned_to: string | null;
  incident_project_id: string;
  priority: {
    id: string;
    name: string;
    response_sla_minutes: number;
    resolution_sla_minutes: number;
  } | null;
  incident_project: {
    id: string;
    name: string;
    lead_id: string | null;
  } | null;
}

interface SLACheckResult {
  incident_id: string;
  incident_number: string;
  response_breached: boolean;
  resolution_breached: boolean;
  response_warning: boolean;
  resolution_warning: boolean;
  response_remaining_minutes: number;
  resolution_remaining_minutes: number;
}

async function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
}

function calculateSLAStatus(incident: IncidentWithSLA): SLACheckResult {
  const now = new Date();
  const createdAt = new Date(incident.created_at);
  const priority = incident.priority;

  const result: SLACheckResult = {
    incident_id: incident.id,
    incident_number: incident.incident_number,
    response_breached: false,
    resolution_breached: false,
    response_warning: false,
    resolution_warning: false,
    response_remaining_minutes: 0,
    resolution_remaining_minutes: 0
  };

  if (!priority) {
    return result;
  }

  // Calculate response SLA
  const responseDueAt = new Date(createdAt.getTime() + priority.response_sla_minutes * 60 * 1000);
  const responseElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  const responseRemaining = priority.response_sla_minutes - responseElapsed;

  if (!incident.first_response_at) {
    result.response_remaining_minutes = Math.round(responseRemaining);
    result.response_breached = now > responseDueAt;
    result.response_warning = !result.response_breached && 
      responseElapsed >= (priority.response_sla_minutes * SLA_WARNING_THRESHOLD);
  }

  // Calculate resolution SLA
  const resolutionDueAt = new Date(createdAt.getTime() + priority.resolution_sla_minutes * 60 * 1000);
  const resolutionElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  const resolutionRemaining = priority.resolution_sla_minutes - resolutionElapsed;

  if (!incident.resolved_at) {
    result.resolution_remaining_minutes = Math.round(resolutionRemaining);
    result.resolution_breached = now > resolutionDueAt;
    result.resolution_warning = !result.resolution_breached && 
      resolutionElapsed >= (priority.resolution_sla_minutes * SLA_WARNING_THRESHOLD);
  }

  return result;
}

async function hasRecentNotification(
  supabase: any,
  incidentId: string,
  notificationType: string,
  withinMinutes: number = 60
): Promise<boolean> {
  const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from("sla_notifications")
    .select("id")
    .eq("incident_id", incidentId)
    .eq("notification_type", notificationType)
    .gte("created_at", cutoffTime)
    .limit(1);

  if (error) {
    console.error("Error checking recent notifications:", error);
    return false;
  }

  return (data?.length || 0) > 0;
}

async function triggerNotification(
  incidentId: string,
  type: "sla_warning" | "sla_breach" | "escalation",
  additionalData?: any
): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-incident-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        type,
        incident_id: incidentId,
        additional_data: additionalData
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[check-incident-sla] Failed to send ${type} notification:`, error);
    } else {
      console.log(`[check-incident-sla] ${type} notification triggered for incident ${incidentId}`);
    }
  } catch (err) {
    console.error(`[check-incident-sla] Error triggering ${type} notification:`, err);
  }
}

async function checkEscalationRules(
  supabase: any,
  incident: IncidentWithSLA,
  slaStatus: SLACheckResult
): Promise<void> {
  // Fetch applicable escalation rules
  const { data: rules, error } = await supabase
    .from("escalation_rules")
    .select("*")
    .eq("is_active", true)
    .or(`incident_project_id.eq.${incident.incident_project_id},incident_project_id.is.null`)
    .order("sort_order");

  if (error || !rules || rules.length === 0) {
    return;
  }

  const createdAt = new Date(incident.created_at);
  const now = new Date();
  const elapsedMinutes = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60));

  for (const rule of rules) {
    // Check if this rule applies to this incident
    if (rule.priority_id && rule.priority_id !== incident.priority?.id) continue;
    if (rule.category_id) continue; // Skip category-specific rules for now

    // Check if trigger time has been exceeded
    if (elapsedMinutes >= rule.trigger_after_minutes) {
      // Check if escalation was already triggered recently
      const { data: existingEscalation } = await supabase
        .from("escalation_history")
        .select("id")
        .eq("incident_id", incident.id)
        .eq("escalation_rule_id", rule.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within 24 hours
        .limit(1);

      if (existingEscalation && existingEscalation.length > 0) {
        continue; // Already escalated by this rule
      }

      // Log escalation
      await supabase.from("escalation_history").insert({
        incident_id: incident.id,
        escalation_rule_id: rule.id,
        escalated_from: incident.assigned_to,
        escalated_to: rule.escalate_to_user_id,
        escalation_reason: rule.description || `SLA exceeded after ${rule.trigger_after_minutes} minutes`,
        notification_sent: true,
        auto_assigned: rule.auto_reassign || false
      });

      // Auto-reassign if configured
      if (rule.auto_reassign && rule.escalate_to_user_id) {
        await supabase
          .from("incidents")
          .update({ 
            assigned_to: rule.escalate_to_user_id,
            escalated_at: new Date().toISOString()
          })
          .eq("id", incident.id);
      }

      // Trigger escalation notification
      await triggerNotification(incident.id, "escalation", {
        escalation_reason: rule.description || `SLA threshold (${rule.trigger_after_minutes} minutes) exceeded`
      });

      console.log(`[check-incident-sla] Escalation triggered for ${incident.incident_number} via rule: ${rule.name}`);
      break; // Only apply one escalation rule per check
    }
  }
}

async function processIncidents(): Promise<{ processed: number; warnings: number; breaches: number; escalations: number }> {
  console.log("[check-incident-sla] Starting SLA check...");
  
  const supabase = await getSupabaseClient();

  // Fetch all open incidents with priority information
  const { data: incidents, error } = await supabase
    .from("incidents")
    .select(`
      id, incident_number, title, status, created_at, first_response_at, resolved_at, assigned_to, incident_project_id,
      priority:incident_priorities(id, name, response_sla_minutes, resolution_sla_minutes),
      incident_project:incident_projects(id, name, lead_id)
    `)
    .not("status", "in", "(Resolved,Closed)")
    .not("priority_id", "is", null);

  if (error) {
    console.error("[check-incident-sla] Error fetching incidents:", error);
    throw error;
  }

  if (!incidents || incidents.length === 0) {
    console.log("[check-incident-sla] No open incidents to check");
    return { processed: 0, warnings: 0, breaches: 0, escalations: 0 };
  }

  console.log(`[check-incident-sla] Checking ${incidents.length} open incidents`);

  let warnings = 0;
  let breaches = 0;
  let escalations = 0;

  for (const incident of incidents as IncidentWithSLA[]) {
    const slaStatus = calculateSLAStatus(incident);

    // Check for SLA warnings - combine response and resolution into ONE email, send only once
    const hasResponseWarning = slaStatus.response_warning && !slaStatus.response_breached;
    const hasResolutionWarning = slaStatus.resolution_warning && !slaStatus.resolution_breached;

    if (hasResponseWarning || hasResolutionWarning) {
      // Use very large cooldown to ensure warning is only sent once per incident
      const hasRecent = await hasRecentNotification(supabase, incident.id, "sla_warning", 99999999);
      if (!hasRecent) {
        await triggerNotification(incident.id, "sla_warning", {
          response_warning: hasResponseWarning,
          resolution_warning: hasResolutionWarning,
          response_remaining_minutes: slaStatus.response_remaining_minutes,
          resolution_remaining_minutes: slaStatus.resolution_remaining_minutes
        });
        warnings++;
      }
    }

    // Check for SLA breach - combine response and resolution into ONE email, send only once
    const hasResponseBreach = slaStatus.response_breached;
    const hasResolutionBreach = slaStatus.resolution_breached;

    if (hasResponseBreach || hasResolutionBreach) {
      // Use very large cooldown to ensure breach is only sent once per incident
      const hasRecent = await hasRecentNotification(supabase, incident.id, "sla_breach", 99999999);
      if (!hasRecent) {
        await triggerNotification(incident.id, "sla_breach", {
          response_breached: hasResponseBreach,
          resolution_breached: hasResolutionBreach,
          response_remaining_minutes: slaStatus.response_remaining_minutes,
          resolution_remaining_minutes: slaStatus.resolution_remaining_minutes
        });
        breaches++;
      }

      // Check escalation rules
      await checkEscalationRules(supabase, incident, slaStatus);
      escalations++;
    }
  }

  console.log(`[check-incident-sla] Completed. Processed: ${incidents.length}, Warnings: ${warnings}, Breaches: ${breaches}`);

  return {
    processed: incidents.length,
    warnings,
    breaches,
    escalations
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[check-incident-sla] Function invoked");

    const result = await processIncidents();

    return new Response(
      JSON.stringify({
        success: true,
        message: "SLA check completed",
        ...result,
        checked_at: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[check-incident-sla] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
