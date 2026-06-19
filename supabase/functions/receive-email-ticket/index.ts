import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp",
};

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to receive-email-ticket");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received email webhook payload:", JSON.stringify(body, null, 2));

    // Extract email data from Resend webhook format
    const emailData: InboundEmail = body.data || body;
    
    if (!emailData.from || !emailData.to) {
      console.error("Missing required email fields:", { from: emailData.from, to: emailData.to });
      return new Response(
        JSON.stringify({ error: "Missing required email fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse the "from" field to extract name and email
    const fromMatch = emailData.from.match(/^(?:(.+?)\s*<)?([^<>]+)>?$/);
    const fromName = fromMatch?.[1]?.trim() || null;
    const fromEmail = fromMatch?.[2]?.trim() || emailData.from;

    // Parse the "to" address to extract the prefix
    // Expected format: prefix@support.comansservices.com.au
    const toMatch = emailData.to.match(/^([^@]+)@support\.comansservices\.com\.au$/i);
    
    if (!toMatch) {
      console.log("Email not addressed to support subdomain:", emailData.to);
      return new Response(
        JSON.stringify({ error: "Email not addressed to a valid support address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailPrefix = toMatch[1].toLowerCase();
    console.log("Extracted email prefix:", emailPrefix);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the incident project by email prefix
    const { data: project, error: projectError } = await supabase
      .from("incident_projects")
      .select("id, name, project_key, lead_id, customer_id")
      .eq("support_email_prefix", emailPrefix)
      .eq("is_active", true)
      .single();

    if (projectError || !project) {
      console.error("Project not found for prefix:", emailPrefix, projectError);
      return new Response(
        JSON.stringify({ error: `No project found for email prefix: ${emailPrefix}` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Found project:", project.name, project.id);

    // Try to find the sender in customer_logins
    let createdBy: string | null = null;
    const { data: customerLogin } = await supabase
      .from("customer_logins")
      .select("user_id, full_name")
      .eq("email", fromEmail.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (customerLogin?.user_id) {
      createdBy = customerLogin.user_id;
      console.log("Found customer login for sender:", fromEmail, createdBy);
    }

    // Generate sequential incident number
    const { data: existingIncidents } = await supabase
      .from("incidents")
      .select("incident_number")
      .eq("incident_project_id", project.id)
      .like("incident_number", `${project.project_key}-%`)
      .order("incident_number", { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (existingIncidents && existingIncidents.length > 0) {
      const match = existingIncidents[0].incident_number.match(new RegExp(`^${project.project_key}-(\\d+)$`));
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const incidentNumber = `${project.project_key}-${nextNumber}`;

    // Create the incident
    const title = emailData.subject?.trim() || "Email Support Request";
    const description = emailData.text?.trim() || emailData.html?.replace(/<[^>]+>/g, ' ').trim() || "No content provided";

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .insert({
        incident_number: incidentNumber,
        title: title.substring(0, 500), // Limit title length
        description: description.substring(0, 10000), // Limit description length
        status: "New",
        incident_project_id: project.id,
        created_by: createdBy,
        assigned_to: project.lead_id, // Auto-assign to project lead
        auto_assigned: !!project.lead_id,
        source: "email"
      })
      .select("id, incident_number")
      .single();

    if (incidentError) {
      console.error("Failed to create incident:", incidentError);
      throw incidentError;
    }

    console.log("Created incident:", incident.incident_number, incident.id);

    // Log the email details
    const { error: logError } = await supabase
      .from("ticket_email_log")
      .insert({
        incident_id: incident.id,
        from_email: fromEmail,
        from_name: fromName,
        subject: emailData.subject,
        body_preview: description.substring(0, 500)
      });

    if (logError) {
      console.warn("Failed to log email:", logError);
      // Don't fail the request for logging issues
    }

    // Create assignment record if assigned
    if (project.lead_id) {
      await supabase
        .from("incident_assignments")
        .insert({
          incident_id: incident.id,
          assigned_to: project.lead_id,
          assignment_reason: "Auto-assigned to project lead (email ticket)",
          is_current: true
        });
    }

    // Send auto-reply email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: `${project.name} Support <incidentmanagement@comansservices.com.au>`,
          to: [fromEmail],
          subject: `Re: ${title} [${incident.incident_number}]`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Thank you for contacting support</h2>
              <p>Your support request has been received and assigned ticket number <strong>${incident.incident_number}</strong>.</p>
              <p>We will review your request and get back to you as soon as possible.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #666; font-size: 14px;">
                <strong>Ticket:</strong> ${incident.incident_number}<br />
                <strong>Subject:</strong> ${title}
              </p>
              <p style="color: #666; font-size: 12px;">
                Please keep this ticket number for your reference. Any replies to this email will be associated with your ticket.
              </p>
            </div>
          `,
        });
        console.log("Auto-reply sent to:", fromEmail);
      } catch (emailError) {
        console.error("Failed to send auto-reply:", emailError);
        // Don't fail the request for email issues
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        incident_id: incident.id,
        incident_number: incident.incident_number,
        message: `Ticket ${incident.incident_number} created successfully`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error processing email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);
