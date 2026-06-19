import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LegalReviewNotificationRequest {
  dealId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId }: LegalReviewNotificationRequest = await req.json();
    
    console.log("Sending legal review notification for deal:", dealId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch deal information with related data
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select(`
        id,
        name,
        deal_number,
        contract_value,
        billing_cadence,
        contract_type,
        proposal_file_url,
        proposal_file_name,
        account:accounts!deals_account_id_fkey(id, name),
        primary_contact:contacts!deals_primary_lead_id_fkey(contact_name, email, phone)
      `)
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      console.error("Error fetching deal:", dealError);
      throw new Error(`Failed to fetch deal: ${dealError?.message}`);
    }

    console.log("Deal data fetched:", deal);

    // Format currency
    const formatCurrency = (value: number | null) => {
      if (!value) return "N/A";
      return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    // Format billing cadence
    const formatBillingCadence = (cadence: string | null) => {
      if (!cadence) return "N/A";
      const cadences: Record<string, string> = {
        monthly: "Monthly",
        quarterly: "Quarterly",
        annually: "Annually",
        one_time: "One-Time",
      };
      return cadences[cadence] || cadence;
    };

    // Get base URL from environment
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";
    const dealUrl = `${appBaseUrl}/crm/deals`;

    // Build proposal section
    const proposalSection = deal.proposal_file_url
      ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #6b7280;">Proposal Document</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <a href="${deal.proposal_file_url}" style="color: #2563eb; text-decoration: underline;">
              ${deal.proposal_file_name || "View Proposal"}
            </a>
          </td>
        </tr>
      `
      : "";

    // Build primary contact section
    const contactInfo = deal.primary_contact
      ? `${deal.primary_contact.contact_name || "N/A"}${deal.primary_contact.email ? ` (${deal.primary_contact.email})` : ""}`
      : "N/A";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">
                ⚖️ Deal Ready for Legal Review
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
              <p style="margin: 0 0 20px 0; color: #4b5563;">
                A deal has moved to the <strong>Negotiation</strong> stage and is ready for legal review.
              </p>
              
              <!-- Deal Info Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Deal Name</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${deal.name || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Deal Number</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${deal.deal_number || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Account</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${(deal.account as any)?.name || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Contract Value</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${formatCurrency(deal.contract_value)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Billing Cadence</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${formatBillingCadence(deal.billing_cadence)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Contract Type</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${deal.contract_type || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Primary Contact</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${contactInfo}
                  </td>
                </tr>
                ${proposalSection}
              </table>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 24px;">
                <a href="${dealUrl}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                  View Deal in CRM
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated notification from the CRM system.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to both Belinda and Jason
    const recipients = [
      "jason.comeau@comansservices.com.au",
      "Belinda.Comeau@comansservices.com.au",
    ];

    const accountName = (deal.account as any)?.name || "Unknown Account";
    const subject = `Legal Review Required: ${deal.name || "Deal"} - ${accountName}`;

    console.log("Sending email to:", recipients);

    const emailResponse = await resend.emails.send({
      from: "Comans CRM <crm@comansservices.com.au>",
      to: recipients,
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-legal-review-notification:", error);
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
