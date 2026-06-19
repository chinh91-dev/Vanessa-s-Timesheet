/**
 * prospect-api Edge Function
 * REST API for agentic operations on the Prospect funnel.
 *
 * Auth: Bearer token (user JWT or service role key).
 * RLS on the database enforces admin-only access.
 *
 * Routes:
 *   GET    /prospect-api/prospects               - list prospects
 *   GET    /prospect-api/prospects/:id           - get single prospect with contacts + activities
 *   POST   /prospect-api/prospects               - create prospect
 *   PATCH  /prospect-api/prospects/:id           - update prospect
 *   POST   /prospect-api/prospects/:id/activities - log activity
 *   POST   /prospect-api/prospects/:id/convert   - convert to deal
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

const PROSPECT_SELECT = `
  *,
  account:account_id(id, name),
  owner:owner_id(id, full_name, email),
  creator:created_by(id, full_name, email),
  prospect_contacts(
    id, prospect_id, contact_id, is_primary, role_label, created_at,
    contact:contact_id(id, contact_name, company_name, email)
  )
`;

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Build Supabase client from the caller's JWT (respects RLS)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Missing Authorization header", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Parse URL
  const url = new URL(req.url);
  // pathname: /prospect-api/prospects or /prospect-api/prospects/:id or /prospect-api/prospects/:id/activities
  const segments = url.pathname.replace(/^\/prospect-api\//, "").split("/").filter(Boolean);
  // segments[0] = "prospects"
  // segments[1] = id (optional)
  // segments[2] = sub-action (optional: "activities", "convert")

  const resource = segments[0]; // "prospects"
  const id = segments[1];
  const subAction = segments[2]; // "activities" | "convert" | undefined

  if (resource !== "prospects") return error("Not found", 404);

  try {
    // -------------------------------------------------------------------------
    // GET /prospects — list
    // -------------------------------------------------------------------------
    if (req.method === "GET" && !id) {
      const params = url.searchParams;
      let query = supabase.from("prospects").select(PROSPECT_SELECT).order("created_at", { ascending: false });

      if (params.get("stage")) query = query.eq("stage", params.get("stage")!);
      if (params.get("owner_id")) query = query.eq("owner_id", params.get("owner_id")!);
      if (params.get("account_id")) query = query.eq("account_id", params.get("account_id")!);

      const { data, error: err } = await query;
      if (err) return error(err.message, 500);
      return json({ prospects: data, count: data?.length ?? 0 });
    }

    // -------------------------------------------------------------------------
    // GET /prospects/:id — single
    // -------------------------------------------------------------------------
    if (req.method === "GET" && id && !subAction) {
      const { data: prospect, error: err } = await supabase
        .from("prospects")
        .select(PROSPECT_SELECT)
        .eq("id", id)
        .single();

      if (err) return error(err.message, err.code === "PGRST116" ? 404 : 500);

      // Fetch activities separately
      const { data: activities } = await supabase
        .from("prospect_activities")
        .select("*, owner:owner_id(id, full_name)")
        .eq("prospect_id", id)
        .order("activity_at", { ascending: false });

      return json({ ...prospect, prospect_activities: activities ?? [] });
    }

    // -------------------------------------------------------------------------
    // POST /prospects — create
    // -------------------------------------------------------------------------
    if (req.method === "POST" && !id) {
      const body = await req.json();

      const { data: newProspect, error: err } = await supabase
        .from("prospects")
        .insert(body)
        .select(PROSPECT_SELECT)
        .single();

      if (err) return error(err.message, 422);
      return json(newProspect, 201);
    }

    // -------------------------------------------------------------------------
    // PATCH /prospects/:id — update
    // -------------------------------------------------------------------------
    if (req.method === "PATCH" && id && !subAction) {
      const body = await req.json();

      const { data: updated, error: err } = await supabase
        .from("prospects")
        .update(body)
        .eq("id", id)
        .select(PROSPECT_SELECT)
        .single();

      if (err) return error(err.message, 422);
      return json(updated);
    }

    // -------------------------------------------------------------------------
    // POST /prospects/:id/activities — log activity
    // -------------------------------------------------------------------------
    if (req.method === "POST" && id && subAction === "activities") {
      const body = await req.json();

      const activity = { ...body, prospect_id: id };

      const { data: newActivity, error: err } = await supabase
        .from("prospect_activities")
        .insert(activity)
        .select("*")
        .single();

      if (err) return error(err.message, 422);

      // Update last_activity_at
      await supabase
        .from("prospects")
        .update({ last_activity_at: activity.activity_at || new Date().toISOString() })
        .eq("id", id);

      return json(newActivity, 201);
    }

    // -------------------------------------------------------------------------
    // POST /prospects/:id/convert — convert to deal
    // -------------------------------------------------------------------------
    if (req.method === "POST" && id && subAction === "convert") {
      const body = await req.json();
      // body: { deal_name, pipeline_stage_id, close_date, notes? }

      // Fetch prospect
      const { data: prospect, error: fetchErr } = await supabase
        .from("prospects")
        .select("*, prospect_contacts(*)")
        .eq("id", id)
        .single();

      if (fetchErr) return error(fetchErr.message, 404);
      if (prospect.converted_to_deal_id) return error("Prospect already converted", 409);
      if (prospect.stage !== "qualified") return error("Prospect must be in Qualified stage to convert", 422);

      const primaryContact = prospect.prospect_contacts?.find((pc: { is_primary: boolean }) => pc.is_primary);
      if (!primaryContact) return error("A primary contact is required before conversion", 422);

      if (!body.pipeline_stage_id) return error("pipeline_stage_id is required", 422);
      if (!body.deal_name) return error("deal_name is required", 422);
      if (!body.close_date) return error("close_date is required", 422);

      // Get calling user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Create deal
      const { data: newDeal, error: dealErr } = await supabase
        .from("deals")
        .insert({
          name: body.deal_name,
          account_id: prospect.account_id,
          pipeline_stage_id: body.pipeline_stage_id,
          primary_contact_id: primaryContact.contact_id,
          source: prospect.source || null,
          owner_id: prospect.owner_id,
          created_by: userId || prospect.created_by,
          close_date: body.close_date,
          notes: body.notes || null,
        })
        .select("id, name, deal_number")
        .single();

      if (dealErr) return error(dealErr.message, 422);

      // Update prospect
      const { error: updateErr } = await supabase
        .from("prospects")
        .update({
          converted_to_deal_id: newDeal.id,
          converted_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateErr) return error(updateErr.message, 500);

      return json({ prospect_id: id, deal: newDeal }, 201);
    }

    return error("Method not allowed", 405);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Internal server error", 500);
  }
});
