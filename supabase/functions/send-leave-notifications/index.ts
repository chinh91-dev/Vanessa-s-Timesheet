import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: string;
  data: any;
}

interface HRIssueRequest {
  userEmail: string;
  userName: string;
  issueDescription: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Leave Notifications function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();

    // Handle legacy HR issue format
    if (body.userEmail && body.issueDescription) {
      return handleHRIssue(body as HRIssueRequest);
    }

    // Handle new leave management emails
    const { type, data }: EmailRequest = body;
    console.log('Email type:', type);

    // Use designated admin email for notifications
    const adminEmails = ['HR-Payroll@comansservices.com.au'];
    console.log('Using designated admin email:', adminEmails[0]);

    let emailContent, subject, recipients = [];

    switch (type) {
      case 'new_leave_application':
        subject = `New Leave Application from ${data.applicant_name}`;
        recipients = adminEmails;
        emailContent = `
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { padding: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0; }
            .application-details { background: #f8f9fa; padding: 16px; border-radius: 4px; margin: 16px 0; }
            .application-details h3 { margin-top: 0; }
            .footer { border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px; color: #666; font-size: 14px; }
          </style>
          <div class="container">
            <div class="header">
              <h1>New Leave Application</h1>
            </div>
            <div class="content">
              <p>A new leave application has been submitted and requires your review.</p>
              
              <div class="application-details">
                <h3>Application Details</h3>
                <p><strong>Employee:</strong> ${data.applicant_name}</p>
                <p><strong>Leave Type:</strong> ${data.leave_type}</p>
                <p><strong>Start Date:</strong> ${data.start_date}</p>
                <p><strong>End Date:</strong> ${data.end_date}</p>
                <p><strong>Duration:</strong> ${data.business_days_count || 'TBD'} business days</p>
                ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
              </div>
              
              <a href="${Deno.env.get('APP_BASE_URL')}/leave-management" class="button">Review Leave Application</a>
            </div>
            <div class="footer">
              <p>This is an automated message from your leave management system.</p>
            </div>
          </div>
        `;
        break;

      case 'leave_decision':
        subject = `Leave Application ${data.status}`;
        recipients = [data.applicant_email];
        emailContent = `<h1>Leave Application ${data.status}</h1><p>Your leave application has been ${data.status}</p>`;
        break;

      case 'balance_update':
        subject = 'Leave Balance Updated';
        recipients = [data.user_email];
        emailContent = `<h1>Leave Balance Update</h1><p>Hello ${data.user_name}, your leave balances have been updated.</p>`;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "HR System <timesheet@comansservices.com.au>",
      to: recipients,
      subject: subject,
      html: emailContent,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-leave-notifications function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function handleHRIssue(data: HRIssueRequest): Promise<Response> {
  // Get admin emails for HR issues
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Use designated admin email for HR issues
  const adminEmails = ['HR-Payroll@comansservices.com.au'];

  const emailResponse = await resend.emails.send({
    from: "HR System <timesheet@comansservices.com.au>",
    to: adminEmails,
    subject: "Timesheet System - HR Issue Report",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0;">Timesheet HR Issue Report</h1>
        </div>
        <div style="padding: 20px 0;">
          <div style="background: #f8f9fa; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p><strong>Reported by:</strong> ${data.userName} (${data.userEmail})</p>
            <p><strong>Issue:</strong> ${data.issueDescription}</p>
          </div>
        </div>
        <div style="border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px; color: #666; font-size: 14px;">
          <p>This is an automated message from your timesheet system.</p>
        </div>
      </div>
    `,
    reply_to: data.userEmail,
  });

  return new Response(JSON.stringify(emailResponse), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(handler);