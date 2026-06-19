import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface ContactData {
  id: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  source: string;
  notes: string | null;
  company_name: string | null;
}

async function insertContactNote(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  noteContent: string
) {
  if (!noteContent?.trim()) return;
  const systemUserId = Deno.env.get("SYSTEM_USER_ID");
  if (!systemUserId) {
    console.warn("SYSTEM_USER_ID env var not set — skipping contact_notes insert for contact", contactId);
    return;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", systemUserId)
    .single();
  const { error: noteErr } = await supabase.from("contact_notes").insert({
    contact_id: contactId,
    note_content: noteContent,
    created_by: systemUserId,
    created_by_name: (profile as any)?.full_name || "Website Webhook",
  });
  if (noteErr) {
    console.error("Failed to insert contact_note:", noteErr.message);
  }
}

async function sendSalesNotifications(
  contactData: ContactData
) {
  console.log("Starting sales notification for contact:", contactData.id);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("No RESEND_API_KEY found, skipping email notification");
    return;
  }

  const resend = new Resend(resendApiKey);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">Hi Team,</h2>
      <p style="color: #666; font-size: 16px;">A new contact just came in from the Comans Services website!</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Contact Details</h3>
        <p><strong>Name:</strong> ${contactData.contact_name}</p>
        ${contactData.company_name ? `<p><strong>Company:</strong> ${contactData.company_name}</p>` : ""}
        ${contactData.email ? `<p><strong>Email:</strong> ${contactData.email}</p>` : ""}
        ${contactData.phone ? `<p><strong>Phone:</strong> ${contactData.phone}</p>` : ""}
        <p><strong>Source:</strong> ${contactData.source}</p>
        ${contactData.notes ? `<p><strong>Message:</strong> ${contactData.notes}</p>` : ""}
      </div>
      
      <p style="color: #666;">Don't let this one get away - follow up quickly!</p>
      
      <p style="margin-top: 30px;">
        <a href="${Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services"}/crm/contacts" 
           style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View in CRM
        </a>
      </p>
    </div>
  `;

  try {
    const { error: emailError } = await resend.emails.send({
      from: "Time Team <crm@comansservices.com.au>",
      to: "sales@comansservices.com.au",
      subject: `New Contact: ${contactData.contact_name}${contactData.company_name ? ` (${contactData.company_name})` : ""}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending sales notification email:", emailError);
    } else {
      console.log("Sales notification email sent to sales@comansservices.com.au");
    }
  } catch (error) {
    console.error("Failed to send sales notification email:", error);
  }
}

async function findOrCreateAccount(
  supabase: ReturnType<typeof createClient>,
  companyName: string
): Promise<string | null> {
  // Look up existing account by name
  const { data: existing, error: lookupError } = await supabase
    .from("accounts")
    .select("id")
    .eq("name", companyName.trim())
    .maybeSingle();

  if (lookupError) {
    console.error("Error looking up account:", lookupError);
    return null;
  }

  if (existing) {
    console.log(`Found existing account: ${existing.id}`);
    return existing.id;
  }

  // Create new account
  const { data: newAccount, error: insertError } = await supabase
    .from("accounts")
    .insert({
      name: companyName.trim(),
      source: "Website",
      segment: "Lead",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating account:", insertError);
    return null;
  }

  console.log(`Created new account: ${newAccount.id}`);
  return newAccount.id;
}

Deno.serve(async (req) => {
  console.log("Comans Services Webhook received request:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("COMANS_SERVICES_API_KEY");

    if (!expectedApiKey) {
      console.error("COMANS_SERVICES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error("Invalid or missing API key");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let formData: Record<string, any> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      formData = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        formData[key] = value;
      }
    } else {
      try {
        formData = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Unsupported content type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Received form data:", JSON.stringify(formData));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formType = formData.form_type || "contact";

    // ── Newsletter form ──
    if (formType === "newsletter") {
      const email = formData.email?.toString().trim();
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contactName = email.split("@")[0] || "Newsletter Subscriber";

      const { data: contact, error: insertError } = await supabase
        .from("contacts")
        .insert({
          contact_name: contactName,
          email,
          source: "Website - Newsletter",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting newsletter contact:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to subscribe", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Newsletter contact created:", contact.id);
      await insertContactNote(supabase, contact.id as string, "Newsletter subscriber from Comans Services website");
      return new Response(
        JSON.stringify({ success: true, message: "Subscribed successfully", contact_id: contact.id }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Workshop waitlist form ──
    if (formType === "workshop") {
      const name = formData.name || formData.full_name || formData.fullName;
      const email = formData.email;
      const company = formData.company || formData.company_name;
      const role = formData.role;
      const interests = formData.interests;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!email || typeof email !== "string" || email.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let accountId: string | null = null;
      if (company && typeof company === "string" && company.trim().length > 0) {
        accountId = await findOrCreateAccount(supabase, company);
      }

      const noteParts: string[] = [];
      noteParts.push("AI Workshop Waitlist submission");
      if (role) noteParts.push(`Role: ${role}`);
      if (interests) noteParts.push(`Interests: ${interests}`);

      const workshopNoteContent = noteParts.join("\n\n");
      const contactInsert: Record<string, any> = {
        contact_name: name.trim(),
        email: email.trim(),
        company_name: company?.toString().trim() || null,
        source: "Website - AI Workshop Waitlist",
      };

      if (accountId) {
        contactInsert.converted_to_account_id = accountId;
      }

      console.log("Inserting workshop contact:", JSON.stringify(contactInsert));

      const { data: contact, error: insertError } = await supabase
        .from("contacts")
        .insert(contactInsert)
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting workshop contact:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to register", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Workshop contact created:", contact.id);
      await insertContactNote(supabase, contact.id as string, workshopNoteContent);

      const contactData: ContactData = {
        id: contact.id,
        contact_name: contact.contact_name,
        phone: contact.phone,
        email: contact.email,
        source: contact.source,
        notes: workshopNoteContent || null,
        company_name: contact.company_name,
      };

      EdgeRuntime.waitUntil(sendSalesNotifications(contactData));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Workshop registration successful",
          contact_id: contact.id,
          account_id: accountId,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Contact form (default) ──
    const name = formData.name || formData.contact_name || formData.fullName || formData.full_name;
    const phone = formData.phone || formData.phoneNumber || formData.phone_number || formData.mobile;
    const email = formData.email || formData.emailAddress || formData.email_address;
    const company = formData.company || formData.company_name;
    const message = formData.message || formData.help || formData.notes;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (name.length > 255) {
      return new Response(
        JSON.stringify({ error: "Name is too long (max 255 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create account if company provided
    let accountId: string | null = null;
    if (company && typeof company === "string" && company.trim().length > 0) {
      accountId = await findOrCreateAccount(supabase, company);
    }

    // Build notes from message
    const noteParts: string[] = [];
    noteParts.push("Contact from Comans Services website");
    if (message) noteParts.push(`Message: ${message}`);

    const contactInsert: Record<string, any> = {
      contact_name: name.trim(),
      phone: phone?.toString().trim() || null,
      email: email?.toString().trim() || null,
      company_name: company?.toString().trim() || null,
      source: "Website - Contact Form",
    };
    const contactFormNoteContent = noteParts.join("\n\n");

    if (accountId) {
      contactInsert.converted_to_account_id = accountId;
    }

    console.log("Inserting contact:", JSON.stringify(contactInsert));

    const { data: contact, error: insertError } = await supabase
      .from("contacts")
      .insert(contactInsert)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting contact:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create contact", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Contact created successfully:", contact.id);
    await insertContactNote(supabase, contact.id as string, contactFormNoteContent);

    const contactData: ContactData = {
      id: contact.id,
      contact_name: contact.contact_name,
      phone: contact.phone,
      email: contact.email,
      source: contact.source,
      notes: contactFormNoteContent || null,
      company_name: contact.company_name,
    };

    EdgeRuntime.waitUntil(sendSalesNotifications(contactData));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contact created successfully",
        contact_id: contact.id,
        account_id: accountId,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
