
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let cachedAdminIds = new Set<string>();
let cachedManagerIds = new Set<string>();
let cachedSalesManagerIds = new Set<string>();
let cachedManagerOrAboveIds = new Set<string>();

const MANAGER_OR_ABOVE_ROLES = ["admin", "manager", "sale_manager"] as const;

/**
 * True when the user is an admin.
 * Priority:
 *   1) role claim in JWT
 *   2) role column in public.profiles (cached)
 */
export const isAdmin = async (user: Session["user"] | null | undefined): Promise<boolean> => {
  if (!user) return false;

  /* ---------- 1 · JWT claim (fast) ---------- */
  const jwtRole =
    (user.user_metadata?.role ??
      user.app_metadata?.role ??
      "") as string;
  if ((jwtRole ?? "").toLowerCase() === "admin") return true;

  /* ---------- 2 · Cached DB lookup ---------- */
  if (cachedAdminIds.has(user.id)) return true;

  /* ---------- 3 · DB lookup from user_roles table (async) ---------- */
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    if (data) {
      cachedAdminIds.add(user.id);
      return true;
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
    // Don't throw error, just return false - this is defensive programming
  }

  return false;
};

/**
 * True when the user is a manager.
 * Priority:
 *   1) role claim in JWT
 *   2) role column in public.profiles (cached)
 */
export const isManager = async (user: Session["user"] | null | undefined): Promise<boolean> => {
  if (!user) return false;

  /* ---------- 1 · JWT claim (fast) ---------- */
  const jwtRole =
    (user.user_metadata?.role ??
      user.app_metadata?.role ??
      "") as string;
  if ((jwtRole ?? "").toLowerCase() === "manager") return true;

  /* ---------- 2 · Cached DB lookup ---------- */
  if (cachedManagerIds.has(user.id)) return true;

  /* ---------- 3 · DB lookup from user_roles table (async) ---------- */
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "manager")
      .maybeSingle();
    
    if (data) {
      cachedManagerIds.add(user.id);
      return true;
    }
  } catch (error) {
    console.error("Error checking manager status:", error);
    // Don't throw error, just return false - this is defensive programming
  }

  return false;
};

/**
 * True when the user is a sales manager.
 * Priority:
 *   1) role claim in JWT
 *   2) role column in public.profiles (cached)
 */
export const isSalesManager = async (user: Session["user"] | null | undefined): Promise<boolean> => {
  if (!user) return false;

  /* ---------- 1 · JWT claim (fast) ---------- */
  const jwtRole =
    (user.user_metadata?.role ??
      user.app_metadata?.role ??
      "") as string;
  if ((jwtRole ?? "").toLowerCase() === "sale_manager") return true;

  /* ---------- 2 · Cached DB lookup ---------- */
  if (cachedSalesManagerIds.has(user.id)) return true;

  /* ---------- 3 · DB lookup from user_roles table (async) ---------- */
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "sale_manager")
      .maybeSingle();
    
    if (data) {
      cachedSalesManagerIds.add(user.id);
      return true;
    }
  } catch (error) {
    console.error("Error checking sales manager status:", error);
  }

  return false;
};

/**
 * True when the user is a manager, sales manager, or admin.
 * Single DB query with .in() instead of 3 sequential checks.
 */
export const isManagerOrAbove = async (user: Session["user"] | null | undefined): Promise<boolean> => {
  if (!user) return false;

  const jwtRole = (
    (user.user_metadata?.role ?? user.app_metadata?.role ?? "") as string
  ).toLowerCase();
  if (MANAGER_OR_ABOVE_ROLES.includes(jwtRole as typeof MANAGER_OR_ABOVE_ROLES[number])) return true;

  if (cachedManagerOrAboveIds.has(user.id)) return true;

  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", MANAGER_OR_ABOVE_ROLES)
      .limit(1)
      .maybeSingle();

    if (data) {
      cachedManagerOrAboveIds.add(user.id);
      return true;
    }
  } catch (error) {
    console.error("Error checking manager-or-above status:", error);
  }

  return false;
};

/**
 * Clear the admin, manager, and sales manager cache - useful when user roles change
 */
export const clearAdminCache = (): void => {
  cachedAdminIds.clear();
  cachedManagerIds.clear();
  cachedSalesManagerIds.clear();
  cachedManagerOrAboveIds.clear();
};

/**
 * Get user's primary role from user_roles table with fallback
 * Returns highest privilege role if user has multiple roles
 */
export const getUserRole = async (userId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("role", { ascending: true }); // Orders by enum definition (admin first)
    
    if (error) {
      console.error("Error fetching user role:", error);
      return "employee"; // Default fallback
    }
    
    // Return first role (highest privilege due to ordering)
    if (data && data.length > 0) {
      return data[0].role;
    }
    
    return "employee";
  } catch (error) {
    console.error("Error in getUserRole:", error);
    return "employee"; // Default fallback
  }
};
