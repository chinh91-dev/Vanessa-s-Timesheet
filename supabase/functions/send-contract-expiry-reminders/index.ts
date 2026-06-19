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

interface Contract {
  id: string;
  name: string;
  end_date: string;
  contract_value: number | null;
  status: string;
  customer_name: string | null;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "Not specified";
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateEmailHtml(contracts: Contract[], warningType: '3-month' | '2-month'): string {
  const isUrgent = warningType === '2-month';
  const headerColor = isUrgent ? '#dc2626' : '#f59e0b';
  const headerText = isUrgent ? '🚨 Urgent: Contracts Expiring in 2 Months' : '⚠️ Contracts Expiring in 3 Months';
  const messageText = isUrgent 
    ? 'The following contracts require immediate attention as they expire in exactly 2 months:'
    : 'The following contracts will expire in exactly 3 months and may need renewal discussions:';

  const contractRows = contracts.map(contract => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${contract.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${contract.customer_name || 'No Customer'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(contract.end_date)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatCurrency(contract.contract_value)}</td>
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
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Contract Name</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Customer</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">End Date</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${contractRows}
          </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 24px;">
          <a href="${APP_BASE_URL}/projects-contracts?tab=contracts" 
             style="display: inline-block; background: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            ${isUrgent ? 'Take Action Now' : 'Review Contracts'}
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting contract expiry reminder check...");

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const today = new Date();
    
    // Calculate exact dates for 3-month (90 days) and 2-month (60 days) warnings
    const threeMonthDate = new Date(today);
    threeMonthDate.setDate(today.getDate() + 90);

    const twoMonthDate = new Date(today);
    twoMonthDate.setDate(today.getDate() + 60);

    const formatDateForQuery = (date: Date) => date.toISOString().split('T')[0];

    const threeMonthDateStr = formatDateForQuery(threeMonthDate);
    const twoMonthDateStr = formatDateForQuery(twoMonthDate);

    console.log(`Checking for contracts expiring exactly on ${threeMonthDateStr} (3-month warning / 90 days)`);
    console.log(`Checking for contracts expiring exactly on ${twoMonthDateStr} (2-month warning / 60 days)`);

    // Query contracts expiring in exactly 90 days (3 months)
    const { data: threeMonthContracts, error: threeMonthError } = await supabase
      .from('contracts')
      .select(`
        id,
        name,
        end_date,
        contract_value,
        status,
        customers!fk_contracts_customer(name)
      `)
      .in('status', ['active', 'pending_renewal'])
      .eq('end_date', threeMonthDateStr);

    if (threeMonthError) {
      console.error("Error fetching 3-month contracts:", threeMonthError);
      throw threeMonthError;
    }

    // Query contracts expiring in exactly 60 days (2 months)
    const { data: twoMonthContracts, error: twoMonthError } = await supabase
      .from('contracts')
      .select(`
        id,
        name,
        end_date,
        contract_value,
        status,
        customers!fk_contracts_customer(name)
      `)
      .in('status', ['active', 'pending_renewal'])
      .eq('end_date', twoMonthDateStr);

    if (twoMonthError) {
      console.error("Error fetching 2-month contracts:", twoMonthError);
      throw twoMonthError;
    }

    // Transform contracts data
    const transformContracts = (contracts: any[]): Contract[] => {
      return contracts.map(c => ({
        id: c.id,
        name: c.name,
        end_date: c.end_date,
        contract_value: c.contract_value,
        status: c.status,
        customer_name: c.customers?.name || null
      }));
    };

    const threeMonthList = transformContracts(threeMonthContracts || []);
    const twoMonthList = transformContracts(twoMonthContracts || []);

    console.log(`Found ${threeMonthList.length} contracts expiring in exactly 90 days`);
    console.log(`Found ${twoMonthList.length} contracts expiring in exactly 60 days`);

    const emailsSent: string[] = [];

    // Send 3-month warning email if there are contracts
    if (threeMonthList.length > 0) {
      console.log("Sending 3-month warning email to Belinda...");
      
      const { error: emailError } = await resend.emails.send({
        from: "Contracts System <timesheet@comansservices.com.au>",
        to: [BELINDA_EMAIL],
        subject: `⚠️ ${threeMonthList.length} Contract${threeMonthList.length > 1 ? 's' : ''} Expiring in 3 Months`,
        html: generateEmailHtml(threeMonthList, '3-month'),
      });

      if (emailError) {
        console.error("Error sending 3-month warning email:", emailError);
      } else {
        emailsSent.push(`3-month warning (${threeMonthList.length} contracts)`);
        console.log("3-month warning email sent successfully");
      }
    }

    // Send 2-month warning email if there are contracts
    if (twoMonthList.length > 0) {
      console.log("Sending 2-month warning email to Belinda...");
      
      const { error: emailError } = await resend.emails.send({
        from: "Contracts System <timesheet@comansservices.com.au>",
        to: [BELINDA_EMAIL],
        subject: `🚨 Urgent: ${twoMonthList.length} Contract${twoMonthList.length > 1 ? 's' : ''} Expiring in 2 Months`,
        html: generateEmailHtml(twoMonthList, '2-month'),
      });

      if (emailError) {
        console.error("Error sending 2-month warning email:", emailError);
      } else {
        emailsSent.push(`2-month warning (${twoMonthList.length} contracts)`);
        console.log("2-month warning email sent successfully");
      }
    }

    const response = {
      success: true,
      message: emailsSent.length > 0 
        ? `Sent ${emailsSent.length} reminder email(s): ${emailsSent.join(', ')}`
        : "No contracts expiring on the exact warning dates today",
      threeMonthContracts: threeMonthList.length,
      twoMonthContracts: twoMonthList.length,
      emailsSent: emailsSent.length
    };

    console.log("Contract expiry reminder check complete:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-contract-expiry-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
