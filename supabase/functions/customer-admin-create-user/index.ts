import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  company_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, full_name, company_id }: CreateUserRequest = await req.json();

    console.log(`Creating customer user: ${email} for company: ${company_id}`);

    // Validate required fields
    if (!email || !password || !company_id) {
      return new Response(
        JSON.stringify({ error: "Email, password, and company_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from("customers")
      .select("id, name")
      .eq("id", company_id)
      .single();

    if (companyError || !company) {
      console.error("Company not found:", companyError);
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        company_id,
        is_customer: true,
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log(`Auth user created: ${userId}`);

    // Create customer_logins record
    const { error: loginError } = await supabaseAdmin
      .from("customer_logins")
      .insert({
        user_id: userId,
        company_id,
        email,
        full_name: full_name || null,
        role: "staff",
        is_active: true,
        must_change_password: true, // Force password change on first login
      });

    if (loginError) {
      console.error("Error creating customer_logins record:", loginError);
      // Rollback: delete the auth user if customer_logins insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Failed to create customer login: ${loginError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Customer login record created for user: ${userId}`);

    // Add customer role to user_roles table
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "customer",
      });

    if (roleError) {
      console.error("Error adding customer role:", roleError);
      // Note: We don't rollback here as the user is already created
      // The role can be added manually if needed
    } else {
      console.log(`Customer role assigned to user: ${userId}`);
    }

    // Send welcome email
    let emailSent = false;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const loginUrl = `${appBaseUrl}/customer-portal/auth`;

        const { error: emailError } = await resend.emails.send({
          from: "Comans Services <notifications@comansservices.com.au>",
          to: [email],
          subject: `Welcome to ${company.name} Customer Portal`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <span style="color: white; font-size: 28px;">🏢</span>
                </div>
                <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Welcome to the Customer Portal!</h1>
              </div>
              
              <p style="font-size: 16px;">Hi ${full_name || 'there'},</p>
              
              <p style="font-size: 16px;">Your account has been created for <strong>${company.name}</strong>. You can now access your service dashboard and manage your account.</p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Details</h3>
                <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>Password:</strong> The password provided by your administrator</p>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Log in to Customer Portal</a>
              </div>
              
              <p style="font-size: 14px; color: #666;">If you have any questions, please contact your administrator.</p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                This email was sent by Comans Services. If you did not expect this email, please contact support.
              </p>
            </body>
            </html>
          `,
        });

        if (emailError) {
          console.error("Error sending welcome email:", emailError);
        } else {
          console.log(`Welcome email sent to: ${email}`);
          emailSent = true;
        }
      } catch (emailErr) {
        console.error("Exception sending welcome email:", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY not configured, skipping welcome email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        company_id,
        company_name: company.name,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
