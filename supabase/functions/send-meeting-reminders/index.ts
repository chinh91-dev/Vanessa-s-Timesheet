import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("No-op: meeting reminders disabled");

  return new Response(
    JSON.stringify({ success: true, message: "Function disabled", emailsSent: 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
