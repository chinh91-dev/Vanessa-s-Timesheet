import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY_LOCATION"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationStatusRequest {
  testMode?: boolean;
}

interface EmployeeLocationStatus {
  user_id: string;
  user_name: string;
  email: string;
  organization: string;
  planned_location: string | null;
  actual_location: string | null;
  has_checked_in: boolean;
  check_in_time: string | null;
  location_changed: boolean;
  is_late_checkin: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting location status report generation...");
    
    // Check if RESEND_API_KEY_LOCATION is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY_LOCATION");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY_LOCATION environment variable is not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    console.log("RESEND_API_KEY_LOCATION is available");
    
    const { testMode = false }: LocationStatusRequest = await req.json().catch(() => ({}));
    
    // Use Australian timezone for the current date
    const australianDate = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Australia/Melbourne'
    });
    
    // Fetch all active employees - already filtering for active users
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, organization')
      .eq('is_active', true)  // CRITICAL: Only include active users
      .not('email', 'is', null)
      .neq('full_name', 'Test User');

    if (employeesError) {
      console.error("Error fetching employees:", employeesError);
      throw new Error(`Failed to fetch employees: ${employeesError.message}`);
    }

    console.log(`Found ${employees?.length || 0} active employees`);

    // Get location status for each employee
    const employeeStatuses: EmployeeLocationStatus[] = [];
    
    for (const employee of employees || []) {
      try {
        const { data: statusData, error: statusError } = await supabase
          .rpc('get_daily_location_status', {
            p_user_id: employee.id,
            p_date: australianDate
          });

        if (statusError) {
          console.error(`Error getting status for ${employee.full_name}:`, statusError);
          continue;
        }

        const status = statusData?.[0];
        employeeStatuses.push({
          user_id: employee.id,
          user_name: employee.full_name || employee.email || 'Unknown User',
          email: employee.email,
          organization: employee.organization || 'Unknown',
          planned_location: status?.planned_location || null,
          actual_location: status?.actual_location || null,
          has_checked_in: status?.has_checked_in || false,
          check_in_time: status?.check_in_time || null,
          location_changed: status?.location_changed || false,
          is_late_checkin: status?.is_late_checkin || false,
        });
      } catch (error) {
        console.error(`Error processing employee ${employee.full_name}:`, error);
      }
    }

    // Categorize employees
    const confirmed = employeeStatuses.filter(emp => emp.has_checked_in && emp.planned_location);
    const notConfirmed = employeeStatuses.filter(emp => !emp.has_checked_in && emp.planned_location);
    const noSchedule = employeeStatuses.filter(emp => !emp.planned_location);

    console.log(`Status summary: ${confirmed.length} confirmed, ${notConfirmed.length} not confirmed, ${noSchedule.length} not scheduled`);

    // Generate email content
    const emailHtml = generateStatusReportEmail(confirmed, notConfirmed, noSchedule, australianDate);

    // Send email to HR and management
    const recipients = testMode 
      ? ['test@example.com'] 
      : ['hr-payroll@comansservices.com.au', 'jason.comeau@comansservices.com.au'];

    console.log(`Sending email to recipients: ${recipients.join(', ')}`);

    const emailResponse = await resend.emails.send({
      from: "Location Reports <timesheet@comansservices.com.au>",
      to: recipients,
      subject: `📍 Daily Location Status Report - ${new Date(australianDate + 'T12:00:00').toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Australia/Melbourne'
      })}`,
      html: emailHtml,
    });

    console.log("Location status report sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_employees: employeeStatuses.length,
        confirmed: confirmed.length,
        not_confirmed: notConfirmed.length,
        no_schedule: noSchedule.length
      },
      email_response: emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in location status report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getLocationDisplayName(location: string): string {
  const locationMap: { [key: string]: string } = {
    'jolimont': 'Jolimont Office',
    'home': 'Working from Home',
    'client_site': 'Client Site',
    'other': 'Other Location'
  };
  
  return locationMap[location] || location.charAt(0).toUpperCase() + location.slice(1);
}

function generateStatusReportEmail(
  confirmed: EmployeeLocationStatus[], 
  notConfirmed: EmployeeLocationStatus[], 
  noSchedule: EmployeeLocationStatus[],
  date: string
): string {
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const totalEmployees = confirmed.length + notConfirmed.length + noSchedule.length;
  const confirmationRate = totalEmployees > 0 ? Math.round((confirmed.length / (confirmed.length + notConfirmed.length)) * 100) : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Location Status Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
        .stats { display: flex; justify-content: space-around; padding: 20px; background: #f1f5f9; }
        .stat { text-align: center; }
        .stat-number { font-size: 24px; font-weight: 700; color: #1e40af; }
        .stat-label { font-size: 14px; color: #64748b; margin-top: 4px; }
        .section { margin: 20px; }
        .section-header { display: flex; align-items: center; gap: 10px; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .section-header.confirmed { background: #dcfce7; border-left: 4px solid #16a34a; }
        .section-header.pending { background: #fef3c7; border-left: 4px solid #d97706; }
        .section-header.no-schedule { background: #f1f5f9; border-left: 4px solid #64748b; }
        .section-title { font-size: 18px; font-weight: 600; margin: 0; }
        .employee-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .employee-table th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
        .employee-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .employee-table tr:hover { background: #f9fafb; }
        .location-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .location-jolimont { background: #dbeafe; color: #1e40af; }
        .location-home { background: #d1fae5; color: #059669; }
        .location-client { background: #fde68a; color: #d97706; }
        .location-other { background: #e2e8f0; color: #475569; }
        .time-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        .time-normal { background: #dcfce7; color: #16a34a; }
        .time-late { background: #fee2e2; color: #dc2626; }
        .location-changed { color: #d97706; font-weight: 500; }
        .footer { padding: 20px; background: #f8fafc; border-top: 1px solid #e5e7eb; text-align: center; color: #64748b; font-size: 14px; }
        .no-data { text-align: center; padding: 30px; color: #64748b; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📍 Daily Location Status Report</h1>
          <p>${new Date(date + 'T12:00:00').toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Australia/Melbourne'
          })}</p>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-number">${totalEmployees}</div>
            <div class="stat-label">Total Employees</div>
          </div>
          <div class="stat">
            <div class="stat-number">${confirmed.length}</div>
            <div class="stat-label">Confirmed</div>
          </div>
          <div class="stat">
            <div class="stat-number">${notConfirmed.length}</div>
            <div class="stat-label">Pending</div>
          </div>
          <div class="stat">
            <div class="stat-number">${confirmationRate}%</div>
            <div class="stat-label">Confirmation Rate</div>
          </div>
        </div>

        <div class="section">
          <div class="section-header confirmed">
            <div class="section-title">✅ Confirmed Locations (${confirmed.length})</div>
          </div>
          ${confirmed.length > 0 ? `
            <table class="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Location</th>
                  <th>Check-in Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${confirmed.map(emp => `
                  <tr>
                    <td>
                      <strong>${emp.user_name}</strong>
                      <br><small style="color: #64748b;">${emp.organization}</small>
                    </td>
                    <td>
                      <span class="location-badge location-${emp.actual_location?.replace('_', '-') || 'other'}">
                        ${getLocationDisplayName(emp.actual_location || '')}
                      </span>
                      ${emp.location_changed ? '<br><span class="location-changed">📍 Location Changed</span>' : ''}
                    </td>
                    <td>
                      <span class="time-badge ${emp.is_late_checkin ? 'time-late' : 'time-normal'}">
                        ${formatTime(emp.check_in_time)}
                        ${emp.is_late_checkin ? ' (Late)' : ''}
                      </span>
                    </td>
                    <td>✅ Confirmed</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">🎉 No employees have confirmed their location yet today.</div>'}
        </div>

        <div class="section">
          <div class="section-header pending">
            <div class="section-title">⚠️ Pending Confirmations (${notConfirmed.length})</div>
          </div>
          ${notConfirmed.length > 0 ? `
            <table class="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Planned Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${notConfirmed.map(emp => `
                  <tr>
                    <td>
                      <strong>${emp.user_name}</strong>
                      <br><small style="color: #64748b;">${emp.organization}</small>
                    </td>
                    <td>
                      <span class="location-badge location-${emp.planned_location?.replace('_', '-') || 'other'}">
                        ${getLocationDisplayName(emp.planned_location || '')}
                      </span>
                    </td>
                    <td>⏳ Awaiting Confirmation</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">🎉 All scheduled employees have confirmed their locations!</div>'}
        </div>

        <div class="section">
          <div class="section-header no-schedule">
            <div class="section-title">📝 Not Scheduled Today (${noSchedule.length})</div>
          </div>
          ${noSchedule.length > 0 ? `
            <table class="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${noSchedule.map(emp => `
                  <tr>
                    <td>
                      <strong>${emp.user_name}</strong>
                      <br><small style="color: #64748b;">${emp.organization}</small>
                    </td>
                    <td>📅 Not Scheduled</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">All employees are scheduled to work today.</div>'}
        </div>

        <div class="footer">
          <p><strong>Comans Services Daily Location Report</strong></p>
          <p>Generated automatically at 11:00 AM AEST • For questions, contact IT Support</p>
          ${notConfirmed.length > 0 ? `<p style="color: #d97706; font-weight: 500;">⚠️ ${notConfirmed.length} employee(s) still need to confirm their location</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
