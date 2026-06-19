import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  templateType: "friday" | "monday" | "monthly" | "monthly-morning" | "monthly-evening" | "friday-evening";
  recipientEmails?: string[]; // Optional: specific emails to send to
  weekStartDate?: string; // Optional: specific week (defaults to current week)
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const serve_handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { templateType, recipientEmails, weekStartDate }: ReminderRequest = await req.json();

    if (!templateType) {
      console.error('Missing templateType in request');
    return new Response(
        JSON.stringify({
          error: 'templateType is required',
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if this is a monthly reminder and if it's the day before the last BUSINESS day of the month
    if (templateType.startsWith("monthly")) {
      const today = new Date();

      // Get the last day of the current month
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const lastDayOfMonthDayOfWeek = lastDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday

      // Calculate the last business day (accounting for weekends)
      let lastBusinessDay = new Date(lastDayOfMonth);

      if (lastDayOfMonthDayOfWeek === 0) {
        // Last day is Sunday → Last business day is Friday (2 days before)
        lastBusinessDay.setDate(lastDayOfMonth.getDate() - 2);
      } else if (lastDayOfMonthDayOfWeek === 6) {
        // Last day is Saturday → Last business day is Friday (1 day before)
        lastBusinessDay.setDate(lastDayOfMonth.getDate() - 1);
      }
      // Otherwise, last business day is the last day itself

      // Calculate the day before the last business day
      const dayBeforeLastBusinessDay = new Date(lastBusinessDay);
      dayBeforeLastBusinessDay.setDate(lastBusinessDay.getDate() - 1);

      // Check if today matches the day before last business day (compare dates only, not time)
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const targetDateOnly = new Date(
        dayBeforeLastBusinessDay.getFullYear(),
        dayBeforeLastBusinessDay.getMonth(),
        dayBeforeLastBusinessDay.getDate(),
      );

      const isTargetDay = todayDateOnly.getTime() === targetDateOnly.getTime();

      if (!isTargetDay) {
        console.log(
          `Not the day before the last business day of the month. Today: ${todayDateOnly.toISOString().split("T")[0]}, Target: ${targetDateOnly.toISOString().split("T")[0]}`,
        );
        return new Response(
          JSON.stringify({
            success: true,
            message: "Skipped - not the day before the last business day of the month",
            emailsSent: 0,
            debug: {
              today: todayDateOnly.toISOString().split("T")[0],
              lastDayOfMonth: lastDayOfMonth.toISOString().split("T")[0],
              lastBusinessDay: lastBusinessDay.toISOString().split("T")[0],
              targetSendDay: targetDateOnly.toISOString().split("T")[0],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      console.log(
        `✓ Today is the day before last business day. Last business day: ${lastBusinessDay.toISOString().split("T")[0]}`,
      );
    }

    let usersToRemind;

    if (recipientEmails && recipientEmails.length > 0) {
      // Send to specific recipients (generic emails)
      console.log(`Sending generic ${templateType} reminders to specified recipients`);
      usersToRemind = recipientEmails.map((email) => ({
        email,
        full_name: "Team Member",
        organization: "",
        missing_days: 0,
        expected_days: 0,
        logged_days: 0,
      }));
    } else {
      // Determine recipient selection based on reminder type
      if (templateType === "monday") {
        // Monday reminders: Only send to users with missing timesheet entries
        console.log("Querying database for users with missing timesheet entries (Monday reminder)");

        const { data: missingUsers, error: dbError } = await supabase.rpc("get_users_missing_timesheet_entries", {
          p_week_start_date: weekStartDate || null,
        });

        if (dbError) {
          console.error("Database error:", dbError);
          throw new Error(`Database query failed: ${dbError.message}`);
        }

        usersToRemind = (missingUsers || []).filter((u: any) => u.full_name !== 'Test User');
        console.log(`Found ${usersToRemind.length} users with missing timesheet entries (after excluding test users)`);
      } else {
        // Friday, Monthly Morning, and Monthly Evening: Send to ALL users
        console.log(`Querying database for all users (${templateType} reminder)`);

        const { data: allUsers, error: dbError } = await supabase
          .from("profiles")
          .select("id, email, full_name, organization, time_zone")
          .eq("is_active", true) // CRITICAL: Only include active users
          .not("email", "is", null)
          .neq("full_name", "Test User");

        if (dbError) {
          console.error("Database error:", dbError);
          throw new Error(`Database query failed: ${dbError.message}`);
        }

        // Transform the data to match the expected format
        usersToRemind = (allUsers || []).map((user) => ({
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          organization: user.organization,
          time_zone: user.time_zone,
          expected_days: 0,
          logged_days: 0,
          missing_days: 0,
        }));

        console.log(`Found ${usersToRemind.length} total users for ${templateType} reminder`);
      }
    }

    // Exclude users on approved leave today
    const todayString = new Date().toISOString().split('T')[0];
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
    const beforeCount = usersToRemind.length;
    usersToRemind = usersToRemind.filter((u: any) => !onLeaveUserIds.has(u.user_id || u.id));
    const usersOnLeaveCount = beforeCount - usersToRemind.length;

    if (usersOnLeaveCount > 0) {
      console.log(`🏖️ Excluded ${usersOnLeaveCount} users currently on approved leave`);
    }

    if (usersToRemind.length === 0) {
      const message =
        templateType === "monday"
          ? "No users require timesheet reminders at this time"
          : "No users found to send reminders to";

      return new Response(
        JSON.stringify({
          success: true,
          message,
          emailsSent: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Generate email content based on template type
    const emailContent = getEmailTemplate(templateType);

    // Send emails sequentially with rate limiting to respect Resend's 2 req/sec limit
    console.log(`Sending ${templateType} reminders to ${usersToRemind.length} users with rate limiting`);

    let successCount = 0;
    let failedEmails = [];

    // Send emails one by one with 500ms delay between each
    for (let i = 0; i < usersToRemind.length; i++) {
      const user = usersToRemind[i];
      console.log(`Sending email ${i + 1}/${usersToRemind.length} to ${user.email}`);

      try {
        const emailResponse = await resend.emails.send({
          from: "Timesheet System <timesheet@comansservices.com.au>",
          to: ["support@comansservices.com.au"],
          subject: `${emailContent.subject} - ${user.full_name || 'Unknown User'}`,
          html: emailContent.html,
        });

        console.log(`✓ Email sent successfully to ${user.email}:`, emailResponse.id);
        successCount++;
      } catch (emailError: any) {
        console.error(`✗ Failed to send email to ${user.email}:`, emailError);
        failedEmails.push({
          email: user.email,
          error: emailError.message,
          errorCode: emailError.status || "unknown",
        });
      }

      // Add 500ms delay between emails to respect rate limits (2 emails per second max)
      if (i < usersToRemind.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const failureCount = failedEmails.length;
    console.log(`Email sending completed: ${successCount} successful, ${failureCount} failed`);

    if (failedEmails.length > 0) {
      console.log("Failed emails details:", failedEmails);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${templateType} timesheet reminders processed`,
        emailsSent: successCount,
        emailsFailed: failureCount,
        failedEmails: failedEmails,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in send-timesheet-reminders function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

function getEmailTemplate(
  templateType: "friday" | "monday" | "monthly" | "monthly-morning" | "monthly-evening" | "friday-evening",
) {
  const templates = {
    friday: {
      subject: "Weekend Reminder: Complete Your Timesheet",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekend Timesheet Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">🎉 Week's End Timesheet Reminder</h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <p style="font-size: 16px; margin-bottom: 15px;">Hello!</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                As we wrap up another productive week, it's time to ensure your timesheet is complete and accurate.
              </p>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-weight: bold; color: #92400e;">
                  ⏰ Please review and submit your timesheet before you log off for the weekend.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                Taking a few minutes now will help ensure accurate payroll processing and project tracking.
              </p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services"}/timesheet" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Complete My Timesheet
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Have a wonderful weekend! 🌟
              </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
              <p>This is an automated reminder from your Timesheet System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    monday: {
      subject: "Week Start Reminder: Update Your Timesheet",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Monday Timesheet Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #059669; margin-bottom: 20px;">☀️ Monday Timesheet Check-In</h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <p style="font-size: 16px; margin-bottom: 15px;">Good Monday morning!</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                As we start a fresh new week, let's make sure your timesheet from last week is complete and ready for processing.
              </p>
              
              <div style="background-color: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
                <p style="margin: 0; font-weight: bold; color: #047857;">
                  📝 Please take a moment to review and finalize your previous week's entries.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                Starting the week with an organized timesheet helps maintain accurate records and ensures smooth project management.
              </p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services"}/timesheet" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Review My Timesheet
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Here's to a productive week ahead! 💪
              </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
              <p>This is an automated reminder from your Timesheet System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    monthly: {
      subject: "Monthly Timesheet Review Required",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Monthly Timesheet Review</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #7c3aed; margin-bottom: 20px;">📊 Monthly Timesheet Review</h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <p style="font-size: 16px; margin-bottom: 15px;">Hello Team Member,</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                Tomorrow is the end of the month, and it's time for our comprehensive timesheet review to ensure all entries are accurate and complete.
              </p>
              
              <div style="background-color: #ede9fe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #7c3aed;">
                <p style="margin: 0; font-weight: bold; color: #5b21b6;">
                  📅 Please review your entire month's timesheet entries for accuracy and completeness.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                This monthly review helps ensure:
              </p>
              
              <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
                <li>Accurate project time allocation</li>
                <li>Proper billing and payroll processing</li>
                <li>Compliance with company policies</li>
                <li>Better project planning for the upcoming month</li>
              </ul>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services"}/timesheet" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Review Monthly Timesheet
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Thank you for your attention to detail and commitment to accurate time tracking! 🎯
              </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
              <p>This is an automated monthly reminder from your Timesheet System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    "monthly-morning": {
      subject: "Monthly Timesheet Review Required - Morning Reminder",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Monthly Timesheet Review - Morning</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #7c3aed; margin-bottom: 20px;">🌅 Monthly Timesheet Review - Morning Reminder</h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <p style="font-size: 16px; margin-bottom: 15px;">Good morning!</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                Tomorrow is the end of the month, and it's time for our comprehensive timesheet review to ensure all entries are accurate and complete.
              </p>
              
              <div style="background-color: #ede9fe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #7c3aed;">
                <p style="margin: 0; font-weight: bold; color: #5b21b6;">
                  📅 Please review your entire month's timesheet entries for accuracy and completeness before the month ends tomorrow.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                This monthly review helps ensure:
              </p>
              
              <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
                <li>Accurate project time allocation</li>
                <li>Proper billing and payroll processing</li>
                <li>Compliance with company policies</li>
                <li>Better project planning for the upcoming month</li>
              </ul>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services"}/timesheet" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Review Monthly Timesheet
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Complete your review by end of business tomorrow to avoid any delays in processing. Thank you! 🎯
              </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
              <p>This is an automated monthly reminder from your Timesheet System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    "monthly-evening": {
      subject: "URGENT: Monthly Timesheet Review - Final Reminder",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Monthly Timesheet Review - Final Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ URGENT: Monthly Timesheet Review - Final Reminder</h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <p style="font-size: 16px; margin-bottom: 15px;">URGENT REMINDER</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                This is the <strong>final reminder</strong> for your monthly timesheet review. Tomorrow is the end of the month, and your timesheet entries are still incomplete.
              </p>
              
              <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">
                  🚨 ACTION REQUIRED: Please complete your monthly timesheet review by end of business tomorrow to avoid processing delays.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                Incomplete timesheets can affect:
              </p>
              
              <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
                <li><strong>Payroll processing</strong> - Delays in payment</li>
                <li><strong>Project billing</strong> - Inaccurate client invoicing</li>
                <li><strong>Compliance</strong> - Company policy violations</li>
                <li><strong>Team planning</strong> - Resource allocation issues</li>
              </ul>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services"}/timesheet" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  COMPLETE TIMESHEET NOW
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                If you need assistance, please contact your manager or HR immediately. ⏰
              </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
              <p>This is an automated final reminder from your Timesheet System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    "friday-evening": {
      subject: "End of Day Reminder: Complete Your Timesheet Before Weekend",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>End of Day Timesheet Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">🌅 End of Day Timesheet Reminder</h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <p style="font-size: 16px; margin-bottom: 15px;">Hello!</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                As the workday comes to an end, it's the perfect time to wrap up your timesheet entries before heading into the weekend.
              </p>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-weight: bold; color: #92400e;">
                  ⏰ Please complete your timesheet entries before you finish for the day.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                Finishing your timesheet before the weekend ensures:
              </p>
              
              <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
                <li>Accurate tracking of today's work</li>
                <li>A fresh start to your weekend</li>
                <li>Smooth payroll processing</li>
                <li>Up-to-date project records</li>
              </ul>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services"}/timesheet" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Complete My Timesheet
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Enjoy your weekend knowing your timesheet is complete! 🎉
              </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
              <p>This is an automated end-of-day reminder from your Timesheet System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
  };

  return templates[templateType] || templates.monthly;
}

serve(serve_handler);
