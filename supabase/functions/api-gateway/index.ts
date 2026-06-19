import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AsyncLocalStorage } from "node:async_hooks";

// Per-request CORS context. AsyncLocalStorage propagates across awaits
// inside a single request without leaking to concurrent requests on the
// same isolate. Used by `json()` and `richError()` so they don't need a
// signature change.
const corsContext = new AsyncLocalStorage<{ origin: string | null }>();

const RAW_ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").trim();
const STRICT_CORS_ENABLED = RAW_ALLOWED_ORIGINS.length > 0;
const ALLOWED_ORIGINS_LIST = RAW_ALLOWED_ORIGINS
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function getRequestCorsHeaders(): Record<string, string> {
  // When ALLOWED_ORIGINS is unset, fall back to the legacy `*` policy
  // for backward compatibility. When set, echo only allowed origins and
  // signal `Vary: Origin` so caches don't share responses across origins.
  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };
  if (!STRICT_CORS_ENABLED) {
    return { ...baseHeaders, "Access-Control-Allow-Origin": "*" };
  }
  const ctx = corsContext.getStore();
  const origin = ctx?.origin ?? null;
  if (origin && ALLOWED_ORIGINS_LIST.includes(origin)) {
    return {
      ...baseHeaders,
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
    };
  }
  // Origin not in allowlist (or absent): omit the allow-origin header so
  // the browser blocks the response.
  return { ...baseHeaders, "Vary": "Origin" };
}

const API_VERSION = "2.12.5";

// Legacy `corsHeaders` constant removed. CORS is now request-scoped via
// `getRequestCorsHeaders()` which honors the `ALLOWED_ORIGINS` env var.
// See top-of-file imports.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OHS_SUPABASE_URL = Deno.env.get("OHS_SUPABASE_URL") ?? "";
const OHS_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("OHS_SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Hoisted Supabase clients reused across requests inside this isolate.
// Avoids per-request handshake/GC churn that the previous in-handler
// `createClient(...)` calls produced on every invocation.
const sharedSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const sharedOhsSupabase =
  OHS_SUPABASE_URL && OHS_SUPABASE_SERVICE_ROLE_KEY
    ? createClient(OHS_SUPABASE_URL, OHS_SUPABASE_SERVICE_ROLE_KEY)
    : null;

// ─── In-memory rate limiter ────────────────────────────────────────────────
// Token-bucket per api key (success path) and per source IP (auth-fail path).
// IMPORTANT: state is per-isolate. With multiple Deno workers behind the
// edge function, each worker enforces its own bucket independently. This
// mitigates trivial floods but is NOT a strong distributed limit. A durable
// limiter (Redis / Postgres) is a separate ticket.
const KEY_BUCKET_CAPACITY = Number(Deno.env.get("RATE_LIMIT_PER_KEY_PER_MIN") ?? "1000");
const IP_AUTHFAIL_BUCKET_CAPACITY = Number(Deno.env.get("RATE_LIMIT_AUTHFAIL_PER_IP_PER_MIN") ?? "20");
const REFILL_INTERVAL_MS = 60_000;

interface Bucket {
  tokens: number;
  lastRefill: number;
}
const keyBuckets = new Map<string, Bucket>();
const ipFailBuckets = new Map<string, Bucket>();

function takeToken(map: Map<string, Bucket>, id: string, capacity: number): boolean {
  const now = Date.now();
  const existing = map.get(id);
  if (!existing) {
    map.set(id, { tokens: capacity - 1, lastRefill: now });
    return true;
  }
  const elapsed = now - existing.lastRefill;
  if (elapsed >= REFILL_INTERVAL_MS) {
    const refills = Math.floor(elapsed / REFILL_INTERVAL_MS);
    existing.tokens = Math.min(capacity, existing.tokens + refills * capacity);
    existing.lastRefill += refills * REFILL_INTERVAL_MS;
  }
  if (existing.tokens <= 0) return false;
  existing.tokens -= 1;
  return true;
}

// ─── Coalesced last_used_at writer ─────────────────────────────────────────
// Replaces the previous fire-and-forget UPDATE per request, which created an
// unbounded unhandled-promise queue under load. Pending key ids are buffered
// in memory and flushed in a single UPDATE every FLUSH_INTERVAL_MS.
const FLUSH_INTERVAL_MS = 30_000;
const pendingLastUsed = new Map<string, string>(); // keyId -> ISO timestamp

function recordKeyUsed(keyId: string) {
  pendingLastUsed.set(keyId, new Date().toISOString());
}

async function flushLastUsed() {
  if (pendingLastUsed.size === 0) return;
  // Snapshot then clear so newly arriving writes during flush are not lost.
  const snapshot = Array.from(pendingLastUsed.entries());
  pendingLastUsed.clear();
  // Group by timestamp bucket would let us batch into fewer queries; per-key
  // UPDATEs are correct and bounded by the snapshot size. Timestamps within
  // a 30s window are close enough that a single representative is fine.
  const latestTs = snapshot.reduce((acc, [, ts]) => (ts > acc ? ts : acc), snapshot[0][1]);
  const ids = snapshot.map(([id]) => id);
  const { error } = await sharedSupabase
    .from("api_keys")
    .update({ last_used_at: latestTs })
    .in("id", ids);
  if (error) {
    console.warn("[auth] flushLastUsed failed:", error.message);
    // Re-queue on failure so we don't lose updates.
    for (const [id, ts] of snapshot) {
      // Only re-queue if no newer write has occurred for the same key.
      if (!pendingLastUsed.has(id)) pendingLastUsed.set(id, ts);
    }
  }
}

// Periodic flush. Deno isolates may sleep between requests; the interval
// keeps ticking only while the isolate is active, which is acceptable
// (writes coalesce until next request anyway).
setInterval(() => {
  flushLastUsed().catch((e) => console.warn("[auth] flushLastUsed threw:", e));
}, FLUSH_INTERVAL_MS);

// Role-based scope mapping
const ROLE_SCOPES: Record<string, string[]> = {
  admin: [
    "incidents:read", "incidents:write",
    "timesheet:read", "timesheet:write",
    "projects:read", "projects:write",
    "contacts:read", "contacts:write",
    "leaves:read", "leaves:write",
    "expenses:read", "expenses:write",
    "customers:read", "customers:write",
    "profiles:read",
    "accounts:read", "accounts:write",
    "deals:read", "deals:write",
    "meetings:read", "meetings:write",
    "contracts:read", "contracts:write",
    "work-schedules:read", "work-schedules:write",
    "work-location:read", "work-location:write",
    "assets:read", "assets:write",
    "prospects:read", "prospects:write",
    "ohs:read", "ohs:write",
  ],
  manager: [
    "incidents:read", "incidents:write",
    "timesheet:read", "timesheet:write",
    "projects:read", "projects:write",
    "contracts:read", "contracts:write",
    "leaves:read", "leaves:write",
    "expenses:read", "expenses:write",
    "customers:read", "customers:write",
    "profiles:read",
    "work-location:read", "work-location:write",
    "work-schedules:read",
    "assets:read", "assets:write",
  ],
  sale_manager: [
    "incidents:read", "incidents:write",
    "contacts:read", "contacts:write",
    "accounts:read", "accounts:write",
    "deals:read", "deals:write",
    "meetings:read", "meetings:write",
    "customers:read", "customers:write",
    "profiles:read",
    "prospects:read", "prospects:write",
    "timesheet:read", "timesheet:write",
    "work-location:read", "work-location:write",
    "work-schedules:read",
    "assets:read", "assets:write",
    "contracts:read",
    "projects:read",
    "leaves:read", "leaves:write",
    "expenses:read", "expenses:write",
  ],
  sale_user: [
    "incidents:read", "incidents:write",
    "contacts:read", "contacts:write",
    "accounts:read", "accounts:write",
    "deals:read", "deals:write",
    "meetings:read", "meetings:write",
    "customers:read",
    "profiles:read",
    "prospects:read", "prospects:write",
    "timesheet:read", "timesheet:write",
    "work-location:read", "work-location:write",
    "work-schedules:read",
    "expenses:read", "expenses:write",
    "assets:read",
    "projects:read",
    "contracts:read",
    "leaves:read", "leaves:write",
  ],
  employee: [
    "incidents:read", "incidents:write",
    "timesheet:read", "timesheet:write",
    "projects:read",
    "contracts:read",
    "leaves:read", "leaves:write",
    "expenses:read", "expenses:write",
    "work-location:read", "work-location:write",
    "work-schedules:read",
    "profiles:read",
    "assets:read", "assets:write",
  ],
  customer: [
    "incidents:read",
    "profiles:read",
  ],
};

async function getEffectiveScopes(
  supabase: ReturnType<typeof createClient>,
  keyRecord: { scopes: string[]; assigned_to: string | null }
): Promise<string[]> {
  if (!keyRecord.assigned_to) {
    return keyRecord.scopes;
  }

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", keyRecord.assigned_to)
    .limit(1)
    .single();

  const currentRole = data?.role as string | null;
  if (!currentRole) return [];

  const allowedByRole = ROLE_SCOPES[currentRole] || [];
  return keyRecord.scopes.filter((s) => allowedByRole.includes(s));
}

async function checkIsAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  return data?.role === "admin";
}

async function userCanSeeAllLeaves(
  supabase: ReturnType<typeof createClient>,
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  const role = data?.role as string | undefined;
  return role === "admin" || role === "manager";
}

async function enforceCasualUnpaidOnly(
  supabase: ReturnType<typeof createClient>,
  apiKeyUserId: string | null | undefined,
  leaveTypeId: string | undefined,
  targetUserId?: string | null
): Promise<Response | null> {
  if (!leaveTypeId) return null;
  const subjectId = targetUserId || apiKeyUserId;
  if (!subjectId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("employment_type")
    .eq("id", subjectId)
    .maybeSingle();
  const empType = (profile as any)?.employment_type as string | undefined;
  if (empType !== "casual" && empType !== "temporary") return null;

  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("name")
    .eq("id", leaveTypeId)
    .maybeSingle();
  const name = ((leaveType as any)?.name || "").toLowerCase();
  if (name === "unpaid leave") return null;

  return richError(
    "CASUAL_UNPAID_ONLY",
    "Casual and temporary employees can only apply for Unpaid Leave",
    403,
    "Use GET /leave-types to find the Unpaid Leave id, then pass it as leave_type_id"
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getRequestCorsHeaders(), "Content-Type": "application/json" },
  });
}

function richError(
  code: string,
  message: string,
  status = 400,
  hint?: string,
  fix_example?: unknown
) {
  return json(
    {
      error: {
        code,
        message,
        ...(hint ? { hint } : {}),
        ...(fix_example ? { fix_example } : {}),
      },
    },
    status
  );
}

function error(message: string, status = 400) {
  return richError("ERROR", message, status);
}

function parseDbError(err: any, resource: string): Response {
  const msg = err?.message || String(err);
  const code = err?.code || "";

  const nnMatch = msg.match(/null value in column "([^"]+)" .* not-null constraint/i);
  if (nnMatch) {
    const col = nnMatch[1];
    return richError("MISSING_REQUIRED_FIELD", `Missing required field: ${col}`, 400, `Provide a value for "${col}" in your request body`, { [col]: `<required>` });
  }

  if (code === "23505" || msg.includes("duplicate key value")) {
    const ukMatch = msg.match(/Key \(([^)]+)\)=\(([^)]+)\) already exists/i);
    return richError("DUPLICATE_VALUE", ukMatch ? `Duplicate value for ${ukMatch[1]}: ${ukMatch[2]}` : "Duplicate value", 409, "Use a unique value or update the existing record");
  }

  if (code === "23503" || msg.includes("violates foreign key constraint")) {
    const fkMatch = msg.match(/Key \(([^)]+)\)=\(([^)]+)\) is not present/i);
    return richError("INVALID_REFERENCE", fkMatch ? `Invalid reference: ${fkMatch[1]}="${fkMatch[2]}" does not exist` : "Invalid foreign key reference", 400, "Check that the referenced record exists");
  }

  if (code === "22P02" || msg.includes("invalid input value for enum")) {
    const enumMatch = msg.match(/invalid input value for enum (\w+): "([^"]+)"/i);
    if (enumMatch) {
      // Surface the exact allowed values from meta if we have them, keyed by the DB field name
      const meta = RESOURCE_META[resource];
      const allAllowed = meta?.allowed_values as Record<string, string[]> | undefined;
      let allowedHint = `Check /meta/${resource} for allowed values`;
      if (allAllowed) {
        // Find which meta field maps to this enum type (field name often equals DB enum name)
        const fieldEntry = Object.entries(allAllowed).find(([k]) =>
          k.replace(/-/g, "_") === enumMatch[1] || enumMatch[1].includes(k.replace(/-/g, "_"))
        );
        if (fieldEntry) {
          allowedHint = `Allowed values for ${fieldEntry[0]}: ${fieldEntry[1].join(", ")}`;
        }
      }
      return richError(
        "INVALID_ENUM_VALUE",
        `Invalid value "${enumMatch[2]}" for field ${enumMatch[1]}`,
        400,
        allowedHint,
        allAllowed ? { allowed_values: allAllowed } : undefined
      );
    }
  }

  return richError("DB_ERROR", msg, 400, `Check /meta/${resource} for field requirements`);
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateApiKey(
  supabase: ReturnType<typeof createClient>,
  apiKey: string
) {
  const trimmedKey = apiKey.trim();
  const keyHash = await hashKey(trimmedKey);

  const { data, error: err } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  console.log("[auth] DB lookup:", { found: !!data, error: err?.message || null });

  if (err || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // Coalesced last_used_at — buffered, flushed periodically by flushLastUsed().
  recordKeyUsed(data.id);

  return data;
}

function checkScope(
  scopes: string[],
  resource: string,
  operation: "read" | "write"
): boolean {
  return (
    scopes.includes(`${resource}:${operation}`) ||
    scopes.includes(`${resource}:*`) ||
    scopes.includes("*:*")
  );
}

function parseRoute(url: URL): { resource: string; id?: string; action?: string } {
  const path = url.pathname.replace(/^\/api-gateway\/?/, "");
  const parts = path.split("/").filter(Boolean);
  return { resource: parts[0] || "", id: parts[1], action: parts[2] };
}

async function resolveNameToId(
  supabase: ReturnType<typeof createClient>,
  table: string,
  nameColumn: string,
  nameValue: string,
  label: string
): Promise<{ id: string } | Response> {
  const { data, error: err } = await supabase
    .from(table)
    .select("id")
    .ilike(nameColumn, nameValue);

  if (err) return error(`Failed to resolve ${label}: ${err.message}`);
  if (!data || data.length === 0) {
    return richError(`${label.toUpperCase()}_NOT_FOUND`, `No ${label} found matching "${nameValue}"`, 404, `Check available values via GET /${table}`, { [`${label}_name`]: nameValue });
  }
  if (data.length > 1) {
    return richError("AMBIGUOUS_MATCH", `Multiple ${label}s match "${nameValue}": ${data.length} results`, 400, "Use the exact name or provide the ID directly", { matches: data.map((d: any) => d.id) });
  }
  return { id: data[0].id };
}

async function resolveBodyNames(
  supabase: ReturnType<typeof createClient>,
  body: any
): Promise<Response | null> {
  if (body?.account_name && !body?.account_id) {
    const result = await resolveNameToId(supabase, "accounts", "name", body.account_name, "account");
    if (result instanceof Response) return result;
    body.account_id = result.id;
    delete body.account_name;
  }

  if (body?.contact_name && !body?.primary_contact_id && !body?.contact_id) {
    const result = await resolveNameToId(supabase, "contacts", "contact_name", body.contact_name, "contact");
    if (result instanceof Response) return result;
    if (body.pipeline_stage_id || body.stage_name) {
      body.primary_contact_id = result.id;
    } else {
      body.contact_id = result.id;
    }
    delete body.contact_name;
  }

  if (body?.customer_name && !body?.customer_id) {
    const result = await resolveNameToId(supabase, "customers", "name", body.customer_name, "customer");
    if (result instanceof Response) return result;
    body.customer_id = result.id;
    delete body.customer_name;
  }

  if (body?.deal_name && !body?.deal_id) {
    const result = await resolveNameToId(supabase, "deals", "name", body.deal_name, "deal");
    if (result instanceof Response) return result;
    body.deal_id = result.id;
    delete body.deal_name;
  }

  if (body?.stage_name && !body?.pipeline_stage_id) {
    const result = await resolveNameToId(supabase, "pipeline_stages", "name", body.stage_name, "stage");
    if (result instanceof Response) return result;
    body.pipeline_stage_id = result.id;
    delete body.stage_name;
  }

  if (body?.owner_name && !body?.owner_id) {
    const result = await resolveNameToId(supabase, "profiles", "full_name", body.owner_name, "owner");
    if (result instanceof Response) return result;
    body.owner_id = result.id;
    delete body.owner_name;
  }

  if (body?.category_name && !body?.category_id) {
    const result = await resolveNameToId(supabase, "expense_categories", "name", body.category_name, "category");
    if (result instanceof Response) return result;
    body.category_id = result.id;
    delete body.category_name;
  }

  if (body?.subcategory_name && !body?.subcategory_id) {
    const result = await resolveNameToId(supabase, "expense_subcategories", "name", body.subcategory_name, "subcategory");
    if (result instanceof Response) return result;
    body.subcategory_id = result.id;
    delete body.subcategory_name;
  }

  return null;
}

// Coerce empty-string values on UUID-shaped fields to null.
// Postgres rejects "" for uuid columns with: invalid input syntax for type uuid: ""
// Frontend forms commonly submit "" for "no value" on uuid selects (account_id, owner_id,
// pipeline_stage_id, contact_id, etc). Convert those to null so the column is cleared.
// Targets any field ending in "_id", "_by", or "assigned_to" / "inspector_id".
function coerceEmptyUuidsToNull(body: any): any {
  if (!body || typeof body !== "object") return body;
  for (const [k, v] of Object.entries(body)) {
    if (v !== "") continue;
    if (
      k.endsWith("_id") ||
      k.endsWith("_by") ||
      k === "assigned_to" ||
      k === "inspector_id" ||
      k === "manager_taking_report"
    ) {
      (body as any)[k] = null;
    }
  }
  return body;
}

function sanitizePatchBody(body: any, resource: string): any {
  const meta = RESOURCE_META[resource];
  if (!meta || !body) return body;
  const rf = meta.required_fields as string[] | undefined;
  const of_ = meta.optional_fields as string[] | undefined;
  const nr = meta.name_resolvable as Record<string, string> | undefined;
  if (!rf && !of_) return body; // no metadata to filter against
  const allowed = new Set([
    ...(rf || []),
    ...(of_ || []),
    ...Object.keys(nr || {}),
  ]);
  const filtered = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.has(k))
  );
  return filtered;
}

// Semantic synonyms for enum fields — tried before the case-insensitive exact-match fallback.
// Key: normalised incoming value (lowercase, no spaces/hyphens/underscores)
// Value: canonical enum string that exists in the DB
const ENUM_SYNONYMS: Record<string, string> = {
  // inspection_status synonyms
  compliant: "Compliant",
  pass: "Compliant",
  passed: "Compliant",
  ok: "Compliant",
  good: "Compliant",
  green: "Compliant",
  noncompliant: "Non-Compliant",
  fail: "Non-Compliant",
  failed: "Non-Compliant",
  failing: "Non-Compliant",
  red: "Non-Compliant",
  na: "Not Applicable",
  notapplicable: "Not Applicable",
  action: "Requires Action",
  actionrequired: "Requires Action",
  amber: "Requires Action",
  yellow: "Requires Action",
  // ohs_status synonyms
  open: "Open",
  inprogress: "In Progress",
  underreview: "Under Review",
  closed: "Closed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  // likelihood / consequence synonyms
  veryunlikely: "Very Unlikely",
  verylikely: "Very Likely",
  insignificant: "Insignificant",
  catastrophic: "Catastrophic",
};

function normalizeEnumValues(body: any, resource: string): any {
  const meta = RESOURCE_META[resource];
  if (!meta || !body) return body;
  const av = meta.allowed_values as Record<string, string[]> | undefined;
  if (!av) return body;
  const normalize = (s: string) => s.toLowerCase().replace(/[-_ ]/g, "");
  for (const [field, allowed] of Object.entries(av)) {
    if (body[field] == null) continue;
    const raw = String(body[field]);
    // 1. Exact match — no change needed
    if (allowed.includes(raw)) continue;
    // 2. Semantic synonym lookup (e.g. "pass" → "Compliant", "fail" → "Non-Compliant")
    const normalizedRaw = normalize(raw);
    const synonym = ENUM_SYNONYMS[normalizedRaw];
    if (synonym && allowed.includes(synonym)) {
      body[field] = synonym;
      continue;
    }
    // 3. Case-insensitive match ignoring underscores, hyphens, spaces
    const match = allowed.find((v) => normalize(v) === normalizedRaw);
    if (match) body[field] = match;
    // If no match, leave as-is — DB will reject with a clear error and allowed_values in response
  }
  return body;
}

async function checkIdempotency(
  supabase: ReturnType<typeof createClient>,
  key: string
): Promise<Response | null> {
  const { data } = await supabase
    .from("api_idempotency_keys")
    .select("response_status, response_body")
    .eq("idempotency_key", key)
    .single();

  if (data) {
    return json(data.response_body, data.response_status);
  }
  return null;
}

async function saveIdempotency(
  supabase: ReturnType<typeof createClient>,
  key: string,
  resource: string,
  response: Response
): Promise<Response> {
  const cloned = response.clone();
  const body = await cloned.json();
  supabase
    .from("api_idempotency_keys")
    .upsert({
      idempotency_key: key,
      resource,
      response_status: response.status,
      response_body: body,
    })
    .then();
  return response;
}

// ============================================================================
// RESOLVE, SEARCH, META, VERSION, CHANGELOG
// ============================================================================

async function handleResolve(
  supabase: ReturnType<typeof createClient>,
  searchParams: URLSearchParams
) {
  const q = searchParams.get("q");
  if (!q) return error("Missing required query parameter: q");

  const typesParam = searchParams.get("type") || "deal,account,contact,stage";
  const types = typesParam.split(",").map((t) => t.trim());
  const pattern = `%${q}%`;
  const results: any[] = [];

  const searches: Promise<void>[] = [];

  if (types.includes("deal")) {
    searches.push(
      (async () => {
        const { data } = await supabase.from("deals").select("id, name, deal_number").or(`name.ilike.${pattern},deal_number.ilike.${pattern}`).limit(10);
        (data || []).forEach((d: any) => {
          const nameMatch = d.name?.toLowerCase().includes(q.toLowerCase());
          results.push({ id: d.id, name: d.name || d.deal_number, type: "deal", score: (d.name?.toLowerCase() === q.toLowerCase() || d.deal_number?.toLowerCase() === q.toLowerCase()) ? 1.0 : 0.7, why_matched: nameMatch ? "name" : "deal_number" });
        });
      })()
    );
  }

  if (types.includes("account")) {
    searches.push(
      (async () => {
        const { data } = await supabase.from("accounts").select("id, name").ilike("name", pattern).limit(10);
        (data || []).forEach((d: any) => {
          results.push({ id: d.id, name: d.name, type: "account", score: d.name?.toLowerCase() === q.toLowerCase() ? 1.0 : 0.7, why_matched: "name" });
        });
      })()
    );
  }

  if (types.includes("contact")) {
    searches.push(
      (async () => {
        const { data } = await supabase.from("contacts").select("id, contact_name, company_name").or(`contact_name.ilike.${pattern},company_name.ilike.${pattern}`).limit(10);
        (data || []).forEach((d: any) => {
          const nameMatch = d.contact_name?.toLowerCase().includes(q.toLowerCase());
          results.push({ id: d.id, name: d.contact_name || d.company_name, type: "contact", score: d.contact_name?.toLowerCase() === q.toLowerCase() ? 1.0 : 0.7, why_matched: nameMatch ? "contact_name" : "company_name" });
        });
      })()
    );
  }

  if (types.includes("stage")) {
    searches.push(
      (async () => {
        const { data } = await supabase.from("pipeline_stages").select("id, name, stage_order, is_active").ilike("name", pattern).limit(10);
        (data || []).forEach((d: any) => {
          results.push({ id: d.id, name: d.name, type: "stage", score: d.name?.toLowerCase() === q.toLowerCase() ? 1.0 : 0.7, why_matched: "name" });
        });
      })()
    );
  }

  if (types.includes("customer")) {
    searches.push(
      (async () => {
        const { data } = await supabase.from("customers").select("id, name").ilike("name", pattern).limit(10);
        (data || []).forEach((d: any) => {
          results.push({ id: d.id, name: d.name, type: "customer", score: d.name?.toLowerCase() === q.toLowerCase() ? 1.0 : 0.7, why_matched: "name" });
        });
      })()
    );
  }

  if (types.includes("project")) {
    searches.push(
      (async () => {
        const { data } = await supabase.from("projects").select("id, name").ilike("name", pattern).limit(10);
        (data || []).forEach((d: any) => {
          results.push({ id: d.id, name: d.name, type: "project", score: d.name?.toLowerCase() === q.toLowerCase() ? 1.0 : 0.7, why_matched: "name" });
        });
      })()
    );
  }

  await Promise.all(searches);
  results.sort((a, b) => b.score - a.score);
  return json({ query: q, results });
}

async function handleSearch(
  supabase: ReturnType<typeof createClient>,
  searchParams: URLSearchParams
) {
  const q = searchParams.get("q");
  if (!q) return error("Missing required query parameter: q");

  const pattern = `%${q}%`;
  const [deals, accounts, contacts, customers, projects, prospects] = await Promise.all([
    supabase.from("deals").select("id, name, deal_number, account_id, pipeline_stage_id").or(`name.ilike.${pattern},deal_number.ilike.${pattern}`).limit(10),
    supabase.from("accounts").select("id, name, industry, segment").ilike("name", pattern).limit(10),
    supabase.from("contacts").select("id, contact_name, company_name, email").or(`contact_name.ilike.${pattern},company_name.ilike.${pattern}`).limit(10),
    supabase.from("customers").select("id, name, industry").ilike("name", pattern).limit(10),
    supabase.from("projects").select("id, name").ilike("name", pattern).limit(10),
    supabase.from("prospects").select("id, name, stage, priority, account_id").ilike("name", pattern).limit(10),
  ]);

  return json({
    query: q,
    deals: deals.data || [],
    accounts: accounts.data || [],
    contacts: contacts.data || [],
    customers: customers.data || [],
    projects: projects.data || [],
    prospects: prospects.data || [],
  });
}

// ============================================================================
// META ENDPOINT
// ============================================================================

const RESOURCE_META: Record<string, any> = {
  deals: {
    required_fields: ["name"],
    optional_fields: ["account_id", "pipeline_stage_id", "amount", "contract_value", "contract_term_months", "billing_cadence", "contract_type", "gst_treatment", "close_date", "next_step", "next_step_due_date", "source", "primary_contact_id", "owner_id", "notes", "status", "discount_amount"],
    notes: [
      "owner_id (UUID → profiles.id): the assigned user shown on the deal card. Use owner_name alias to resolve by full name.",
      "POST /deals — created_by is auto-set from the API key's assigned user if not provided, ensuring new deals are always attributed and never show as Unassigned.",
      "amount: display value shown on deal cards. Use PATCH /deals/:id/amount for a dedicated update, or include amount in a standard PATCH /deals/:id.",
      "contract_value: the commercial/negotiated value. Independent of amount — both can be set in a single PATCH.",
      "GET /deals and GET /deals/:id responses include owner_name (resolved from profiles) alongside owner_id.",
    ],
    name_resolvable: {
      stage_name: "Resolves to pipeline_stage_id via pipeline_stages.name",
      account_name: "Resolves to account_id via accounts.name",
      contact_name: "Resolves to primary_contact_id via contacts.contact_name",
      owner_name: "Resolves to owner_id via profiles.full_name",
    },
    allowed_values: {
      status: ["draft", "pending_approval", "approved", "active", "completed", "cancelled"],
      billing_cadence: ["monthly", "quarterly", "annually", "one_time"],
      gst_treatment: ["gst_inclusive", "gst_exclusive", "gst_free"],
    },
    special_endpoints: {
      "PATCH /deals/:id/amount": "Update the deal display amount. Required: { amount: number }.",
      "POST /deals/:id/transition": "Workflow-safe stage move. Body: { to_stage: 'Discovery' }",
      "GET /deals/:id/notes": "List deal stage notes. Params: limit",
      "POST /deals/:id/notes": "Add a deal stage note. Required: note_content. Optional: stage_name, stage_id, lost_reason, lost_reason_other",
      "GET /deals/:id/history": "List deal stage transition history with stage names. Params: limit",
    },
  },
  contacts: {
    required_fields: ["contact_name", "source"],
    optional_fields: ["company_name", "email", "phone", "work_phone", "mobile_phone", "title", "owner_id", "converted_to_account_id"],
    notes: [
      "If first_name/last_name are provided without contact_name, the API auto-composes contact_name as 'first_name last_name'",
      "The legacy 'notes' column is no longer accepted. Use POST /contacts/:id/notes with { note_content } to add notes (stored in contact_notes table).",
      "POST /contacts/:id/convert-to-prospect — promote a contact into a Prospect pursuit (stage='new'). Body (all optional): name (defaults to '<company> - Outreach'), priority (low|medium|high, default 'medium'), source, segment, account_id (defaults to contact's converted_to_account_id), summary. The contact is auto-linked as the prospect's primary contact via prospect_contacts. owner_id and created_by auto-fill from API key user / contact owner.",
    ],
    sub_resources: {
      "convert-to-prospect": "POST /contacts/:id/convert-to-prospect — see notes. Returns { prospect, primary_contact_id }.",
      notes: "GET/POST/DELETE /contacts/:id/notes — see contact_notes table.",
    },
    allowed_values: {
      source: ["website", "referral", "linkedin", "email_campaign", "event", "cold_outreach", "partner", "existing_client"],
    },
  },
  accounts: {
    required_fields: ["name"],
    optional_fields: ["abn", "acn", "has_trading_name", "trading_name", "website", "email", "account_email", "phone", "industry", "segment", "description", "street_address", "suburb", "state_au", "postcode", "postal_different", "postal_street_address", "postal_suburb", "postal_state", "postal_postcode", "owner_id"],
    allowed_values: {
      segment: ["enterprise", "mid_market", "small_business", "startup"],
    },
    notes: [
      "DELETE /accounts/:id — permanently deletes the account. Requires accounts:write scope (admin role).",
      "POST /accounts — if company_name is provided on a contact, the gateway auto-creates or links an account.",
      "segment must be one of the allowed values; omit to leave unset.",
    ],
  },
  meetings: {
    required_fields: ["title", "meeting_date", "start_time", "meeting_type"],
    optional_fields: ["end_time", "location", "description", "contact_id", "account_id", "deal_id", "prospect_id", "contact_name", "contact_phone", "contact_email", "status", "owner_id"],
    notes: [
      "meeting_type required. owner_id always auto-filled from API key user (overrides any value sent)",
      "Meeting notes live in crm_meeting_notes table. Access via sub-resource:",
      "GET /meetings/:id/notes — list notes for a meeting. Optional query: limit (default 50).",
      "POST /meetings/:id/notes — add note. Required: content (or note_content alias). Optional: note_type (default 'general'), note_date. created_by auto-filled from API key user.",
      "PATCH /meetings/:id/notes?note_id=<uuid> — update a note. Accepts content, note_type, note_date.",
      "DELETE /meetings/:id/notes?note_id=<uuid> — delete a note.",
    ],
    name_resolvable: {
      contact_name: "Resolves to contact_id via contacts.contact_name",
      account_name: "Resolves to account_id via accounts.name",
      deal_name: "Resolves to deal_id via deals.name",
      prospect_name: "Resolves to prospect_id via prospects.name",
    },
    allowed_values: {
      meeting_type: ["new_contact", "existing_client", "follow_up"],
      status: ["scheduled", "completed", "cancelled", "no_show"],
    },
  },
  contracts: {
    required_fields: ["name", "start_date", "end_date", "status"],
    optional_fields: ["description", "customer_id", "deal_id", "contract_value", "billing_cadence", "contract_type", "gst_treatment", "signature_status", "is_active", "signature_url", "signed_date", "project_key", "project_id"],
    name_resolvable: {
      customer_name: "Resolves to customer_id via customers.name",
      deal_name: "Resolves to deal_id via deals.name",
    },
    allowed_values: {
      status: ["draft", "active", "expired", "cancelled"],
      billing_cadence: ["monthly", "quarterly", "annually", "one_time"],
    },
    notes: [
      "GET /contracts and GET /contracts/:id enforce per-user scoping: admin sees all contracts; every other role only sees ACTIVE contracts they are assigned to (via contract_assignments.user_id). Non-admin callers receive 403 FORBIDDEN when accessing an unassigned or inactive contract.",
    ],
  },
  "timesheet-entries": {
    required_fields: ["entry_type", "entry_date", "hours_logged"],
    optional_fields: ["user_id", "project_id", "contract_id", "incident_id", "notes", "start_time", "end_time"],
    allowed_values: { entry_type: ["project", "contract"] },
    constraints: [
      "If entry_type='project', project_id is required",
      "If entry_type='contract', contract_id is required",
      "notes is required on POST for all non-admin roles",
      "Non-admin: the referenced project/contract must be ACTIVE (is_active=true) AND the caller must be assigned to it (project_assignments / contract_assignments). Admin bypasses both checks.",
    ],
  },
  incidents: {
    required_fields: ["title", "incident_project_id"],
    optional_fields: ["description", "status", "priority_id", "category_id", "assigned_to", "created_by", "impact_description", "template_id", "source"],
    notes: [
      "incident_number is auto-generated from the project key (e.g. PROJ-0001). Do not send it.",
      "incident_project_id must reference a valid incident_projects record",
      "status defaults to 'New' if not provided",
      "created_by auto-filled from API key user on POST",
      "GET responses include enriched labels: priority_name, priority_color, category_name, assignee_name, project_name",
    ],
    allowed_values: {
      status: ["New", "Triaged", "In Progress", "Resolved", "Closed"],
      source: ["web", "email", "sms", "api"],
    },
  },
  projects: {
    required_fields: ["name"],
    optional_fields: ["description", "start_date", "end_date", "is_active", "budget_hours", "created_by", "customer_id", "is_internal", "has_budget_limit"],
    notes: [
      "budget_hours defaults to 0 if not provided",
      "The owner/user field is 'created_by' (UUID FK to auth.users). Sending 'user_id' on PATCH is accepted and auto-aliased to 'created_by'. Do NOT send user_id on POST — it is not a DB column.",
      "GET /projects and GET /projects/:id enforce per-user scoping: admin sees all projects; every other role only sees ACTIVE projects they are assigned to (via project_assignments.user_id). Non-admin callers receive 403 FORBIDDEN when accessing an unassigned or inactive project.",
    ],
  },
  "incident-projects": {
    required_fields: ["name", "project_key"],
    optional_fields: ["description", "lead_id", "customer_id", "timesheet_project_id", "icon_color", "support_email_prefix", "is_active"],
    notes: ["GET responses include lead_name (resolved from profiles via lead_id)"],
  },
  "incident-priorities": {
    note: "Read-only via API. Lists active incident priority levels.",
  },
  "incident-categories": {
    note: "Read-only via API. Lists active incident categories.",
  },
  "incident-templates": {
    note: "Read-only via API. Lists active incident templates with default priority/category names.",
  },
  "incident-comments": {
    required_fields: ["content"],
    optional_fields: ["is_internal", "created_by"],
    notes: ["Sub-resource of incidents: /incidents/:id/comments", "created_by auto-filled from API key user on POST"],
  },
  "customer-logins": {
    required_fields: ["company_id", "email"],
    optional_fields: ["full_name", "role", "is_active"],
    allowed_values: { role: ["user", "admin"] },
    name_resolvable: {
      company_name: "Resolves to company_id via customers.name",
    },
    notes: ["Manages customer portal user accounts. company_id references the CUSTOMERS table (not accounts).", "You can send company_name instead of company_id and it will be auto-resolved.", "GET responses include company_name (resolved from customers)"],
  },
  customers: {
    required_fields: ["name"],
    optional_fields: ["company", "email", "phone", "industry", "segment", "abn", "acn", "website", "street_address", "suburb", "state_au", "postcode", "notes"],
  },
  leaves: {
    required_fields: ["leave_type_id", "start_date", "end_date", "business_days_count", "reason"],
    optional_fields: ["user_id", "status", "half_day_start", "half_day_end"],
    allowed_values: { status: ["pending", "approved", "rejected", "cancelled"] },
    notes: [
      "File attachments: POST /leaves/:id/attachments accepts either multipart/form-data (field 'file') OR application/json ({ file_base64, file_name, file_type }). GET /leaves/:id/attachments, DELETE /leaves/:id/attachments?attachment_id=<uuid>. Max 10MB, MIME: jpeg/png/gif/pdf/doc/docx. Uses leaves:write/leaves:read scopes.",
      "Leave types lookup: GET /leave-types (list active), GET /leave-types/:id. Use ?include_inactive=true to include disabled types. Uses leaves:read scope.",
    ],
  },
  "leave-types": {
    required_fields: [],
    optional_fields: [],
    notes: [
      "Read-only resource. GET /leave-types returns active leave types; GET /leave-types?include_inactive=true returns all. GET /leave-types/:id fetches a single type. Fields: id, name, description, requires_attachment, default_balance_days, is_active, max_carry_over_days, carry_over_expiry_months. Uses leaves:read scope.",
    ],
  },
  expenses: {
    required_fields: ["amount", "expense_date", "category_id"],
    optional_fields: ["user_id", "subcategory_id", "description", "expense_type", "merchant_name", "notes", "status", "tax_amount", "account_id", "deal_id", "category_name", "subcategory_name"],
    allowed_values: { status: ["pending", "approved", "rejected"] },
    name_resolvable: { category_name: "category_id", subcategory_name: "subcategory_id" },
    notes: [
      "category_id can be supplied directly or resolved from category_name (matches expense_categories.name, case-insensitive).",
      "subcategory_id can be supplied directly or resolved from subcategory_name (matches expense_subcategories.name, case-insensitive).",
      "GET responses include enriched labels: category_name, subcategory_name (from joined tables).",
      "Available categories/subcategories can be listed via GET /expense-categories and GET /expense-subcategories (filter by category_id).",
      "File attachments: POST /expenses/:id/attachments accepts either multipart/form-data (field 'file') OR application/json ({ file_base64, file_name, file_type }). GET /expenses/:id/attachments, DELETE /expenses/:id/attachments?attachment_id=<uuid>. Max 10MB, MIME: jpeg/png/webp/pdf. Uses expenses:write/expenses:read scopes.",
      "Role access: admin/manager/sale_user/sale_manager/employee all hold expenses:read + expenses:write. user_id auto-fills from API key on POST so each caller creates their own expenses; row-ownership is enforced by RLS (users see/update their own rows; admin sees all).",
    ],
  },
  "expense-categories": {
    note: "Read-only via API. Lists active expense categories (id, name, description, sort_order).",
  },
  "expense-subcategories": {
    note: "Read-only via API. Lists active expense subcategories. Filter by ?category_id=<uuid> to scope to a parent category.",
  },
  profiles: {
    note: "Read-only via API. Includes role from user_roles table.",
  },
  "pipeline-stages": {
    note: "Read-only via API. Use stage names in /deals or /deals/:id/transition",
  },
  "ohs-hazard-reports": {
    required_fields: ["employee_reporter_name", "intake_source", "manager_taking_report", "site_area", "exact_location", "title", "description", "category", "likelihood", "consequence", "hierarchy_of_control", "control_justification", "created_by"],
    optional_fields: ["employee_reporter_contact", "exposure", "rp_likelihood_factor", "rp_degree_of_harm", "rp_knowledge_factor", "rp_available_methods", "rp_cost_factor", "action_owner", "due_date", "consultation_notes", "residual_likelihood", "residual_consequence", "residual_risk_rating", "review_date", "status", "signed_off_by", "signed_off_at"],
    notes: [
      "manager_taking_report: UUID FK → profiles.id. Must be a real user UUID from GET /profiles. Use 'manager_name' (full_name) to auto-resolve.",
      "initial_risk_rating is AUTO-CALCULATED by a DB trigger from likelihood × consequence — do NOT send it.",
      "created_by: UUID FK → profiles.id. Auto-filled from API key user if not provided.",
    ],
    name_resolvable: {
      manager_name: "Resolves to manager_taking_report via profiles.full_name",
    },
    allowed_values: {
      intake_source: ["verbal", "email", "phone"],
      category: ["Physical", "Chemical", "Biological", "Mechanical-Electrical", "Psychological", "Slip-Trip-Fall", "Ergonomic", "Environmental", "Fire", "Other"],
      likelihood: ["Very Unlikely", "Unlikely", "Possible", "Likely", "Very Likely"],
      consequence: ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"],
      hierarchy_of_control: ["Eliminate", "Substitute", "Isolate", "Engineer", "Administration", "PPE"],
      status: ["Open", "In Progress", "Under Review", "Closed", "Cancelled"],
      residual_likelihood: ["Very Unlikely", "Unlikely", "Possible", "Likely", "Very Likely"],
      residual_consequence: ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"],
    },
  },
  "ohs-hr-incidents": {
    required_fields: ["description", "incident_date", "location", "prepared_by"],
    optional_fields: ["status", "incident_time", "report_number", "nature_workplace_injury", "nature_harassment_discrimination", "nature_policy_violation", "nature_other", "nature_other_details", "individuals_involved", "immediate_actions", "follow_up_actions", "prepared_by_signature", "date_reported", "created_by"],
    allowed_values: {
      status: ["Open", "In Progress", "Under Review", "Closed", "Cancelled"],
    },
  },
  "ohs-injury-registers": {
    required_fields: ["injured_person_name", "incident_date", "incident_time", "is_am_pm", "location", "injury_description", "body_parts_affected", "injury_severity", "entry_maker_name", "entry_maker_position", "entry_maker_date", "created_by"],
    optional_fields: ["injured_person_contact", "medical_treatment_required", "medical_provider", "equipment_involved", "equipment_details", "witnesses_present", "witness_names", "witness_contacts", "immediate_action_taken", "first_aid_provided", "first_aid_provider", "emergency_services_called", "entry_maker_signature", "manager_investigation", "contributing_factors", "controls_implemented", "manager_name", "manager_signature", "manager_date", "employer_confirmation", "employer_signature", "employer_date", "follow_up_required", "follow_up_notes", "follow_up_date", "status"],
    allowed_values: {
      injury_severity: ["First Aid", "Medical Treatment", "Lost Time", "Permanent Disability", "Fatality"],
      status: ["Open", "In Progress", "Under Review", "Closed", "Cancelled"],
    },
  },
  "ohs-workplace-inspections": {
    required_fields: ["inspection_date", "inspector_id", "site_area", "created_by"],
    optional_fields: ["overall_status", "notes", "completed_at", "reviewed_by", "reviewed_at"],
    notes: [
      "overall_status accepts: Compliant | Non-Compliant | Not Applicable | Requires Action",
      "Completion aliases for overall_status: 'completed', 'done', 'finished', 'complete' are auto-translated to 'Compliant' and also stamp completed_at=now()",
      "Common aliases also accepted: 'pass'/'ok'/'good' → Compliant; 'fail'/'failed' → Non-Compliant; 'action'/'actionrequired' → Requires Action; 'na'/'n/a' → Not Applicable",
      "inspector_id and created_by: UUID FK → profiles.id. Both are auto-filled from the API key user on POST if not provided.",
    ],
    allowed_values: {
      overall_status: ["Compliant", "Non-Compliant", "Not Applicable", "Requires Action"],
    },
  },
  "team-members": {
    required_fields: ["incident_project_id"],
    optional_fields: ["user_id", "role"],
    allowed_values: { role: ["admin", "member"] },
    notes: ["Manages incident project team assignments"],
  },
  "work-schedules": {
    required_fields: [],
    optional_fields: ["user_id", "working_days", "allow_weekend_entries", "allow_holiday_entries", "locked_until_date", "lock_reason", "locked_by", "default_monday_location", "default_tuesday_location", "default_wednesday_location", "default_thursday_location", "default_friday_location", "default_saturday_location", "default_sunday_location", "created_by"],
    allowed_values: {
      "default_*_location": ["jolimont", "collins_square", "wfh", "client", "meetings", "not_in_work"],
    },
    notes: [
      "Role access: admin holds work-schedules:read + work-schedules:write (full CRUD, all users). Manager, sale_manager, sale_user and employee hold work-schedules:read only, and GET responses are auto-scoped to their own record (user_id = API key's assigned user). Admin can filter by ?user_id=<uuid>; non-admin callers cannot.",
      "GET /work-schedules/:id returns 403 FORBIDDEN for non-admin callers when the record belongs to another user.",
      "POST/PATCH/DELETE are admin-only — any other role will receive 403 INSUFFICIENT_SCOPE (no work-schedules:write scope).",
    ],
  },
  "daily-location-checkins": {
    required_fields: ["actual_location", "check_in_date"],
    optional_fields: ["user_id", "planned_location", "check_in_time", "end_time", "notes", "location_change_reason", "late_checkin"],
    allowed_values: {
      actual_location: ["jolimont", "collins_square", "wfh", "client", "meetings", "not_in_work"],
      planned_location: ["jolimont", "collins_square", "wfh", "client", "meetings", "not_in_work"],
    },
    notes: ["user_id auto-filled from API key user on POST", "GET responses include user_name and user_email", "Filters: user_id, date (exact), from_date, to_date, limit"],
  },
  "weekly-work-schedules": {
    required_fields: ["week_start_date"],
    optional_fields: ["user_id", "monday_working", "tuesday_working", "wednesday_working", "thursday_working", "friday_working", "saturday_working", "sunday_working", "monday_location", "tuesday_location", "wednesday_location", "thursday_location", "friday_location", "saturday_location", "sunday_location", "weekend_work_approved", "weekend_work_approved_by", "weekend_work_approved_at", "weekend_work_reason", "holiday_work_approved", "holiday_work_approved_by", "holiday_work_approved_at", "holiday_work_reason", "notes", "created_by"],
    allowed_values: {
      "*_location": ["jolimont", "collins_square", "wfh", "client", "meetings", "not_in_work"],
    },
    notes: [
      "Per-week override of the default work_schedules pattern. If a row exists for a given user + week_start_date, its <day>_working flags take precedence over work_schedules.working_days for that week.",
      "Role access: same as /work-schedules. Admin: full CRUD across all users. Manager, sale_manager, sale_user, employee: read-only and auto-scoped to their own rows; the handler forces user_id = API key's assigned user on GET lists and returns 403 FORBIDDEN on GET /:id when the record belongs to another user.",
      "Writes (POST/PATCH/DELETE) remain admin-only.",
      "Filters: user_id (admin only), week_start_date (exact), limit.",
    ],
  },
  assets: {
    required_fields: ["label", "type_id", "status_id"],
    optional_fields: ["group_id", "owner_user_id", "location", "serial_number", "purchase_date", "warranty_expiry", "cost", "notes", "created_by"],
    notes: [
      "asset_key is auto-generated from the group prefix via generate_asset_key RPC when group_id is provided and asset_key is omitted.",
      "GET responses include enriched labels: type_name, status_name, status_colour, group_name, owner_name, owner_email.",
      "Filters: search (label/serial_number/asset_key ilike), type_id, status_id, group_id, owner_user_id, warranty_expiring_days, page, limit.",
      "created_by auto-filled from API key user on POST.",
      "Role access: admin/manager/sale_manager/employee hold assets:read + assets:write; sale_user is read-only (assets:read). Employees can create and edit assets to match the Incident Management UI behaviour.",
    ],
  },
  "asset-groups": {
    required_fields: ["name"],
    optional_fields: ["description", "color", "customer_id", "sort_order", "is_active", "created_by"],
    notes: [
      "DELETE is a soft delete — sets is_active=false to preserve historical asset records.",
      "customer_id links the group to a specific customer for scoped asset dashboards.",
      "GET /asset-groups supports filter: customer_id.",
    ],
  },
  "asset-types": {
    required_fields: [],
    optional_fields: [],
    notes: ["Read-only lookup table. Managed via app settings."],
  },
  "asset-statuses": {
    required_fields: [],
    optional_fields: [],
    notes: ["Read-only lookup table. is_terminal=true indicates a final state (e.g. Decommissioned). Managed via app settings."],
  },
  "portal-groups": {
    required_fields: ["name"],
    optional_fields: ["customer_id", "description", "icon", "sort_order", "is_active"],
    notes: [
      "Portal groups organise request types on the customer portal.",
      "customer_id scopes the group to a specific customer (null = global).",
      "GET supports filter: customer_id.",
      "DELETE is a soft delete — sets is_active=false.",
    ],
  },
  "portal-request-types": {
    required_fields: ["name"],
    optional_fields: ["description", "icon", "category", "form_schema", "sort_order", "is_active"],
    allowed_values: {
      category: ["Incidents", "Service requests"],
    },
    notes: [
      "Defines the request type templates shown on the customer portal.",
      "form_schema is a JSON object describing dynamic form fields.",
      "GET supports filter: category.",
      "DELETE is a soft delete — sets is_active=false.",
    ],
  },
  "portal-group-request-types": {
    required_fields: ["portal_group_id", "request_type_id"],
    optional_fields: ["sort_order"],
    notes: [
      "Join table linking portal groups to request types.",
      "GET supports filter: portal_group_id, request_type_id.",
      "DELETE by id removes the link.",
    ],
  },
  prospects: {
    required_fields: ["name"],
    optional_fields: ["account_id", "owner_id", "stage", "summary", "source", "segment", "priority", "next_action", "next_action_due_date", "nurture_reason", "disqualified_reason", "converted_to_deal_id"],
    notes: [
      "name: the pursuit label, not a person — use format 'School — Offer', e.g. 'Aquinas College VIC - MFA Outreach'.",
      "owner_id auto-filled from API key user on POST if not provided.",
      "created_by auto-filled from API key user on POST.",
      "account_id is OPTIONAL — prospects may exist without an account (mirrors how contacts can exist without an account).",
      "GET responses include account_name and owner_name (resolved from joins).",
      "Use owner_name to resolve owner_id by full name.",
      "Use account_name to resolve account_id by account name.",
      "Pipeline framework: Contact → (POST /contacts/:id/convert-to-prospect) → Prospect → (POST /prospects/:id/convert-to-deal when stage='qualified') → Deal.",
      "POST /prospects/:id/convert-to-deal — converts a qualified prospect to a deal. Required body: close_date (YYYY-MM-DD). Optional: deal_name (default '<prospect.name> Opportunity'), pipeline_stage_id (auto-resolves; pass start_stage='discovery' to default to Discovery instead of Qualified), notes. Guards: must be stage='qualified', must not already be converted, must have a primary contact in prospect_contacts. Sets prospects.converted_to_deal_id and converted_at on success.",
    ],
    name_resolvable: {
      account_name: "Resolves to account_id via accounts.name",
      owner_name: "Resolves to owner_id via profiles.full_name",
    },
    sub_resources: {
      "convert-to-deal": "POST /prospects/:id/convert-to-deal — see notes. Returns { deal, converted_at }.",
      notes: "GET/POST/DELETE /prospects/:id/notes — see prospect_notes table.",
    },
    allowed_values: {
      stage: ["new", "researched", "outreach_started", "engaged", "qualified", "nurture", "disqualified"],
      priority: ["low", "medium", "high"],
      source: ["website", "referral", "linkedin", "email_campaign", "event", "cold_outreach", "partner", "existing_client"],
      segment: ["enterprise", "mid_market", "small_business", "startup"],
    },
  },
  "prospect-contacts": {
    required_fields: ["prospect_id", "contact_id"],
    optional_fields: ["is_primary", "role_label"],
    notes: [
      "Join table linking prospects to contacts (many-to-many).",
      "Only one contact per prospect should have is_primary=true.",
      "GET responses include contact_name (resolved from contacts join).",
      "GET supports filters: prospect_id, contact_id, limit.",
    ],
  },
  "prospect-notes": {
    required_fields: ["note_content"],
    optional_fields: ["created_by"],
    notes: [
      "Sub-resource of prospects: /prospects/:id/notes",
      "Stored in the prospect_notes table (separate from the prospects record).",
      "created_by and created_by_name auto-filled from API key user on POST.",
      "GET supports param: limit (default 50). Returns id, prospect_id, note_content, created_by, created_by_name, created_at.",
      "DELETE requires query param: note_id=<uuid>",
    ],
  },
};

function handleMeta(resource?: string) {
  if (!resource) {
    return json({ resources: Object.keys(RESOURCE_META), meta: RESOURCE_META });
  }
  const meta = RESOURCE_META[resource];
  if (!meta) return richError("UNKNOWN_RESOURCE", `No metadata for: ${resource}`, 404);
  return json({ resource, ...meta });
}

// ============================================================================
// VERSION & CHANGELOG
// ============================================================================

const CHANGELOG = [
  {
    version: "2.12.5",
    date: "2026-04-27",
    breaking: false,
    changes: [
      "GET/POST /incidents/:id/comments — response now exposes `content` (aliases the underlying `comment` column) and `created_by` (aliases the underlying `create_by` column), matching the documented metadata shape. The legacy `comment`/`create_by` fields are no longer returned.",
      "POST /incidents/:id/comments — request body now accepts either `content` or `comment` for the comment text.",
      "PATCH /incidents/:id — when `status` is set to `Resolved`, `resolved_at` is auto-filled with the current timestamp and `resolved_by` is auto-filled from the API key user (unless either is explicitly provided in the body).",
    ],
  },
  {
    version: "2.12.4",
    date: "2026-04-24",
    breaking: false,
    changes: [
      "ROLE_SCOPES: sale_manager granted expenses:read and expenses:write. Closes gap where sale_manager users could not submit or view expenses via API while sale_user and manager already had the same scopes.",
    ],
  },
  {
    version: "2.12.3",
    date: "2026-04-24",
    breaking: false,
    changes: [
      "Fixed 'invalid input syntax for type uuid: \"\"' errors on POST/PATCH across all resources. The gateway now coerces empty-string values to null for any field whose name ends in _id, _by, or matches assigned_to / inspector_id / manager_taking_report. Frontend forms commonly submit '' for uuid selects when the user clears a field — those now correctly clear the column instead of crashing the request. Example: PATCH /deals with { account_id: '' } now sets account_id = null rather than returning a 400 from Postgres.",
    ],
  },
  {
    version: "2.12.2",
    date: "2026-04-24",
    breaking: false,
    changes: [
      "ROLE_SCOPES: work-schedules:read added to manager, sale_manager, sale_user, and employee. Previously only admin keys could query /work-schedules and /weekly-work-schedules, so bots using a non-admin key (e.g. employee) got 403 INSUFFICIENT_SCOPE when checking whether a user was scheduled for a given day — they incorrectly reported the user as not scheduled.",
      "GET /work-schedules and GET /weekly-work-schedules are now self-scoped for non-admin callers: the handler forces user_id = apiKeyUserId on the list query and returns 403 FORBIDDEN on GET /:id when the record belongs to another user. Admin keys still see all users and may filter by ?user_id=<uuid>.",
      "Writes to /work-schedules and /weekly-work-schedules remain admin-only (no :write scope granted to non-admin roles).",
      "RESOURCE_META work-schedules and weekly-work-schedules notes updated to document the self-scoped read behaviour.",
    ],
  },
  {
    version: "2.12.1",
    date: "2026-04-24",
    breaking: false,
    changes: [
      "ROLE_SCOPES employee: added expenses:write and assets:write. Closes gap where the app UI lets employees submit expenses and create/update assets, but API keys assigned to employees were blocked from doing the same (row-ownership still enforced by existing RLS policies).",
    ],
  },
  {
    version: "2.12.0",
    date: "2026-04-23",
    breaking: false,
    changes: [
      "CRM funnel framework formalised: Contact → Prospect → Deal. Convert-to-deal action removed from /contacts and added to /prospects (matches the new app behaviour).",
      "Added POST /contacts/:id/convert-to-prospect — promotes a contact to a Prospect pursuit. Body (all optional): name (defaults to '<company> - Outreach'), priority (low|medium|high, default 'medium'), source (defaults to contact.source), segment, account_id (defaults to contact.converted_to_account_id), summary, stage (default 'new'). The contact is auto-linked as the prospect's primary contact via prospect_contacts (is_primary=true). owner_id and created_by auto-fill from API key user / contact owner. Returns { prospect, primary_contact_id }. Requires contacts:write scope.",
      "Added POST /prospects/:id/convert-to-deal — converts a qualified prospect into a deal. Required body: close_date (YYYY-MM-DD). Optional: deal_name (default '<prospect.name> Opportunity'), pipeline_stage_id (auto-resolved from active stages — pass start_stage='discovery' to default to Discovery instead of the first/Qualified stage), notes. Guards: prospect must be stage='qualified', must not already be converted (converted_to_deal_id null), and must have a primary contact in prospect_contacts. On success, sets prospects.converted_to_deal_id and prospects.converted_at. Returns { deal, converted_at }. Requires prospects:write scope.",
      "RESOURCE_META.contacts: documented the new convert-to-prospect sub-resource.",
      "RESOURCE_META.prospects: account_id explicitly noted as OPTIONAL (prospects can be created without an account, mirroring contacts). Documented the new convert-to-deal sub-resource and full Contact→Prospect→Deal pipeline.",
      "Added CROSS_SCOPE_ACTIONS enforcement: actions that write to a different resource now require BOTH scopes. POST /contacts/:id/convert-to-prospect requires contacts:write + prospects:write. POST /prospects/:id/convert-to-deal requires prospects:write + deals:write. Returns 403 INSUFFICIENT_SCOPE if any required scope is missing.",
      "ROLE_SCOPES audit: admin, sale_manager, sale_user already hold contacts:write + prospects:write + deals:write — no role changes needed for the new convert endpoints. Manager and employee roles intentionally do not have CRM write scopes.",
    ],
  },
  {
    version: "2.11.0",
    date: "2026-04-22",
    breaking: true,
    changes: [
      "BREAKING: POST /leaves now requires reason field. Previously optional — requests without reason will return 400 MISSING_REQUIRED_FIELD.",
      "Added POST /leaves/:id/attachments — upload a supporting document via multipart/form-data (field name: file). Max 10MB. Allowed MIME: application/pdf, image/jpeg, image/png, image/gif, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document. File stored in leave-attachments bucket; row inserted into leave_application_attachments with file_name, file_url (storage path), file_type, file_size. Requires leaves:write scope.",
      "Added GET /leaves/:id/attachments — list attachments for a leave application, ordered by uploaded_at desc. Requires leaves:read scope.",
      "Added DELETE /leaves/:id/attachments?attachment_id=<uuid> — removes attachment row and underlying storage object. Requires leaves:write scope.",
      "Gateway multipart/form-data parser now also handles /leaves/:id/attachments uploads (in addition to /expenses/:id/attachments).",
      "ROLE_SCOPES: sale_manager and sale_user granted leaves:read. GET /leaves now available to all staff roles (admin, manager, sale_manager, sale_user, employee).",
      "GET /leaves now enforces in-app permission parity: admin and manager can see all leave applications and filter by ?user_id; all other roles are automatically scoped to their own applications only (apiKeyUserId). Same rule applies to GET /leaves/:id and /leaves/:id/attachments — non-privileged callers receive 403 FORBIDDEN when accessing another user's leave data.",
      "Added /leave-types — read-only resource listing leave types (annual, sick, etc). GET /leave-types (active only), GET /leave-types?include_inactive=true, GET /leave-types/:id. Uses leaves:read scope. Fields: id, name, description, requires_attachment, default_balance_days, is_active, max_carry_over_days, carry_over_expiry_months.",
      "POST/PATCH /leaves now enforces casual/temporary employment parity with the app: if the target profile.employment_type is 'casual' or 'temporary', the only accepted leave_type is Unpaid Leave (matched by leave_types.name = 'Unpaid Leave', case-insensitive). Returns 403 CASUAL_UNPAID_ONLY otherwise.",
      "GET /leave-types now filters response by caller's profile.employment_type. Casual/temporary employees only see the Unpaid Leave type in the list response; GET /leave-types/:id returns 403 FORBIDDEN if they request any other type. Mirrors the LeaveApplicationForm UI filter.",
    ],
  },
  {
    version: "2.10.0",
    date: "2026-04-22",
    breaking: false,
    changes: [
      "Added POST /expenses/:id/attachments — upload a receipt file via multipart/form-data (field name: file). Max 10MB. Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf. File is stored in the expense-receipts bucket; a row is inserted into expense_attachments with file_name, file_url (storage path), file_type, file_size. Requires expenses:write scope.",
      "Added GET /expenses/:id/attachments — list attachments for an expense, ordered by uploaded_at desc. Requires expenses:read scope.",
      "Added DELETE /expenses/:id/attachments?attachment_id=<uuid> — removes the attachment row and the underlying storage object. Requires expenses:write scope.",
      "Gateway now parses multipart/form-data bodies for expense attachment uploads. All other endpoints continue to expect application/json.",
      "ROLE_SCOPES: sale_user granted projects:read and contracts:read; sale_manager granted projects:read; employee granted contracts:read. All non-customer roles can now read projects and contracts they are assigned to via the API.",
    ],
  },
  {
    version: "2.9.0",
    date: "2026-04-22",
    breaking: false,
    changes: [
      "Added GET /expense-categories — list active expense categories (read-only). Requires expenses:read scope.",
      "Added GET /expense-categories/:id — fetch a single category.",
      "Added GET /expense-subcategories — list active expense subcategories. Optional filter: category_id. Requires expenses:read scope.",
      "Added GET /expense-subcategories/:id — fetch a single subcategory.",
      "Expenses GET responses now include enriched category_name and subcategory_name from joined tables.",
      "Expenses POST/PATCH accept category_name and subcategory_name — auto-resolved to category_id/subcategory_id via resolveBodyNames (case-insensitive).",
      "Expenses GET list added filters: category_id, subcategory_id, status, account_id, deal_id, from_date, to_date. Default order changed to expense_date desc.",
      "Fixed error hint on MISSING_CATEGORY_ID to reference the now-existing /expense-categories endpoint and mention category_name auto-resolve.",
    ],
  },
  {
    version: "2.8.0",
    date: "2026-04-22",
    breaking: false,
    changes: [
      "Added GET /meetings/:id/notes — list notes for a meeting (crm_meeting_notes table). Optional query: limit (default 50).",
      "Added POST /meetings/:id/notes — add a meeting note. Required: content (or note_content alias). Optional: note_type (default 'general'), note_date. created_by auto-filled from API key user.",
      "Added PATCH /meetings/:id/notes?note_id=<uuid> — update content, note_type, or note_date on a meeting note.",
      "Added DELETE /meetings/:id/notes?note_id=<uuid> — delete a specific meeting note.",
      "Meeting notes sub-resource reuses meetings:read / meetings:write scopes — no new API key permissions required.",
      "Router dispatch updated so meetings resource now receives the action segment (enables sub-paths).",
    ],
  },
  {
    version: "2.7.0",
    date: "2026-04-22",
    breaking: false,
    changes: [
      "Added GET /prospects/:id/notes — list prospect notes (prospect_notes table). Params: limit.",
      "Added POST /prospects/:id/notes — add note to prospect. Required: note_content. created_by and created_by_name auto-filled from API key user.",
      "Added DELETE /prospects/:id/notes?note_id=<uuid> — delete a specific prospect note.",
      "Removed qualification_notes from prospects RESOURCE_META optional_fields — field no longer exposed via API.",
    ],
  },
  {
    version: "2.6.0",
    date: "2026-04-15",
    breaking: false,
    changes: [
      "DELETE /accounts/:id — permanently deletes an account. Requires accounts:write scope (admin role).",
      "POST /contacts — auto-creates or links an accounts row when company_name is provided and converted_to_account_id is not. Uses case-insensitive name match; creates new account if none found.",
      "PATCH /contacts/:id — now also auto-resolves company_name to converted_to_account_id (same logic as POST). Direct write of converted_to_account_id now supported on PATCH.",
      "contacts RESOURCE_META: added converted_to_account_id to optional_fields so it survives PATCH sanitization.",
      "accounts RESOURCE_META updated with notes on DELETE and auto-account-link behavior.",
    ],
  },
  {
    version: "2.5.0",
    date: "2026-04-02",
    breaking: false,
    changes: [
      "New endpoint: /prospects — full CRUD for CRM prospect pursuits",
      "GET /prospects — filters: account_id, stage, priority, owner_id, limit. Returns account_name, owner_name",
      "GET /prospects/:id — single prospect with enriched account_name, owner_name",
      "POST /prospects — Required: name. Optional: account_id (or account_name, auto-resolves). owner_id and created_by auto-filled from API key user",
      "PATCH /prospects/:id — update prospect. Accepts account_name, owner_name",
      "DELETE /prospects/:id — delete prospect",
      "New endpoint: /prospect-contacts — full CRUD for prospect-contact links",
      "GET /prospect-contacts — filters: prospect_id, contact_id, limit. Returns contact_name",
      "POST /prospect-contacts — Required: prospect_id, contact_id. Optional: is_primary, role_label",
      "PATCH /prospect-contacts/:id — update is_primary or role_label",
      "DELETE /prospect-contacts/:id — remove link",
      "New scopes: prospects:read, prospects:write",
      "ROLE_SCOPES: admin + manager get prospects:read/write; sale_manager gets prospects:read/write; sale_user gets prospects:read",
      "owner_name resolution added globally to resolveBodyNames — resolves to owner_id via profiles.full_name",
      "/search endpoint now includes prospects (name search)",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-03-12",
    breaking: false,
    changes: [
      "New endpoint: /customer-logins — full CRUD for customer portal user accounts",
      "GET /customer-logins — filters: company_id, is_active, email, limit. Returns company_name",
      "POST /customer-logins — create customer login. Required: company_id, email. Optional: full_name, role, is_active",
      "PATCH /customer-logins/:id — update customer login fields",
      "DELETE /customer-logins/:id — delete customer login",
      "Scoped under incidents (requires incidents:read/write)",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-03-12",
    breaking: false,
    changes: [
      "New endpoint: GET /incident-priorities — list active incident priority levels",
      "New endpoint: GET /incident-categories — list active incident categories",
      "New endpoint: GET /incident-templates — list active templates with default priority/category names",
      "New endpoint: GET /incidents/:id/comments — list comments for an incident (filter: is_internal, limit)",
      "New endpoint: POST /incidents/:id/comments — add comment to incident (created_by auto-filled from API key)",
      "GET /incidents — new filters: priority_id, category_id, assigned_to, created_by. Response enriched with priority_name, priority_color, category_name, assignee_name, project_name",
      "POST /incidents — created_by auto-filled from API key user. source field now documented (web, email, sms, api)",
      "GET /incident-projects — enriched with lead_name. New filters: customer_id, is_active",
      "PATCH /incident-projects — now documented in API docs with full optional_fields",
      "RESOURCE_META updated for incidents (new optional_fields, source allowed_values), incident-projects (lead_id, customer_id, icon_color etc.), and new resources",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-03-10",
    breaking: false,
    changes: [
      "PATCH /deals/:id — amount added to optional_fields; it is now patchable directly alongside contract_value.",
      "New PATCH /deals/:id/amount — dedicated endpoint to update the deal display amount. Required: { amount: number }.",
      "POST /deals — created_by is now auto-set from the API key's assigned user when not provided, preventing deals from appearing Unassigned on the pipeline board.",
      "GET /deals / GET /deals/:id — owner_name is now included in the response (resolved from profiles via owner_id).",
      "RESOURCE_META deals — added notes documenting amount vs contract_value, owner_id/owner_name behaviour, and created_by auto-fill. Added owner_name to name_resolvable.",
    ],
  },
  {
    version: "2.1.7",
    date: "2026-03-06",
    breaking: false,
    changes: [
      "user_id removed from required_fields for timesheet-entries, leaves, expenses, team-members, work-schedules, weekly-work-schedules — now auto-filled from API key's assigned user on POST",
      "user_id auto-fill expanded to ALL resources that declare user_id in their meta (was previously limited to work-schedules and weekly-work-schedules only)",
      "PATCH /contracts — user_id now auto-aliased to created_by (same as projects), preventing stripped-field errors",
      "projects optional_fields — removed user_id (not a DB column); alias in PATCH handler still supports it for backward compat",
    ],
  },
  {
    version: "2.1.6",
    date: "2026-03-06",
    breaking: false,
    changes: [
      "PATCH /ohs-workplace-inspections — 'completed'/'done'/'finished'/'complete' are now accepted as overall_status values and translated to 'Compliant' + completed_at=now(). DB enum only supports Compliant/Non-Compliant/Not Applicable/Requires Action — 'completed' had no mapping and was hard-failing.",
      "normalizeEnumValues — added ENUM_SYNONYMS table: pass/ok/good → Compliant; fail/failed → Non-Compliant; na/n/a → Not Applicable; action/actionrequired → Requires Action; open/closed/cancelled/inprogress/underreview for ohs_status; veryunlikely/verylikely for likelihood fields.",
      "All enum normalisation now runs synonym lookup BEFORE case-insensitive match, catching a wider range of caller variations without DB round-trip.",
      "Added resolveInspectionCompletionAlias() helper applied to both POST and PATCH for ohs-workplace-inspections.",
      "RESOURCE_META ohs-workplace-inspections — added notes documenting all accepted aliases so GET /meta/ohs-workplace-inspections is self-describing.",
    ],
  },
  {
    version: "2.1.9",
    date: "2026-03-06",
    breaking: false,
    changes: [
      "PATCH — user_id alias broadened: if user_id is not a DB column for the resource, it is always deleted from body BEFORE sanitizePatchBody; aliased to created_by only when that column exists (projects). Contracts user_id is now silently stripped instead of causing a DB error.",
      "Forced redeployment to ensure v2.1.8+ pre-sanitize alias logic is live on the server.",
    ],
  },
  {
    version: "2.1.5",
    date: "2026-03-06",
    breaking: false,
    changes: [
      "PATCH /projects — added 'user_id' to optional_fields so it now survives sanitizePatchBody and reaches the user_id→created_by alias (was stripped before alias could fire)",
      "POST/PATCH all resources — created_by auto-fill now guarded by meta field check; fixes contracts PATCH injecting a non-existent created_by column and crashing the insert",
      "created_by / inspector_id auto-fill is now POST-only — PATCH no longer silently overwrites record authorship",
      "PATCH empty body: changed from hard 400 EMPTY_PATCH_BODY to a 200 no-op with _warning field — PATCH /work-schedules with an unrecognised field (e.g. 'notes' which has no DB column) now returns 200 instead of failing",
      "INVALID_ENUM_VALUE errors now include the full list of allowed values from meta in the response body — callers can see exactly which values are accepted without a separate /meta call",
    ],
  },
  {
    version: "2.1.4",
    date: "2026-03-06",
    breaking: false,
    changes: [
      "PATCH /projects — added created_by, customer_id, is_internal, has_budget_limit to optional_fields so they are no longer stripped by sanitizePatchBody",
      "PATCH /projects — 'user_id' is now auto-aliased to 'created_by' for backwards compatibility (projects table uses created_by, not user_id)",
      "PATCH /contracts — added is_active, signature_url, signed_date, project_key, project_id to optional_fields",
      "PATCH any resource — empty body after field stripping now returns EMPTY_PATCH_BODY 400 with a clear hint instead of an opaque PostgREST error",
      "POST /ohs-hazard-reports — initial_risk_rating removed from required_fields; it is auto-calculated by DB trigger from likelihood × consequence",
      "POST /ohs-hazard-reports — hierarchy_of_control allowed_values fixed to match actual DB enum (control_hierarchy): Eliminate, Substitute, Isolate, Engineer, Administration, PPE",
      "POST /ohs-hazard-reports — manager_taking_report documented as UUID FK → profiles.id; pass 'manager_name' to auto-resolve by full_name",
      "POST /ohs-hazard-reports — initial_risk_rating is now silently removed from POST body even if caller sends it (trigger overrides anyway)",
      "All POST/PATCH — created_by is now auto-filled from the API key's assigned user (keyRecord.assigned_to) when not provided",
      "PATCH /ohs-workplace-inspections — inspector_id auto-filled from API key user when not provided",
      "POST/PATCH /work-schedules, /weekly-work-schedules — user_id auto-filled from API key user when not provided",
    ],
  },
  {
    version: "2.1.2",
    date: "2026-03-05",
    breaking: false,
    changes: [
      "Fixed sanitizePatchBody fallback bug — no longer leaks unknown fields when all sent fields are stripped",
      "Updated RESOURCE_META for work-schedules, weekly-work-schedules, and all OHS resources to match actual DB schemas",
      "Added allowed_values for all OHS enum fields (category, likelihood, consequence, hierarchy_of_control, injury_severity, overall_status, status)",
      "POST /weekly-work-schedules now uses upsert on (user_id, week_start_date) — no more 409 on duplicates",
    ],
  },
  {
    version: "2.1.1",
    date: "2026-03-05",
    breaking: false,
    changes: [
      "PATCH requests now auto-strip unknown fields using RESOURCE_META, preventing 400 errors from PostgREST (e.g. user_id on projects/contracts)",
      "Use GET /meta/:resource to discover valid fields for any resource",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-03-05",
    breaking: false,
    changes: [
      "Full CRUD for /leaves — POST, PATCH, DELETE now supported",
      "Full CRUD for /expenses — POST, PATCH, DELETE now supported",
      "Full CRUD for /customers — POST, PATCH, DELETE now supported",
      "New /ohs-hazard-reports endpoint — full CRUD on OHS hazard reports",
      "New /ohs-hr-incidents endpoint — full CRUD on OHS HR incidents",
      "New /ohs-injury-registers endpoint — full CRUD on OHS injury registers",
      "New /ohs-workplace-inspections endpoint — full CRUD on OHS workplace inspections",
      "New /team-members endpoint — full CRUD on incident project team assignments",
      "New /work-schedules endpoint — full CRUD on work schedules",
      "New /weekly-work-schedules endpoint — full CRUD on weekly work schedules",
      "New scopes: leaves:write, expenses:write, customers:write, ohs:read, ohs:write, work-schedules:read, work-schedules:write",
    ],
  },
  {
    version: "2.0.2",
    date: "2026-03-05",
    breaking: false,
    changes: [
      "Added GET /deals/:id/notes — list deal stage notes with stage_name, author, content",
      "Added POST /deals/:id/notes — add deal stage note (auto-fills created_by from API key user)",
      "Added GET /deals/:id/history — list deal stage transition history with from/to stage names",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-03-04",
    breaking: false,
    changes: [
      "Fixed GET /deals FK constraint name mismatch causing 400 errors",
      "POST /contacts now auto-composes contact_name from first_name + last_name",
      "POST /incidents: status is now optional (defaults to 'New'), incident_number is auto-generated",
      "POST /projects: budget_hours defaults to 0 if not provided",
      "All write handlers now return structured errors with code, hint, fix_example",
      "Enriched label fields (contact_display_name, deal_name, account_name) always present even when null",
      "Fixed meeting_type allowed values to match actual DB enum",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-03-04",
    breaking: false,
    changes: [
      "Added /resolve endpoint for cross-entity name lookup",
      "Added /search endpoint for grouped cross-CRM search",
      "Added /meta/:resource endpoint for field metadata",
      "Added /version and /changelog endpoints",
      "Added /deals/:id/transition endpoint for workflow-safe stage moves",
      "Enriched GET responses with label fields (pipeline_stage_name, account_name, etc.)",
      "Accept name-based writes: account_name, contact_name, customer_name, deal_name, stage_name auto-resolve to IDs",
      "Idempotency-Key header support on POST requests",
      "Structured error responses with code, message, hint, fix_example",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-15",
    breaking: false,
    changes: ["Initial API Gateway release"],
  },
];

// ============================================================================
// RESOURCE HANDLERS
// ============================================================================

async function handleIncidents(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  action?: string,
  apiKeyUserId?: string | null
) {
  // Sub-resource: /incidents/:id/comments
  if (action === "comments" && id) {
    if (method === "GET") {
      let query = supabase.from("incident_comments").select("*").eq("incident_id", id);
      const is_internal = searchParams.get("is_internal");
      if (is_internal !== null) query = query.eq("is_internal", is_internal === "true");
      const limit = parseInt(searchParams.get("limit") || "100");
      query = query.order("created_at", { ascending: true }).limit(limit);
      const { data, error: err } = await query;
      if (err) return error(err.message);
      // Enrich with author names via manual profiles lookup
      const comments = data || [];
      const authorIds = [...new Set(comments.map((c: any) => c.create_by).filter(Boolean))];
      let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", authorIds);
        for (const p of (profiles || [])) profileMap[p.id] = { full_name: p.full_name, email: p.email };
      }
      return json(comments.map((c: any) => {
        const { create_by, comment, ...rest } = c;
        return {
          ...rest,
          created_by: create_by,
          content: comment,
          author_name: profileMap[create_by]?.full_name || null,
          author_email: profileMap[create_by]?.email || null,
        };
      }));
    }
    if (method === "POST") {
      const contentInput = body?.content ?? body?.comment;
      if (!contentInput) return richError("MISSING_CONTENT", "content is required", 400);
      const commentBody: any = {
        incident_id: id,
        comment: contentInput,
        is_internal: body.is_internal ?? false,
        create_by: body.created_by || apiKeyUserId,
      };
      if (!commentBody.create_by) return richError("MISSING_AUTHOR", "created_by is required or use an API key assigned to a user", 400);
      const { data, error: err } = await supabase.from("incident_comments").insert(commentBody).select().single();
      if (err) return parseDbError(err, "incident-comments");
      const { create_by, comment, ...rest } = data as any;
      return json({ ...rest, created_by: create_by, content: comment }, 201);
    }
    return error("Method not allowed", 405);
  }

  if (method === "GET" && id) {
    const enrichedSelect = "*, incident_projects(name, project_key), incident_priorities(name, color), incident_categories(name)";
    const { data, error: err } = await supabase.from("incidents").select(enrichedSelect).eq("id", id).single();
    if (err) return error(err.message, 404);
    const flat: any = { ...data };
    flat.project_name = (data as any).incident_projects?.name || null;
    flat.project_key = (data as any).incident_projects?.project_key || null;
    flat.priority_name = (data as any).incident_priorities?.name || null;
    flat.priority_color = (data as any).incident_priorities?.color || null;
    flat.category_name = (data as any).incident_categories?.name || null;
    // Manual profiles lookup for assignee
    if (flat.assigned_to) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", flat.assigned_to).maybeSingle();
      flat.assignee_name = profile?.full_name || null;
    } else {
      flat.assignee_name = null;
    }
    delete flat.incident_projects; delete flat.incident_priorities; delete flat.incident_categories;
    return json(flat);
  }

  if (method === "GET") {
    const enrichedSelect = "*, incident_projects(name, project_key), incident_priorities(name, color), incident_categories(name)";
    let query = supabase.from("incidents").select(enrichedSelect);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const incident_project_id = searchParams.get("incident_project_id");
    if (incident_project_id) query = query.eq("incident_project_id", incident_project_id);
    const project_id = searchParams.get("project_id");
    if (project_id && !incident_project_id) query = query.eq("incident_project_id", project_id);
    const priority_id = searchParams.get("priority_id");
    if (priority_id) query = query.eq("priority_id", priority_id);
    const category_id = searchParams.get("category_id");
    if (category_id) query = query.eq("category_id", category_id);
    const assigned_to = searchParams.get("assigned_to");
    if (assigned_to) query = query.eq("assigned_to", assigned_to);
    const created_by = searchParams.get("created_by");
    if (created_by) query = query.eq("created_by", created_by);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    // Batch lookup assignee names
    const rows = data || [];
    const assigneeIds = [...new Set(rows.map((r: any) => r.assigned_to).filter(Boolean))];
    let assigneeMap: Record<string, string> = {};
    if (assigneeIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", assigneeIds);
      for (const p of (profiles || [])) assigneeMap[p.id] = p.full_name || "";
    }
    return json(rows.map((row: any) => {
      const flat = { ...row };
      flat.project_name = row.incident_projects?.name || null;
      flat.project_key = row.incident_projects?.project_key || null;
      flat.priority_name = row.incident_priorities?.name || null;
      flat.priority_color = row.incident_priorities?.color || null;
      flat.category_name = row.incident_categories?.name || null;
      flat.assignee_name = assigneeMap[row.assigned_to] || null;
      delete flat.incident_projects; delete flat.incident_priorities; delete flat.incident_categories;
      return flat;
    }));
  }

  if (method === "POST") {
    if (body) delete body.incident_number;
    const { data, error: err } = await supabase.from("incidents").insert(body).select().single();
    if (err) return parseDbError(err, "incidents");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    if (body) delete body.incident_number;
    if (body?.status === "Resolved") {
      if (body.resolved_at === undefined) body.resolved_at = new Date().toISOString();
      if (body.resolved_by === undefined && apiKeyUserId) body.resolved_by = apiKeyUserId;
    }
    const { data, error: err } = await supabase.from("incidents").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "incidents");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("incidents").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleIncidentPriorities(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  _searchParams: URLSearchParams
) {
  if (method !== "GET") return error("Method not allowed", 405);
  if (id) {
    const { data, error: err } = await supabase.from("incident_priorities").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }
  const { data, error: err } = await supabase.from("incident_priorities").select("*").eq("is_active", true).order("sort_order");
  if (err) return error(err.message);
  return json(data);
}

async function handleIncidentCategories(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  _searchParams: URLSearchParams
) {
  if (method !== "GET") return error("Method not allowed", 405);
  if (id) {
    const { data, error: err } = await supabase.from("incident_categories").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }
  const { data, error: err } = await supabase.from("incident_categories").select("*").eq("is_active", true).order("sort_order");
  if (err) return error(err.message);
  return json(data);
}

async function handleIncidentTemplates(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  _searchParams: URLSearchParams
) {
  if (method !== "GET") return error("Method not allowed", 405);
  if (id) {
    const { data, error: err } = await supabase.from("incident_templates").select("*, incident_priorities(name, color), incident_categories(name)").eq("id", id).single();
    if (err) return error(err.message, 404);
    const row: any = data;
    row.default_priority_name = row.incident_priorities?.name || null;
    row.default_priority_color = row.incident_priorities?.color || null;
    row.default_category_name = row.incident_categories?.name || null;
    delete row.incident_priorities; delete row.incident_categories;
    return json(row);
  }
  const { data, error: err } = await supabase.from("incident_templates").select("*, incident_priorities(name, color), incident_categories(name)").eq("is_active", true).order("name");
  if (err) return error(err.message);
  return json((data || []).map((row: any) => {
    const flat = { ...row };
    flat.default_priority_name = row.incident_priorities?.name || null;
    flat.default_priority_color = row.incident_priorities?.color || null;
    flat.default_category_name = row.incident_categories?.name || null;
    delete flat.incident_priorities; delete flat.incident_categories;
    return flat;
  }));
}

async function handleCustomerLogins(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase
      .from("customer_logins")
      .select("*, customers(name)")
      .eq("id", id)
      .single();
    if (err) return error(err.message, 404);
    const flat: any = { ...data };
    flat.company_name = (data as any).customers?.name || null;
    delete flat.customers;
    return json(flat);
  }

  if (method === "GET") {
    let query = supabase.from("customer_logins").select("*, customers(name)");
    const company_id = searchParams.get("company_id");
    if (company_id) query = query.eq("company_id", company_id);
    const is_active = searchParams.get("is_active");
    if (is_active !== null) query = query.eq("is_active", is_active === "true");
    const email = searchParams.get("email");
    if (email) query = query.ilike("email", `%${email}%`);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map((row: any) => {
      const flat = { ...row };
      flat.company_name = row.customers?.name || null;
      delete flat.customers;
      return flat;
    }));
  }

  if (method === "POST") {
    // Resolve company_name to company_id if provided
    if (body?.company_name && !body?.company_id) {
      const { data: customer } = await supabase.from("customers").select("id").ilike("name", body.company_name).limit(1).maybeSingle();
      if (!customer) return richError("NAME_NOT_FOUND", `No customer found with name "${body.company_name}". company_id must reference the customers table.`, 400, { hint: "Use GET /customers or /search?q=... to find valid customer IDs" });
      body.company_id = customer.id;
    }
    const insertBody: any = {
      company_id: body?.company_id,
      email: body?.email,
      full_name: body?.full_name || null,
      role: body?.role || "user",
      is_active: body?.is_active ?? true,
    };
    const { data, error: err } = await supabase
      .from("customer_logins")
      .insert(insertBody)
      .select("*, customers(name)")
      .single();
    if (err) return parseDbError(err, "customer-logins");
    const flat: any = { ...data };
    flat.company_name = (data as any).customers?.name || null;
    delete flat.customers;
    return json(flat, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase
      .from("customer_logins")
      .update(body)
      .eq("id", id)
      .select("*, customers(name)")
      .single();
    if (err) return parseDbError(err, "customer-logins");
    const flat: any = { ...data };
    flat.company_name = (data as any).customers?.name || null;
    delete flat.customers;
    return json(flat);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("customer_logins").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleIncidentProjects(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("incident_projects").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    const { data, error: err } = await supabase.from("incident_projects").select("*").order("created_at", { ascending: false });
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("incident_projects").insert(body).select().single();
    if (err) return parseDbError(err, "incident-projects");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("incident_projects").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "incident-projects");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("incident_projects").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleTimesheetEntries(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  _action?: string,
  apiKeyUserId?: string | null
) {
  const selectFields = "*, projects(name), contracts(name)";

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("timesheet_entries").select(selectFields).eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("timesheet_entries").select(selectFields);
    const user_id = searchParams.get("user_id");
    if (user_id) query = query.eq("user_id", user_id);
    const project_id = searchParams.get("project_id");
    if (project_id) query = query.eq("project_id", project_id);
    const contract_id = searchParams.get("contract_id");
    if (contract_id) query = query.eq("contract_id", contract_id);
    const entry_type = searchParams.get("entry_type");
    if (entry_type) query = query.eq("entry_type", entry_type);
    const incident_id = searchParams.get("incident_id");
    if (incident_id) query = query.eq("incident_id", incident_id);
    const from_date = searchParams.get("from_date");
    if (from_date) query = query.gte("entry_date", from_date);
    const to_date = searchParams.get("to_date");
    if (to_date) query = query.lte("entry_date", to_date);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("entry_date", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    if (!body?.entry_type || !["project", "contract"].includes(body.entry_type)) {
      return richError("INVALID_ENTRY_TYPE", "entry_type is required and must be 'project' or 'contract'", 400, "Set entry_type to 'project' or 'contract'", { entry_type: "project", project_id: "uuid" });
    }
    if (body.entry_type === "project") {
      if (!body.project_id) return richError("MISSING_PROJECT_ID", "project_id is required for project entries", 400);
      delete body.contract_id;
    }
    if (body.entry_type === "contract") {
      if (!body.contract_id) return richError("MISSING_CONTRACT_ID", "contract_id is required for contract entries", 400);
      delete body.project_id;
    }
    const isAdmin = await checkIsAdmin(supabase, apiKeyUserId);
    if (!body.notes?.trim() && !isAdmin) {
      return richError("MISSING_NOTES", "notes is required for timesheet entries", 400, "Include a notes field describing the work performed", { notes: "Worked on X" });
    }
    // Non-admin: require referenced project/contract to be active AND user to be assigned
    if (!isAdmin) {
      if (!apiKeyUserId) return richError("UNAUTHORIZED", "API key has no assigned user", 401);
      if (body.entry_type === "project") {
        const { data: proj } = await supabase.from("projects").select("id, is_active").eq("id", body.project_id).maybeSingle();
        if (!proj) return richError("PROJECT_NOT_FOUND", `Project ${body.project_id} not found`, 404);
        if ((proj as any).is_active !== true) return richError("PROJECT_INACTIVE", "Cannot log time against an inactive project", 403);
        const { data: asg } = await supabase.from("project_assignments").select("id").eq("project_id", body.project_id).eq("user_id", apiKeyUserId).maybeSingle();
        if (!asg) return richError("FORBIDDEN", "You are not assigned to this project", 403);
      }
      if (body.entry_type === "contract") {
        const { data: con } = await supabase.from("contracts").select("id, is_active").eq("id", body.contract_id).maybeSingle();
        if (!con) return richError("CONTRACT_NOT_FOUND", `Contract ${body.contract_id} not found`, 404);
        if ((con as any).is_active !== true) return richError("CONTRACT_INACTIVE", "Cannot log time against an inactive contract", 403);
        const { data: asg } = await supabase.from("contract_assignments").select("id").eq("contract_id", body.contract_id).eq("user_id", apiKeyUserId).maybeSingle();
        if (!asg) return richError("FORBIDDEN", "You are not assigned to this contract", 403);
      }
    }
    delete body.task_mode;
    const { data, error: err } = await supabase.from("timesheet_entries").insert(body).select().single();
    if (err) return parseDbError(err, "timesheet-entries");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    delete body?.task_mode;
    const { data, error: err } = await supabase.from("timesheet_entries").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "timesheet-entries");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("timesheet_entries").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleProjects(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  const canSeeAll = await checkIsAdmin(supabase, apiKeyUserId);

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("projects").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    if (!canSeeAll) {
      if (!apiKeyUserId) return richError("UNAUTHORIZED", "API key has no assigned user", 401);
      if ((data as any)?.is_active !== true) {
        return richError("FORBIDDEN", "This project is inactive", 403);
      }
      const { data: asg } = await supabase
        .from("project_assignments")
        .select("id")
        .eq("project_id", id)
        .eq("user_id", apiKeyUserId)
        .maybeSingle();
      if (!asg) return richError("FORBIDDEN", "You are not assigned to this project", 403);
    }
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("projects").select("*");
    if (!canSeeAll) {
      if (!apiKeyUserId) return richError("UNAUTHORIZED", "API key has no assigned user", 401);
      const { data: asgs, error: asgErr } = await supabase
        .from("project_assignments")
        .select("project_id")
        .eq("user_id", apiKeyUserId);
      if (asgErr) return error(asgErr.message);
      const ids = (asgs || []).map((a: any) => a.project_id);
      if (ids.length === 0) return json([]);
      query = query.in("id", ids).eq("is_active", true);
    }
    const { data, error: err } = await query.order("created_at", { ascending: false });
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    if (body && (body.budget_hours === undefined || body.budget_hours === null)) {
      body.budget_hours = 0;
    }
    const { data, error: err } = await supabase.from("projects").insert(body).select().single();
    if (err) return parseDbError(err, "projects");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("projects").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "projects");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("projects").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

const CONTACT_SELECT = `
  *,
  contact_category_assignments(
    category_id,
    contact_categories(id, name)
  )
`;

function flattenContact(c: any) {
  const categories = (c.contact_category_assignments || []).map((a: any) => ({
    id: a.contact_categories?.id,
    name: a.contact_categories?.name,
  }));
  const { contact_category_assignments, notes: _legacyNotes, ...rest } = c;
  return { ...rest, categories };
}

// Resolve category names/IDs to category IDs
async function resolveCategoryIds(
  supabase: ReturnType<typeof createClient>,
  categories: string[]
): Promise<{ ids: string[]; err: Response | null }> {
  const { data: allCats, error: err } = await supabase
    .from("contact_categories")
    .select("id, name")
    .eq("is_active", true);
  if (err) return { ids: [], err: error(err.message, 500) };

  const ids: string[] = [];
  for (const cat of categories) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat);
    const match = isUuid
      ? allCats!.find((c: any) => c.id === cat)
      : allCats!.find((c: any) => c.name.toLowerCase() === cat.toLowerCase());
    if (!match) return { ids: [], err: error(`Unknown category: "${cat}". Valid categories: ${allCats!.map((c: any) => c.name).join(", ")}`, 400) };
    ids.push(match.id);
  }
  return { ids, err: null };
}

async function assignCategories(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  categoryIds: string[]
) {
  // Delete existing assignments
  await supabase.from("contact_category_assignments").delete().eq("contact_id", contactId);
  if (categoryIds.length === 0) return;
  await supabase.from("contact_category_assignments").insert(
    categoryIds.map((category_id) => ({ contact_id: contactId, category_id }))
  );
}

async function handleContactNotes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  contactId: string,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "50");
    const { data, error: err } = await supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (err) return error(err.message);
    return json(data || []);
  }

  if (method === "POST") {
    if (!body?.note_content) {
      return richError("MISSING_REQUIRED_FIELD", "Missing required field: note_content", 400, "Provide note_content in request body", { note_content: "Your note text here" });
    }
    const noteData: any = {
      contact_id: contactId,
      note_content: body.note_content,
    };
    const resolvedUserId = apiKeyUserId || body.created_by || null;
    if (!resolvedUserId) {
      return richError("MISSING_AUTHOR", "created_by is required or use an API key assigned to a user", 400);
    }
    noteData.created_by = resolvedUserId;
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", resolvedUserId).single();
    noteData.created_by_name = profile?.full_name || "API User";
    const { data, error: err } = await supabase.from("contact_notes").insert(noteData).select().single();
    if (err) return parseDbError(err, "contact-notes");
    return json(data, 201);
  }

  if (method === "DELETE") {
    const noteId = searchParams.get("note_id");
    if (!noteId) {
      return richError("MISSING_PARAM", "Missing required query param: note_id", 400, "Append ?note_id=<uuid> to the URL");
    }
    const { error: err } = await supabase
      .from("contact_notes")
      .delete()
      .eq("id", noteId)
      .eq("contact_id", contactId);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleContacts(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  action?: string,
  apiKeyUserId?: string | null
) {
  if (action === "notes" && id) {
    return handleContactNotes(supabase, method, id, body, searchParams, apiKeyUserId);
  }

  if (action === "convert-to-prospect" && id) {
    if (method !== "POST") return error("Method not allowed — use POST", 405);
    return convertContactToProspect(supabase, id, body, apiKeyUserId);
  }

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("contacts").select(CONTACT_SELECT).eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(flattenContact(data));
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    const category = searchParams.get("category");

    let query = supabase.from("contacts").select(CONTACT_SELECT).order("created_at", { ascending: false }).limit(limit);

    const { data, error: err } = await query;
    if (err) return error(err.message);

    let results = (data || []).map(flattenContact);

    // Filter by category name or ID after flattening
    if (category) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      results = results.filter((c: any) =>
        c.categories.some((cat: any) =>
          isUuid ? cat.id === category : cat.name?.toLowerCase() === category.toLowerCase()
        )
      );
    }

    return json(results);
  }

  if (method === "POST") {
    if (body) delete body.notes;
    if (body && !body.contact_name) {
      const parts = [body.first_name, body.last_name].filter(Boolean);
      if (parts.length > 0) {
        body.contact_name = parts.join(" ");
        delete body.first_name;
        delete body.last_name;
      } else {
        return richError("MISSING_CONTACT_NAME", "contact_name is required (or provide first_name and/or last_name)", 400, "Set contact_name or provide first_name/last_name which will be auto-composed", { contact_name: "Jane Smith" });
      }
    }
    if (body) { delete body.first_name; delete body.last_name; }

    const validSources = ["website", "referral", "linkedin", "email_campaign", "event", "cold_outreach", "partner", "existing_client"];
    if (!body?.source) return richError("MISSING_SOURCE", "source is required", 400, "Include a source value", { source: "referral" });
    if (!validSources.includes(body.source)) return richError("INVALID_SOURCE", `source must be one of: ${validSources.join(", ")}`, 400);

    const categories: string[] = body?.categories || [];
    if (body) delete body.categories;

    // Auto-resolve account from company_name if no account ID is already provided
    if (body && body.company_name && !body.converted_to_account_id) {
      const companyName = body.company_name.trim();

      // Look for an existing account (case-insensitive)
      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .ilike("name", companyName)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (existingAccount) {
        body.converted_to_account_id = existingAccount.id;
      } else {
        // Create a new account
        const { data: newAccount, error: accountErr } = await supabase
          .from("accounts")
          .insert({ name: companyName, is_active: true })
          .select("id")
          .single();

        if (accountErr) return error(`Failed to create account for company "${companyName}": ${accountErr.message}`, 500);
        body.converted_to_account_id = newAccount.id;
      }
    }

    const { data, error: err } = await supabase.from("contacts").insert(body).select(CONTACT_SELECT).single();
    if (err) return parseDbError(err, "contacts");

    if (categories.length > 0) {
      const { ids, err: catErr } = await resolveCategoryIds(supabase, categories);
      if (catErr) return catErr;
      await assignCategories(supabase, data.id, ids);
      // Re-fetch with categories
      const { data: fresh } = await supabase.from("contacts").select(CONTACT_SELECT).eq("id", data.id).single();
      return json(flattenContact(fresh), 201);
    }

    return json(flattenContact(data), 201);
  }

  if (method === "PATCH" && id) {
    if (body) delete body.notes;
    if (body && !body.contact_name && (body.first_name || body.last_name)) {
      const parts = [body.first_name, body.last_name].filter(Boolean);
      body.contact_name = parts.join(" ");
      delete body.first_name;
      delete body.last_name;
    }
    if (body) { delete body.first_name; delete body.last_name; }

    const categories: string[] | undefined = body?.categories;
    if (body) delete body.categories;

    if (body && body.company_name && !body.converted_to_account_id) {
      const companyName = body.company_name.trim();
      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .ilike("name", companyName)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (existingAccount) {
        body.converted_to_account_id = existingAccount.id;
      } else {
        const { data: newAccount, error: accountErr } = await supabase
          .from("accounts")
          .insert({ name: companyName, is_active: true })
          .select("id")
          .single();
        if (accountErr) return error(`Failed to create account for company "${companyName}": ${accountErr.message}`, 500);
        body.converted_to_account_id = newAccount.id;
      }
    }

    const { data, error: err } = await supabase.from("contacts").update(body).eq("id", id).select(CONTACT_SELECT).single();
    if (err) return parseDbError(err, "contacts");

    if (categories !== undefined) {
      const { ids, err: catErr } = await resolveCategoryIds(supabase, categories);
      if (catErr) return catErr;
      await assignCategories(supabase, id, ids);
      const { data: fresh } = await supabase.from("contacts").select(CONTACT_SELECT).eq("id", id).single();
      return json(flattenContact(fresh));
    }

    return json(flattenContact(data));
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("contacts").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// LEAVES — Full CRUD (upgraded from read-only)
// ============================================================================

async function handleLeaves(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  action?: string,
  apiKeyUserId?: string | null
) {
  if (action === "attachments" && id) {
    return handleLeaveAttachments(supabase, method, id, body, searchParams, apiKeyUserId);
  }

  const selectFields = "*, profiles!leave_applications_user_id_fkey(full_name)";

  const canSeeAll = await userCanSeeAllLeaves(supabase, apiKeyUserId);

  if (method === "GET" && id) {
    let query = supabase.from("leave_applications").select(selectFields).eq("id", id);
    if (!canSeeAll) query = query.eq("user_id", apiKeyUserId || "");
    const { data, error: err } = await query.single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("leave_applications").select(selectFields);
    if (!canSeeAll) {
      query = query.eq("user_id", apiKeyUserId || "");
    } else {
      const user_id = searchParams.get("user_id");
      if (user_id) query = query.eq("user_id", user_id);
    }
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const casualCheck = await enforceCasualUnpaidOnly(supabase, apiKeyUserId, body?.leave_type_id, body?.user_id);
    if (casualCheck) return casualCheck;
    const { data, error: err } = await supabase.from("leave_applications").insert(body).select().single();
    if (err) return parseDbError(err, "leaves");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    if (body?.leave_type_id) {
      const { data: existing } = await supabase.from("leave_applications").select("user_id").eq("id", id).single();
      const targetUserId = (existing as any)?.user_id || apiKeyUserId;
      const casualCheck = await enforceCasualUnpaidOnly(supabase, apiKeyUserId, body.leave_type_id, targetUserId);
      if (casualCheck) return casualCheck;
    }
    const { data, error: err } = await supabase.from("leave_applications").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "leaves");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("leave_applications").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

const LEAVE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const LEAVE_ATTACHMENT_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

async function handleLeaveAttachments(
  supabase: ReturnType<typeof createClient>,
  method: string,
  applicationId: string,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  const { data: appRow, error: appErr } = await supabase
    .from("leave_applications")
    .select("id, user_id")
    .eq("id", applicationId)
    .single();
  if (appErr || !appRow) {
    return richError("LEAVE_NOT_FOUND", `No leave application found with id ${applicationId}`, 404);
  }

  const canSeeAll = await userCanSeeAllLeaves(supabase, apiKeyUserId);
  if (!canSeeAll && (appRow as any).user_id !== apiKeyUserId) {
    return richError("FORBIDDEN", "You can only access attachments for your own leave applications", 403);
  }

  if (method === "GET") {
    const { data, error: err } = await supabase
      .from("leave_application_attachments")
      .select("*")
      .eq("application_id", applicationId)
      .order("uploaded_at", { ascending: false });
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const upload = body?.__upload;
    if (!upload || !(upload.file instanceof Uint8Array)) {
      return richError("MISSING_FILE", "Attachment upload requires multipart/form-data with a 'file' field", 400, "Submit POST /leaves/:id/attachments as multipart/form-data with field 'file'");
    }
    const fileName: string = upload.filename || "document";
    const mimeType: string = upload.mime || "application/octet-stream";
    const fileBytes: Uint8Array = upload.file;

    if (fileBytes.byteLength === 0) return richError("EMPTY_FILE", "Uploaded file is empty", 400);
    if (fileBytes.byteLength > LEAVE_ATTACHMENT_MAX_BYTES) {
      return richError("FILE_TOO_LARGE", `File exceeds ${LEAVE_ATTACHMENT_MAX_BYTES} bytes (10MB) limit`, 400);
    }
    if (!LEAVE_ATTACHMENT_ALLOWED_MIME.includes(mimeType)) {
      return richError("INVALID_FILE_TYPE", `Unsupported file type: ${mimeType}`, 400, `Allowed: ${LEAVE_ATTACHMENT_ALLOWED_MIME.join(", ")}`);
    }

    const ownerFolder = (appRow as any).user_id || apiKeyUserId || "api";
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/_{2,}/g, "_").substring(0, 100);
    const storagePath = `${ownerFolder}/${applicationId}/${Date.now()}_${sanitized}`;

    const { error: uploadErr } = await supabase.storage
      .from("leave-attachments")
      .upload(storagePath, fileBytes, { contentType: mimeType, upsert: false });
    if (uploadErr) {
      return richError("UPLOAD_FAILED", `Storage upload failed: ${uploadErr.message}`, 500);
    }

    const { data, error: insertErr } = await supabase
      .from("leave_application_attachments")
      .insert({
        application_id: applicationId,
        file_name: fileName,
        file_url: storagePath,
        file_type: mimeType,
        file_size: fileBytes.byteLength,
      })
      .select()
      .single();
    if (insertErr) {
      await supabase.storage.from("leave-attachments").remove([storagePath]).catch(() => {});
      return parseDbError(insertErr, "leaves");
    }
    return json(data, 201);
  }

  if (method === "DELETE") {
    const attachmentId = searchParams.get("attachment_id") || (body && body.attachment_id);
    if (!attachmentId) {
      return richError("MISSING_ATTACHMENT_ID", "attachment_id is required on DELETE", 400, "Include ?attachment_id=<uuid> in the query string");
    }
    const { data: existing, error: fetchErr } = await supabase
      .from("leave_application_attachments")
      .select("id, application_id, file_url")
      .eq("id", attachmentId)
      .eq("application_id", applicationId)
      .single();
    if (fetchErr || !existing) {
      return richError("ATTACHMENT_NOT_FOUND", `No attachment ${attachmentId} on leave application ${applicationId}`, 404);
    }
    const { error: delErr } = await supabase.from("leave_application_attachments").delete().eq("id", attachmentId);
    if (delErr) return error(delErr.message);
    await supabase.storage.from("leave-attachments").remove([(existing as any).file_url]).catch(() => {});
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleLeaveTypes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  searchParams: URLSearchParams,
  _action?: string,
  apiKeyUserId?: string | null
) {
  if (method !== "GET") return error("Method not allowed", 405);

  let isCasualOrTemp = false;
  if (apiKeyUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("employment_type")
      .eq("id", apiKeyUserId)
      .maybeSingle();
    const empType = (profile as any)?.employment_type as string | undefined;
    isCasualOrTemp = empType === "casual" || empType === "temporary";
  }

  if (id) {
    const { data, error: err } = await supabase.from("leave_types").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    if (isCasualOrTemp && ((data as any)?.name || "").toLowerCase() !== "unpaid leave") {
      return richError("FORBIDDEN", "Casual and temporary employees can only access Unpaid Leave", 403);
    }
    return json(data);
  }

  let query = supabase.from("leave_types").select("*");
  const includeInactive = searchParams.get("include_inactive") === "true";
  if (!includeInactive) query = query.eq("is_active", true);
  if (isCasualOrTemp) query = query.ilike("name", "unpaid leave");
  const { data, error: err } = await query.order("name");
  if (err) return error(err.message);
  return json(data);
}

// ============================================================================
// EXPENSES — Full CRUD (upgraded from read-only)
// ============================================================================

async function handleExpenses(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  action?: string,
  apiKeyUserId?: string | null
) {
  if (action === "attachments" && id) {
    return handleExpenseAttachments(supabase, method, id, body, searchParams, apiKeyUserId);
  }

  const selectFields = "*, expense_categories(name), expense_subcategories(name)";
  const enrich = (row: any) => {
    if (!row) return row;
    const out: any = { ...row };
    if (row.expense_categories && typeof row.expense_categories === "object") {
      out.category_name = row.expense_categories.name;
    }
    if (row.expense_subcategories && typeof row.expense_subcategories === "object") {
      out.subcategory_name = row.expense_subcategories.name;
    }
    delete out.expense_categories;
    delete out.expense_subcategories;
    return out;
  };

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("expenses").select(selectFields).eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(enrich(data));
  }

  if (method === "GET") {
    let query = supabase.from("expenses").select(selectFields);
    const user_id = searchParams.get("user_id");
    if (user_id) query = query.eq("user_id", user_id);
    const category_id = searchParams.get("category_id");
    if (category_id) query = query.eq("category_id", category_id);
    const subcategory_id = searchParams.get("subcategory_id");
    if (subcategory_id) query = query.eq("subcategory_id", subcategory_id);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const account_id = searchParams.get("account_id");
    if (account_id) query = query.eq("account_id", account_id);
    const deal_id = searchParams.get("deal_id");
    if (deal_id) query = query.eq("deal_id", deal_id);
    const from_date = searchParams.get("from_date");
    if (from_date) query = query.gte("expense_date", from_date);
    const to_date = searchParams.get("to_date");
    if (to_date) query = query.lte("expense_date", to_date);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("expense_date", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(enrich));
  }

  if (method === "POST") {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    if (!body?.amount || body.amount <= 0) return richError("MISSING_AMOUNT", "amount is required and must be greater than 0", 400, "Include amount as a positive number", { amount: 10.50 });
    if (!body?.expense_date) return richError("MISSING_EXPENSE_DATE", "expense_date is required", 400, "Include expense_date as YYYY-MM-DD", { expense_date: "2026-04-21" });
    if (!body?.category_id) return richError("MISSING_CATEGORY_ID", "category_id is required", 400, "Use GET /expense-categories to find valid category IDs, or send category_name to auto-resolve", { category_id: "<uuid>" });
    const { data, error: err } = await supabase.from("expenses").insert(body).select(selectFields).single();
    if (err) return parseDbError(err, "expenses");
    return json(enrich(data), 201);
  }

  if (method === "PATCH" && id) {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    const { data, error: err } = await supabase.from("expenses").update(body).eq("id", id).select(selectFields).single();
    if (err) return parseDbError(err, "expenses");
    return json(enrich(data));
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("expenses").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleExpenseCategories(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  _searchParams: URLSearchParams
) {
  if (method !== "GET") return error("Method not allowed", 405);
  if (id) {
    const { data, error: err } = await supabase.from("expense_categories").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }
  const { data, error: err } = await supabase.from("expense_categories").select("*").eq("is_active", true).order("sort_order").order("name");
  if (err) return error(err.message);
  return json(data);
}

async function handleExpenseSubcategories(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  searchParams: URLSearchParams
) {
  if (method !== "GET") return error("Method not allowed", 405);
  if (id) {
    const { data, error: err } = await supabase.from("expense_subcategories").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }
  let query = supabase.from("expense_subcategories").select("*").eq("is_active", true);
  const category_id = searchParams.get("category_id");
  if (category_id) query = query.eq("category_id", category_id);
  const { data, error: err } = await query.order("sort_order").order("name");
  if (err) return error(err.message);
  return json(data);
}

const EXPENSE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const EXPENSE_ATTACHMENT_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

async function handleExpenseAttachments(
  supabase: ReturnType<typeof createClient>,
  method: string,
  expenseId: string,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  const { data: expenseRow, error: expenseErr } = await supabase
    .from("expenses")
    .select("id, user_id")
    .eq("id", expenseId)
    .single();
  if (expenseErr || !expenseRow) {
    return richError("EXPENSE_NOT_FOUND", `No expense found with id ${expenseId}`, 404);
  }

  if (method === "GET") {
    const { data, error: err } = await supabase
      .from("expense_attachments")
      .select("*")
      .eq("expense_id", expenseId)
      .order("uploaded_at", { ascending: false });
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const upload = body?.__upload;
    if (!upload || !(upload.file instanceof Uint8Array)) {
      return richError("MISSING_FILE", "Attachment upload requires multipart/form-data with a 'file' field", 400, "Submit POST /expenses/:id/attachments as multipart/form-data with field 'file'");
    }
    const fileName: string = upload.filename || "receipt";
    const mimeType: string = upload.mime || "application/octet-stream";
    const fileBytes: Uint8Array = upload.file;

    if (fileBytes.byteLength === 0) return richError("EMPTY_FILE", "Uploaded file is empty", 400);
    if (fileBytes.byteLength > EXPENSE_ATTACHMENT_MAX_BYTES) {
      return richError("FILE_TOO_LARGE", `File exceeds ${EXPENSE_ATTACHMENT_MAX_BYTES} bytes (10MB) limit`, 400);
    }
    if (!EXPENSE_ATTACHMENT_ALLOWED_MIME.includes(mimeType)) {
      return richError("INVALID_FILE_TYPE", `Unsupported file type: ${mimeType}`, 400, `Allowed: ${EXPENSE_ATTACHMENT_ALLOWED_MIME.join(", ")}`);
    }

    const ownerFolder = (expenseRow as any).user_id || apiKeyUserId || "api";
    const extMatch = fileName.match(/\.([A-Za-z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : mimeType.split("/")[1] || "bin";
    const rand = Math.random().toString(36).substring(2, 7);
    const storagePath = `${ownerFolder}/receipt-${Date.now()}-${rand}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("expense-receipts")
      .upload(storagePath, fileBytes, { contentType: mimeType, upsert: false });
    if (uploadErr) {
      return richError("UPLOAD_FAILED", `Storage upload failed: ${uploadErr.message}`, 500);
    }

    const { data, error: insertErr } = await supabase
      .from("expense_attachments")
      .insert({
        expense_id: expenseId,
        file_name: fileName,
        file_url: storagePath,
        file_type: mimeType,
        file_size: fileBytes.byteLength,
      })
      .select()
      .single();
    if (insertErr) {
      await supabase.storage.from("expense-receipts").remove([storagePath]).catch(() => {});
      return parseDbError(insertErr, "expense-attachments");
    }
    return json(data, 201);
  }

  if (method === "DELETE") {
    const attachmentId = searchParams.get("attachment_id") || (body && body.attachment_id);
    if (!attachmentId) {
      return richError("MISSING_ATTACHMENT_ID", "attachment_id is required on DELETE", 400, "Include ?attachment_id=<uuid> in the query string");
    }
    const { data: existing, error: fetchErr } = await supabase
      .from("expense_attachments")
      .select("id, expense_id, file_url")
      .eq("id", attachmentId)
      .eq("expense_id", expenseId)
      .single();
    if (fetchErr || !existing) {
      return richError("ATTACHMENT_NOT_FOUND", `No attachment ${attachmentId} on expense ${expenseId}`, 404);
    }
    const { error: delErr } = await supabase.from("expense_attachments").delete().eq("id", attachmentId);
    if (delErr) return error(delErr.message);
    await supabase.storage.from("expense-receipts").remove([(existing as any).file_url]).catch(() => {});
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// CUSTOMERS — Full CRUD (upgraded from read-only)
// ============================================================================

async function handleCustomers(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("customers").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    const { data, error: err } = await supabase.from("customers").select("*").order("name").limit(limit);
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("customers").insert(body).select().single();
    if (err) return parseDbError(err, "customers");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("customers").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "customers");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("customers").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// OHS HAZARD REPORTS — Full CRUD
// ============================================================================

async function handleOhsHazardReports(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("ohs_hazard_reports").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("ohs_hazard_reports").select("*");
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    // Resolve manager_name → manager_taking_report UUID via profiles.full_name
    if (body?.manager_name && !body?.manager_taking_report) {
      const result = await resolveNameToId(supabase, "profiles", "full_name", body.manager_name, "manager");
      if (result instanceof Response) return result;
      body.manager_taking_report = result.id;
      delete body.manager_name;
    }
    // initial_risk_rating is auto-calculated by trigger — remove if caller mistakenly sends it
    if (body) delete body.initial_risk_rating;
    const { data, error: err } = await supabase.from("ohs_hazard_reports").insert(body).select().single();
    if (err) return parseDbError(err, "ohs-hazard-reports");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("ohs_hazard_reports").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "ohs-hazard-reports");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("ohs_hazard_reports").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// OHS HR INCIDENTS — Full CRUD
// ============================================================================

async function handleOhsHrIncidents(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("ohs_hr_incidents").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("ohs_hr_incidents").select("*");
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("ohs_hr_incidents").insert(body).select().single();
    if (err) return parseDbError(err, "ohs-hr-incidents");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("ohs_hr_incidents").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "ohs-hr-incidents");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("ohs_hr_incidents").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// OHS INJURY REGISTERS — Full CRUD
// ============================================================================

async function handleOhsInjuryRegisters(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("ohs_injury_registers").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("ohs_injury_registers").select("*");
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("ohs_injury_registers").insert(body).select().single();
    if (err) return parseDbError(err, "ohs-injury-registers");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("ohs_injury_registers").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "ohs-injury-registers");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("ohs_injury_registers").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// OHS WORKPLACE INSPECTIONS — Full CRUD
// ============================================================================

/**
 * Translates "completion intent" aliases on overall_status into valid DB values.
 *
 * The DB inspection_status enum is: Compliant | Non-Compliant | Not Applicable | Requires Action
 * It has no "completed" / "done" / "finished" value. When a caller sends one of those,
 * they mean "this inspection is now finished" — we interpret that as:
 *   - overall_status → "Compliant"   (default positive outcome for a completed inspection)
 *   - completed_at  → now()          (stamp the completion time)
 *
 * If the caller also supplies completed_at explicitly, their value is kept.
 */
function resolveInspectionCompletionAlias(body: any): any {
  if (!body?.overall_status) return body;
  const COMPLETION_ALIASES = new Set(["completed", "done", "finished", "complete"]);
  const normalized = String(body.overall_status).toLowerCase().replace(/[-_ ]/g, "");
  if (COMPLETION_ALIASES.has(normalized)) {
    body.overall_status = "Compliant";
    if (body.completed_at === undefined || body.completed_at === null) {
      body.completed_at = new Date().toISOString();
    }
  }
  return body;
}

async function handleOhsWorkplaceInspections(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("ohs_workplace_inspections").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("ohs_workplace_inspections").select("*");
    const overall_status = searchParams.get("overall_status");
    if (overall_status) query = query.eq("overall_status", overall_status);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    body = resolveInspectionCompletionAlias(body);
    const { data, error: err } = await supabase.from("ohs_workplace_inspections").insert(body).select().single();
    if (err) return parseDbError(err, "ohs-workplace-inspections");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    body = resolveInspectionCompletionAlias(body);
    const { data, error: err } = await supabase.from("ohs_workplace_inspections").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "ohs-workplace-inspections");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("ohs_workplace_inspections").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// TEAM MEMBERS (incident_project_assignments) — Full CRUD
// ============================================================================

async function handleTeamMembers(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  const selectFields = "*, profiles!incident_project_assignments_user_id_profiles_fkey(full_name, email)";

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("incident_project_assignments").select(selectFields).eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("incident_project_assignments").select(selectFields);
    const incident_project_id = searchParams.get("incident_project_id");
    if (incident_project_id) query = query.eq("incident_project_id", incident_project_id);
    const user_id = searchParams.get("user_id");
    if (user_id) query = query.eq("user_id", user_id);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("assigned_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    if (!body?.role) body.role = "member";
    const { data, error: err } = await supabase.from("incident_project_assignments").insert(body).select().single();
    if (err) return parseDbError(err, "team-members");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("incident_project_assignments").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "team-members");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("incident_project_assignments").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// WORK SCHEDULES — Full CRUD
// ============================================================================

async function handleWorkSchedules(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  _action?: string,
  apiKeyUserId?: string | null
) {
  const isAdmin = await checkIsAdmin(supabase, apiKeyUserId);

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("work_schedules").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    if (!isAdmin && data?.user_id !== apiKeyUserId) {
      return richError("FORBIDDEN", "You can only access your own work schedule", 403);
    }
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("work_schedules").select("*");
    const user_id = searchParams.get("user_id");
    if (!isAdmin) {
      query = query.eq("user_id", apiKeyUserId || "");
    } else if (user_id) {
      query = query.eq("user_id", user_id);
    }
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("work_schedules").upsert(body, { onConflict: "user_id" }).select().single();
    if (err) return parseDbError(err, "work-schedules");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("work_schedules").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "work-schedules");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("work_schedules").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// WEEKLY WORK SCHEDULES — Full CRUD
// ============================================================================

async function handleWeeklyWorkSchedules(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  _action?: string,
  apiKeyUserId?: string | null
) {
  const isAdmin = await checkIsAdmin(supabase, apiKeyUserId);

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("weekly_work_schedules").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    if (!isAdmin && data?.user_id !== apiKeyUserId) {
      return richError("FORBIDDEN", "You can only access your own weekly work schedule", 403);
    }
    return json(data);
  }

  if (method === "GET") {
    let query = supabase.from("weekly_work_schedules").select("*");
    const user_id = searchParams.get("user_id");
    if (!isAdmin) {
      query = query.eq("user_id", apiKeyUserId || "");
    } else if (user_id) {
      query = query.eq("user_id", user_id);
    }
    const week_start_date = searchParams.get("week_start_date");
    if (week_start_date) query = query.eq("week_start_date", week_start_date);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("week_start_date", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("weekly_work_schedules").upsert(body, { onConflict: "user_id,week_start_date" }).select().single();
    if (err) return parseDbError(err, "weekly-work-schedules");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("weekly_work_schedules").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "weekly-work-schedules");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("weekly_work_schedules").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// DAILY LOCATION CHECK-INS
// ============================================================================

async function handleDailyLocationCheckins(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  _action?: string,
  apiKeyUserId?: string | null
) {
  const select = "*, profiles!daily_location_checkins_user_id_fkey(full_name, email)";

  function flatten(d: any) {
    if (!d) return d;
    const r = { ...d };
    r.user_name = d.profiles?.full_name || null;
    r.user_email = d.profiles?.email || null;
    delete r.profiles;
    return r;
  }

  if (method === "GET" && id) {
    const isAdmin = await checkIsAdmin(supabase, apiKeyUserId);
    let query = supabase.from("daily_location_checkins").select(select).eq("id", id);
    if (!isAdmin) query = query.eq("user_id", apiKeyUserId || "");
    const { data, error: err } = await query.single();
    if (err) return error(err.message, 404);
    return json(flatten(data));
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    const isAdmin = await checkIsAdmin(supabase, apiKeyUserId);
    let query = supabase.from("daily_location_checkins").select(select).order("check_in_date", { ascending: false }).limit(limit);
    // Non-admins can only see their own check-ins; admin can filter by any user_id or see all
    if (!isAdmin) {
      query = query.eq("user_id", apiKeyUserId || "");
    } else {
      const user_id = searchParams.get("user_id");
      if (user_id) query = query.eq("user_id", user_id);
    }
    const date = searchParams.get("date");
    if (date) query = query.eq("check_in_date", date);
    const from_date = searchParams.get("from_date");
    if (from_date) query = query.gte("check_in_date", from_date);
    const to_date = searchParams.get("to_date");
    if (to_date) query = query.lte("check_in_date", to_date);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(flatten));
  }

  if (method === "POST") {
    if (!body?.actual_location) return richError("MISSING_ACTUAL_LOCATION", "actual_location is required", 400, "Include actual_location (e.g. 'wfh', 'jolimont', 'collins_square', 'client', 'meetings', 'not_in_work')", { actual_location: "wfh" });
    if (!body?.check_in_date) return richError("MISSING_CHECK_IN_DATE", "check_in_date is required", 400, "Include check_in_date as YYYY-MM-DD", { check_in_date: "2026-04-21" });
    if (apiKeyUserId && !body.user_id) body.user_id = apiKeyUserId;
    const { data, error: err } = await supabase.from("daily_location_checkins").insert(body).select(select).single();
    if (err) return parseDbError(err, "daily-location-checkins");
    return json(flatten(data), 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("daily_location_checkins").update(body).eq("id", id).select(select).single();
    if (err) return parseDbError(err, "daily-location-checkins");
    return json(flatten(data));
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("daily_location_checkins").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// PROFILES (read-only)
// ============================================================================

async function handleProfiles(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  searchParams: URLSearchParams
) {
  if (method !== "GET") return error("Method not allowed", 405);

  if (id) {
    const { data, error: err } = await supabase.from("profiles").select("id, full_name, email, organization, time_zone, is_active").eq("id", id).single();
    if (err) return error(err.message, 404);
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", id).limit(1).single();
    return json({ ...data, role: roleData?.role || null });
  }

  const limit = parseInt(searchParams.get("limit") || "100");
  const { data, error: err } = await supabase.from("profiles").select("id, full_name, email, organization, time_zone, is_active").order("full_name").limit(limit);
  if (err) return error(err.message);

  const userIds = (data || []).map((p: any) => p.id);
  const { data: rolesData } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
  const roleMap = new Map((rolesData || []).map((r: any) => [r.user_id, r.role]));
  const enriched = (data || []).map((p: any) => ({ ...p, role: roleMap.get(p.id) || null }));
  return json(enriched);
}

async function handleAccounts(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("accounts").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    const { data, error: err } = await supabase.from("accounts").select("*").order("name").limit(limit);
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("accounts").insert(body).select().single();
    if (err) return parseDbError(err, "accounts");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("accounts").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "accounts");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("accounts").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handlePipelineStages(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  _searchParams: URLSearchParams
) {
  if (method !== "GET") return error("Method not allowed", 405);

  if (id) {
    const { data, error: err } = await supabase.from("pipeline_stages").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  const { data, error: err } = await supabase.from("pipeline_stages").select("*").order("stage_order", { ascending: true });
  if (err) return error(err.message);
  return json(data);
}

async function handleDeals(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  action?: string,
  apiKeyUserId?: string | null
) {
  if (action === "transition" && method === "POST" && id) {
    return handleDealTransition(supabase, id, body);
  }
  if (action === "notes" && id) {
    return handleDealNotes(supabase, method, id, body, searchParams, apiKeyUserId);
  }
  if (action === "history" && method === "GET" && id) {
    return handleDealHistory(supabase, id, searchParams);
  }
  if (action === "amount" && method === "PATCH" && id) {
    return handleDealAmount(supabase, id, body);
  }

  const enrichedSelect = "*, pipeline_stages(name), accounts!deals_account_id_fkey(name), contacts!deals_primary_lead_id_fkey(contact_name)";

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("deals").select(enrichedSelect).eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(flattenDeal(data));
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    let query = supabase.from("deals").select(enrichedSelect);
    const stage_id = searchParams.get("stage_id");
    if (stage_id) query = query.eq("pipeline_stage_id", stage_id);
    const account_id = searchParams.get("account_id");
    if (account_id) query = query.eq("account_id", account_id);
    const stage_name = searchParams.get("stage_name");
    if (stage_name) {
      const { data: stg } = await supabase.from("pipeline_stages").select("id").ilike("name", stage_name).single();
      if (stg) query = query.eq("pipeline_stage_id", stg.id);
    }
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(flattenDeal));
  }

  if (method === "POST") {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    if (apiKeyUserId && !body.created_by) body.created_by = apiKeyUserId;
    const { data, error: err } = await supabase.from("deals").insert(body).select().single();
    if (err) return parseDbError(err, "deals");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    const { data, error: err } = await supabase.from("deals").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "deals");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("deals").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

function flattenDeal(d: any) {
  if (!d) return d;
  const result = { ...d };
  result.pipeline_stage_name = d.pipeline_stages?.name || null;
  delete result.pipeline_stages;
  result.account_name = d.accounts?.name || null;
  delete result.accounts;
  result.primary_contact_name = d.contacts?.contact_name || null;
  delete result.contacts;
  return result;
}

async function handleDealAmount(
  supabase: ReturnType<typeof createClient>,
  dealId: string,
  body: any
) {
  const { amount } = body || {};
  if (amount === undefined) {
    return richError("MISSING_FIELDS", "amount is required", 400, "Provide the display amount for the deal", { amount: 5000 });
  }
  const { data, error: err } = await supabase.from("deals").update({ amount }).eq("id", dealId).select().single();
  if (err) return parseDbError(err, "deals");
  return json(data);
}

async function handleDealTransition(
  supabase: ReturnType<typeof createClient>,
  dealId: string,
  body: any
) {
  if (!body?.to_stage) {
    return richError("MISSING_TO_STAGE", "to_stage is required", 400, "Provide the stage name to transition to", { to_stage: "Discovery" });
  }

  const { data: stage } = await supabase.from("pipeline_stages").select("id, name, stage_order, is_closed_won, is_closed_lost").ilike("name", body.to_stage).single();

  if (!stage) {
    const { data: allStages } = await supabase.from("pipeline_stages").select("name").eq("is_active", true).order("stage_order");
    return richError("STAGE_NOT_FOUND", `Pipeline stage "${body.to_stage}" not found`, 404, `Available stages: ${(allStages || []).map((s: any) => s.name).join(", ")}`, { to_stage: (allStages || [])[0]?.name || "Discovery" });
  }

  const { data: deal, error: dealErr } = await supabase.from("deals").select("id, pipeline_stage_id, name").eq("id", dealId).single();
  if (dealErr || !deal) return richError("DEAL_NOT_FOUND", `Deal ${dealId} not found`, 404);

  if (deal.pipeline_stage_id && deal.pipeline_stage_id !== stage.id) {
    await supabase.from("deal_stage_history").insert({ deal_id: dealId, from_stage_id: deal.pipeline_stage_id, to_stage_id: stage.id });
  }

  const updatePayload: any = { pipeline_stage_id: stage.id };
  if (body.clear_next_step !== false) {
    updatePayload.next_step = null;
    updatePayload.next_step_due_date = null;
  }
  if (body.next_step) updatePayload.next_step = body.next_step;
  if (body.next_step_due_date) updatePayload.next_step_due_date = body.next_step_due_date;
  if (body.notes) updatePayload.notes = body.notes;

  const { data: updated, error: updateErr } = await supabase.from("deals").update(updatePayload).eq("id", dealId).select().single();
  if (updateErr) return error(updateErr.message);

  return json({ ...updated, pipeline_stage_name: stage.name, transitioned: true, from_stage_id: deal.pipeline_stage_id, to_stage_id: stage.id, to_stage_name: stage.name });
}

async function handleDealNotes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  dealId: string,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "50");
    const { data, error: err } = await supabase.from("deal_stage_notes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }).limit(limit);
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    if (!body?.note_content) {
      return richError("MISSING_REQUIRED_FIELD", "Missing required field: note_content", 400, "Provide note_content in request body", { note_content: "Stage transition note" });
    }

    let stageId = body.stage_id || null;
    let stageName = body.stage_name || null;

    // Auto-fill from deal's current stage if not provided
    if (!stageId || !stageName) {
      const { data: deal } = await supabase
        .from("deals")
        .select("pipeline_stage_id, pipeline_stages(name)")
        .eq("id", dealId)
        .single();
      if (deal) {
        stageId = stageId || (deal as any).pipeline_stage_id;
        stageName = stageName || (deal as any).pipeline_stages?.name || "Unknown";
      }
    }

    const noteData: any = {
      deal_id: dealId,
      note_content: body.note_content,
      stage_name: stageName,
      stage_id: stageId,
      lost_reason: body.lost_reason || null,
      lost_reason_other: body.lost_reason_other || null,
    };

    // Check for apiKeyUserId passed via body (already extracted at gateway level)
    // or fall back to body.created_by for session-based calls
    const resolvedUserId = apiKeyUserId || body.created_by || null;
    if (resolvedUserId) {
      noteData.created_by = resolvedUserId;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", resolvedUserId).single();
      noteData.created_by_name = profile?.full_name || "API User";
    } else {
      noteData.created_by_name = body.created_by_name || "API User";
    }

    const { data, error: err } = await supabase.from("deal_stage_notes").insert(noteData).select().single();
    if (err) return parseDbError(err, "deal-notes");
    return json(data, 201);
  }

  return error("Method not allowed", 405);
}

async function handleDealHistory(
  supabase: ReturnType<typeof createClient>,
  dealId: string,
  searchParams: URLSearchParams
) {
  const limit = parseInt(searchParams.get("limit") || "50");
  const { data, error: err } = await supabase.from("deal_stage_history").select("id, deal_id, from_stage_id, to_stage_id, changed_at, changed_by").eq("deal_id", dealId).order("changed_at", { ascending: false }).limit(limit);
  if (err) return error(err.message);

  const stageIds = new Set<string>();
  (data || []).forEach((h: any) => {
    if (h.from_stage_id) stageIds.add(h.from_stage_id);
    if (h.to_stage_id) stageIds.add(h.to_stage_id);
  });

  const stageMap = new Map<string, string>();
  if (stageIds.size > 0) {
    const { data: stages } = await supabase.from("pipeline_stages").select("id, name").in("id", Array.from(stageIds));
    (stages || []).forEach((s: any) => stageMap.set(s.id, s.name));
  }

  const enriched = (data || []).map((h: any) => ({ ...h, from_stage_name: stageMap.get(h.from_stage_id) || null, to_stage_name: stageMap.get(h.to_stage_id) || null }));
  return json(enriched);
}

// ============================================================================
// MEETINGS (enriched with label fields + name resolution)
// ============================================================================

async function handleMeetingNotes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  meetingId: string,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "50");
    const { data, error: err } = await supabase
      .from("crm_meeting_notes")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (err) return error(err.message);
    return json(data || []);
  }

  if (method === "POST") {
    const content = body?.content ?? body?.note_content;
    if (!content) {
      return richError("MISSING_REQUIRED_FIELD", "Missing required field: content", 400, "Provide content (or note_content) in request body", { content: "Your note text here" });
    }
    const noteData: any = {
      meeting_id: meetingId,
      content,
      note_type: body?.note_type || "general",
    };
    if (body?.note_date) noteData.note_date = body.note_date;
    const resolvedUserId = apiKeyUserId || body?.created_by || null;
    if (resolvedUserId) noteData.created_by = resolvedUserId;
    const { data, error: err } = await supabase.from("crm_meeting_notes").insert(noteData).select().single();
    if (err) return parseDbError(err, "meeting-notes");
    return json(data, 201);
  }

  if (method === "PATCH") {
    const noteId = searchParams.get("note_id");
    if (!noteId) {
      return richError("MISSING_PARAM", "Missing required query param: note_id", 400, "Append ?note_id=<uuid> to the URL");
    }
    const patch: any = {};
    if (body?.content != null) patch.content = body.content;
    if (body?.note_content != null) patch.content = body.note_content;
    if (body?.note_type != null) patch.note_type = body.note_type;
    if (body?.note_date != null) patch.note_date = body.note_date;
    const { data, error: err } = await supabase
      .from("crm_meeting_notes")
      .update(patch)
      .eq("id", noteId)
      .eq("meeting_id", meetingId)
      .select()
      .single();
    if (err) return parseDbError(err, "meeting-notes");
    return json(data);
  }

  if (method === "DELETE") {
    const noteId = searchParams.get("note_id");
    if (!noteId) {
      return richError("MISSING_PARAM", "Missing required query param: note_id", 400, "Append ?note_id=<uuid> to the URL");
    }
    const { error: err } = await supabase
      .from("crm_meeting_notes")
      .delete()
      .eq("id", noteId)
      .eq("meeting_id", meetingId);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleMeetings(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  action?: string,
  apiKeyUserId?: string | null
) {
  if (action === "notes" && id) {
    return handleMeetingNotes(supabase, method, id, body, searchParams, apiKeyUserId);
  }

  const enrichedSelect = "*, contacts!crm_meetings_lead_id_fkey(contact_name), deals!crm_meetings_deal_id_fkey(name), accounts!crm_meetings_account_id_fkey(name), prospects!crm_meetings_prospect_id_fkey(id, name, stage)";

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("crm_meetings").select(enrichedSelect).eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(flattenMeeting(data));
  }

  if (method === "GET") {
    let query = supabase.from("crm_meetings").select(enrichedSelect);
    const contact_id = searchParams.get("contact_id");
    if (contact_id) query = query.eq("contact_id", contact_id);
    const deal_id = searchParams.get("deal_id");
    if (deal_id) query = query.eq("deal_id", deal_id);
    const prospect_id = searchParams.get("prospect_id");
    if (prospect_id) query = query.eq("prospect_id", prospect_id);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const from_date = searchParams.get("from_date");
    if (from_date) query = query.gte("meeting_date", from_date);
    const to_date = searchParams.get("to_date");
    if (to_date) query = query.lte("meeting_date", to_date);
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("meeting_date", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(flattenMeeting));
  }

  if (method === "POST") {
    const validMeetingTypes = ["new_contact", "existing_client", "follow_up"];
    if (!body?.meeting_type) return richError("MISSING_MEETING_TYPE", "meeting_type is required", 400, "Include meeting_type", { meeting_type: "follow_up" });
    if (!validMeetingTypes.includes(body.meeting_type)) return richError("INVALID_MEETING_TYPE", `meeting_type must be one of: ${validMeetingTypes.join(", ")}`, 400);
    if (apiKeyUserId) body.owner_id = apiKeyUserId;
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    const MEETING_FIELDS = new Set(["title", "meeting_type", "meeting_date", "start_time", "end_time", "location", "description", "contact_id", "account_id", "deal_id", "prospect_id", "contact_name", "contact_phone", "contact_email", "status", "owner_id", "created_by"]);
    const sanitized = Object.fromEntries(Object.entries(body).filter(([k]) => MEETING_FIELDS.has(k)));
    const { data, error: err } = await supabase.from("crm_meetings").insert(sanitized).select().single();
    if (err) return parseDbError(err, "meetings");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    const MEETING_PATCH_FIELDS = new Set(["title", "meeting_type", "meeting_date", "start_time", "end_time", "location", "description", "contact_id", "account_id", "deal_id", "prospect_id", "contact_name", "contact_phone", "contact_email", "status", "owner_id"]);
    const sanitized = Object.fromEntries(Object.entries(body).filter(([k]) => MEETING_PATCH_FIELDS.has(k)));
    const { data, error: err } = await supabase.from("crm_meetings").update(sanitized).eq("id", id).select().single();
    if (err) return parseDbError(err, "meetings");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("crm_meetings").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

function flattenMeeting(d: any) {
  if (!d) return d;
  const result = { ...d };
  result.contact_display_name = d.contacts?.contact_name || null;
  delete result.contacts;
  result.deal_name = d.deals?.name || null;
  delete result.deals;
  result.account_name = d.accounts?.name || null;
  delete result.accounts;
  result.prospect_name = d.prospects?.name || null;
  result.prospect_stage = d.prospects?.stage || null;
  delete result.prospects;
  return result;
}

// ============================================================================
// CONTRACTS (enriched with label fields + name resolution)
// ============================================================================

async function handleContracts(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  const enrichedSelect = "*, customers!fk_contracts_customer(name), deals!contracts_deal_id_fkey(name)";
  const canSeeAll = await checkIsAdmin(supabase, apiKeyUserId);

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("contracts").select(enrichedSelect).eq("id", id).single();
    if (err) return error(err.message, 404);
    if (!canSeeAll) {
      if (!apiKeyUserId) return richError("UNAUTHORIZED", "API key has no assigned user", 401);
      if ((data as any)?.is_active !== true) {
        return richError("FORBIDDEN", "This contract is inactive", 403);
      }
      const { data: asg } = await supabase
        .from("contract_assignments")
        .select("id")
        .eq("contract_id", id)
        .eq("user_id", apiKeyUserId)
        .maybeSingle();
      if (!asg) return richError("FORBIDDEN", "You are not assigned to this contract", 403);
    }
    return json(flattenContract(data));
  }

  if (method === "GET") {
    let query = supabase.from("contracts").select(enrichedSelect);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const customer_id = searchParams.get("customer_id");
    if (customer_id) query = query.eq("customer_id", customer_id);
    const deal_id = searchParams.get("deal_id");
    if (deal_id) query = query.eq("deal_id", deal_id);
    if (!canSeeAll) {
      if (!apiKeyUserId) return richError("UNAUTHORIZED", "API key has no assigned user", 401);
      const { data: asgs, error: asgErr } = await supabase
        .from("contract_assignments")
        .select("contract_id")
        .eq("user_id", apiKeyUserId);
      if (asgErr) return error(asgErr.message);
      const ids = (asgs || []).map((a: any) => a.contract_id);
      if (ids.length === 0) return json([]);
      query = query.in("id", ids).eq("is_active", true);
    }
    const limit = parseInt(searchParams.get("limit") || "100");
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(flattenContract));
  }

  if (method === "POST") {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    const { data, error: err } = await supabase.from("contracts").insert(body).select().single();
    if (err) return parseDbError(err, "contracts");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    const { data, error: err } = await supabase.from("contracts").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "contracts");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("contracts").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

function flattenContract(d: any) {
  if (!d) return d;
  const result = { ...d };
  result.customer_name = d.customers?.name || null;
  delete result.customers;
  result.deal_name = d.deals?.name || null;
  delete result.deals;
  return result;
}

// ============================================================================
// ASSETS — Full CRUD
// ============================================================================

async function handleAssets(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase
      .from("assets")
      .select(`*, type:asset_types(id, name), status:asset_statuses(id, name, colour), group:asset_groups(id, name, color), owner:profiles!owner_user_id(id, full_name, email)`)
      .eq("id", id)
      .single();
    if (err) return error(err.message, 404);
    return json(flattenAsset(data));
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    let query = supabase
      .from("assets")
      .select(`*, type:asset_types(id, name), status:asset_statuses(id, name, colour), group:asset_groups(id, name, color), owner:profiles!owner_user_id(id, full_name, email)`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const search = searchParams.get("search");
    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`label.ilike.${pattern},serial_number.ilike.${pattern},asset_key.ilike.${pattern}`);
    }
    const typeId = searchParams.get("type_id");
    if (typeId) query = query.eq("type_id", typeId);
    const statusId = searchParams.get("status_id");
    if (statusId) query = query.eq("status_id", statusId);
    const groupId = searchParams.get("group_id");
    if (groupId) query = query.eq("group_id", groupId);
    const ownerUserId = searchParams.get("owner_user_id");
    if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
    const warrantyDays = parseInt(searchParams.get("warranty_expiring_days") || "0");
    if (warrantyDays > 0) {
      const cutoff = new Date(Date.now() + warrantyDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      query = query.lte("warranty_expiry", cutoff).not("warranty_expiry", "is", null);
    }

    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(flattenAsset));
  }

  if (method === "POST") {
    if (!body.asset_key && body.group_id) {
      const { data: keyData, error: keyErr } = await supabase.rpc("generate_asset_key", { p_group_id: body.group_id });
      if (!keyErr && keyData) body.asset_key = keyData;
    }
    const { data, error: err } = await supabase.from("assets").insert(body).select().single();
    if (err) return parseDbError(err, "assets");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("assets").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "assets");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("assets").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

function flattenAsset(d: any) {
  if (!d) return d;
  const result = { ...d };
  result.type_name = d.type?.name || null;
  delete result.type;
  result.status_name = d.status?.name || null;
  result.status_colour = d.status?.colour || null;
  delete result.status;
  result.group_name = d.group?.name || null;
  delete result.group;
  result.owner_name = d.owner?.full_name || null;
  result.owner_email = d.owner?.email || null;
  delete result.owner;
  return result;
}

// ============================================================================
// ASSET GROUPS — Full CRUD
// ============================================================================

async function handleAssetGroups(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase
      .from("asset_groups")
      .select("*, customer:customers(id, name)")
      .eq("id", id)
      .single();
    if (err) return error(err.message, 404);
    return json(flattenAssetGroup(data));
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    const customerId = searchParams.get("customer_id");
    let query = supabase
      .from("asset_groups")
      .select("*, customer:customers(id, name)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(limit);
    if (customerId) query = query.eq("customer_id", customerId);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(flattenAssetGroup));
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("asset_groups").insert(body).select().single();
    if (err) return parseDbError(err, "asset-groups");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase
      .from("asset_groups")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (err) return parseDbError(err, "asset-groups");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("asset_groups").update({ is_active: false }).eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

function flattenAssetGroup(d: any) {
  if (!d) return d;
  const result = { ...d };
  result.customer_name = d.customer?.name || null;
  delete result.customer;
  return result;
}

// ============================================================================
// ASSET TYPES — Read-only lookup
// ============================================================================

async function handleAssetTypes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  _searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("asset_types").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }
  if (method === "GET") {
    const { data, error: err } = await supabase.from("asset_types").select("*").order("name");
    if (err) return error(err.message);
    return json(data);
  }
  return error("Method not allowed", 405);
}

// ============================================================================
// ASSET STATUSES — Read-only lookup
// ============================================================================

async function handleAssetStatuses(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  _body: any,
  _searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("asset_statuses").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }
  if (method === "GET") {
    const { data, error: err } = await supabase.from("asset_statuses").select("*").order("name");
    if (err) return error(err.message);
    return json(data);
  }
  return error("Method not allowed", 405);
}

// ============================================================================
// PORTAL GROUPS — Full CRUD
// ============================================================================

async function handlePortalGroups(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("portal_groups").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    let query = supabase
      .from("portal_groups")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(limit);
    const customerId = searchParams.get("customer_id");
    if (customerId) query = query.eq("customer_id", customerId);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("portal_groups").insert(body).select().single();
    if (err) return parseDbError(err, "portal-groups");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase
      .from("portal_groups")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (err) return parseDbError(err, "portal-groups");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("portal_groups").update({ is_active: false }).eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// PORTAL REQUEST TYPES — Full CRUD
// ============================================================================

async function handlePortalRequestTypes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("portal_request_types").select("*").eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    let query = supabase
      .from("portal_request_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(limit);
    const category = searchParams.get("category");
    if (category) query = query.eq("category", category);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("portal_request_types").insert(body).select().single();
    if (err) return parseDbError(err, "portal-request-types");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase
      .from("portal_request_types")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (err) return parseDbError(err, "portal-request-types");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("portal_request_types").update({ is_active: false }).eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// PORTAL GROUP REQUEST TYPES — Full CRUD
// ============================================================================

async function handlePortalGroupRequestTypes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET" && id) {
    const { data, error: err } = await supabase
      .from("portal_group_request_types")
      .select("*, portal_group:portal_groups(id, name), request_type:portal_request_types(id, name, icon, category)")
      .eq("id", id)
      .single();
    if (err) return error(err.message, 404);
    return json(data);
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    let query = supabase
      .from("portal_group_request_types")
      .select("*, portal_group:portal_groups(id, name), request_type:portal_request_types(id, name, icon, category)")
      .order("sort_order", { ascending: true })
      .limit(limit);
    const portalGroupId = searchParams.get("portal_group_id");
    if (portalGroupId) query = query.eq("portal_group_id", portalGroupId);
    const requestTypeId = searchParams.get("request_type_id");
    if (requestTypeId) query = query.eq("request_type_id", requestTypeId);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json(data);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("portal_group_request_types").insert(body).select().single();
    if (err) return parseDbError(err, "portal-group-request-types");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase
      .from("portal_group_request_types")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (err) return parseDbError(err, "portal-group-request-types");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("portal_group_request_types").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// PROSPECTS
// ============================================================================

const prospectSelect = "*, accounts!prospects_account_id_fkey(name), profiles!prospects_owner_id_fkey(full_name)";

function flattenProspect(d: any) {
  if (!d) return d;
  const result = { ...d };
  result.account_name = d.accounts?.name || null;
  delete result.accounts;
  result.owner_name = d.profiles?.full_name || null;
  delete result.profiles;
  return result;
}

async function handleProspectNotes(
  supabase: ReturnType<typeof createClient>,
  method: string,
  prospectId: string,
  body: any,
  searchParams: URLSearchParams,
  apiKeyUserId?: string | null
) {
  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "50");
    const { data, error: err } = await supabase
      .from("prospect_notes")
      .select("*")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (err) return error(err.message);
    return json(data || []);
  }

  if (method === "POST") {
    if (!body?.note_content) {
      return richError("MISSING_REQUIRED_FIELD", "Missing required field: note_content", 400, "Provide note_content in request body", { note_content: "Your note text here" });
    }
    const noteData: any = {
      prospect_id: prospectId,
      note_content: body.note_content,
    };
    const resolvedUserId = apiKeyUserId || body.created_by || null;
    if (!resolvedUserId) {
      return richError("MISSING_AUTHOR", "created_by is required or use an API key assigned to a user", 400);
    }
    noteData.created_by = resolvedUserId;
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", resolvedUserId).single();
    noteData.created_by_name = profile?.full_name || "API User";
    const { data, error: err } = await supabase.from("prospect_notes").insert(noteData).select().single();
    if (err) return parseDbError(err, "prospect-notes");
    return json(data, 201);
  }

  if (method === "DELETE") {
    const noteId = searchParams.get("note_id");
    if (!noteId) {
      return richError("MISSING_PARAM", "Missing required query param: note_id", 400, "Append ?note_id=<uuid> to the URL");
    }
    const { error: err } = await supabase
      .from("prospect_notes")
      .delete()
      .eq("id", noteId)
      .eq("prospect_id", prospectId);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleProspects(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams,
  action?: string,
  apiKeyUserId?: string | null
) {
  if (action === "notes" && id) {
    return handleProspectNotes(supabase, method, id, body, searchParams, apiKeyUserId);
  }

  if (action === "convert-to-deal" && id) {
    if (method !== "POST") return error("Method not allowed — use POST", 405);
    return convertProspectToDeal(supabase, id, body, apiKeyUserId);
  }

  if (method === "GET" && id) {
    const { data, error: err } = await supabase.from("prospects").select(prospectSelect).eq("id", id).single();
    if (err) return error(err.message, 404);
    return json(flattenProspect(data));
  }

  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    let query = supabase.from("prospects").select(prospectSelect);
    const account_id = searchParams.get("account_id");
    if (account_id) query = query.eq("account_id", account_id);
    const stage = searchParams.get("stage");
    if (stage) query = query.eq("stage", stage);
    const priority = searchParams.get("priority");
    if (priority) query = query.eq("priority", priority);
    const owner_id = searchParams.get("owner_id");
    if (owner_id) query = query.eq("owner_id", owner_id);
    query = query.order("created_at", { ascending: false }).limit(limit);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    return json((data || []).map(flattenProspect));
  }

  if (method === "POST") {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    if (apiKeyUserId && !body.created_by) body.created_by = apiKeyUserId;
    if (apiKeyUserId && !body.owner_id) body.owner_id = apiKeyUserId;
    const { data, error: err } = await supabase.from("prospects").insert(body).select().single();
    if (err) return parseDbError(err, "prospects");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const nameErr = await resolveBodyNames(supabase, body);
    if (nameErr) return nameErr;
    const { data, error: err } = await supabase.from("prospects").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "prospects");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("prospects").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

async function handleProspectContacts(
  supabase: ReturnType<typeof createClient>,
  method: string,
  id: string | undefined,
  body: any,
  searchParams: URLSearchParams
) {
  if (method === "GET") {
    const limit = parseInt(searchParams.get("limit") || "100");
    let query = supabase
      .from("prospect_contacts")
      .select("*, contacts!prospect_contacts_contact_id_fkey(contact_name)")
      .order("created_at", { ascending: true })
      .limit(limit);
    const prospect_id = searchParams.get("prospect_id");
    if (prospect_id) query = query.eq("prospect_id", prospect_id);
    const contact_id = searchParams.get("contact_id");
    if (contact_id) query = query.eq("contact_id", contact_id);
    const { data, error: err } = await query;
    if (err) return error(err.message);
    const flat = (data || []).map((r: any) => {
      const result = { ...r };
      result.contact_name = r.contacts?.contact_name || null;
      delete result.contacts;
      return result;
    });
    return json(flat);
  }

  if (method === "POST") {
    const { data, error: err } = await supabase.from("prospect_contacts").insert(body).select().single();
    if (err) return parseDbError(err, "prospect-contacts");
    return json(data, 201);
  }

  if (method === "PATCH" && id) {
    const { data, error: err } = await supabase.from("prospect_contacts").update(body).eq("id", id).select().single();
    if (err) return parseDbError(err, "prospect-contacts");
    return json(data);
  }

  if (method === "DELETE" && id) {
    const { error: err } = await supabase.from("prospect_contacts").delete().eq("id", id);
    if (err) return error(err.message);
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

// ============================================================================
// CONVERSION ACTIONS — Contact → Prospect → Deal
// ============================================================================

async function convertContactToProspect(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  body: any,
  apiKeyUserId?: string | null
) {
  const { data: contact, error: cErr } = await supabase
    .from("contacts")
    .select("id, contact_name, company_name, source, owner_id, converted_to_account_id")
    .eq("id", contactId)
    .single();
  if (cErr || !contact) return richError("CONTACT_NOT_FOUND", `Contact ${contactId} not found`, 404);

  const companyLabel = (contact as any).company_name || (contact as any).contact_name || "Contact";
  const prospectName = (body?.name || body?.prospect_name || `${companyLabel} - Outreach`).toString().trim();
  if (!prospectName) return richError("MISSING_PROSPECT_NAME", "name is required", 400);

  const validPriorities = ["low", "medium", "high"];
  const priority = (body?.priority || "medium").toString();
  if (!validPriorities.includes(priority)) {
    return richError("INVALID_PRIORITY", `priority must be one of: ${validPriorities.join(", ")}`, 400);
  }

  const ownerId = body?.owner_id || (contact as any).owner_id || apiKeyUserId;
  if (!ownerId) return richError("MISSING_OWNER", "owner_id required (no API key user available)", 400);
  if (!apiKeyUserId && !body?.created_by) return richError("MISSING_CREATED_BY", "created_by required", 400);

  const insertPayload: any = {
    name: prospectName,
    account_id: body?.account_id || (contact as any).converted_to_account_id || null,
    owner_id: ownerId,
    stage: body?.stage || "new",
    priority,
    source: body?.source || (contact as any).source || null,
    segment: body?.segment || null,
    summary: body?.summary || null,
    created_by: body?.created_by || apiKeyUserId,
  };

  const { data: newProspect, error: pErr } = await supabase
    .from("prospects")
    .insert(insertPayload)
    .select("id, name, stage, priority, account_id, owner_id, created_at")
    .single();
  if (pErr) return parseDbError(pErr, "prospects");

  const { error: linkErr } = await supabase
    .from("prospect_contacts")
    .insert({
      prospect_id: (newProspect as any).id,
      contact_id: contactId,
      is_primary: true,
    });
  if (linkErr) {
    await supabase.from("prospects").delete().eq("id", (newProspect as any).id);
    return parseDbError(linkErr, "prospect-contacts");
  }

  return json({
    success: true,
    prospect: newProspect,
    primary_contact_id: contactId,
  }, 201);
}

async function convertProspectToDeal(
  supabase: ReturnType<typeof createClient>,
  prospectId: string,
  body: any,
  apiKeyUserId?: string | null
) {
  const { data: prospect, error: pErr } = await supabase
    .from("prospects")
    .select("id, name, stage, account_id, owner_id, source, converted_to_deal_id")
    .eq("id", prospectId)
    .single();
  if (pErr || !prospect) return richError("PROSPECT_NOT_FOUND", `Prospect ${prospectId} not found`, 404);

  if ((prospect as any).converted_to_deal_id) {
    return richError("ALREADY_CONVERTED", "This prospect has already been converted to a deal", 409);
  }
  if ((prospect as any).stage !== "qualified") {
    return richError("NOT_QUALIFIED", "Only qualified prospects can be converted to deals", 400, "Move the prospect to stage='qualified' first");
  }

  const { data: primaryLink, error: lErr } = await supabase
    .from("prospect_contacts")
    .select("contact_id")
    .eq("prospect_id", prospectId)
    .eq("is_primary", true)
    .maybeSingle();
  if (lErr) return error(lErr.message);
  if (!primaryLink) return richError("MISSING_PRIMARY_CONTACT", "A primary contact must be linked to this prospect before conversion", 400);

  let pipelineStageId = body?.pipeline_stage_id;
  const startStage = (body?.start_stage || body?.stage_name || "qualified").toString().toLowerCase();
  if (!pipelineStageId) {
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("id, name, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const active = stages || [];
    if (startStage.includes("discovery")) {
      const discovery = active.find((s: any) => (s.name || "").toLowerCase().includes("discovery"));
      pipelineStageId = (discovery as any)?.id || (active[0] as any)?.id;
    } else {
      pipelineStageId = (active[0] as any)?.id;
    }
  }
  if (!pipelineStageId) return richError("NO_PIPELINE_STAGE", "Could not resolve pipeline_stage_id (no active stages)", 400);

  const dealName = (body?.deal_name || body?.name || `${prospect.name} Opportunity`).toString().trim();
  if (!dealName) return richError("MISSING_DEAL_NAME", "deal_name is required", 400);

  const closeDate = body?.close_date;
  if (!closeDate) return richError("MISSING_CLOSE_DATE", "close_date is required (YYYY-MM-DD)", 400);

  const createdBy = body?.created_by || apiKeyUserId;
  if (!createdBy) return richError("MISSING_CREATED_BY", "created_by required (no API key user available)", 400);

  const { data: newDeal, error: dErr } = await supabase
    .from("deals")
    .insert({
      name: dealName,
      account_id: (prospect as any).account_id,
      pipeline_stage_id: pipelineStageId,
      primary_contact_id: (primaryLink as any).contact_id,
      source: (prospect as any).source || null,
      owner_id: (prospect as any).owner_id,
      created_by: createdBy,
      close_date: closeDate,
      notes: body?.notes || null,
    })
    .select("id, name, deal_number, pipeline_stage_id")
    .single();
  if (dErr) return parseDbError(dErr, "deals");

  const { error: uErr } = await supabase
    .from("prospects")
    .update({
      converted_to_deal_id: (newDeal as any).id,
      converted_at: new Date().toISOString(),
    })
    .eq("id", prospectId);
  if (uErr) return parseDbError(uErr, "prospects");

  return json({
    success: true,
    deal: newDeal,
    converted_at: new Date().toISOString(),
  }, 201);
}

// ============================================================================
// ROUTE MAP & MAIN HANDLER
// ============================================================================

const RESOURCE_HANDLERS: Record<string, Function> = {
  incidents: handleIncidents,
  "incident-projects": handleIncidentProjects,
  "incident-priorities": handleIncidentPriorities,
  "incident-categories": handleIncidentCategories,
  "incident-templates": handleIncidentTemplates,
  "timesheet-entries": handleTimesheetEntries,
  projects: handleProjects,
  contacts: handleContacts,
  leaves: handleLeaves,
  expenses: handleExpenses,
  "expense-categories": handleExpenseCategories,
  "leave-types": handleLeaveTypes,
  "expense-subcategories": handleExpenseSubcategories,
  customers: handleCustomers,
  profiles: handleProfiles,
  accounts: handleAccounts,
  "pipeline-stages": handlePipelineStages,
  deals: handleDeals,
  meetings: handleMeetings,
  contracts: handleContracts,
  "ohs-hazard-reports": handleOhsHazardReports,
  "ohs-hr-incidents": handleOhsHrIncidents,
  "ohs-injury-registers": handleOhsInjuryRegisters,
  "ohs-workplace-inspections": handleOhsWorkplaceInspections,
  "team-members": handleTeamMembers,
  "work-schedules": handleWorkSchedules,
  "weekly-work-schedules": handleWeeklyWorkSchedules,
  "daily-location-checkins": handleDailyLocationCheckins,
  "customer-logins": handleCustomerLogins,
  assets: handleAssets,
  "asset-groups": handleAssetGroups,
  "asset-types": handleAssetTypes,
  "asset-statuses": handleAssetStatuses,
  "portal-groups": handlePortalGroups,
  "portal-request-types": handlePortalRequestTypes,
  "portal-group-request-types": handlePortalGroupRequestTypes,
  prospects: handleProspects,
  "prospect-contacts": handleProspectContacts,
};

const SCOPE_MAP: Record<string, string> = {
  incidents: "incidents",
  "incident-projects": "incidents",
  "incident-priorities": "incidents",
  "incident-categories": "incidents",
  "incident-templates": "incidents",
  "timesheet-entries": "timesheet",
  projects: "projects",
  contacts: "contacts",
  leaves: "leaves",
  expenses: "expenses",
  "expense-categories": "expenses",
  "leave-types": "leaves",
  "expense-subcategories": "expenses",
  customers: "customers",
  profiles: "profiles",
  accounts: "accounts",
  "pipeline-stages": "deals",
  deals: "deals",
  meetings: "meetings",
  contracts: "contracts",
  "ohs-hazard-reports": "ohs",
  "ohs-hr-incidents": "ohs",
  "ohs-injury-registers": "ohs",
  "ohs-workplace-inspections": "ohs",
  "team-members": "incidents",
  "customer-logins": "incidents",
  "work-schedules": "work-schedules",
  "weekly-work-schedules": "work-schedules",
  "daily-location-checkins": "work-location",
  assets: "assets",
  "asset-groups": "assets",
  "asset-types": "assets",
  "asset-statuses": "assets",
  "portal-groups": "incidents",
  "portal-request-types": "incidents",
  "portal-group-request-types": "incidents",
  prospects: "prospects",
  "prospect-contacts": "prospects",
};

// Cross-resource action scopes — actions whose side effects write to OTHER resources.
// Key: "<resource>:<action>". Value: list of additional scopes required (in addition
// to the base resource scope already enforced).
const CROSS_SCOPE_ACTIONS: Record<string, string[]> = {
  "contacts:convert-to-prospect": ["prospects:write"],
  "prospects:convert-to-deal": ["deals:write"],
};

const RESOURCE_METHODS: Record<string, string[]> = {
  incidents: ["GET", "POST", "PATCH", "DELETE"],
  "incident-projects": ["GET", "POST", "PATCH", "DELETE"],
  "incident-priorities": ["GET"],
  "incident-categories": ["GET"],
  "incident-templates": ["GET"],
  "timesheet-entries": ["GET", "POST", "PATCH", "DELETE"],
  projects: ["GET", "POST", "PATCH", "DELETE"],
  contacts: ["GET", "POST", "PATCH", "DELETE"],
  leaves: ["GET", "POST", "PATCH", "DELETE"],
  expenses: ["GET", "POST", "PATCH", "DELETE"],
  "expense-categories": ["GET"],
  "leave-types": ["GET"],
  "expense-subcategories": ["GET"],
  customers: ["GET", "POST", "PATCH", "DELETE"],
  profiles: ["GET"],
  accounts: ["GET", "POST", "PATCH", "DELETE"],
  "pipeline-stages": ["GET"],
  deals: ["GET", "POST", "PATCH", "DELETE"],
  meetings: ["GET", "POST", "PATCH", "DELETE"],
  contracts: ["GET", "POST", "PATCH", "DELETE"],
  "ohs-hazard-reports": ["GET", "POST", "PATCH", "DELETE"],
  "ohs-hr-incidents": ["GET", "POST", "PATCH", "DELETE"],
  "ohs-injury-registers": ["GET", "POST", "PATCH", "DELETE"],
  "ohs-workplace-inspections": ["GET", "POST", "PATCH", "DELETE"],
  "team-members": ["GET", "POST", "PATCH", "DELETE"],
  "work-schedules": ["GET", "POST", "PATCH", "DELETE"],
  "weekly-work-schedules": ["GET", "POST", "PATCH", "DELETE"],
  "daily-location-checkins": ["GET", "POST", "PATCH", "DELETE"],
  "customer-logins": ["GET", "POST", "PATCH", "DELETE"],
  assets: ["GET", "POST", "PATCH", "DELETE"],
  "asset-groups": ["GET", "POST", "PATCH", "DELETE"],
  "asset-types": ["GET"],
  "asset-statuses": ["GET"],
  "portal-groups": ["GET", "POST", "PATCH", "DELETE"],
  "portal-request-types": ["GET", "POST", "PATCH", "DELETE"],
  "portal-group-request-types": ["GET", "POST", "PATCH", "DELETE"],
  prospects: ["GET", "POST", "PATCH", "DELETE"],
  "prospect-contacts": ["GET", "POST", "PATCH", "DELETE"],
};

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    // Compute CORS headers for OPTIONS within the same context so the
    // allowlist applies to preflight as well as actual responses.
    return corsContext.run({ origin: requestOrigin }, () =>
      Promise.resolve(new Response(null, { headers: getRequestCorsHeaders() }))
    );
  }

  return corsContext.run({ origin: requestOrigin }, async () => {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return richError("MISSING_API_KEY", "Missing x-api-key header", 401, "Include your API key in the x-api-key header");
    }

    // Source IP for auth-fail throttling. Behind the edge proxy this header
    // chain is trusted; if absent fall back to a shared "unknown" bucket.
    const sourceIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      "unknown";

    const supabase = sharedSupabase;
    const ohsSupabase = sharedOhsSupabase;

    const keyRecord = await validateApiKey(supabase, apiKey);
    if (!keyRecord) {
      // Throttle brute-force probing per source IP. Counts only failed lookups.
      const ipOk = takeToken(ipFailBuckets, sourceIp, IP_AUTHFAIL_BUCKET_CAPACITY);
      if (!ipOk) {
        return new Response(
          JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many auth failures from this source. Try again later." } }),
          { status: 429, headers: { ...getRequestCorsHeaders(), "Content-Type": "application/json", "Retry-After": "60" } },
        );
      }
      return richError("INVALID_API_KEY", "Invalid or expired API key", 401);
    }

    // Per-key rate limit on the success path.
    const keyOk = takeToken(keyBuckets, keyRecord.id, KEY_BUCKET_CAPACITY);
    if (!keyOk) {
      return new Response(
        JSON.stringify({ error: { code: "RATE_LIMITED", message: "API key request quota exceeded. Try again later." } }),
        { status: 429, headers: { ...getRequestCorsHeaders(), "Content-Type": "application/json", "Retry-After": "60" } },
      );
    }

    const url = new URL(req.url);
    const { resource, id, action } = parseRoute(url);

    if (!resource) {
      return json({
        name: "API Gateway",
        version: API_VERSION,
        resources: Object.keys(RESOURCE_HANDLERS),
        utility_endpoints: ["resolve", "search", "meta", "version", "changelog"],
        scopes: keyRecord.scopes,
      });
    }

    if (resource === "debug-hash") {
      const trimmedKey = apiKey.trim();
      const computedHash = await hashKey(trimmedKey);
      const { data: allKeys } = await supabase
        .from("api_keys")
        .select("id, key_prefix, key_hash, is_active, expires_at")
        .eq("is_active", true);
      const matchFound = allKeys?.some((k: any) => k.key_hash === computedHash) || false;
      const storedHashes = allKeys?.map((k: any) => ({
        id: k.id,
        prefix: k.key_prefix,
        hash_prefix: k.key_hash.substring(0, 16) + "...",
        is_active: k.is_active,
        expires_at: k.expires_at,
      })) || [];
      return json({
        key_prefix: trimmedKey.substring(0, 11) + "...",
        key_length: trimmedKey.length,
        computed_hash: computedHash,
        match_found: matchFound,
        active_keys: storedHashes,
      });
    }

    if (resource === "version") {
      return json({ version: API_VERSION, date: "2026-03-12" });
    }

    if (resource === "changelog") {
      return json({ changelog: CHANGELOG });
    }

    if (resource === "meta") {
      return handleMeta(id);
    }

    if (resource === "resolve") {
      const effectiveScopes = await getEffectiveScopes(supabase, keyRecord);
      if (!effectiveScopes.some((s) => s.endsWith(":read") || s === "*:*")) {
        return richError("INSUFFICIENT_SCOPE", "Requires at least one :read scope", 403);
      }
      return handleResolve(supabase, url.searchParams);
    }

    if (resource === "search") {
      const effectiveScopes = await getEffectiveScopes(supabase, keyRecord);
      if (!effectiveScopes.some((s) => s.endsWith(":read") || s === "*:*")) {
        return richError("INSUFFICIENT_SCOPE", "Requires at least one :read scope", 403);
      }
      return handleSearch(supabase, url.searchParams);
    }

    const handler = RESOURCE_HANDLERS[resource];
    if (!handler) {
      return richError("UNKNOWN_RESOURCE", `Unknown resource: ${resource}`, 404, `Available resources: ${Object.keys(RESOURCE_HANDLERS).join(", ")}`);
    }

    const allowedMethods = RESOURCE_METHODS[resource];
    if (allowedMethods && !allowedMethods.includes(req.method)) {
      return richError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    }

    const effectiveScopes = await getEffectiveScopes(supabase, keyRecord);
    const scopePrefix = SCOPE_MAP[resource] || resource;
    const operation = req.method === "GET" ? "read" : "write";
    if (!checkScope(effectiveScopes, scopePrefix, operation)) {
      return richError("INSUFFICIENT_SCOPE", `Insufficient scope. Required: ${scopePrefix}:${operation}`, 403, `Your effective scopes: ${effectiveScopes.join(", ")}`);
    }

    // Cross-resource action scope checks (actions that write to other resources)
    const crossScopeKey = `${resource}:${action || ""}`;
    const extraScopes = CROSS_SCOPE_ACTIONS[crossScopeKey];
    if (extraScopes && req.method !== "GET") {
      for (const required of extraScopes) {
        const [r, op] = required.split(":");
        if (!checkScope(effectiveScopes, r, op as "read" | "write")) {
          return richError(
            "INSUFFICIENT_SCOPE",
            `Insufficient scope for ${crossScopeKey}. Required: ${required}`,
            403,
            `This action writes to multiple resources. Your effective scopes: ${effectiveScopes.join(", ")}`
          );
        }
      }
    }

    let body: any = null;
    const isAttachmentUpload = (resource === "expenses" || resource === "leaves") && action === "attachments" && req.method === "POST";
    if (isAttachmentUpload) {
      const contentType = (req.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("multipart/form-data")) {
        try {
          const form = await req.formData();
          const file = form.get("file");
          if (!(file instanceof File)) {
            return richError("MISSING_FILE", "multipart form must include a 'file' field", 400);
          }
          const buf = new Uint8Array(await file.arrayBuffer());
          body = {
            __upload: {
              file: buf,
              filename: file.name,
              mime: file.type || "application/octet-stream",
            },
          };
        } catch (e) {
          return richError("INVALID_MULTIPART", `Failed to parse multipart body: ${e instanceof Error ? e.message : "unknown"}`, 400);
        }
      } else if (contentType.includes("application/json")) {
        // JSON path for chatbot/LLM integrations that cannot send multipart.
        // Expect: { file_base64: string, file_name: string, file_type?: string }
        const jsonBody: any = await req.json().catch(() => null);
        if (!jsonBody || typeof jsonBody !== "object") {
          return richError("INVALID_JSON", "Invalid JSON body", 400);
        }
        const b64: unknown = jsonBody.file_base64 ?? jsonBody.file ?? jsonBody.content;
        const fileName: unknown = jsonBody.file_name ?? jsonBody.filename ?? jsonBody.name;
        const fileType: unknown = jsonBody.file_type ?? jsonBody.mime ?? jsonBody.content_type;
        if (typeof b64 !== "string" || !b64) {
          return richError("MISSING_FILE", "JSON body must include 'file_base64' (base64-encoded file bytes)", 400, "Send { file_base64, file_name, file_type } or use multipart/form-data");
        }
        if (typeof fileName !== "string" || !fileName) {
          return richError("MISSING_FILE_NAME", "JSON body must include 'file_name'", 400);
        }
        try {
          const cleaned = b64.replace(/^data:[^;]+;base64,/, "");
          const binary = atob(cleaned);
          const buf = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
          body = {
            __upload: {
              file: buf,
              filename: fileName,
              mime: typeof fileType === "string" && fileType ? fileType : "application/octet-stream",
            },
          };
        } catch (e) {
          return richError("INVALID_BASE64", `Failed to decode file_base64: ${e instanceof Error ? e.message : "unknown"}`, 400);
        }
      } else {
        return richError("INVALID_CONTENT_TYPE", `POST /${resource}/:id/attachments requires multipart/form-data or application/json`, 400, "Use multipart with a 'file' field, or JSON { file_base64, file_name, file_type }");
      }
    } else if (["POST", "PATCH", "PUT"].includes(req.method)) {
      body = await req.json().catch(() => null);
      if (!body) return richError("INVALID_JSON", "Invalid JSON body", 400);
      body = coerceEmptyUuidsToNull(body);
    }

    // Extract API key user ID separately — never let it pollute the insert body
    const apiKeyUserId = keyRecord.assigned_to || null;
    if (body) delete body._api_key_user_id;

    // Alias user_id → created_by for resources that use created_by but not user_id (e.g. projects, contracts)
    // Must happen BEFORE sanitizePatchBody so the field survives stripping
    if (req.method === "PATCH" && body?.user_id) {
      const resMeta = RESOURCE_META[resource];
      const metaFields = new Set([
        ...(resMeta?.required_fields || []),
        ...(resMeta?.optional_fields || []),
      ]);
      if (!metaFields.has("user_id")) {
        // user_id is not a DB column for this resource
        if (metaFields.has("created_by") && !body.created_by) {
          body.created_by = body.user_id; // alias (e.g. projects)
        }
        delete body.user_id; // always strip — prevents DB errors (e.g. contracts)
      }
    }

    // Strip unknown fields on PATCH to prevent 400s from PostgREST
    if (req.method === "PATCH" && body) {
      body = sanitizePatchBody(body, resource);
      // If every field in the payload was unrecognised, nothing is left to update.
      // Return 200 with a warning rather than a 400 — the record is unchanged.
      if (Object.keys(body).length === 0) {
        return json({
          _warning: "PATCH had no recognised fields — no changes were made to the record",
          _fields_hint: `Use GET /meta/${resource} to see the full list of patchable fields`,
        });
      }
    }
    // Normalize enum values (case-insensitive) on POST and PATCH
    if (["POST", "PATCH"].includes(req.method) && body) {
      body = normalizeEnumValues(body, resource);
    }

    // Auto-fill user-assignment fields from the API key's assigned user when not provided.
    // Only inject a field when the resource meta actually declares it — prevents injecting columns
    // that don't exist on the DB table (e.g. created_by does NOT exist on contracts).
    const resMeta = RESOURCE_META[resource];
    const metaFields = new Set([
      ...(resMeta?.required_fields || []),
      ...(resMeta?.optional_fields || []),
    ]);
    if (body && apiKeyUserId) {
      // created_by: POST only — never overwrite on PATCH (would silently change record authorship)
      if (req.method === "POST" && metaFields.has("created_by") && (body.created_by === undefined || body.created_by === null)) {
        body.created_by = apiKeyUserId;
      }
      // inspector_id: POST only — same reasoning as created_by
      if (req.method === "POST" && metaFields.has("inspector_id") && (body.inspector_id === undefined || body.inspector_id === null)) {
        body.inspector_id = apiKeyUserId;
      }
      // user_id: POST only — auto-fill for any resource that declares user_id in its meta
      if (req.method === "POST" && metaFields.has("user_id") && (body.user_id === undefined || body.user_id === null)) {
        body.user_id = apiKeyUserId;
      }
      // owner_id: POST only — auto-fill for any resource that declares owner_id in its meta
      if (req.method === "POST" && metaFields.has("owner_id") && (body.owner_id === undefined || body.owner_id === null)) {
        body.owner_id = apiKeyUserId;
      }
    }

    // Enforce mandatory user-assignment on POST: user_id and owner_id must always be set.
    // They are auto-filled above when the API key has an assigned user.
    // If still missing it means the key is unassigned — reject with a clear error.
    if (req.method === "POST" && body) {
      const USER_FIELDS = ["user_id", "owner_id"] as const;
      for (const field of USER_FIELDS) {
        if (metaFields.has(field) && (body[field] === undefined || body[field] === null || body[field] === "")) {
          return richError(
            "MISSING_USER_ASSIGNMENT",
            `${field} is required but was not provided and could not be auto-filled. Assign this API key to a user, or pass ${field} explicitly in the request body.`,
            400,
            `Assign the API key to a user (so ${field} is auto-filled), or include "${field}": "<user-uuid>" in your request body.`,
            { [field]: "<user-uuid>" }
          );
        }
      }
    }

    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey && req.method === "POST") {
      const cached = await checkIdempotency(supabase, idempotencyKey);
      if (cached) return cached;
    }

    const OHS_RESOURCES = new Set(["ohs-hazard-reports", "ohs-hr-incidents", "ohs-injury-registers", "ohs-workplace-inspections"]);

    let response: Response;
    if (OHS_RESOURCES.has(resource)) {
      if (!ohsSupabase) {
        return richError("OHS_UNAVAILABLE", "OHS database is not configured on this gateway", 503, "Set OHS_SUPABASE_URL and OHS_SUPABASE_SERVICE_ROLE_KEY secrets on this project");
      }
      response = await handler(ohsSupabase, req.method, id, body, url.searchParams);
    } else if (resource === "deals" || resource === "incidents" || resource === "prospects" || resource === "contacts" || resource === "meetings" || resource === "expenses" || resource === "leaves") {
      response = await handler(supabase, req.method, id, body, url.searchParams, action, apiKeyUserId);
    } else if (resource === "timesheet-entries" || resource === "daily-location-checkins" || resource === "leave-types" || resource === "work-schedules" || resource === "weekly-work-schedules") {
      response = await handler(supabase, req.method, id, body, url.searchParams, undefined, apiKeyUserId);
    } else if (resource === "projects" || resource === "contracts") {
      response = await handler(supabase, req.method, id, body, url.searchParams, apiKeyUserId);
    } else {
      response = await handler(supabase, req.method, id, body, url.searchParams);
    }

    if (idempotencyKey && req.method === "POST" && response.status < 500) {
      return saveIdempotency(supabase, idempotencyKey, resource, response);
    }

    return response;
  } catch (e) {
    console.error("API Gateway error:", e);
    return richError("INTERNAL_ERROR", "Internal server error", 500);
  }
  });
});
