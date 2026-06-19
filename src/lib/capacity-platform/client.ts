// ============================================================================
// Capacity Platform — Scoped Supabase client
// ----------------------------------------------------------------------------
// The global `supabase` client in `src/integrations/supabase/client.ts` is
// currently typed as `<any>`. We intentionally re-export it as-is rather
// than wrapping in a narrow typed cast, because supabase-js v2.53's
// `from()` / `rpc()` generics interact poorly with manual Database stubs
// (collapse to `never`).
//
// Type safety inside the capacity-platform module instead comes from:
//   1. Explicit `as RowType` casts on read data
//   2. Hand-written Insert / Update parameter types in `./types.ts`
//   3. Client-side validators (Monday alignment, first-of-month, etc.)
//
// When `src/integrations/supabase/types.ts` is regenerated and the global
// client is flipped to `createClient<Database>`, this file should be
// reduced to `export { supabase as capacitySupabase } from "..."`.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const capacitySupabase: any = supabase;
