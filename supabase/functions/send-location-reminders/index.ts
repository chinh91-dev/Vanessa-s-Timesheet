import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LocationReminderRequest {
  specificUsers?: string[];
  testMode?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🏢 Starting work location reminder process...");

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { specificUsers, testMode = false }: LocationReminderRequest = body;

    // Get today's date in AEST timezone
    const today = new Date();
    const aestDate = new Date(today.getTime() + (10 * 60 * 60 * 1000)); // UTC+10 for AEST
    const todayString = aestDate.toISOString().split('T')[0];

    console.log(`📅 Processing reminders for date: ${todayString}`);

    // Check if today is a public holiday - skip all reminders if so
    const { data: isHolidayToday, error: holidayError } = await supabase
      .rpc('is_public_holiday', {
        entry_date: todayString,
        target_state: 'VIC'
      });

    if (holidayError) {
      console.error("⚠️ Error checking holiday status:", holidayError);
      // Continue anyway - don't skip reminders if we can't check
    } else if (isHolidayToday === true) {
      console.log("🎉 Today is a public holiday - skipping all location reminders");
      return new Response(JSON.stringify({
        message: "Today is a public holiday - no reminders sent",
        isHoliday: true,
        date: todayString
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all active users with email addresses
    let usersQuery = supabase.from('profiles').select('id, email, full_name, organization').eq('is_active', true).not('email', 'is', null).neq('full_name', 'Test User'); // Include all working roles, exclude test user

    if (specificUsers && specificUsers.length > 0) {
      usersQuery = usersQuery.in('id', specificUsers);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("ℹ️ No users found to send reminders to");
      return new Response(JSON.stringify({ 
        message: "No users found to send reminders to",
        count: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`👥 Found ${users.length} users to process`);

    // Exclude users on approved leave today
    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_applications')
      .select('user_id')
      .eq('status', 'approved')
      .lte('start_date', todayString)
      .gte('end_date', todayString);

    if (leaveError) {
      console.error("⚠️ Error fetching leave data:", leaveError);
    }

    const onLeaveUserIds = new Set((leaveData || []).map((l: any) => l.user_id));
    const filteredUsers = users.filter(u => !onLeaveUserIds.has(u.id));
    const usersOnLeave = users.length - filteredUsers.length;

    if (usersOnLeave > 0) {
      console.log(`🏖️ Excluded ${usersOnLeave} users currently on approved leave`);
    }

    let remindersSent = 0;
    let remindersSkipped = 0;
    const errors: any[] = [];

    for (const user of filteredUsers) {
      try {
        // Get user's daily location status for today
        const { data: locationStatus, error: statusError } = await supabase
          .rpc('get_daily_location_status', {
            p_user_id: user.id,
            p_date: todayString
          });

        if (statusError) {
          console.error(`❌ Error getting location status for user ${user.email}:`, statusError);
          errors.push({ user: user.email, error: statusError.message });
          continue;
        }

        // Skip if user has no planned location (not scheduled to work today)
        if (!locationStatus || !Array.isArray(locationStatus) || locationStatus.length === 0 || !locationStatus[0]?.planned_location) {
          console.log(`⏭️ Skipping ${user.email} - no planned location for today`);
          remindersSkipped++;
          continue;
        }

        // Skip if user has already checked in today
        if (locationStatus[0]?.has_checked_in) {
          console.log(`✅ Skipping ${user.email} - already checked in`);
          remindersSkipped++;
          continue;
        }

        // Send reminder email
        const plannedLocationDisplay = getLocationDisplayName(locationStatus[0]?.planned_location);
        const userName = user.full_name || user.email?.split('@')[0] || 'there';
        
        const emailResponse = await resend.emails.send({
          from: "Work Location Reminder <timesheet@comansservices.com.au>",
          to: ["support@comansservices.com.au"],
          subject: `🏢 Good Morning! Confirm Your Work Location for Today - ${user.full_name || 'Unknown User'}`,
          html: generateReminderEmail(userName, plannedLocationDisplay, user.organization),
        });

        if (emailResponse.error) {
          console.error(`❌ Error sending email to ${user.email}:`, emailResponse.error);
          errors.push({ user: user.email, error: emailResponse.error });
        } else {
          console.log(`📧 Reminder sent successfully to ${user.email}`);
          remindersSent++;
        }

        // Rate limiting - wait 600ms between emails to avoid 429 errors
        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);
        errors.push({ user: user.email, error: error.message });
      }
    }

    const summary = {
      totalUsers: users.length,
      usersOnLeave,
      remindersSent,
      remindersSkipped,
      errors: errors.length,
      errorDetails: errors,
      date: todayString,
      testMode
    };

    console.log("📊 Location reminder summary:", summary);

    return new Response(JSON.stringify({
      message: `Location reminders processed: ${remindersSent} sent, ${remindersSkipped} skipped`,
      ...summary
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Error in send-location-reminders function:", error);
    
    // Enhanced error logging with more details
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      function: 'send-location-reminders'
    };
    
    console.error("Detailed error information:", JSON.stringify(errorDetails, null, 2));
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to process location reminders",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getLocationDisplayName(location: string): string {
  const locationMap: { [key: string]: string } = {
    'collins_square': 'Collins Square',
    'wfh': 'WFH',
    'client': 'Client Site',
  };

  return locationMap[location] || location.charAt(0).toUpperCase() + location.slice(1).replace(/_/g, ' ');
}

function generateReminderEmail(userName: string, plannedLocation: string, organization?: string): string {
  const baseUrl = Deno.env.get('APP_BASE_URL');
  const workLocationUrl = `${baseUrl}/timesheet/work-location`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Location Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">🏢 Good Morning, ${userName}!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Time to confirm your work location for today</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">📍 Your Planned Location Today</h2>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #374151;">${plannedLocation}</p>
          </div>
          
          <p style="margin-bottom: 25px; font-size: 16px; color: #374151;">
            Please take a moment to confirm your work location for today, or update it if your plans have changed.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${workLocationUrl}" 
              style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #dc2626; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
              🎯 Confirm or Update Location
            </a>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin-top: 25px;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">
              <strong>💡 Tip:</strong> Confirming your location helps your team know where to find you and ensures accurate attendance tracking.
            </p>
          </div>
          
          ${organization ? `
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
            This message was sent by ${organization} Work Location Management System
          </p>
          ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>If you have any questions about work locations, please contact your administrator.</p>
        </div>
      </body>
    </html>
  `;
}

serve(handler);
