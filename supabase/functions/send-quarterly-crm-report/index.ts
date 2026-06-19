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

function pct(num: number, den: number): string {
  return den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "0.0%";
}

function getAESTDate(): { day: number; month: number; year: number; dayOfWeek: number } {
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
  const aestDate = new Date(Date.UTC(year, month, day));
  return { day, month, year, dayOfWeek: aestDate.getUTCDay() };
}

function isLastWeekdayOfMonth(day: number, month: number, year: number, dayOfWeek: number): boolean {
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Check if remaining days in month are all weekend
  for (let d = day + 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(year, month, d)).getUTCDay();
    if (dow !== 0 && dow !== 6) return false; // Another weekday exists after today
  }
  return true;
}

// Australian FY quarters end in: Sep (month 8), Dec (month 11), Mar (month 2), Jun (month 5)
const QUARTER_END_MONTHS = [8, 11, 2, 5]; // 0-indexed

function getFinancialYear(month: number, year: number): string {
  // month is 1-indexed here
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function getQuarterDateRange(month0: number, year: number): { startDate: string; endDate: string; quarterLabel: string; months: { month: number; year: number }[] } {
  // month0 is 0-indexed end month of the quarter
  const endDate = new Date(year, month0 + 1, 0); // Last day of end month
  const startMonth0 = month0 - 2; // 3 months back
  let startYear = year;
  let sm = startMonth0;
  if (sm < 0) { sm += 12; startYear--; }
  const startDate = new Date(startYear, sm, 1);

  const months: { month: number; year: number }[] = [];
  for (let i = 0; i < 3; i++) {
    let m = sm + i;
    let y = startYear;
    if (m > 11) { m -= 12; y++; }
    months.push({ month: m + 1, year: y }); // 1-indexed month
  }

  const startLabel = startDate.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
  const endLabel = endDate.toLocaleDateString("en-AU", { month: "short", year: "numeric" });

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: `${endDate.toISOString().split("T")[0]}T23:59:59`,
    quarterLabel: `${startLabel} – ${endLabel}`,
    months,
  };
}

function buildTable(headers: string[], rows: string[][]): string {
  const hdr = headers.map(h => `<th style="padding:8px 12px;background:#f0f4f8;border:1px solid #ddd;text-align:left;font-size:13px;">${h}</th>`).join("");
  const body = rows.map(r => `<tr>${r.map(c => `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${c}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0;"><thead><tr>${hdr}</tr></thead><tbody>${body}</tbody></table>`;
}

// ==================== COMMISSION TIERS ====================
const COMMISSION_TIERS = [
  { min: 0, max: 50000, rate: 0.05, label: "Up to $50,000 (5%)" },
  { min: 50001, max: 150000, rate: 0.07, label: "$50,001 – $150,000 (7%)" },
  { min: 150001, max: Infinity, rate: 0.10, label: "Above $150,000 (10%)" },
];

function calculateCommission(revenue: number): { tier: string; commission: number; rate: number } {
  let commission = 0;
  let tierLabel = "";
  let appliedRate = 0;
  for (const tier of COMMISSION_TIERS) {
    if (revenue >= tier.min) {
      const taxable = Math.min(revenue, tier.max) - tier.min + 1;
      commission += taxable * tier.rate;
      tierLabel = tier.label;
      appliedRate = tier.rate;
    }
  }
  // Simplified: use highest tier reached
  return { tier: tierLabel, commission, rate: appliedRate };
}

// ==================== HANDLER ====================
const handler = async (req: Request): Promise<Response> => {
  console.log("send-quarterly-crm-report function invoked");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let forceRun = false;
    try { const body = await req.json(); forceRun = body.forceRun === true; } catch { /* no body */ }

    // Check if today is the last weekday of a quarter-end month
    const aest = getAESTDate();
    const isQuarterEnd = QUARTER_END_MONTHS.includes(aest.month);
    const isLastWeekday = isLastWeekdayOfMonth(aest.day, aest.month, aest.year, aest.dayOfWeek);

    if (!forceRun && (!isQuarterEnd || !isLastWeekday)) {
      console.log(`Not a quarter-end last weekday (month=${aest.month}, day=${aest.day}, dow=${aest.dayOfWeek}). Skipping.`);
      return new Response(JSON.stringify({ skipped: true, reason: "Not quarter-end last weekday" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { startDate, endDate, quarterLabel, months } = getQuarterDateRange(aest.month, aest.year);
    const fy = getFinancialYear(months[0].month, months[0].year);
    console.log(`Generating quarterly report: ${quarterLabel}, FY ${fy}`);

    // ========== FETCH ALL DATA ==========
    const [
      { data: salesReps },
      { data: deals },
      { data: contacts },
      { data: meetings },
      { data: stages },
      { data: stageHistory },
      { data: customers },
      { data: allOpenDeals },
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("is_active", true),
      supabase.from("deals").select(`
        id, name, amount, contract_value, close_date, created_at, lost_reason, source, owner_id,
        owner:owner_id(id, full_name),
        account:account_id(id, name, converted_to_customer_id),
        pipeline_stage:pipeline_stage_id(id, name, is_closed_won, is_closed_lost, default_probability, stage_order)
      `),
      supabase.from("contacts").select("id, source, created_by, owner_id, created_at").gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("crm_meetings").select("id, title, meeting_type, owner_id, status, meeting_date").gte("meeting_date", startDate).lte("meeting_date", endDate),
      supabase.from("pipeline_stages").select("id, name, stage_order, is_closed_won, is_closed_lost, default_probability").eq("is_active", true).order("stage_order"),
      supabase.from("deal_stage_history").select("deal_id, from_stage_id, to_stage_id, changed_at"),
      supabase.from("customers").select("id, name, created_at, is_active"),
      supabase.from("deals").select(`
        id, amount, contract_value, owner_id,
        owner:owner_id(id, full_name),
        pipeline_stage:pipeline_stage_id(id, name, is_closed_won, is_closed_lost, default_probability, stage_order)
      `),
    ]);

    // KPI targets - query separately as table may not exist yet
    let kpiTargets: any[] = [];
    try {
      const { data, error } = await supabase.from("sales_kpi_targets").select("*").eq("financial_year", fy);
      if (!error && data) kpiTargets = data;
    } catch { /* table may not exist */ }

    const closedWonStage = stages?.find((s: any) => s.is_closed_won);
    const proposalStage = stages?.find((s: any) => s.name.toLowerCase().includes("proposal") || s.name.toLowerCase().includes("quote"));

    // Filter deals
    const dealsClosedInQuarter = (deals || []).filter((d: any) => d.close_date && d.close_date >= startDate && d.close_date <= endDate);
    const wonDeals = dealsClosedInQuarter.filter((d: any) => d.pipeline_stage?.is_closed_won);
    const lostDeals = dealsClosedInQuarter.filter((d: any) => d.pipeline_stage?.is_closed_lost);
    const dealsCreatedInQuarter = (deals || []).filter((d: any) => d.created_at >= startDate && d.created_at <= endDate);
    const openDeals = (allOpenDeals || []).filter((d: any) => !d.pipeline_stage?.is_closed_won && !d.pipeline_stage?.is_closed_lost);

    // Active rep IDs
    const activeRepIds = new Set<string>();
    wonDeals.forEach((d: any) => d.owner?.id && activeRepIds.add(d.owner.id));
    lostDeals.forEach((d: any) => d.owner?.id && activeRepIds.add(d.owner.id));
    dealsCreatedInQuarter.forEach((d: any) => d.owner?.id && activeRepIds.add(d.owner.id));
    (contacts || []).forEach((c: any) => { if (c.owner_id) activeRepIds.add(c.owner_id); if (c.created_by) activeRepIds.add(c.created_by); });
    (meetings || []).forEach((m: any) => m.owner_id && activeRepIds.add(m.owner_id));
    const reps = (salesReps || []).filter((r: any) => activeRepIds.has(r.id));

    // ========== HELPER: get metrics for a specific month ==========
    function getMonthMetrics(m: number, y: number) {
      const ms = `${y}-${String(m).padStart(2, "0")}`;
      const mStart = `${ms}-01`;
      const mEnd = `${ms}-${new Date(y, m, 0).getDate()}T23:59:59`;
      const mWon = wonDeals.filter((d: any) => d.close_date >= mStart && d.close_date <= mEnd);
      const mLost = lostDeals.filter((d: any) => d.close_date >= mStart && d.close_date <= mEnd);
      const mMeetings = (meetings || []).filter((m2: any) => m2.meeting_date >= mStart && m2.meeting_date <= mEnd);
      const mContacts = (contacts || []).filter((c: any) => c.created_at >= mStart && c.created_at <= mEnd);
      const revenue = mWon.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
      const totalClosed = mWon.length + mLost.length;
      return {
        label: new Date(y, m - 1).toLocaleDateString("en-AU", { month: "short", year: "numeric" }),
        wonCount: mWon.length, lostCount: mLost.length, revenue,
        winRate: totalClosed > 0 ? (mWon.length / totalClosed) * 100 : 0,
        avgDealSize: mWon.length > 0 ? revenue / mWon.length : 0,
        meetings: mMeetings.length, contacts: mContacts.length,
      };
    }

    const monthlyMetrics = months.map(m => getMonthMetrics(m.month, m.year));

    // ========== TEAM QUARTERLY TOTALS ==========
    const totalWonValue = wonDeals.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
    const totalLostValue = lostDeals.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
    const totalPipelineValue = openDeals.reduce((s: number, d: any) => s + (Number(d.contract_value) || Number(d.amount) || 0), 0);
    const totalClosed = wonDeals.length + lostDeals.length;

    // ========== CLIENT HEALTH ==========
    const newCustomers = (customers || []).filter((c: any) => c.created_at >= startDate && c.created_at <= endDate);
    // Upsell: existing customers (created before quarter) with new won deals this quarter
    const existingCustomerIds = new Set((customers || []).filter((c: any) => c.created_at < startDate).map((c: any) => c.id));
    const upsoldCustomerIds = new Set<string>();
    wonDeals.forEach((d: any) => {
      const custId = d.account?.converted_to_customer_id;
      if (custId && existingCustomerIds.has(custId)) upsoldCustomerIds.add(custId);
    });
    // Churned: customers with all deals closed_lost and no active deals
    const customerDealMap: Record<string, { hasActive: boolean; hasLost: boolean }> = {};
    (deals || []).forEach((d: any) => {
      const custId = d.account?.converted_to_customer_id;
      if (!custId) return;
      if (!customerDealMap[custId]) customerDealMap[custId] = { hasActive: false, hasLost: false };
      if (d.pipeline_stage?.is_closed_lost) customerDealMap[custId].hasLost = true;
      else if (!d.pipeline_stage?.is_closed_won) customerDealMap[custId].hasActive = true;
    });
    const churnedCustomers = Object.entries(customerDealMap).filter(([_, v]) => v.hasLost && !v.hasActive);

    // ========== FORECAST VS ACTUAL ==========
    // Weighted pipeline at quarter start: deals that were open at startDate
    const dealsOpenAtStart = (deals || []).filter((d: any) => {
      if (!d.created_at || d.created_at > startDate) return false;
      if (d.close_date && d.close_date < startDate) return false;
      return true;
    });
    const forecastAtStart = dealsOpenAtStart.reduce((s: number, d: any) => {
      const val = Number(d.contract_value) || Number(d.amount) || 0;
      const prob = d.pipeline_stage?.default_probability || 0;
      return s + val * (prob / 100);
    }, 0);
    const forecastAccuracy = forecastAtStart > 0 ? ((totalWonValue / forecastAtStart) * 100).toFixed(0) : "N/A";

    // ========== PIPELINE COVERAGE RATIO ==========
    const quarterlyTargetRevenue = (kpiTargets || []).reduce((s: number, t: any) => s + (Number(t.target_revenue) || 0), 0);
    const coverageRatio = quarterlyTargetRevenue > 0 ? (totalPipelineValue / quarterlyTargetRevenue).toFixed(1) : "N/A";

    // ========== BUILD PER-REP COMMISSION SECTION ==========
    let commissionHtml = "";
    let repItemizedSections = "";
    const csvLines: string[] = ["Section,Rep,Metric,Value"];

    for (const rep of reps) {
      const repId = rep.id;
      const repName = rep.full_name || "Unknown";
      const repWon = wonDeals.filter((d: any) => d.owner?.id === repId);
      const repRevenue = repWon.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
      const { tier, commission } = calculateCommission(repRevenue);
      const repLost = lostDeals.filter((d: any) => d.owner?.id === repId);
      const repMeetings = (meetings || []).filter((m: any) => m.owner_id === repId);

      commissionHtml += `<tr>
        <td style="padding:7px 12px;border:1px solid #ddd;">${repName}</td>
        <td style="padding:7px 12px;border:1px solid #ddd;">${formatCurrency(repRevenue)}</td>
        <td style="padding:7px 12px;border:1px solid #ddd;">${tier || "—"}</td>
        <td style="padding:7px 12px;border:1px solid #ddd;">$0</td>
        <td style="padding:7px 12px;border:1px solid #ddd;font-weight:600;">${formatCurrency(commission)}</td>
      </tr>`;

      // ===== ITEMIZED LISTS PER REP =====
      let repDetailHtml = "";

      if (repWon.length > 0) {
        repDetailHtml += `<p style="font-size:13px;margin:8px 0 4px;"><strong>Won Deals:</strong></p>`;
        repDetailHtml += buildTable(
          ["Deal Name", "Value", "Close Date"],
          repWon.map((d: any) => [
            d.name || "Unnamed Deal",
            formatCurrency(Number(d.amount) || 0),
            d.close_date ? new Date(d.close_date).toLocaleDateString("en-AU") : "—",
          ])
        );
      }

      if (repLost.length > 0) {
        repDetailHtml += `<p style="font-size:13px;margin:8px 0 4px;"><strong>Lost Deals:</strong></p>`;
        repDetailHtml += buildTable(
          ["Deal Name", "Value", "Reason"],
          repLost.map((d: any) => [
            d.name || "Unnamed Deal",
            formatCurrency(Number(d.amount) || 0),
            d.lost_reason || "Not specified",
          ])
        );
      }

      if (repMeetings.length > 0) {
        repDetailHtml += `<p style="font-size:13px;margin:8px 0 4px;"><strong>Meetings:</strong></p>`;
        repDetailHtml += buildTable(
          ["Title", "Date", "Type"],
          repMeetings.map((m: any) => [
            m.title || "Untitled Meeting",
            m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-AU") : "—",
            (m.meeting_type || "").replace(/_/g, " "),
          ])
        );
      }

      if (repDetailHtml) {
        repItemizedSections += `<div style="margin:12px 0 20px 0;padding:12px;background:#fafbfc;border:1px solid #e2e8f0;border-radius:6px;">`;
        repItemizedSections += `<h4 style="color:#0066cc;font-size:14px;margin:0 0 8px 0;">📋 ${repName} — Deal & Meeting Details</h4>`;
        repItemizedSections += repDetailHtml;
        repItemizedSections += `</div>`;
      }

      csvLines.push(`Commission,${escapeCsv(repName)},Qualified Revenue,${repRevenue}`);
      csvLines.push(`Commission,${escapeCsv(repName)},Commission Payable,${commission.toFixed(2)}`);

      // Per-rep monthly breakdown for CSV
      for (const mm of months) {
        const ms = `${mm.year}-${String(mm.month).padStart(2, "0")}`;
        const mStart = `${ms}-01`;
        const mEnd = `${ms}-${new Date(mm.year, mm.month, 0).getDate()}T23:59:59`;
        const mRepWon = repWon.filter((d: any) => d.close_date >= mStart && d.close_date <= mEnd);
        const mRepMeetings = (meetings || []).filter((m2: any) => m2.owner_id === repId && m2.meeting_date >= mStart && m2.meeting_date <= mEnd);
        csvLines.push(`Monthly,${escapeCsv(repName)},${ms} Won Deals,${mRepWon.length}`);
        csvLines.push(`Monthly,${escapeCsv(repName)},${ms} Revenue,${mRepWon.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0)}`);
        csvLines.push(`Monthly,${escapeCsv(repName)},${ms} Meetings,${mRepMeetings.length}`);
      }
    }

    // ========== BUILD EMAIL HTML ==========
    const emailHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:850px;margin:0 auto;color:#333;">
        <div style="background:linear-gradient(135deg,#0066cc,#004999);padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">📊 Quarterly CRM Report — ${quarterLabel}</h1>
          <p style="color:#cce0ff;margin:6px 0 0;font-size:14px;">Financial Year ${fy}</p>
        </div>
        <div style="padding:24px;background:#fff;">
          <p>Hi Team,</p>
          <p>Here is the quarterly CRM performance report for <strong>${quarterLabel}</strong>.</p>

          <!-- TEAM SUMMARY -->
          <h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin:24px 0 12px;">Team Summary</h2>
          ${buildTable(["Metric", "Value"], [
            ["Total Revenue (Won)", formatCurrency(totalWonValue)],
            ["Deals Won", `${wonDeals.length}`],
            ["Deals Lost", `${lostDeals.length} (${formatCurrency(totalLostValue)})`],
            ["Win Rate", pct(wonDeals.length, totalClosed)],
            ["Average Deal Size", formatCurrency(wonDeals.length > 0 ? totalWonValue / wonDeals.length : 0)],
            ["Total Pipeline Value (Open)", formatCurrency(totalPipelineValue)],
          ])}

          <!-- COMMISSION CALCULATION -->
          <h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin:28px 0 12px;">Commission Calculation</h2>
          <table style="border-collapse:collapse;width:100%;margin:8px 0;">
            <thead><tr>
              <th style="padding:8px 12px;background:#f0f4f8;border:1px solid #ddd;text-align:left;font-size:13px;">Rep</th>
              <th style="padding:8px 12px;background:#f0f4f8;border:1px solid #ddd;font-size:13px;">Qualified Revenue</th>
              <th style="padding:8px 12px;background:#f0f4f8;border:1px solid #ddd;font-size:13px;">Tier Reached</th>
              <th style="padding:8px 12px;background:#f0f4f8;border:1px solid #ddd;font-size:13px;">Deductions</th>
              <th style="padding:8px 12px;background:#f0f4f8;border:1px solid #ddd;font-size:13px;">Net Commission</th>
            </tr></thead>
            <tbody>${commissionHtml || "<tr><td colspan='5' style='padding:12px;text-align:center;color:#999;'>No commission data</td></tr>"}</tbody>
          </table>
          <p style="font-size:12px;color:#666;margin:4px 0;">* Deductions column is a placeholder for deals that fell through post-invoice. Update manually before payroll sign-off.</p>

          <!-- PER-REP DEAL & MEETING DETAILS -->
          ${repItemizedSections ? `<h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin:28px 0 12px;">Per Rep — Deal & Meeting Details</h2>${repItemizedSections}` : ""}

          <!-- PERFORMANCE TRENDS -->
          <h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin:28px 0 12px;">Performance Trends (Month-by-Month)</h2>
          ${buildTable(
            ["Month", "Deals Won", "Revenue", "Win Rate", "Avg Deal Size", "Meetings", "New Contacts"],
            monthlyMetrics.map(m => [m.label, `${m.wonCount}`, formatCurrency(m.revenue), `${m.winRate.toFixed(1)}%`, formatCurrency(m.avgDealSize), `${m.meetings}`, `${m.contacts}`])
          )}
          <p style="font-size:13px;margin:8px 0;"><strong>Pipeline Coverage Ratio:</strong> ${coverageRatio}x ${typeof coverageRatio === "string" && coverageRatio !== "N/A" ? (parseFloat(coverageRatio) >= 3 ? "✅ Healthy" : "⚠️ Below 3x target") : "(no quarterly target set)"}</p>

          <!-- CLIENT HEALTH -->
          <h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin:28px 0 12px;">Client Health</h2>
          ${buildTable(["Metric", "Value"], [
            ["New Clients Acquired", `${newCustomers.length}`],
            ["Existing Clients Upsold/Renewed", `${upsoldCustomerIds.size}`],
            ["Lost/Churned Clients", `${churnedCustomers.length}`],
          ])}
          ${newCustomers.length > 0 ? `<p style="font-size:13px;margin:4px 0;"><strong>New clients:</strong> ${newCustomers.map((c: any) => c.name).join(", ")}</p>` : ""}

          <!-- FORECAST VS ACTUAL -->
          <h2 style="color:#1a1a2e;font-size:18px;border-bottom:2px solid #0066cc;padding-bottom:6px;margin:28px 0 12px;">Forecast vs Actual</h2>
          ${buildTable(["Metric", "Value"], [
            ["Weighted Pipeline Forecast (Quarter Start)", formatCurrency(forecastAtStart)],
            ["Actual Closed Revenue", formatCurrency(totalWonValue)],
            ["Forecast Accuracy", `${forecastAccuracy}%`],
          ])}
          <p style="font-size:12px;color:#666;">Forecast accuracy = Actual Revenue ÷ Weighted Forecast at quarter start. &gt;100% = exceeded forecast.</p>

          <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
          <p style="font-size:12px;color:#999;">This report was auto-generated. A detailed CSV is attached. Commission figures require sign-off before payroll processing.</p>
        </div>
      </div>
    `;

    // Add summary CSV rows
    csvLines.push(`Summary,,Total Won Revenue,${totalWonValue}`);
    csvLines.push(`Summary,,Deals Won,${wonDeals.length}`);
    csvLines.push(`Summary,,Deals Lost,${lostDeals.length}`);
    csvLines.push(`Summary,,Win Rate,${pct(wonDeals.length, totalClosed)}`);
    csvLines.push(`Summary,,Pipeline Value,${totalPipelineValue}`);
    csvLines.push(`Summary,,Forecast at Start,${forecastAtStart}`);
    csvLines.push(`Summary,,Forecast Accuracy,${forecastAccuracy}%`);
    csvLines.push(`Client Health,,New Clients,${newCustomers.length}`);
    csvLines.push(`Client Health,,Upsold Clients,${upsoldCustomerIds.size}`);
    csvLines.push(`Client Health,,Churned Clients,${churnedCustomers.length}`);

    const csvContent = csvLines.join("\n");
    const qSlug = quarterLabel.toLowerCase().replace(/\s/g, "-").replace(/–/g, "to");

    // ========== SEND EMAIL ==========
    console.log("Sending quarterly report to Belinda and Jason");
    const { error: emailError } = await resend.emails.send({
      from: "CRM Reports <crm@comansservices.com.au>",
      to: ["Belinda.Comeau@comansservices.com.au", "jason.comeau@comansservices.com.au"],
      subject: `Quarterly CRM Report — ${quarterLabel} (FY ${fy})`,
      html: emailHtml,
      attachments: [
        {
          filename: `crm-quarterly-report-${qSlug}.csv`,
          content: base64Encode(new TextEncoder().encode(csvContent)),
        },
      ],
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
    }

    console.log("Successfully sent quarterly CRM report");
    return new Response(JSON.stringify({ success: true, quarterLabel, fy, repsIncluded: reps.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-quarterly-crm-report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
