import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  assigned_profile?: { full_name: string } | null;
  assigned_role?: string | null;
  has_stale_scopes?: boolean;
}

export const ALL_SCOPES = [
  { group: "Incidents", scopes: ["incidents:read", "incidents:write"] },
  { group: "Timesheets", scopes: ["timesheet:read", "timesheet:write"] },
  { group: "Projects", scopes: ["projects:read", "projects:write"] },
  { group: "Contacts", scopes: ["contacts:read", "contacts:write"] },
  { group: "Leaves", scopes: ["leaves:read", "leaves:write"] },
  { group: "Expenses", scopes: ["expenses:read", "expenses:write"] },
  { group: "Customers", scopes: ["customers:read", "customers:write"] },
  { group: "Profiles", scopes: ["profiles:read"] },
  { group: "Accounts", scopes: ["accounts:read", "accounts:write"] },
  { group: "Deals", scopes: ["deals:read", "deals:write"] },
  { group: "Prospects", scopes: ["prospects:read", "prospects:write"] },
  { group: "Meetings", scopes: ["meetings:read", "meetings:write"] },
  { group: "Contracts", scopes: ["contracts:read", "contracts:write"] },
  { group: "Assets", scopes: ["assets:read", "assets:write"] },
  { group: "OHS", scopes: ["ohs:read", "ohs:write"] },
  { group: "Work Schedules", scopes: ["work-schedules:read", "work-schedules:write"] },
  { group: "Work Location", scopes: ["work-location:read", "work-location:write"] },
] as const;

export const ROLE_SCOPES: Record<string, string[]> = {
  admin: ALL_SCOPES.flatMap((g) => g.scopes as unknown as string[]),
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

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  // Reject-sample to keep uniform distribution over `chars`.
  const max = Math.floor(256 / chars.length) * chars.length;
  const out = new Array<string>(48);
  let filled = 0;
  while (filled < 48) {
    const buf = new Uint8Array(48 - filled);
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && filled < 48; i++) {
      const b = buf[i];
      if (b < max) {
        out[filled++] = chars.charAt(b % chars.length);
      }
    }
  }
  return "sk_" + out.join("");
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at, created_by, assigned_to")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch assigned profile names for keys that have assigned_to
      const assignedIds = data
        .map((k: any) => k.assigned_to)
        .filter(Boolean) as string[];

      let profileMap: Record<string, string> = {};
      let roleMap: Record<string, string> = {};

      if (assignedIds.length > 0) {
        const [profilesResult, rolesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", assignedIds),
          supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", assignedIds),
        ]);

        if (profilesResult.data) {
          profileMap = Object.fromEntries(profilesResult.data.map((p) => [p.id, p.full_name]));
        }
        if (rolesResult.data) {
          roleMap = Object.fromEntries(rolesResult.data.map((r: any) => [r.user_id, r.role]));
        }
      }

      return data.map((k: any) => {
        const currentRole = k.assigned_to ? roleMap[k.assigned_to] || null : null;
        const allowedScopes = currentRole ? (ROLE_SCOPES[currentRole] || []) : null;
        const hasStaleScopes = allowedScopes
          ? k.scopes.some((s: string) => !allowedScopes.includes(s))
          : false;

        return {
          ...k,
          assigned_profile: k.assigned_to
            ? { full_name: profileMap[k.assigned_to] || "Unknown" }
            : null,
          assigned_role: currentRole,
          has_stale_scopes: hasStaleScopes,
        };
      }) as ApiKey[];
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      scopes,
      expires_at,
      assigned_to,
    }: {
      name: string;
      scopes: string[];
      expires_at?: string | null;
      assigned_to?: string | null;
    }) => {
      const plainKey = generateApiKey();
      const keyHash = await hashKey(plainKey);
      const keyPrefix = plainKey.substring(0, 11) + "...";

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("api_keys").insert({
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes,
        is_active: true,
        expires_at: expires_at || null,
        created_by: user?.id || null,
        assigned_to: assigned_to || null,
      } as any);

      if (error) throw error;

      return plainKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: any) => {
      toast.error("Failed to create API key: " + err.message);
    },
  });
}

export function useRenameApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name cannot be empty");
      const { error } = await supabase
        .from("api_keys")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key renamed");
    },
    onError: (err: any) => {
      toast.error("Failed to rename API key: " + err.message);
    },
  });
}

export function useToggleApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key updated");
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted");
    },
  });
}

export function useActiveProfiles() {
  return useQuery({
    queryKey: ["active-profiles-for-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });
}

export function useUserRole(userId: string | null) {
  return useQuery({
    queryKey: ["user-role-for-api-key", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.role as string | null;
    },
  });
}
