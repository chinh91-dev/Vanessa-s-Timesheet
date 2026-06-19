import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BELINDA_EMAIL = "Belinda.Comeau@comansservices.com.au";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";

interface Project {
  id: string;
  name: string;
  end_date: string;
  budget_hours: number | null;
  is_active: boolean;
  customer_name: string | null;
}

function formatHours(value: number | null): string {
  if (value === null || value === undefined) return "Not specified";
  return `${value.toLocaleString()} hrs`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateEmailHtml(projects: Project[], warningType: '3-month' | '2-month'): string {
  const isUrgent = warningType === '2-month';
  const headerColor = isUrgent ? '#dc2626' : '#f59e0b';
  const headerText = isUrgent ? '🚨 Urgent: Projects Due in 2 Months' : '⚠️ Projects Due in 3 Months';
  const messageText = isUrgent 
    ? 'The following projects require immediate attention as they are due in exactly 2 months:'
    : 'The following projects will be due in exactly 3 months and may need planning discussions:';

  const projectRows = projects.map(project => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${project.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${project.customer_name || 'No Customer'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(project.end_date)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatHours(project.budget_hours)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: ${headerColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${headerText}</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin-top: 0;">${messageText}</p>
        
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Project Name</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Customer</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">End Date</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Budget Hours</th>
            </tr>
          </thead>
          <tbody>
            ${projectRows}
          </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 24px;">
          <a href="${APP_BASE_URL}/projects-contracts?tab=projects" 
             style="display: inline-block; background: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            ${isUrgent ? 'Take Action Now' : 'Review Projects'}
          </a>
        </div>
        
        <p style="margin-bottom: 0; margin-top: 24px; font-size: 14px; color: #6b7280;">
          This is an automated reminder from the Comans Timesheet system.
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting project expiry reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const today = new Date();
    
    const threeMonthDate = new Date(today);
    threeMonthDate.setDate(today.getDate() + 90);

    const twoMonthDate = new Date(today);
    twoMonthDate.setDate(today.getDate() + 60);

    const formatDateForQuery = (date: Date) => date.toISOString().split('T')[0];

    const threeMonthDateStr = formatDateForQuery(threeMonthDate);
    const twoMonthDateStr = formatDateForQuery(twoMonthDate);

    console.log(`Checking for projects due exactly on ${threeMonthDateStr} (3-month warning / 90 days)`);
    console.log(`Checking for projects due exactly on ${twoMonthDateStr} (2-month warning / 60 days)`);

    // Query projects due in exactly 90 days
    const { data: threeMonthProjects, error: threeMonthError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        end_date,
        budget_hours,
        is_active,
        customers!projects_customer_id_fkey(name)
      `)
      .eq('is_active', true)
      .eq('end_date', threeMonthDateStr);

    if (threeMonthError) {
      console.error("Error fetching 3-month projects:", threeMonthError);
      throw threeMonthError;
    }

    // Query projects due in exactly 60 days
    const { data: twoMonthProjects, error: twoMonthError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        end_date,
        budget_hours,
        is_active,
        customers!projects_customer_id_fkey(name)
      `)
      .eq('is_active', true)
      .eq('end_date', twoMonthDateStr);

    if (twoMonthError) {
      console.error("Error fetching 2-month projects:", twoMonthError);
      throw twoMonthError;
    }

    const transformProjects = (projects: any[]): Project[] => {
      return projects.map(p => ({
        id: p.id,
        name: p.name,
        end_date: p.end_date,
        budget_hours: p.budget_hours,
        is_active: p.is_active,
        customer_name: p.customers?.name || null
      }));
    };

    const threeMonthList = transformProjects(threeMonthProjects || []);
    const twoMonthList = transformProjects(twoMonthProjects || []);

    console.log(`Found ${threeMonthList.length} projects due in exactly 90 days`);
    console.log(`Found ${twoMonthList.length} projects due in exactly 60 days`);

    const emailsSent: string[] = [];

    if (threeMonthList.length > 0) {
      console.log("Sending 3-month warning email to Belinda...");
      
      const { error: emailError } = await resend.emails.send({
        from: "Projects System <timesheet@comansservices.com.au>",
        to: [BELINDA_EMAIL],
        subject: `⚠️ ${threeMonthList.length} Project${threeMonthList.length > 1 ? 's' : ''} Due in 3 Months`,
        html: generateEmailHtml(threeMonthList, '3-month'),
      });

      if (emailError) {
        console.error("Error sending 3-month warning email:", emailError);
      } else {
        emailsSent.push(`3-month warning (${threeMonthList.length} projects)`);
        console.log("3-month warning email sent successfully");
      }
    }

    if (twoMonthList.length > 0) {
      console.log("Sending 2-month warning email to Belinda...");
      
      const { error: emailError } = await resend.emails.send({
        from: "Projects System <timesheet@comansservices.com.au>",
        to: [BELINDA_EMAIL],
        subject: `🚨 Urgent: ${twoMonthList.length} Project${twoMonthList.length > 1 ? 's' : ''} Due in 2 Months`,
        html: generateEmailHtml(twoMonthList, '2-month'),
      });

      if (emailError) {
        console.error("Error sending 2-month warning email:", emailError);
      } else {
        emailsSent.push(`2-month warning (${twoMonthList.length} projects)`);
        console.log("2-month warning email sent successfully");
      }
    }

    const response = {
      success: true,
      message: emailsSent.length > 0 
        ? `Sent ${emailsSent.length} reminder email(s): ${emailsSent.join(', ')}`
        : "No projects due on the exact warning dates today",
      threeMonthProjects: threeMonthList.length,
      twoMonthProjects: twoMonthList.length,
      emailsSent: emailsSent.length
    };

    console.log("Project expiry reminder check complete:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-project-expiry-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
