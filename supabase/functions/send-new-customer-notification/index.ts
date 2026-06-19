import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewCustomerNotificationRequest {
  dealId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId }: NewCustomerNotificationRequest = await req.json();
    
    console.log("Processing new customer notification for deal:", dealId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch deal data with related account and contact
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select(`
        id,
        name,
        deal_number,
        contract_value,
        billing_cadence,
        contract_type,
        account_id,
        accounts:account_id (
          id,
          name,
          email,
          phone,
          converted_to_customer_id
        ),
        primary_contact:primary_contact_id (
          id,
          contact_name,
          email,
          phone,
          mobile_phone
        )
      `)
      .eq("id", dealId)
      .single();

    if (dealError) {
      console.error("Error fetching deal:", dealError);
      throw new Error(`Failed to fetch deal: ${dealError.message}`);
    }

    if (!deal) {
      throw new Error("Deal not found");
    }

    console.log("Deal data fetched:", deal);

    // Format currency
    const formatCurrency = (amount: number | null) => {
      if (!amount) return "Not specified";
      return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
      }).format(amount);
    };

    // Format billing cadence
    const formatBillingCadence = (cadence: string | null) => {
      if (!cadence) return "Not specified";
      return cadence.charAt(0).toUpperCase() + cadence.slice(1);
    };

    // Get account and contact info
    const account = deal.accounts as any;
    const contact = deal.primary_contact as any;
    const customerName = account?.name || "Unknown Customer";
    const contactName = contact?.contact_name || "Not specified";
    const contactEmail = contact?.email || account?.email || "Not specified";
    const contactPhone = contact?.phone || contact?.mobile_phone || account?.phone || "Not specified";

    // Get the app URL for the link
    const appUrl = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Customer Signed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 New Customer Signed!</h1>
  </div>
  
  <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Hi Belinda,</p>
    
    <p style="font-size: 16px;">Great news! A new customer has signed and is ready for onboarding.</p>
    
    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #16a34a; margin-top: 0; font-size: 18px; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">Customer Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Customer Name:</td>
          <td style="padding: 8px 0; font-weight: 600;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Primary Contact:</td>
          <td style="padding: 8px 0;">${contactName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${contactEmail}" style="color: #16a34a;">${contactEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
          <td style="padding: 8px 0;">${contactPhone}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #16a34a; margin-top: 0; font-size: 18px; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">Deal Information</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Deal Name:</td>
          <td style="padding: 8px 0; font-weight: 600;">${deal.name || "Untitled Deal"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Deal Number:</td>
          <td style="padding: 8px 0;">${deal.deal_number || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Contract Value:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #16a34a;">${formatCurrency(deal.contract_value)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Billing Cadence:</td>
          <td style="padding: 8px 0;">${formatBillingCadence(deal.billing_cadence)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Contract Type:</td>
          <td style="padding: 8px 0;">${deal.contract_type || "Not specified"}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #b45309; margin-top: 0; font-size: 16px;">📋 Action Required</h3>
      <p style="margin-bottom: 0; color: #92400e;">Please set up timesheet access for this new customer.</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${appUrl}/customers" 
         style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Customers
      </a>
    </div>
  </div>
  
  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">This is an automated notification from the CRM system.</p>
  </div>
</body>
</html>
    `;

    // Send email to Belinda
    const emailResponse = await resend.emails.send({
      from: "Comans CRM <crm@comansservices.com.au>",
      to: ["Belinda.Comeau@comansservices.com.au"],
      subject: `New Customer Signed: ${customerName} - Timesheet Setup Required`,
      html: emailHtml,
    });

    console.log("New customer notification email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-new-customer-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
