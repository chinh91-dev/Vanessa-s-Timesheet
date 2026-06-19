import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "support@comansservices.com.au";

const URGENT_STAGES = ["negotiation", "discovery"];

interface StageNote {
  note_content: string;
  stage_name: string;
  created_by_name: string;
  created_at: string;
}

interface Deal {
  id: string;
  name: string | null;
  amount: number | null;
  close_date: string;
  owner_id: string;
  next_step: string | null;
  pipeline_stage: { name: string } | null;
  account: { name: string } | null;
  owner: { full_name: string; email: string } | null;
  lastStageNote?: StageNote | null;
}

async function getLastStageNote(supabase: any, dealId: string): Promise<StageNote | null> {
  const { data, error } = await supabase
    .from("deal_stage_notes")
    .select("note_content, stage_name, created_by_name, created_at")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as StageNote;
}

function isUrgentStage(stageName: string | null): boolean {
  if (!stageName) return false;
  return URGENT_STAGES.includes(stageName.toLowerCase());
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "Not specified";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getAESTDate(): Date {
  const now = new Date();
  const aestOffset = 10 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + aestOffset * 60000);
}

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function generateStageNoteHtml(note: StageNote | null | undefined): string {
  if (!note) return "";
  const noteDate = new Date(note.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return `
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Last Note:</td>
      <td style="padding: 8px 0; color: #111827; font-size: 14px;">
        <em>${note.note_content}</em>
        <br><span style="color: #9ca3af; font-size: 12px;">by ${note.created_by_name} on ${noteDate} (Stage: ${note.stage_name})</span>
      </td>
    </tr>
  `;
}

function generateDealRowHtml(deal: Deal): string {
  const accountName = deal.account?.name || "Unknown Account";
  const stageName = deal.pipeline_stage?.name || "Unknown Stage";
  const ownerName = deal.owner?.full_name || "Unassigned";

  return `
    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 16px;">${deal.name || "Unnamed Deal"}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 120px;">Account:</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${accountName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Owner:</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${ownerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Stage:</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${stageName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Amount:</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${formatCurrency(deal.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Close Date:</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${formatDate(deal.close_date)}</td>
        </tr>
        ${deal.next_step ? `
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Next Step:</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px;">${deal.next_step}</td>
        </tr>
        ` : ""}
        ${generateStageNoteHtml(deal.lastStageNote)}
      </table>
    </div>
  `;
}

function generateConsolidatedEmailHtml(deals: Deal[], appBaseUrl: string): string {
  const urgentDeals = deals.filter(d => isUrgentStage(d.pipeline_stage?.name ?? null));
  const lowDeals = deals.filter(d => !isUrgentStage(d.pipeline_stage?.name ?? null));
  const hasUrgent = urgentDeals.length > 0;

  const headerBg = hasUrgent
    ? "background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);"
    : "background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);";
  const headerIcon = hasUrgent ? "🚨" : "📋";
  const headerText = hasUrgent
    ? `${headerIcon} Deals Closing Tomorrow – Urgent Action Needed`
    : `${headerIcon} Deals Closing Tomorrow – Reminder`;

  let urgentSection = "";
  if (urgentDeals.length > 0) {
    const rows = urgentDeals.map(d => generateDealRowHtml(d)).join("");
    urgentSection = `
      <div style="background-color: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #991b1b; margin: 0 0 16px 0; font-size: 16px;">🚨 Urgent – Negotiation / Discovery Stage</h2>
        ${rows}
      </div>
    `;
  }

  let lowSection = "";
  if (lowDeals.length > 0) {
    const rows = lowDeals.map(d => generateDealRowHtml(d)).join("");
    lowSection = `
      <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #92400e; margin: 0 0 16px 0; font-size: 16px;">📋 Reminder – Earlier Pipeline Stages</h2>
        ${rows}
      </div>
    `;
  }

  const count = deals.length;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="${headerBg} padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${headerText}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
            ${count} deal${count === 1 ? "" : "s"} closing tomorrow
          </p>
        </div>

        <div style="padding: 24px;">
          <p style="color: #374151; margin: 0 0 20px 0;">Hi Team,</p>
          <p style="color: #374151; margin: 0 0 24px 0;">The following deal${count === 1 ? " is" : "s are"} expected to close <strong>tomorrow</strong>. Please review and take action where needed.</p>

          ${urgentSection}
          ${lowSection}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${appBaseUrl}/crm/pipeline" style="display: inline-block; background-color: ${hasUrgent ? "#dc2626" : "#f59e0b"}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View Pipeline</a>
          </div>
        </div>

        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">This is an automated closing-tomorrow reminder from your CRM system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-deal-close-reminders function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const today = getAESTDate();
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);
    const oneDayDate = getDateString(oneDayFromNow);

    console.log(`Checking for deals closing tomorrow: ${oneDayDate}`);

    const { data: closedStages, error: stagesError } = await supabase
      .from("pipeline_stages")
      .select("id")
      .in("name", ["Closed Won", "Closed Lost"]);

    if (stagesError) {
      console.error("Error fetching closed stages:", stagesError);
      throw stagesError;
    }

    const closedStageIds = closedStages?.map(s => s.id) || [];

    const { data: tomorrowDeals, error: dealsError } = await supabase
      .from("deals")
      .select(`
        id, name, amount, close_date, owner_id, next_step,
        pipeline_stage:pipeline_stage_id(name),
        account:account_id(name),
        owner:owner_id(full_name, email)
      `)
      .eq("close_date", oneDayDate)
      .not("owner_id", "is", null)
      .not("pipeline_stage_id", "in", `(${closedStageIds.join(",")})`);

    if (dealsError) {
      console.error("Error fetching tomorrow deals:", dealsError);
      throw dealsError;
    }

    const deals = (tomorrowDeals || []) as Deal[];
    console.log(`Found ${deals.length} deals closing tomorrow`);

    if (deals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No deals closing tomorrow", emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const deal of deals) {
      deal.lastStageNote = await getLastStageNote(supabase, deal.id);
    }

    const hasUrgent = deals.some(d => isUrgentStage(d.pipeline_stage?.name ?? null));
    const urgencyTag = hasUrgent ? "🚨 Urgent: " : "";
    const stageList = [...new Set(deals.map(d => d.pipeline_stage?.name || "Unknown"))].join(", ");
    const subject = deals.length === 1
      ? `${urgencyTag}Deal Closing Tomorrow: ${deals[0].name || "Unnamed Deal"} - ${deals[0].pipeline_stage?.name || "Unknown"} (${deals[0].owner?.full_name || "Unassigned"})`
      : `${urgencyTag}${deals.length} Deals Closing Tomorrow [${stageList}]`;

    const html = generateConsolidatedEmailHtml(deals, appBaseUrl);

    console.log(`Sending consolidated closing-tomorrow email to ${SUPPORT_EMAIL}`);

    const emailResponse = await resend.emails.send({
      from: "CRM Reminders <crm@comansservices.com.au>",
      to: [SUPPORT_EMAIL],
      subject,
      html,
    });

    console.log("Email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: 1,
        dealsCount: deals.length,
        hasUrgent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-deal-close-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
