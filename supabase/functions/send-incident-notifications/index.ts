import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = "https://xvflgagfwqwfjjrjknby.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZmxnYWdmd3F3ZmpqcmprbmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNTk1NDMsImV4cCI6MjA1OTgzNTU0M30.CT6SZhSf5qZBVCWkXz2nwSInmZedtkLmdKp42PQ6_lo";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";
const FROM_EMAIL = "Incident System <incidentmanagement@comansservices.com.au>";

type NotificationType =
  | "new_assignment"
  | "reassignment"
  | "new_comment"
  | "status_change"
  | "incident_resolved"
  | "ticket_created"
  | "escalation"
  | "sla_warning"
  | "sla_breach";

interface NotificationRequest {
  type: NotificationType;
  incident_id: string;
  recipients?: string[]; // User IDs (if not provided, will be determined by type)
  additional_data?: {
    old_assignee_id?: string;
    new_status?: string;
    old_status?: string;
    comment_author_id?: string;
    escalation_reason?: string;
    sla_type?: "response" | "resolution";
    sla_remaining_minutes?: number;
  };
}

interface IncidentData {
  id: string;
  title: string;
  description: string;
  incident_number: string;
  status: string;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
  incident_project_id: string;
  priority?: { id: string; name: string; color: string };
  incident_project?: { id: string; name: string; project_key: string; lead_id?: string };
}

async function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
}

async function fetchIncidentData(supabase: any, incidentId: string): Promise<IncidentData | null> {
  const { data, error } = await supabase
    .from("incidents")
    .select(`
      id, title, description, incident_number, status, created_at, created_by, assigned_to, incident_project_id,
      priority:incident_priorities(id, name, color),
      incident_project:incident_projects(id, name, project_key, lead_id)
    `)
    .eq("id", incidentId)
    .single();

  if (error) {
    console.error("Error fetching incident:", error);
    return null;
  }
  return data;
}

async function getUserEmails(supabase: any, userIds: string[]): Promise<Map<string, { email: string; full_name: string }>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", uniqueIds);

  if (error) {
    console.error("Error fetching user emails:", error);
    return new Map();
  }

  const map = new Map();
  (data || []).forEach((u: any) => {
    if (u.email) {
      map.set(u.id, { email: u.email, full_name: u.full_name || u.email });
    }
  });
  return map;
}

function getPriorityBadge(priority: { name: string; color: string } | undefined): string {
  if (!priority) return "";
  const colors: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#16a34a"
  };
  const bgColor = colors[priority.name.toLowerCase()] || priority.color || "#6b7280";
  return `<span style="background-color: ${bgColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${priority.name}</span>`;
}

function getEmailTemplate(type: NotificationType, incident: IncidentData, additionalData?: any): { subject: string; html: string } {
  const incidentLink = `${APP_BASE_URL}/incident-management/incidents/${incident.id}`;
  const priorityBadge = getPriorityBadge(incident.priority);
  const projectName = incident.incident_project?.name || "Unknown Project";
  
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
      .footer { background: #1f2937; color: #9ca3af; padding: 16px; border-radius: 0 0 8px 8px; font-size: 12px; }
      .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
      .detail-row { margin: 8px 0; }
      .label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
      .value { font-weight: 500; }
      .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; }
      .danger { background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; }
    </style>
  `;

  const commonFooter = `
    <div class="footer">
      <p>This is an automated notification from the Incident Management System.</p>
      <p>© Comans Services - All rights reserved</p>
    </div>
  `;

  switch (type) {
    case "new_assignment":
      return {
        subject: `[${incident.incident_number}] New Incident Assigned: ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎫 New Incident Assigned</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <div style="margin: 16px 0;">${priorityBadge}</div>
              <div class="detail-row"><span class="label">Project:</span> <span class="value">${projectName}</span></div>
              <div class="detail-row"><span class="label">Status:</span> <span class="value">${incident.status}</span></div>
              <p style="margin: 16px 0;">${incident.description?.substring(0, 300) || "No description provided"}${(incident.description?.length || 0) > 300 ? "..." : ""}</p>
              <a href="${incidentLink}" class="btn">View Incident</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    case "ticket_created":
      return {
        subject: `[${incident.incident_number}] Ticket Created: ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎫 New Ticket Created</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <div style="margin: 16px 0;">${priorityBadge}</div>
              <div class="detail-row"><span class="label">Project:</span> <span class="value">${projectName}</span></div>
              <div class="detail-row"><span class="label">Status:</span> <span class="value">${incident.status}</span></div>
              <p style="margin: 16px 0;">${incident.description?.substring(0, 300) || "No description provided"}${(incident.description?.length || 0) > 300 ? "..." : ""}</p>
              <p>A new ticket has been created. You will receive updates as it progresses.</p>
              <a href="${incidentLink}" class="btn">View Ticket</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    case "reassignment":
      return {
        subject: `[${incident.incident_number}] Incident Reassigned: ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔄 Incident Reassigned</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <div style="margin: 16px 0;">${priorityBadge}</div>
              <div class="detail-row"><span class="label">Project:</span> <span class="value">${projectName}</span></div>
              <div class="detail-row"><span class="label">Status:</span> <span class="value">${incident.status}</span></div>
              <p>This incident has been reassigned to you. Please review and take appropriate action.</p>
              <a href="${incidentLink}" class="btn">View Incident</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    case "new_comment": {
      const commentContent = additionalData?.comment_content as string | undefined;
      return {
        subject: `[${incident.incident_number}] New Comment: ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">💬 New Comment Added</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number} — ${projectName}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              ${commentContent
                ? `<div style="background:#f3f4f6;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0;white-space:pre-wrap;font-size:14px;">${commentContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
                : `<p>A new comment has been added to this incident.</p>`
              }
              <p style="color:#6b7280;font-size:13px;">Reply to this email to respond, or click the button below to view it in the app.</p>
              <a href="${incidentLink}" class="btn">View &amp; Reply</a>
            </div>
            ${commonFooter}
          </div>
        `
      };
    }

    case "status_change":
      return {
        subject: `[${incident.incident_number}] Status Changed: ${additionalData?.old_status} → ${additionalData?.new_status}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📋 Status Updated</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <div class="detail-row">
                <span class="label">Status Changed:</span> 
                <span class="value">${additionalData?.old_status || "Unknown"} → ${additionalData?.new_status || incident.status}</span>
              </div>
              <a href="${incidentLink}" class="btn">View Incident</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    case "incident_resolved":
      return {
        subject: `[${incident.incident_number}] Incident Resolved: ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <h1 style="margin: 0;">✅ Incident Resolved</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <p>Great news! This incident has been resolved. If you have any questions or the issue persists, please reopen the ticket or create a new one.</p>
              <a href="${incidentLink}" class="btn">View Details</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    case "escalation":
      return {
        subject: `[ESCALATED] [${incident.incident_number}] ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
              <h1 style="margin: 0;">⚠️ Incident Escalated</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <div style="margin: 16px 0;">${priorityBadge}</div>
              <div class="danger">
                <strong>Escalation Reason:</strong> ${additionalData?.escalation_reason || "SLA threshold exceeded"}
              </div>
              <div class="detail-row"><span class="label">Project:</span> <span class="value">${projectName}</span></div>
              <p>This incident requires immediate attention. Please review and take action.</p>
              <a href="${incidentLink}" class="btn">Take Action</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    case "sla_warning":
      // Build list of SLAs at risk
      const warningItems: string[] = [];
      if (additionalData?.response_warning) {
        warningItems.push(`<li><strong>Response SLA:</strong> ${additionalData.response_remaining_minutes} minutes remaining</li>`);
      }
      if (additionalData?.resolution_warning) {
        warningItems.push(`<li><strong>Resolution SLA:</strong> ${additionalData.resolution_remaining_minutes} minutes remaining</li>`);
      }
      // Fallback for old format
      if (warningItems.length === 0 && additionalData?.sla_type) {
        warningItems.push(`<li><strong>${additionalData.sla_type === "response" ? "Response" : "Resolution"} SLA:</strong> ${additionalData.sla_remaining_minutes || "?"} minutes remaining</li>`);
      }
      
      return {
        subject: `[SLA WARNING] [${incident.incident_number}] ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
              <h1 style="margin: 0;">⏰ SLA Warning</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <div style="margin: 16px 0;">${priorityBadge}</div>
              <div class="warning">
                <strong>Warning:</strong> The following SLA targets are at risk:
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                  ${warningItems.join("")}
                </ul>
              </div>
              <div class="detail-row"><span class="label">Project:</span> <span class="value">${projectName}</span></div>
              <p>Please take action to resolve this incident before the SLA expires.</p>
              <a href="${incidentLink}" class="btn">View Incident</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    case "sla_breach":
      // Build list of breached SLAs
      const breachedItems: string[] = [];
      if (additionalData?.response_breached) {
        breachedItems.push("<li><strong>Response SLA:</strong> First response was not provided in time</li>");
      }
      if (additionalData?.resolution_breached) {
        breachedItems.push("<li><strong>Resolution SLA:</strong> Incident was not resolved in time</li>");
      }
      // Fallback for old format
      if (breachedItems.length === 0 && additionalData?.sla_type) {
        breachedItems.push(`<li><strong>${additionalData.sla_type === "response" ? "Response" : "Resolution"} SLA:</strong> Target exceeded</li>`);
      }
      
      return {
        subject: `[SLA BREACH] [${incident.incident_number}] ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
              <h1 style="margin: 0;">🚨 SLA Breached</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${incident.incident_number}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${incident.title}</h2>
              <div style="margin: 16px 0;">${priorityBadge}</div>
              <div class="danger">
                <strong>Alert:</strong> The following SLA targets have been breached:
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                  ${breachedItems.join("")}
                </ul>
              </div>
              <div class="detail-row"><span class="label">Project:</span> <span class="value">${projectName}</span></div>
              <p>This incident requires immediate attention. Please prioritize and resolve immediately.</p>
              <a href="${incidentLink}" class="btn">Take Action Now</a>
            </div>
            ${commonFooter}
          </div>
        `
      };

    default:
      return {
        subject: `[${incident.incident_number}] Notification: ${incident.title}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📢 Incident Notification</h1>
            </div>
            <div class="content">
              <h2>${incident.title}</h2>
              <a href="${incidentLink}" class="btn">View Incident</a>
            </div>
            ${commonFooter}
          </div>
        `
      };
  }
}

async function determineRecipients(
  supabase: any,
  type: NotificationType,
  incident: IncidentData,
  additionalData?: any
): Promise<string[]> {
  const recipients: Set<string> = new Set();

  switch (type) {
    case "new_assignment":
    case "reassignment":
      if (incident.assigned_to) recipients.add(incident.assigned_to);
      break;

    case "ticket_created":
      // Notify reporter always; notify assignee if exists
      if (incident.created_by) recipients.add(incident.created_by);
      if (incident.assigned_to) recipients.add(incident.assigned_to);
      break;

    case "new_comment":
      // Notify reporter, assignee, and participants — except the comment author
      if (incident.created_by && incident.created_by !== additionalData?.comment_author_id) {
        recipients.add(incident.created_by);
      }
      if (incident.assigned_to && incident.assigned_to !== additionalData?.comment_author_id) {
        recipients.add(incident.assigned_to);
      }
      // CC: participants
      {
        const { data: participants } = await supabase
          .from("incident_participants")
          .select("user_id")
          .eq("incident_id", incident.id);
        (participants || []).forEach((p: any) => {
          if (p.user_id !== additionalData?.comment_author_id) recipients.add(p.user_id);
        });
      }
      break;

    case "status_change":
      // No emails for intermediate status changes
      break;

    case "incident_resolved":
      // Notify reporter and assignee
      if (incident.created_by) recipients.add(incident.created_by);
      if (incident.assigned_to) recipients.add(incident.assigned_to);
      break;

    case "sla_breach":
    case "sla_warning":
      // Notify project lead AND assignee for SLA warnings and breaches
      if (incident.incident_project?.lead_id) {
        recipients.add(incident.incident_project.lead_id);
      }
      if (incident.assigned_to) {
        recipients.add(incident.assigned_to);
      }
      break;

    case "escalation":
      // Notify assignee, project lead, and managers
      if (incident.assigned_to) recipients.add(incident.assigned_to);
      if (incident.incident_project?.lead_id) recipients.add(incident.incident_project.lead_id);
      
      // Get managers
      const { data: managers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "manager"]);
      
      (managers || []).forEach((m: any) => recipients.add(m.user_id));
      break;
  }

  return Array.from(recipients);
}

async function sendNotification(request: NotificationRequest): Promise<{ success: boolean; error?: string; sent_count: number }> {
  console.log(`[send-incident-notifications] Processing ${request.type} for incident ${request.incident_id}`);

  const supabase = await getSupabaseClient();

  // Fetch incident data
  const incident = await fetchIncidentData(supabase, request.incident_id);
  if (!incident) {
    return { success: false, error: "Incident not found", sent_count: 0 };
  }

  // Determine recipients
  const recipientIds = request.recipients || await determineRecipients(supabase, request.type, incident, request.additional_data);

  if (recipientIds.length === 0) {
    console.log(`[send-incident-notifications] No recipients for ${request.type}`);
    return { success: true, sent_count: 0 };
  }

  // Get recipient emails
  const emailsMap = await getUserEmails(supabase, recipientIds);

  if (emailsMap.size === 0) {
    console.log(`[send-incident-notifications] No valid email addresses found`);
    return { success: true, sent_count: 0 };
  }

  // For new_comment, set reply-to as the comment author's email
  let replyTo: string | undefined;
  if (request.type === "new_comment" && request.additional_data?.comment_author_id) {
    const authorMap = await getUserEmails(supabase, [request.additional_data.comment_author_id as string]);
    const authorEntry = authorMap.get(request.additional_data.comment_author_id as string);
    if (authorEntry) replyTo = authorEntry.email;
  }

  // Generate email content
  const { subject, html } = getEmailTemplate(request.type, incident, request.additional_data);

  // Send emails
  let sentCount = 0;
  const errors: string[] = [];

  for (const [userId, { email, full_name }] of emailsMap) {
    try {
      // Add delay to prevent Resend rate limiting (2 requests/second limit)
      await new Promise(resolve => setTimeout(resolve, 600));

      console.log(`[send-incident-notifications] Sending ${request.type} to ${email}`);

      const emailResponse = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        ...(replyTo ? { replyTo } : {}),
        subject,
        html
      });

      console.log(`[send-incident-notifications] Email sent to ${email}:`, emailResponse);
      sentCount++;

      // Log notification in assignment_notifications table if relevant
      if (["new_assignment", "reassignment", "escalation"].includes(request.type)) {
        await supabase.from("assignment_notifications").insert({
          incident_id: request.incident_id,
          assigned_to: userId,
          notification_type: request.type,
          assignment_type: request.type,
          sent_at: new Date().toISOString(),
          delivery_status: "sent",
          notification_content: { subject, recipient: email }
        });
      }

      // Log SLA notifications - use combined type for breach duplicate prevention
      if (["sla_warning", "sla_breach"].includes(request.type)) {
        await supabase.from("sla_notifications").insert({
          incident_id: request.incident_id,
          notification_type: request.type, // "sla_breach" - combined, not separate types
          recipient_user_id: userId,
          sent_at: new Date().toISOString(),
          notification_sent: true
        });
      }

    } catch (err: any) {
      console.error(`[send-incident-notifications] Failed to send to ${email}:`, err);
      errors.push(`${email}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    sent_count: sentCount
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: NotificationRequest = await req.json();
    
    console.log(`[send-incident-notifications] Received request:`, JSON.stringify(request));

    if (!request.type || !request.incident_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and incident_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendNotification(request);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[send-incident-notifications] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
