import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("HR Timesheet Report function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body for manual date override (for testing)
    let requestBody: any = {};
    try {
      if (req.method === "POST") {
        requestBody = await req.json();
      }
    } catch (e) {
      // No body or invalid JSON, continue with default logic
    }

    // Enhanced AEST timezone handling and week calculation
    // Get current AEST time (UTC+10 for AEST, UTC+11 for AEDT)
    const aestOffset = 10; // Simplified to AEST for consistency
    const currentUTC = new Date();
    const currentAEST = new Date(currentUTC.getTime() + (aestOffset * 60 * 60 * 1000));
    
    console.log(`Current UTC time: ${currentUTC.toISOString()}`);
    console.log(`Current AEST time: ${currentAEST.toISOString()}`);

    let weekStartDate: string;
    
    if (requestBody.weekStartDate) {
      // Manual override for testing
      weekStartDate = requestBody.weekStartDate;
      console.log(`Using manual override week start date: ${weekStartDate}`);
    } else {
      // Calculate the previous week's Monday using AEST time
      // This matches the SQL function's logic: date_trunc('week', CURRENT_DATE)
      const aestDay = currentAEST.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Get Monday of current week in AEST
      const daysFromMonday = aestDay === 0 ? 6 : aestDay - 1; // Sunday = 6 days from Monday, others are day-1
      const currentWeekMonday = new Date(currentAEST);
      currentWeekMonday.setDate(currentAEST.getDate() - daysFromMonday);
      
      // Get previous week's Monday (7 days before current week's Monday)
      const previousWeekMonday = new Date(currentWeekMonday);
      previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);
      
      // Format as YYYY-MM-DD
      weekStartDate = previousWeekMonday.toISOString().split('T')[0];
    }

    console.log(`Checking timesheet completion for week starting: ${weekStartDate}`);
    console.log(`Week end date would be: ${new Date(new Date(weekStartDate).getTime() + (6 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]}`);

    // Get users with missing timesheet entries for the previous week
    // Note: get_users_missing_timesheet_entries function already filters for active users only
    const { data: missingUsers, error } = await supabase.rpc(
      'get_users_missing_timesheet_entries', 
      { p_week_start_date: weekStartDate }
    );

    if (error) {
      console.error("Error fetching missing timesheet entries:", error);
      throw error;
    }

    // Filter out Test User from results
    const filteredUsers = (missingUsers || []).filter((u: any) => u.full_name !== 'Test User');
    
    console.log(`Found ${missingUsers?.length || 0} users with missing entries (${filteredUsers.length} after excluding test users)`);
    
    // Enhanced debugging: Log all user data returned from SQL function
    if (missingUsers && missingUsers.length > 0) {
      console.log("Detailed missing users data:");
      missingUsers.forEach((user: any, index: number) => {
        console.log(`User ${index + 1}:`, {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          expected_days: user.expected_days,
          logged_days: user.logged_days,
          missing_days: user.missing_days,
          week_start_date: user.week_start_date,
          week_end_date: user.week_end_date,
          missing_specific_days: user.missing_specific_days
        });
      });
    } else {
      console.log("No users with missing entries found - all users are compliant");
    }

    // Prepare email content
    let emailSubject: string;
    let emailHtml: string;

    if (filteredUsers.length === 0) {
      // All timesheets complete
      emailSubject = `✅ Timesheet Compliance Report - Week ${weekStartDate} - All Complete`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a; margin-bottom: 20px;">📊 Weekly Timesheet Compliance Report</h2>
          
          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #0369a1; margin-top: 0;">Week Starting: ${weekStartDate}</h3>
            <p style="font-size: 16px; color: #16a34a; font-weight: bold; margin: 10px 0;">
              ✅ All employees have completed their timesheets for this week.
            </p>
          </div>

          <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              This automated report is sent every Monday at 9:05 AM AEST to check timesheet completion status.
            </p>
          </div>
        </div>
      `;
    } else {
      // Some users have missing entries
      emailSubject = `⚠️ Timesheet Compliance Report - Week ${weekStartDate} - ${filteredUsers.length} Incomplete`;
      
      const userRows = filteredUsers.map((user: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; border-right: 1px solid #e2e8f0;">${user.full_name || 'N/A'}</td>
          <td style="padding: 12px; border-right: 1px solid #e2e8f0;">${user.email}</td>
          <td style="padding: 12px; border-right: 1px solid #e2e8f0;">${user.organization || 'N/A'}</td>
          <td style="padding: 12px; border-right: 1px solid #e2e8f0; text-align: center;">${user.expected_days}</td>
          <td style="padding: 12px; border-right: 1px solid #e2e8f0; text-align: center;">${user.logged_days}</td>
          <td style="padding: 12px; text-align: center; color: #dc2626; font-weight: bold;">${user.missing_days}</td>
        </tr>
      `).join('');

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #dc2626; margin-bottom: 20px;">📊 Weekly Timesheet Compliance Report</h2>
          
          <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin-top: 0;">Week Starting: ${weekStartDate}</h3>
            <p style="font-size: 16px; color: #dc2626; font-weight: bold; margin: 10px 0;">
              ⚠️ ${filteredUsers.length} employee${filteredUsers.length > 1 ? 's have' : ' has'} incomplete timesheets.
            </p>
          </div>

          <div style="overflow-x: auto; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Name</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Email</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Organization</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Expected Days</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Logged Days</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Missing Days</th>
                </tr>
              </thead>
              <tbody>
                ${userRows}
              </tbody>
            </table>
          </div>

          <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              This automated report is sent every Monday at 9:05 AM AEST to check timesheet completion status.
              Please follow up with employees who have missing timesheet entries.
            </p>
          </div>
        </div>
      `;
    }

    // Send email to HR
    const emailResponse = await resend.emails.send({
      from: "Timesheet System <timesheet@comansservices.com.au>",
      to: ["HR-Payroll@comansservices.com.au"],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("HR email sent successfully:", emailResponse);

    const weekEndDate = new Date(new Date(weekStartDate).getTime() + (6 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "HR timesheet report sent successfully",
      reportDetails: {
        weekStartDate,
        weekEndDate,
        usersWithMissingEntries: filteredUsers.length,
        allUsersCompliant: filteredUsers.length === 0,
        emailSent: true,
        reportGeneratedAt: new Date().toISOString(),
        aestTime: currentAEST.toISOString(),
        manualOverride: !!requestBody.weekStartDate
      },
      missingUsersData: filteredUsers
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-hr-timesheet-report function:", error);
    
    // Enhanced error logging with more details
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      function: 'send-hr-timesheet-report'
    };
    
    console.error("Detailed error information:", JSON.stringify(errorDetails, null, 2));
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);