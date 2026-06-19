import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function escapeCsv(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function getLastMonthRange(testDate?: string): { startDate: string; endDate: string; monthYear: string; month: number; year: number } {
  const now = testDate ? new Date(testDate) : new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    startDate: lastMonth.toISOString().split("T")[0],
    endDate: `${lastDay.toISOString().split("T")[0]}T23:59:59`,
    monthYear: lastMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
    month: lastMonth.getMonth() + 1,
    year: lastMonth.getFullYear(),
  };
}

function getFinancialYear(month: number, year: number): string {
  // Australian FY: July-June. Month 7-12 = FY year/(year+1), Month 1-6 = FY (year-1)/year
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function pct(num: number, den: number): string {
  return den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "0.0%";
}

function pctNum(num: number, den: number): number {
  return den > 0 ? (num / den) * 100 : 0;
}

// ==================== EMAIL HTML BUILDER ====================

function buildSection(title: string, content: string): string {
  return `
    <div style="margin-bottom:28px;">
      <h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin-bottom:12px;">${title}</h2>
      ${content}
    </div>`;
}

function buildTable(headers: string[], rows: string[][]): string {
  const hdr = headers.map(h => `<th style="padding:8px 12px;background:#f0f4f8;border:1px solid #ddd;text-align:left;font-size:13px;">${h}</th>`).join("");
  const body = rows.map(r => `<tr>${r.map(c => `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${c}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0;">${hdr ? `<thead><tr>${hdr}</tr></thead>` : ""}<tbody>${body}</tbody></table>`;
}

function buildKpiRow(label: string, actual: number | string, target: number | string | null, unit: string = ""): string {
  const act = typeof actual === "number" ? (unit === "$" ? formatCurrency(actual) : `${actual}`) : actual;
  if (target === null) return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${label}</td><td style="padding:6px 12px;border:1px solid #ddd;">${act}</td><td style="padding:6px 12px;border:1px solid #ddd;color:#999;">No target set</td><td style="padding:6px 12px;border:1px solid #ddd;">—</td></tr>`;
  const tgt = typeof target === "number" ? (unit === "$" ? formatCurrency(target) : `${target}`) : target;
  const actualNum = typeof actual === "number" ? actual : 0;
  const targetNum = typeof target === "number" ? target : 0;
  const achievement = targetNum > 0 ? ((actualNum / targetNum) * 100).toFixed(0) : "—";
  const color = targetNum > 0 && actualNum >= targetNum ? "#22c55e" : targetNum > 0 ? "#ef4444" : "#666";
  return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${label}</td><td style="padding:6px 12px;border:1px solid #ddd;">${act}</td><td style="padding:6px 12px;border:1px solid #ddd;">${tgt}</td><td style="padding:6px 12px;border:1px solid #ddd;color:${color};font-weight:600;">${achievement}%</td></tr>`;
}

// ==================== HANDLER ====================

const handler = async (req: Request): Promise<Response> => {
  console.log("send-monthly-crm-report function invoked");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let testDate: string | undefined;
    try { const body = await req.json(); testDate = body.testDate; } catch { /* no body */ }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { startDate, endDate, monthYear, month, year } = getLastMonthRange(testDate);
    const fy = getFinancialYear(month, year);
    console.log(`Generating report for: ${monthYear} (${startDate} to ${endDate}), FY ${fy}`);

    // ========== FETCH ALL DATA IN PARALLEL ==========
    const [
      { data: salesReps },
      { data: deals },
      { data: contacts },
      { data: meetings },
      { data: stages },
      { data: stageHistory },
      { data: allOpenDeals },
    ] = await Promise.all([
      // Sales reps (anyone who owns deals or contacts)
      supabase.from("profiles").select("id, full_name, email").eq("is_active", true),
      // Deals closed in period OR created in period
      supabase.from("deals").select(`
        id, name, amount, contract_value, close_date, created_at, lost_reason, source, owner_id,
        owner:owner_id(id, full_name),
        pipeline_stage:pipeline_stage_id(id, name, is_closed_won, is_closed_lost, default_probability, stage_order)
      `),
      // Contacts created in period
      supabase.from("contacts").select("id, source, created_by, owner_id").gte("created_at", startDate).lte("created_at", endDate),
      // Meetings in period
      supabase.from("crm_meetings").select("id, title, meeting_type, owner_id, status, meeting_date").gte("meeting_date", startDate).lte("meeting_date", endDate),
      // Pipeline stages
      supabase.from("pipeline_stages").select("id, name, stage_order, is_closed_won, is_closed_lost, default_probability").eq("is_active", true).order("stage_order"),
      // Deal stage history for velocity
      supabase.from("deal_stage_history").select("deal_id, from_stage_id, to_stage_id, changed_at"),
      // All currently open deals for pipeline snapshot
      supabase.from("deals").select(`
        id, amount, contract_value, owner_id,
        owner:owner_id(id, full_name),
        pipeline_stage:pipeline_stage_id(id, name, is_closed_won, is_closed_lost, default_probability, stage_order)
      `),
    ]);

    // KPI targets - query separately as table may not exist yet
    let kpiTargets: any[] = [];
    try {
      const { data, error } = await supabase.from("sales_kpi_targets").select("*").eq("financial_year", fy).eq("month", month);
      if (!error && data) kpiTargets = data;
    } catch { /* table may not exist */ }

    const closedWonStage = stages?.find((s: any) => s.is_closed_won);
    const closedLostStage = stages?.find((s: any) => s.is_closed_lost);
    const proposalStage = stages?.find((s: any) => s.name.toLowerCase().includes("proposal") || s.name.toLowerCase().includes("quote"));
    const qualifiedStage = stages?.find((s: any) => s.name.toLowerCase().includes("qualified"));

    // Filter deals closed in the reporting period
    const dealsClosedInPeriod = (deals || []).filter((d: any) => d.close_date && d.close_date >= startDate && d.close_date <= endDate);
    const wonDeals = dealsClosedInPeriod.filter((d: any) => d.pipeline_stage?.is_closed_won);
    const lostDeals = dealsClosedInPeriod.filter((d: any) => d.pipeline_stage?.is_closed_lost);

    // Deals created in period
    const dealsCreatedInPeriod = (deals || []).filter((d: any) => d.created_at >= startDate && d.created_at <= endDate);

    // Currently open (not closed) deals for pipeline value
    const openDeals = (allOpenDeals || []).filter((d: any) => !d.pipeline_stage?.is_closed_won && !d.pipeline_stage?.is_closed_lost);

    // Identify unique sales reps who have activity
    const activeRepIds = new Set<string>();
    wonDeals.forEach((d: any) => d.owner?.id && activeRepIds.add(d.owner.id));
    lostDeals.forEach((d: any) => d.owner?.id && activeRepIds.add(d.owner.id));
    dealsCreatedInPeriod.forEach((d: any) => d.owner?.id && activeRepIds.add(d.owner.id));
    (contacts || []).forEach((c: any) => { if (c.owner_id) activeRepIds.add(c.owner_id); if (c.created_by) activeRepIds.add(c.created_by); });
    (meetings || []).forEach((m: any) => m.owner_id && activeRepIds.add(m.owner_id));

    const reps = (salesReps || []).filter((r: any) => activeRepIds.has(r.id));

    // ========== BUILD PER-REP SECTIONS ==========
    let repSectionsHtml = "";
    const csvLines: string[] = [
      "Section,Rep,Metric,Value",
    ];

    for (const rep of reps) {
      const repId = rep.id;
      const repName = rep.full_name || "Unknown";

      // --- Activity ---
      const repMeetings = (meetings || []).filter((m: any) => m.owner_id === repId);
      const meetingsNew = repMeetings.filter((m: any) => m.meeting_type === "new_contact").length;
      const meetingsExisting = repMeetings.filter((m: any) => m.meeting_type === "existing_client").length;
      const meetingsFollowUp = repMeetings.filter((m: any) => m.meeting_type === "follow_up").length;
      const totalMeetings = repMeetings.length;

      const repContacts = (contacts || []).filter((c: any) => c.created_by === repId || c.owner_id === repId);
      const newContacts = repContacts.length;

      // Leads by source
      const sourceMap: Record<string, number> = {};
      repContacts.forEach((c: any) => { const s = c.source || "unknown"; sourceMap[s] = (sourceMap[s] || 0) + 1; });

      // --- Pipeline value by stage ---
      const repOpenDeals = openDeals.filter((d: any) => d.owner?.id === repId);
      const stageMap: Record<string, { count: number; value: number; probability: number }> = {};
      repOpenDeals.forEach((d: any) => {
        const sn = d.pipeline_stage?.name || "Unknown";
        const prob = d.pipeline_stage?.default_probability || 0;
        const val = Number(d.contract_value) || Number(d.amount) || 0;
        if (!stageMap[sn]) stageMap[sn] = { count: 0, value: 0, probability: prob };
        stageMap[sn].count++;
        stageMap[sn].value += val;
      });
      const repPipelineValue = repOpenDeals.reduce((s: number, d: any) => s + (Number(d.contract_value) || Number(d.amount) || 0), 0);

      // --- Revenue ---
      const repWon = wonDeals.filter((d: any) => d.owner?.id === repId);
      const repLost = lostDeals.filter((d: any) => d.owner?.id === repId);
      const wonCount = repWon.length;
      const wonValue = repWon.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
      const lostCount = repLost.length;
      const lostValue = repLost.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
      const avgDealSize = wonCount > 0 ? wonValue / wonCount : 0;

      // Lost reason breakdown
      const lostReasonMap: Record<string, number> = {};
      repLost.forEach((d: any) => { const r = d.lost_reason || "Not specified"; lostReasonMap[r] = (lostReasonMap[r] || 0) + 1; });

      // Quotes sent vs accepted (deals reaching proposal stage)
      const repDealsCreated = dealsCreatedInPeriod.filter((d: any) => d.owner?.id === repId);
      const quotesSent = repDealsCreated.filter((d: any) => proposalStage && d.pipeline_stage?.stage_order >= proposalStage.stage_order).length;
      const quotesAccepted = repWon.length; // Closed won = accepted

      // --- Conversion rates ---
      const repDealsCount = repDealsCreated.length;
      const contactToMeeting = pct(totalMeetings, newContacts);
      const meetingToProposal = pct(quotesSent, totalMeetings);
      const proposalToClosed = pct(wonCount, quotesSent);
      const totalClosed = wonCount + lostCount;
      const winRate = pct(wonCount, totalClosed);

      // --- Deal velocity ---
      let avgVelocityDays = 0;
      if (closedWonStage && repWon.length > 0) {
        const velocities: number[] = [];
        for (const deal of repWon) {
          const history = (stageHistory || []).filter((h: any) => h.deal_id === deal.id);
          if (history.length > 0) {
            const firstEntry = history.reduce((min: any, h: any) => new Date(h.changed_at) < new Date(min.changed_at) ? h : min, history[0]);
            const closeEntry = history.find((h: any) => h.to_stage_id === closedWonStage.id);
            if (closeEntry) {
              const days = (new Date(closeEntry.changed_at).getTime() - new Date(firstEntry.changed_at).getTime()) / (1000 * 60 * 60 * 24);
              velocities.push(Math.max(0, days));
            }
          }
        }
        if (velocities.length > 0) avgVelocityDays = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      }

      // --- KPI targets ---
      const repTarget = (kpiTargets || []).find((t: any) => t.user_id === repId);

      // ========== BUILD HTML FOR THIS REP ==========
      let repHtml = `<div style="margin:24px 0;padding:20px;background:#fafbfc;border:1px solid #e2e8f0;border-radius:8px;">`;
      repHtml += `<h3 style="color:#0066cc;font-size:16px;margin:0 0 16px 0;">📊 ${repName}</h3>`;

      // Activity & Pipeline
      repHtml += `<h4 style="color:#333;font-size:14px;margin:12px 0 6px 0;">Activity & Pipeline</h4>`;
      repHtml += buildTable(
        ["Metric", "Value"],
        [
          ["Meetings Booked (Total)", `${totalMeetings}`],
          ["— New Contact", `${meetingsNew}`],
          ["— Existing Client", `${meetingsExisting}`],
          ["— Follow Up", `${meetingsFollowUp}`],
          ["New Contacts Added", `${newContacts}`],
          ["Pipeline Value (Open)", formatCurrency(repPipelineValue)],
        ]
      );

      // Leads by source
      if (Object.keys(sourceMap).length > 0) {
        repHtml += `<p style="font-size:13px;margin:8px 0 4px;"><strong>Leads by Source:</strong></p>`;
        repHtml += buildTable(["Source", "Count"], Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s.replace(/_/g, " "), `${c}`]));
      }

      // Pipeline by stage
      if (Object.keys(stageMap).length > 0) {
        repHtml += `<p style="font-size:13px;margin:8px 0 4px;"><strong>Pipeline by Stage:</strong></p>`;
        repHtml += buildTable(["Stage", "Deals", "Value"], Object.entries(stageMap).map(([sn, d]) => [sn, `${d.count}`, formatCurrency(d.value)]));
      }

      // Conversion rates
      repHtml += `<p style="font-size:13px;margin:8px 0 4px;"><strong>Conversion Rates:</strong></p>`;
      repHtml += buildTable(
        ["Funnel Step", "Rate"],
        [
          ["Contacts → Meetings", contactToMeeting],
          ["Meetings → Proposals", meetingToProposal],
          ["Proposals → Closed Won", proposalToClosed],
          ["Overall Win Rate", winRate],
        ]
      );

      // Revenue
      repHtml += `<h4 style="color:#333;font-size:14px;margin:16px 0 6px 0;">Revenue</h4>`;
      repHtml += buildTable(
        ["Metric", "Value"],
        [
          ["Closed/Won Deals", `${wonCount} (${formatCurrency(wonValue)})`],
          ["Closed/Lost Deals", `${lostCount} (${formatCurrency(lostValue)})`],
          ["Quotes Sent", `${quotesSent}`],
          ["Quotes Accepted (Won)", `${quotesAccepted}`],
          ["Average Deal Size", formatCurrency(avgDealSize)],
        ]
      );

      // Lost reasons
      if (Object.keys(lostReasonMap).length > 0) {
        repHtml += `<p style="font-size:13px;margin:8px 0 4px;"><strong>Loss Reasons:</strong></p>`;
        repHtml += buildTable(["Reason", "Count"], Object.entries(lostReasonMap).map(([r, c]) => [r, `${c}`]));
      }

      // KPI Scorecard
      repHtml += `<h4 style="color:#333;font-size:14px;margin:16px 0 6px 0;">KPI Scorecard</h4>`;
      repHtml += `<table style="border-collapse:collapse;width:100%;margin:8px 0;">`;
      repHtml += `<thead><tr><th style="padding:6px 12px;background:#f0f4f8;border:1px solid #ddd;text-align:left;font-size:13px;">KPI</th><th style="padding:6px 12px;background:#f0f4f8;border:1px solid #ddd;font-size:13px;">Actual</th><th style="padding:6px 12px;background:#f0f4f8;border:1px solid #ddd;font-size:13px;">Target</th><th style="padding:6px 12px;background:#f0f4f8;border:1px solid #ddd;font-size:13px;">Achievement</th></tr></thead><tbody>`;
      repHtml += buildKpiRow("Meetings", totalMeetings, repTarget?.target_meetings ?? null);
      repHtml += buildKpiRow("Proposals / Quotes", quotesSent, repTarget?.target_proposals ?? null);
      repHtml += buildKpiRow("Revenue", wonValue, repTarget?.target_revenue ?? null, "$");
      repHtml += buildKpiRow("New Contacts", newContacts, repTarget?.target_new_contacts ?? null);
      repHtml += `</tbody></table>`;

      // Deal velocity
      repHtml += `<p style="font-size:13px;margin:8px 0;"><strong>Deal Velocity:</strong> ${avgVelocityDays > 0 ? `${avgVelocityDays.toFixed(0)} days avg (lead to close)` : "Not enough data"}</p>`;

      // ===== ITEMIZED LISTS =====
      // Won Deals list
      if (repWon.length > 0) {
        repHtml += `<h4 style="color:#333;font-size:14px;margin:16px 0 6px 0;">Won Deals</h4>`;
        repHtml += buildTable(
          ["Deal Name", "Value", "Close Date"],
          repWon.map((d: any) => [
            d.name || "Unnamed Deal",
            formatCurrency(Number(d.amount) || 0),
            d.close_date ? new Date(d.close_date).toLocaleDateString("en-AU") : "—",
          ])
        );
      }

      // Lost Deals list
      if (repLost.length > 0) {
        repHtml += `<h4 style="color:#333;font-size:14px;margin:16px 0 6px 0;">Lost Deals</h4>`;
        repHtml += buildTable(
          ["Deal Name", "Value", "Reason"],
          repLost.map((d: any) => [
            d.name || "Unnamed Deal",
            formatCurrency(Number(d.amount) || 0),
            d.lost_reason || "Not specified",
          ])
        );
      }

      // Meetings list
      if (repMeetings.length > 0) {
        repHtml += `<h4 style="color:#333;font-size:14px;margin:16px 0 6px 0;">Meetings</h4>`;
        repHtml += buildTable(
          ["Title", "Date", "Type"],
          repMeetings.map((m: any) => [
            m.title || "Untitled Meeting",
            m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-AU") : "—",
            (m.meeting_type || "").replace(/_/g, " "),
          ])
        );
      }

      repHtml += `</div>`;
      repSectionsHtml += repHtml;

      // CSV rows
      csvLines.push(`Activity,${escapeCsv(repName)},Meetings Booked,${totalMeetings}`);
      csvLines.push(`Activity,${escapeCsv(repName)},Meetings - New Contact,${meetingsNew}`);
      csvLines.push(`Activity,${escapeCsv(repName)},Meetings - Existing Client,${meetingsExisting}`);
      csvLines.push(`Activity,${escapeCsv(repName)},Meetings - Follow Up,${meetingsFollowUp}`);
      csvLines.push(`Activity,${escapeCsv(repName)},New Contacts Added,${newContacts}`);
      csvLines.push(`Activity,${escapeCsv(repName)},Pipeline Value,${repPipelineValue}`);
      Object.entries(sourceMap).forEach(([s, c]) => csvLines.push(`Leads by Source,${escapeCsv(repName)},${escapeCsv(s)},${c}`));
      csvLines.push(`Revenue,${escapeCsv(repName)},Won Deals Count,${wonCount}`);
      csvLines.push(`Revenue,${escapeCsv(repName)},Won Deals Value,${wonValue}`);
      csvLines.push(`Revenue,${escapeCsv(repName)},Lost Deals Count,${lostCount}`);
      csvLines.push(`Revenue,${escapeCsv(repName)},Lost Deals Value,${lostValue}`);
      csvLines.push(`Revenue,${escapeCsv(repName)},Quotes Sent,${quotesSent}`);
      csvLines.push(`Revenue,${escapeCsv(repName)},Quotes Accepted,${quotesAccepted}`);
      csvLines.push(`Revenue,${escapeCsv(repName)},Avg Deal Size,${avgDealSize}`);
      csvLines.push(`KPI,${escapeCsv(repName)},Deal Velocity Days,${avgVelocityDays.toFixed(0)}`);
    }

    // ========== TEAM TOTALS ==========
    const totalWonValue = wonDeals.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
    const totalLostValue = lostDeals.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
    const totalPipelineValue = openDeals.reduce((s: number, d: any) => s + (Number(d.contract_value) || Number(d.amount) || 0), 0);
    const totalMeetingsAll = (meetings || []).length;
    const totalContactsAll = (contacts || []).length;
    const totalClosedAll = wonDeals.length + lostDeals.length;

    const summaryHtml = buildTable(
      ["Metric", "Value"],
      [
        ["Total Revenue (Won)", formatCurrency(totalWonValue)],
        ["Deals Won", `${wonDeals.length}`],
        ["Deals Lost", `${lostDeals.length} (${formatCurrency(totalLostValue)})`],
        ["Win Rate", pct(wonDeals.length, totalClosedAll)],
        ["Average Deal Size", formatCurrency(wonDeals.length > 0 ? totalWonValue / wonDeals.length : 0)],
        ["Total Pipeline Value (Open)", formatCurrency(totalPipelineValue)],
        ["Total Meetings", `${totalMeetingsAll}`],
        ["Total New Contacts", `${totalContactsAll}`],
      ]
    );

    // ========== COMPOSE EMAIL ==========
    const emailHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:800px;margin:0 auto;color:#333;">
        <div style="background:#0066cc;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">📈 Monthly CRM Report — ${monthYear}</h1>
        </div>
        <div style="padding:24px;background:#fff;">
          <p>Hi Team,</p>
          <p>Here is the CRM performance report for <strong>${monthYear}</strong>.</p>
          
          ${buildSection("Team Summary", summaryHtml)}
          
          <h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin:28px 0 12px;">Per Sales Rep Breakdown</h2>
          ${repSectionsHtml || "<p>No sales activity recorded for this period.</p>"}
          
          <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
          <p style="font-size:12px;color:#999;">This report was auto-generated. A detailed CSV is attached.</p>
        </div>
      </div>
    `;

    const csvContent = csvLines.join("\n");
    const monthSlug = monthYear.toLowerCase().replace(" ", "-");

    // ========== SEND EMAIL ==========
    console.log("Sending report to Belinda and Jason");
    const { error: emailError } = await resend.emails.send({
      from: "CRM Reports <crm@comansservices.com.au>",
      to: ["Belinda.Comeau@comansservices.com.au", "jason.comeau@comansservices.com.au"],
      subject: `Monthly CRM Report — ${monthYear}`,
      html: emailHtml,
      attachments: [
        {
          filename: `crm-monthly-report-${monthSlug}.csv`,
          content: base64Encode(new TextEncoder().encode(csvContent)),
        },
      ],
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
    }

    console.log("Successfully sent monthly CRM report");
    return new Response(JSON.stringify({ success: true, reportPeriod: monthYear, repsIncluded: reps.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-monthly-crm-report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
