import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createHmac } from "node:crypto";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VercelDeploymentPayload {
  type: string;
  payload: {
    deployment: {
      id: string;
      url: string;
      name: string; // This IS the project name in Vercel webhooks
      meta?: {
        githubCommitRef?: string;
        githubCommitSha?: string;
        githubCommitMessage?: string;
        githubCommitAuthorName?: string;
      };
    };
    project: {
      id: string;
      // Note: name is NOT provided in deployment.error events
    };
    team?: {
      id: string;
      slug?: string;
    };
    user?: {
      id: string;
    };
    links?: {
      deployment: string; // Direct URL to Vercel dashboard deployment
      project: string;    // Direct URL to Vercel dashboard project
    };
    target?: string;
    error?: {
      message?: string;
      code?: string;
    };
  };
  createdAt: number;
}

async function verifyVercelSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const hmac = createHmac("sha1", secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying Vercel signature:", error);
    return false;
  }
}

async function sendDeploymentFailureEmail(payload: VercelDeploymentPayload): Promise<void> {
  const { deployment, team, error, links } = payload.payload;
  const meta = deployment?.meta || {};
  
  // deployment.name IS the project name in Vercel webhooks
  const projectName = deployment?.name || "Unknown Project";
  const teamSlug = team?.slug || "";
  const deploymentUrl = deployment?.url ? `https://${deployment.url}` : "N/A";
  const gitBranch = meta.githubCommitRef || "N/A";
  const commitSha = meta.githubCommitSha ? meta.githubCommitSha.substring(0, 7) : "N/A";
  const commitMessage = meta.githubCommitMessage || "N/A";
  const commitAuthor = meta.githubCommitAuthorName || "N/A";
  const errorMessage = error?.message || payload.type || "Deployment failed";
  const errorCode = error?.code || "N/A";
  const timestamp = new Date(payload.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
  
  // Use Vercel's provided links if available, otherwise construct a fallback
  const logsUrl = links?.deployment || `https://vercel.com/${teamSlug ? teamSlug + "/" : ""}${projectName}/deployments/${deployment?.id}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; }
        .info-row { display: flex; margin-bottom: 8px; }
        .info-label { color: #6b7280; width: 140px; flex-shrink: 0; }
        .info-value { color: #111827; font-weight: 500; }
        .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-top: 12px; }
        .error-text { color: #dc2626; font-weight: 500; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Deployment Failed</h1>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">Project Details</div>
            <div class="info-row">
              <span class="info-label">Project:</span>
              <span class="info-value">${projectName}</span>
            </div>
            ${teamSlug ? `<div class="info-row">
              <span class="info-label">Team:</span>
              <span class="info-value">${teamSlug}</span>
            </div>` : ""}
            <div class="info-row">
              <span class="info-label">Deployment URL:</span>
              <span class="info-value">${deploymentUrl}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Timestamp:</span>
              <span class="info-value">${timestamp}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Git Information</div>
            <div class="info-row">
              <span class="info-label">Branch:</span>
              <span class="info-value">${gitBranch}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Commit:</span>
              <span class="info-value">${commitSha}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Author:</span>
              <span class="info-value">${commitAuthor}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Message:</span>
              <span class="info-value">${commitMessage}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Error Details</div>
            <div class="error-box">
              <div class="error-text">${errorMessage}</div>
              ${errorCode !== "N/A" ? `<div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Error Code: ${errorCode}</div>` : ""}
            </div>
          </div>
          
          <a href="${logsUrl}" class="button">View Deployment Logs →</a>
        </div>
        <div class="footer">
          This notification was sent by your Vercel deployment monitoring system.
        </div>
      </div>
    </body>
    </html>
  `;

  const emailResponse = await resend.emails.send({
    from: "Deployment Monitor <noreply@comansservices.com.au>",
    to: ["support@comansservices.com.au"],
    subject: `🚨 Deployment Failed: ${projectName}`,
    html: emailHtml,
  });

  console.log("Deployment failure email sent:", emailResponse);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-vercel-signature");
    const webhookSecret = Deno.env.get("VERCEL_WEBHOOK_SECRET");

    console.log("Received Vercel webhook");
    console.log("Signature present:", !!signature);

    // Verify webhook signature
    if (!webhookSecret) {
      console.error("VERCEL_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (signature) {
      const isValid = await verifyVercelSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      console.log("Webhook signature verified");
    } else {
      console.warn("No signature provided - skipping verification (development mode)");
    }

    const payload: VercelDeploymentPayload = JSON.parse(rawBody);
    console.log("Webhook type:", payload.type);
    console.log("Project name (from deployment.name):", payload.payload?.deployment?.name);
    console.log("Links provided:", JSON.stringify(payload.payload?.links));
    console.log("Full payload:", JSON.stringify(payload, null, 2));

    // Check if this is a deployment error event
    if (payload.type === "deployment.error" || payload.type === "deployment-error") {
      console.log("Deployment error detected, sending notification email...");
      await sendDeploymentFailureEmail(payload);
      console.log("Notification email sent successfully");
    } else {
      console.log("Event type not handled:", payload.type);
    }

    return new Response(JSON.stringify({ success: true, type: payload.type }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing Vercel webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
