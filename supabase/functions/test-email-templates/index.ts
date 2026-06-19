import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const serve_handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing email templates...');

    const testEmail = 'HR-Payroll@comansservices.com.au';
    const templates = [
      { type: 'friday', subject: 'Weekend Reminder: Complete Your Timesheet' },
      { type: 'monday', subject: 'Week Start Reminder: Update Your Timesheet' },
      { type: 'monthly', subject: 'Monthly Timesheet Review Required' }
    ];
    
    const results = [];
    
    // Send emails sequentially with delays to avoid rate limiting
    for (const template of templates) {
      try {
        const emailContent = getEmailTemplate(template.type as any);
        
        const emailResponse = await resend.emails.send({
          from: "Timesheet System <timesheet@comansservices.com.au>",
          to: [testEmail],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log(`${template.type} template sent successfully:`, emailResponse);
        results.push({ template: template.type, success: true, id: emailResponse.id });
        
        // Add 1 second delay between emails to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (emailError: any) {
        console.error(`Failed to send ${template.type} template:`, emailError);
        results.push({ template: template.type, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(result => result.success).length;
    const failureCount = results.filter(result => !result.success).length;

    console.log(`Template testing completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email template testing completed`,
        emailsSent: successCount,
        emailsFailed: failureCount,
        results: results,
        testEmail: testEmail
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in test-email-templates function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function getEmailTemplate(templateType: 'friday' | 'monday' | 'monthly') {
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
                <a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
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
      `
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
                <a href="#" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
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
      `
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
                As we close out another month, it's time for our comprehensive timesheet review to ensure all entries are accurate and complete.
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
                <a href="#" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
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
      `
    }
  };

  return templates[templateType];
}

serve(serve_handler);
