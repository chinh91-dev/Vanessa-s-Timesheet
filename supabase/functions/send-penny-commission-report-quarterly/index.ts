import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENTS = [
  "Belinda.Comeau@comansservices.com.au",
  "jason.comeau@comansservices.com.au",
];

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

function getAESTDate(): { day: number; month: number; year: number } {
  const now = new Date();
  const aestOffset = 10 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const aestMinutes = utcMinutes + aestOffset;

  let day = now.getUTCDate();
  let month = now.getUTCMonth();
  let year = now.getUTCFullYear();

  if (aestMinutes >= 24 * 60) {
    const nextDay = new Date(Date.UTC(year, month, day + 1));
    day = nextDay.getUTCDate();
    month = nextDay.getUTCMonth();
    year = nextDay.getUTCFullYear();
  }

  return { day, month, year };
}

function isLastWeekdayOfMonth(): boolean {
  const { day, month, year } = getAESTDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  let lastWeekday = lastDayOfMonth;
  while (true) {
    const d = new Date(year, month, lastWeekday);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) break;
    lastWeekday--;
  }

  return day === lastWeekday;
}

function isQuarterEndMonth(): boolean {
  const { month } = getAESTDate();
  return [2, 5, 8, 11].includes(month);
}

function getQuarterRange(): {
  quarterNumber: number;
  fyLabel: string;
  startDate: string;
  endDate: string;
  quarterLabel: string;
} {
  const { month, year } = getAESTDate();

  let quarterNumber: number;
  let qStartMonth: number;
  let qStartYear: number;
  let qEndMonth: number;
  let qEndYear: number;
  let fyStartYear: number;

  switch (month) {
    case 8:
      quarterNumber = 1;
      qStartMonth = 6; qStartYear = year;
      qEndMonth = 8; qEndYear = year;
      fyStartYear = year;
      break;
    case 11:
      quarterNumber = 2;
      qStartMonth = 9; qStartYear = year;
      qEndMonth = 11; qEndYear = year;
      fyStartYear = year;
      break;
    case 2:
      quarterNumber = 3;
      qStartMonth = 0; qStartYear = year;
      qEndMonth = 2; qEndYear = year;
      fyStartYear = year - 1;
      break;
    case 5:
      quarterNumber = 4;
      qStartMonth = 3; qStartYear = year;
      qEndMonth = 5; qEndYear = year;
      fyStartYear = year - 1;
      break;
    default:
      throw new Error(`Not a quarter-end month: ${month}`);
  }

  const lastDay = new Date(qEndYear, qEndMonth + 1, 0).getDate();
  const startDate = new Date(qStartYear, qStartMonth, 1).toISOString().split("T")[0];
  const endDate = `${new Date(qEndYear, qEndMonth, lastDay).toISOString().split("T")[0]}T23:59:59`;

  const fyEndYear = fyStartYear + 1;
  const fyLabel = `FY ${fyStartYear}/${String(fyEndYear).slice(2)}`;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const quarterLabel = `Q${quarterNumber} ${fyLabel} (${monthNames[qStartMonth]} ${qStartYear} – ${monthNames[qEndMonth]} ${qEndYear})`;

  return { quarterNumber, fyLabel, startDate, endDate, quarterLabel };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-penny-commission-report-quarterly function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let force = false;
    try {
      const body = await req.json();
      force = body.force === true;
    } catch {
      // No body
    }

    if (!force) {
      if (!isQuarterEndMonth()) {
        console.log("Not a quarter-end month — skipping.");
        return new Response(
          JSON.stringify({ message: "Not a quarter-end month, skipping." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!isLastWeekdayOfMonth()) {
        console.log("Not the last weekday of the month — skipping.");
        return new Response(
          JSON.stringify({ message: "Not the last weekday of the month, skipping." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== IDENTIFY PENNY ==========
    const { data: pennyProfile, error: pennyError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .ilike("full_name", "%penelope%sharp%")
      .single();

    if (pennyError || !pennyProfile) {
      console.error("Could not find Penny Sharp in profiles:", pennyError);
      throw new Error("Penny Sharp not found in profiles table");
    }

    const pennyId = pennyProfile.id;
    console.log(`Found Penny Sharp: ${pennyProfile.full_name} (${pennyId})`);

    const { quarterNumber, fyLabel, startDate, endDate, quarterLabel } = getQuarterRange();
    console.log(`Generating quarterly commission report for: ${quarterLabel} (${startDate} to ${endDate})`);

    // ========== FETCH ALL DATA ==========

    const { data: allDeals } = await supabase
      .from("deals")
      .select(`
        id, name, amount, contract_value, close_date, created_at, source,
        billing_cadence, gst_treatment,
        primary_contact_id,
        pipeline_stage:pipeline_stage_id(id, name, is_closed_won, is_closed_lost, default_probability, stage_order),
        primary_contact:primary_contact_id(id, contact_name, company_name, email)
      `)
      .eq("owner_id", pennyId);

    const allOwnedDeals = allDeals || [];

    const periodDeals = allOwnedDeals.filter((d: any) => {
      const created = d.created_at >= startDate && d.created_at <= endDate;
      const closed = d.close_date && d.close_date >= startDate && d.close_date <= endDate;
      return created || closed;
    });

    const newDeals = allOwnedDeals.filter((d: any) => d.created_at >= startDate && d.created_at <= endDate);
    const closedInPeriod = allOwnedDeals.filter((d: any) => d.close_date && d.close_date >= startDate && d.close_date <= endDate);
    const wonDeals = closedInPeriod.filter((d: any) => d.pipeline_stage?.is_closed_won);
    const lostDeals = closedInPeriod.filter((d: any) => d.pipeline_stage?.is_closed_lost);
    const openDeals = allOwnedDeals.filter((d: any) => !d.pipeline_stage?.is_closed_won && !d.pipeline_stage?.is_closed_lost);

    // 2. Revenue metrics
    const totalWonRevenue = wonDeals.reduce((sum: number, d: any) => sum + (Number(d.contract_value) || Number(d.amount) || 0), 0);
    const totalLostRevenue = lostDeals.reduce((sum: number, d: any) => sum + (Number(d.contract_value) || Number(d.amount) || 0), 0);
    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;
    const lossRate = totalClosed > 0 ? (lostDeals.length / totalClosed) * 100 : 0;

    // Closed Sales tiers
    const getDealValue = (d: any) => Number(d.contract_value) || Number(d.amount) || 0;
    const wonUpTo10k = wonDeals.filter((d: any) => getDealValue(d) <= 10000);
    const won10kTo50k = wonDeals.filter((d: any) => { const v = getDealValue(d); return v >= 10001 && v <= 50000; });
    const wonAbove50k = wonDeals.filter((d: any) => getDealValue(d) > 50000);
    const totalUpTo10k = wonUpTo10k.reduce((sum: number, d: any) => sum + getDealValue(d), 0);
    const total10kTo50k = won10kTo50k.reduce((sum: number, d: any) => sum + getDealValue(d), 0);
    const totalAbove50k = wonAbove50k.reduce((sum: number, d: any) => sum + getDealValue(d), 0);

    // 3. Deals by stage breakdown
    const stageBreakdown: { [key: string]: number } = {};
    allOwnedDeals.forEach((d: any) => {
      const stage = d.pipeline_stage?.name || "Unknown";
      stageBreakdown[stage] = (stageBreakdown[stage] || 0) + 1;
    });

    // 4. Qualified & First-time qualified
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("id, name")
      .ilike("name", "%qualified%");

    const qualifiedStageIds = stages?.map((s: any) => s.id) || [];
    const qualifiedDeals = allOwnedDeals.filter((d: any) =>
      qualifiedStageIds.includes(d.pipeline_stage?.id)
    );

    const { data: existingCustomers } = await supabase
      .from("customers")
      .select("name");

    const existingCustomerNames = new Set(
      existingCustomers?.map((c: any) => c.name?.toLowerCase().trim()).filter(Boolean) || []
    );

    const contactIds = [...new Set(qualifiedDeals.filter((d: any) => d.primary_contact_id).map((d: any) => d.primary_contact_id))];
    let contactFirstDealMap: { [key: string]: string } = {};

    if (contactIds.length > 0) {
      const { data: contactAllDeals } = await supabase
        .from("deals")
        .select("id, primary_contact_id, created_at")
        .in("primary_contact_id", contactIds)
        .order("created_at", { ascending: true });

      contactAllDeals?.forEach((d: any) => {
        if (d.primary_contact_id && !contactFirstDealMap[d.primary_contact_id]) {
          contactFirstDealMap[d.primary_contact_id] = d.id;
        }
      });
    }

    let firstTimeQualifiedCount = 0;
    const firstTimeQualifiedDeals: any[] = [];

    qualifiedDeals.forEach((deal: any) => {
      const contactId = deal.primary_contact_id;
      if (contactId && contactFirstDealMap[contactId] === deal.id) {
        const companyName = deal.primary_contact?.company_name;
        const isExistingCustomer = companyName && existingCustomerNames.has(companyName.toLowerCase().trim());
        if (!isExistingCustomer) {
          firstTimeQualifiedCount++;
          firstTimeQualifiedDeals.push(deal);
        }
      }
    });

    // 5. Deal items on won deals
    const wonDealIds = wonDeals.map((d: any) => d.id);
    let dealItems: any[] = [];
    if (wonDealIds.length > 0) {
      const { data: items } = await supabase
        .from("deal_items")
        .select("id, deal_id, description, quantity, unit_price, discount_percent, tax_percent, line_total, line_total_with_discount, tax_amount, final_total")
        .in("deal_id", wonDealIds)
        .order("sort_order");
      dealItems = items || [];
    }

    // 6. Meetings this quarter (with contact info for existing client check)
    const { data: meetings } = await supabase
      .from("crm_meetings")
      .select("id, meeting_type, status, contact_id, contact_name")
      .eq("owner_id", pennyId)
      .gte("meeting_date", startDate)
      .lte("meeting_date", endDate.split("T")[0]);

    const allMeetings = meetings || [];
    const newContactMeetings = allMeetings.filter((m: any) => m.meeting_type === "new_contact").length;
    const existingClientMeetings = allMeetings.filter((m: any) => m.meeting_type === "existing_client").length;
    const followUpMeetings = allMeetings.filter((m: any) => m.meeting_type === "follow_up").length;




    // ========== GENERATE CSV ==========
    const csvLines: string[] = [];
    csvLines.push(`# Penny Sharp - Quarterly Commission Report - ${quarterLabel}`);
    csvLines.push(`# Generated: ${new Date().toISOString()}`);
    csvLines.push("");

    csvLines.push("DEAL DETAILS");
    csvLines.push("Deal Name,Amount,Contract Value,Stage,Close Date,Contact,Company,Source,Billing Cadence,GST Treatment,Created Date");
    periodDeals.forEach((d: any) => {
      csvLines.push([
        escapeCsvField(d.name),
        d.amount || "",
        d.contract_value || "",
        escapeCsvField(d.pipeline_stage?.name || ""),
        d.close_date || "",
        escapeCsvField(d.primary_contact?.contact_name || ""),
        escapeCsvField(d.primary_contact?.company_name || ""),
        escapeCsvField(d.source || ""),
        escapeCsvField(d.billing_cadence || ""),
        escapeCsvField(d.gst_treatment || ""),
        d.created_at ? d.created_at.split("T")[0] : "",
      ].join(","));
    });
    csvLines.push("");

    if (dealItems.length > 0) {
      csvLines.push("WON DEAL LINE ITEMS");
      csvLines.push("Deal ID,Description,Quantity,Unit Price,Discount %,Line Total,Tax %,Tax Amount,Final Total");
      dealItems.forEach((item: any) => {
        const dealName = wonDeals.find((d: any) => d.id === item.deal_id)?.name || item.deal_id;
        csvLines.push([
          escapeCsvField(dealName),
          escapeCsvField(item.description),
          item.quantity,
          item.unit_price,
          item.discount_percent,
          item.line_total_with_discount || item.line_total || "",
          item.tax_percent,
          item.tax_amount || "",
          item.final_total || "",
        ].join(","));
      });
      csvLines.push("");
    }

    if (firstTimeQualifiedDeals.length > 0) {
      csvLines.push("FIRST-TIME QUALIFIED DEALS");
      csvLines.push("Deal Name,Amount,Contract Value,Contact,Company");
      firstTimeQualifiedDeals.forEach((d: any) => {
        csvLines.push([
          escapeCsvField(d.name),
          d.amount || "",
          d.contract_value || "",
          escapeCsvField(d.primary_contact?.contact_name || ""),
          escapeCsvField(d.primary_contact?.company_name || ""),
        ].join(","));
      });
    }

    const csvContent = csvLines.join("\n");

    // ========== GENERATE HTML EMAIL ==========
    const stageRows = Object.entries(stageBreakdown)
      .map(([stage, count]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${stage}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">${count}</td></tr>`)
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:700px;margin:0 auto;">
        <h1 style="color:#1a1a2e;">Quarterly Commission Report — Penny Sharp</h1>
        <p style="color:#666;">Report period: <strong>${quarterLabel}</strong></p>
        
        <h2 style="color:#16213e;border-bottom:2px solid #0f3460;padding-bottom:6px;">Deal Summary</h2>
        <table style="border-collapse:collapse;width:100%;margin:12px 0;">
          <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Total Deals Owned (all time)</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${allOwnedDeals.length}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">New Deals (this quarter)</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${newDeals.length}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Deals Won (this quarter)</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${wonDeals.length}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Deals Lost (this quarter)</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${lostDeals.length}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Open Deals</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${openDeals.length}</td></tr>
        </table>

        <h2 style="color:#16213e;border-bottom:2px solid #0f3460;padding-bottom:6px;">Revenue</h2>
        <table style="border-collapse:collapse;width:100%;margin:12px 0;">
          <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Won Revenue</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${formatCurrency(totalWonRevenue)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Lost Revenue</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${formatCurrency(totalLostRevenue)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Closed Sales up to $10,000</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${wonUpTo10k.length} deals — ${formatCurrency(totalUpTo10k)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Closed Sales $10,001 to $50,000</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${won10kTo50k.length} deals — ${formatCurrency(total10kTo50k)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Closed Sales above $50,000</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${wonAbove50k.length} deals — ${formatCurrency(totalAbove50k)}</td></tr>
        </table>

        <h2 style="color:#16213e;border-bottom:2px solid #0f3460;padding-bottom:6px;">Win / Loss Rate</h2>
        <table style="border-collapse:collapse;width:100%;margin:12px 0;">
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Win Rate</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${winRate.toFixed(1)}%</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Loss Rate</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${lossRate.toFixed(1)}%</td></tr>
        </table>

        <h2 style="color:#16213e;border-bottom:2px solid #0f3460;padding-bottom:6px;">Deals by Stage</h2>
        <table style="border-collapse:collapse;width:100%;margin:12px 0;">
          <tr><th style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">Stage</th><th style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;text-align:right;">Count</th></tr>
          ${stageRows}
        </table>

        <h2 style="color:#16213e;border-bottom:2px solid #0f3460;padding-bottom:6px;">Qualified Deals</h2>
        <table style="border-collapse:collapse;width:100%;margin:12px 0;">
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Total Qualified</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${qualifiedDeals.length}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;">First-Time Qualified</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${firstTimeQualifiedCount}</td></tr>
        </table>

        <h2 style="color:#16213e;border-bottom:2px solid #0f3460;padding-bottom:6px;">Meetings (this quarter)</h2>
        <table style="border-collapse:collapse;width:100%;margin:12px 0;">
          <tr><th style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">Type</th><th style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;text-align:right;">Count</th></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">New Contact</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${newContactMeetings}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Existing Client</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${existingClientMeetings}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;">Follow Up</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${followUpMeetings}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;">Total</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${allMeetings.length}</td></tr>
        </table>

        ${dealItems.length > 0 ? `
        <h2 style="color:#16213e;border-bottom:2px solid #0f3460;padding-bottom:6px;">Won Deal Line Items</h2>
        <table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;">
          <tr>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">Deal</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">Item</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:right;">Qty</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:right;">Unit Price</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:right;">Total</th>
          </tr>
          ${dealItems.map((item: any) => {
            const dealName = wonDeals.find((d: any) => d.id === item.deal_id)?.name || "—";
            return `<tr>
              <td style="padding:6px 8px;border:1px solid #ddd;">${dealName}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;">${item.description}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${item.quantity}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.unit_price)}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.final_total || item.line_total || 0)}</td>
            </tr>`;
          }).join("")}
        </table>` : ""}

        <p style="margin-top:24px;color:#888;font-size:12px;">This is an automated quarterly commission report. Full deal-level detail is in the attached CSV.</p>
      </div>
    `;

    // ========== SEND EMAIL ==========
    const subject = `Penny Sharp — Quarterly Commission Report — Q${quarterNumber} ${fyLabel}`;
    const fileSlug = `penny-sharp-quarterly-q${quarterNumber}-${fyLabel.replace(/\s|\//g, "-").toLowerCase()}`;

    const { error: emailError } = await resend.emails.send({
      from: "CRM Reports <crm@comansservices.com.au>",
      to: RECIPIENTS,
      subject,
      html,
      attachments: [
        {
          filename: `${fileSlug}.csv`,
          content: base64Encode(new TextEncoder().encode(csvContent)),
        },
      ],
    });

    if (emailError) {
      console.error("Error sending quarterly commission report email:", emailError);
      throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
    }

    console.log(`Successfully sent Penny Sharp quarterly commission report for ${quarterLabel} to ${RECIPIENTS.join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Quarterly commission report sent for ${quarterLabel}`,
        stats: {
          totalDeals: allOwnedDeals.length,
          periodDeals: periodDeals.length,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          wonRevenue: totalWonRevenue,
          winRate: winRate.toFixed(1),
          qualifiedDeals: qualifiedDeals.length,
          firstTimeQualified: firstTimeQualifiedCount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-penny-commission-report-quarterly:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
