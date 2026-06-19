/**
 * Coerce empty-string values on UUID-shaped fields to null before sending to Supabase.
 * Postgres rejects "" for uuid columns with: invalid input syntax for type uuid: ""
 * Forms commonly submit "" when a user clears a select — this converts those to null so
 * the column is cleared instead of crashing the mutation.
 *
 * Targets any key ending in _id, _by, or named assigned_to / inspector_id /
 * manager_taking_report. Mirrors the gateway-side coercion in api-gateway index.ts.
 */
export function coerceEmptyUuidsToNull<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = { ...input };
  for (const [k, v] of Object.entries(out)) {
    if (v !== "") continue;
    if (
      k.endsWith("_id") ||
      k.endsWith("_by") ||
      k === "assigned_to" ||
      k === "inspector_id" ||
      k === "manager_taking_report"
    ) {
      out[k] = null;
    }
  }
  return out as T;
}
