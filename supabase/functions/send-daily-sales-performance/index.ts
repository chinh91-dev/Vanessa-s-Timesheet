import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "support@comansservices.com.au";

const CRM_ACTIONS = [
  "deal_created", "deal_updated", "deal_stage_changed", "deal_won", "deal_lost",
  "contact_created", "contact_updated", "contact_qualified",
  "lead_created", "lead_qualified", "lead_converted",
  "account_created", "account_updated",
  "task_created", "task_updated", "task_completed",
  "meeting_created", "meeting_updated", "activity_logged",
  "service_added", "service_updated",
];

const ACTION_LABELS: Record<string, string> = {
  deal_created: "Deals Created", deal_updated: "Deals Updated",
  deal_stage_changed: "Stage Changes", deal_won: "Deals Won", deal_lost: "Deals Lost",
  contact_created: "Contacts Created", contact_updated: "Contacts Updated",
  contact_qualified: "Contacts Qualified", lead_created: "Leads Created",
  lead_qualified: "Leads Qualified", lead_converted: "Leads Converted",
  account_created: "Accounts Created", account_updated: "Accounts Updated",
  task_created: "Tasks Created", task_updated: "Tasks Updated",
  task_completed: "Tasks Completed", meeting_created: "Meetings Created",
  meeting_updated: "Meetings Updated", activity_logged: "Activities Logged",
  service_added: "Services Added", service_updated: "Services Updated",
};

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_name: string | null;
  description: string | null;
  created_at: string;
}

interface SalespersonSummary {
  userId: string;
  userName: string;
  totalActions: number;
  actionBreakdown: { action: string; count: number; label: string }[];
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Daily sales performance report triggered");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in AEST
    const now = new Date();
    const aestOffset = 10 * 60;
    const aestDate = new Date(now.getTime() + aestOffset * 60 * 1000);
    const todayStr = aestDate.toISOString().split("T")[0];

    console.log(`Fetching audit logs for date: ${todayStr}`);

    const { data: auditLogs, error: auditError } = await supabase.rpc(
      "get_audit_logs_direct",
      { p_start_date: todayStr, p_end_date: todayStr, p_user_id: null }
    );

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
      throw auditError;
    }

    const crmLogs =
      auditLogs?.filter((log: AuditLog) => CRM_ACTIONS.includes(log.action)) || [];

    console.log(`Found ${crmLogs.length} CRM audit logs for today`);

    if (crmLogs.length === 0) {
      console.log("No CRM activity today, skipping email");
      return new Response(
        JSON.stringify({ message: "No CRM activity today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by salesperson
    const userMap = new Map<string, SalespersonSummary>();

    crmLogs.forEach((log: AuditLog) => {
      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, {
          userId: log.user_id,
          userName: log.user_name || "Unknown User",
          totalActions: 0,
          actionBreakdown: [],
        });
      }

      const userSummary = userMap.get(log.user_id)!;
      userSummary.totalActions++;

      const existingAction = userSummary.actionBreakdown.find(
        (a) => a.action === log.action
      );
      if (existingAction) {
        existingAction.count++;
      } else {
        userSummary.actionBreakdown.push({
          action: log.action,
          count: 1,
          label: ACTION_LABELS[log.action] || log.action,
        });
      }
    });

    const summaries = Array.from(userMap.values()).sort(
      (a, b) => b.totalActions - a.totalActions
    );

    // Format date for email
    const formattedDate = aestDate.toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const totalActions = summaries.reduce((sum, s) => sum + s.totalActions, 0);

    // Build email HTML
    const salespersonRows = summaries
      .map((s) => {
        const breakdownItems = s.actionBreakdown
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((ab) => `<li style="color: #666;">${ab.label}: ${ab.count}</li>`)
          .join("");

        return `
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 style="margin: 0; color: #111827; font-size: 16px;">${s.userName}</h3>
            <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 600;">
              ${s.totalActions} actions
            </span>
          </div>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
            ${breakdownItems}
          </ul>
        </div>
      `;
      })
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Sales Activity Report</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📊 Daily Sales Activity Report</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${formattedDate}</p>
          </div>

          <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <p style="margin: 0; color: #666; font-size: 14px;">Total CRM Actions</p>
                <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: 700; color: #1d4ed8;">${totalActions}</p>
              </div>
              <div>
                <p style="margin: 0; color: #666; font-size: 14px;">Active Salespeople</p>
                <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: 700; color: #1d4ed8;">${summaries.length}</p>
              </div>
            </div>
          </div>

          <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Activity by Salesperson</h2>
          
          ${salespersonRows}

          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="${appBaseUrl}/crm/deals" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              View Full Report
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This is an automated daily report. Do not reply to this email.
          </p>
        </body>
      </html>
    `;

    // Send single email to support
    console.log(`Sending daily sales performance to ${SUPPORT_EMAIL}`);

    const emailResponse = await resend.emails.send({
      from: "CRM Reports <crm@comansservices.com.au>",
      to: [SUPPORT_EMAIL],
      subject: `[Daily Report] Sales Team Activity Summary - ${formattedDate}`,
      html: emailHtml,
    });

    console.log(`Email sent to ${SUPPORT_EMAIL}:`, emailResponse);

    return new Response(
      JSON.stringify({
        message: "Daily performance report sent",
        totalActions,
        salespersonCount: summaries.length,
        emailsSent: 1,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-daily-sales-performance:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
