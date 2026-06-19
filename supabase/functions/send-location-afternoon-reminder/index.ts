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

interface AfternoonReminderRequest {
  mode: 'reminder' | 'auto_confirm';
  specificUsers?: string[];
  testMode?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🏢 Starting afternoon location reminder/auto-confirm process...");

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { mode = 'reminder', specificUsers, testMode = false }: AfternoonReminderRequest = body;

    console.log(`📋 Mode: ${mode}, Test mode: ${testMode}`);

    // Get today's date in AEST timezone
    const today = new Date();
    const aestDate = new Date(today.getTime() + (10 * 60 * 60 * 1000)); // UTC+10 for AEST
    const todayString = aestDate.toISOString().split('T')[0];
    const currentTimeAEST = aestDate.toTimeString().slice(0, 5);

    console.log(`📅 Processing for date: ${todayString}, AEST time: ${currentTimeAEST}`);

    // Check if today is a public holiday - skip all processing if so
    const { data: isHolidayToday, error: holidayError } = await supabase
      .rpc('is_public_holiday', {
        entry_date: todayString,
        target_state: 'VIC'
      });

    if (holidayError) {
      console.error("⚠️ Error checking holiday status:", holidayError);
      // Continue anyway - don't skip if we can't check
    } else if (isHolidayToday === true) {
      console.log("🎉 Today is a public holiday - skipping afternoon reminders/auto-confirm");
      return new Response(JSON.stringify({
        message: "Today is a public holiday - no processing done",
        isHoliday: true,
        date: todayString,
        mode
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all active users with email addresses
    let usersQuery = supabase
      .from('profiles')
      .select('id, email, full_name, organization')
      .eq('is_active', true)
      .not('email', 'is', null)
      .neq('full_name', 'Test User');

    if (specificUsers && specificUsers.length > 0) {
      usersQuery = usersQuery.in('id', specificUsers);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("ℹ️ No users found to process");
      return new Response(JSON.stringify({ 
        message: "No users found to process",
        count: 0,
        mode
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`👥 Found ${users.length} users to process`);

    let processed = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const user of users) {
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
          skipped++;
          continue;
        }

        // Skip if user has already checked in today
        if (locationStatus[0]?.has_checked_in) {
          console.log(`✅ Skipping ${user.email} - already checked in`);
          skipped++;
          continue;
        }

        const plannedLocation = locationStatus[0]?.planned_location;
        const plannedLocationDisplay = getLocationDisplayName(plannedLocation);
        const userName = user.full_name || user.email?.split('@')[0] || 'there';

        if (mode === 'reminder') {
          // Send 2 PM reminder email
          const emailResponse = await resend.emails.send({
            from: "Work Location Reminder <timesheet@comansservices.com.au>",
            to: ["support@comansservices.com.au"],
            subject: `⏰ Last Reminder: Please Confirm Your Work Location - ${user.full_name || 'Unknown User'}`,
            html: generateAfternoonReminderEmail(userName, plannedLocationDisplay, user.organization),
          });

          if (emailResponse.error) {
            console.error(`❌ Error sending email to ${user.email}:`, emailResponse.error);
            errors.push({ user: user.email, error: emailResponse.error });
          } else {
            console.log(`📧 Afternoon reminder sent successfully to ${user.email}`);
            processed++;
          }

          // Rate limiting - wait 600ms between emails
          await new Promise(resolve => setTimeout(resolve, 600));

        } else if (mode === 'auto_confirm') {
          // Auto-confirm the user's planned location
          if (testMode) {
            console.log(`🧪 [TEST MODE] Would auto-confirm ${user.email} at ${plannedLocation}`);
            processed++;
            continue;
          }

          // Insert check-in record with auto-confirmed note
          const { error: insertError } = await supabase
            .from('daily_location_checkins')
            .insert({
              user_id: user.id,
              check_in_date: todayString,
              actual_location: plannedLocation,
              planned_location: plannedLocation,
              check_in_time: currentTimeAEST,
              late_checkin: true,
              notes: 'Auto-confirmed by system at 4:00 PM AEST',
              location_change_reason: null
            });

          if (insertError) {
            console.error(`❌ Error auto-confirming ${user.email}:`, insertError);
            errors.push({ user: user.email, error: insertError.message });
          } else {
            console.log(`🤖 Auto-confirmed ${user.email} at ${plannedLocationDisplay}`);
            processed++;
          }
        }

      } catch (error: any) {
        console.error(`❌ Error processing user ${user.email}:`, error);
        errors.push({ user: user.email, error: error.message });
      }
    }

    const summary = {
      mode,
      totalUsers: users.length,
      processed,
      skipped,
      errors: errors.length,
      errorDetails: errors,
      date: todayString,
      testMode
    };

    console.log("📊 Afternoon reminder/auto-confirm summary:", summary);

    const actionVerb = mode === 'reminder' ? 'reminders sent' : 'auto-confirmations';
    return new Response(JSON.stringify({
      message: `${mode === 'reminder' ? 'Afternoon reminders' : 'Auto-confirmations'} processed: ${processed} ${actionVerb}, ${skipped} skipped`,
      ...summary
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Error in send-location-afternoon-reminder function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to process afternoon location reminder/auto-confirm",
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

function generateAfternoonReminderEmail(userName: string, plannedLocation: string, organization?: string): string {
  const baseUrl = Deno.env.get('APP_BASE_URL');
  const workLocationUrl = `${baseUrl}/timesheet/work-location`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Location - Last Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">⏰ Last Reminder, ${userName}!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Please confirm your work location before 4 PM</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; color: #92400e; font-size: 18px;">📍 Your Planned Location Today</h2>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #374151;">${plannedLocation}</p>
          </div>
          
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 25px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
              <strong>⚠️ Important:</strong> If you don't confirm by <strong>4:00 PM AEST</strong>, your planned location will be automatically confirmed.
            </p>
          </div>
          
          <p style="margin-bottom: 25px; font-size: 16px; color: #374151;">
            Please take a moment to confirm your work location, or update it if your plans have changed.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${workLocationUrl}" 
              style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">
              🎯 Confirm My Location
            </a>
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
