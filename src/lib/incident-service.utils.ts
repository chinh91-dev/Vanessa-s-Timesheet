import { supabase } from "@/integrations/supabase/client";
import type { Incident, SLACalculation } from "@/types/incident-types";

type UserInfo = { id: string; full_name?: string; email?: string; user_type?: string };

export async function getCreatorInfo(userId: string): Promise<UserInfo | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("all_users")
    .select("user_id, full_name, email, user_type")
    .eq("user_id", userId)
    .single();
  return data
    ? { id: data.user_id, full_name: data.full_name, email: data.email, user_type: data.user_type }
    : null;
}

export async function getCreatorsInfo(userIds: string[]): Promise<Map<string, UserInfo>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data } = await supabase
    .from("all_users")
    .select("user_id, full_name, email, user_type")
    .in("user_id", uniqueIds);

  const map = new Map<string, UserInfo>();
  (data || []).forEach(u => {
    map.set(u.user_id, { id: u.user_id, full_name: u.full_name, email: u.email, user_type: u.user_type });
  });
  return map;
}

export function calculateSLA(incident: Incident): SLACalculation {
  const now = new Date();
  const createdAt = new Date(incident.created_at);
  const priority = incident.priority;

  if (!priority) {
    return {
      response_breached: false,
      resolution_breached: false,
      response_time_remaining: 0,
      resolution_time_remaining: 0,
    };
  }

  const responseDueAt = new Date(createdAt.getTime() + priority.response_sla_minutes * 60 * 1000);
  const resolutionDueAt = new Date(createdAt.getTime() + priority.resolution_sla_minutes * 60 * 1000);

  const responseTimeRemaining = incident.first_response_at
    ? 0
    : Math.max(0, responseDueAt.getTime() - now.getTime()) / (1000 * 60);

  const resolutionTimeRemaining = incident.resolved_at
    ? 0
    : Math.max(0, resolutionDueAt.getTime() - now.getTime()) / (1000 * 60);

  return {
    response_due_at: responseDueAt.toISOString(),
    resolution_due_at: resolutionDueAt.toISOString(),
    response_breached: !incident.first_response_at && now > responseDueAt,
    resolution_breached: !incident.resolved_at && now > resolutionDueAt,
    response_time_remaining: Math.round(responseTimeRemaining),
    resolution_time_remaining: Math.round(resolutionTimeRemaining),
  };
}
