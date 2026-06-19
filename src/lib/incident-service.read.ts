import { supabase } from "@/integrations/supabase/client";
import type {
  Incident,
  IncidentProject,
  IncidentPriority,
  IncidentCategory,
  IncidentComment,
  IncidentFilters,
  IncidentProjectStats,
  IncidentTemplate,
  IncidentAssignment,
  IncidentStatusTransition,
  IncidentAutoAssignmentRule,
} from "@/types/incident-types";
import { getCreatorInfo, getCreatorsInfo, calculateSLA } from "./incident-service.utils";

export { getCreatorInfo, calculateSLA };

export async function getIncidentProjects(): Promise<IncidentProject[]> {
  const { data, error } = await supabase
    .from("incident_projects")
    .select(`
      *,
      lead:profiles!lead_id(id, full_name, email),
      customer:customers!customer_id(id, name, company),
      incidents!incident_project_id(id, status)
    `)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return data.map(project => ({
    ...project,
    incident_count: project.incidents?.length || 0,
    open_incident_count: project.incidents?.filter(
      (i: { status: string }) => i.status !== "Closed" && i.status !== "Resolved"
    ).length || 0,
  }));
}

export async function getIncidentProject(id: string): Promise<IncidentProject | null> {
  const { data, error } = await supabase
    .from("incident_projects")
    .select(`
      *,
      lead:profiles!lead_id(id, full_name, email),
      customer:customers!customer_id(id, name, company),
      timesheet_project:projects!timesheet_project_id(id, name, description),
      contract:contracts!contract_id(id, name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function getIncidents(filters?: IncidentFilters): Promise<Incident[]> {
  let query = supabase
    .from("incidents")
    .select(`
      *,
      priority:incident_priorities(id, name, color, sort_order, is_active, response_sla_minutes, resolution_sla_minutes, created_at, updated_at),
      category:incident_categories(id, name, description, parent_id, category_level, sort_order, is_active, created_at, updated_at),
      incident_project:incident_projects(id, name, project_key),
      template:incident_templates(id, name)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }
  if (filters?.priority_id) {
    if (Array.isArray(filters.priority_id)) {
      query = query.in("priority_id", filters.priority_id);
    } else {
      query = query.eq("priority_id", filters.priority_id);
    }
  }
  if (filters?.category_id) {
    if (Array.isArray(filters.category_id)) {
      query = query.in("category_id", filters.category_id);
    } else {
      query = query.eq("category_id", filters.category_id);
    }
  }
  if (filters?.incident_project_id) {
    if (Array.isArray(filters.incident_project_id)) {
      query = query.in("incident_project_id", filters.incident_project_id);
    } else {
      query = query.eq("incident_project_id", filters.incident_project_id);
    }
  }
  if (filters?.assigned_to) {
    if (Array.isArray(filters.assigned_to)) {
      query = query.in("assigned_to", filters.assigned_to);
    } else {
      query = query.eq("assigned_to", filters.assigned_to);
    }
  }
  if (filters?.created_by) {
    if (Array.isArray(filters.created_by)) {
      query = query.in("created_by", filters.created_by);
    } else {
      query = query.eq("created_by", filters.created_by);
    }
  }
  if (filters?.template_id) {
    if (Array.isArray(filters.template_id)) {
      query = query.in("template_id", filters.template_id);
    } else {
      query = query.eq("template_id", filters.template_id);
    }
  }
  if (filters?.auto_assigned !== undefined) {
    query = query.eq("auto_assigned", filters.auto_assigned);
  }
  if (filters?.escalated !== undefined) {
    if (filters.escalated) {
      query = query.not("escalated_at", "is", null);
    } else {
      query = query.is("escalated_at", null);
    }
  }
  if (filters?.date_range) {
    query = query
      .gte("created_at", filters.date_range.start)
      .lte("created_at", filters.date_range.end);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,incident_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const userIds = (data || [])
    .flatMap(i => [i.created_by, i.assigned_to, i.resolved_by])
    .filter(Boolean);
  const usersMap = await getCreatorsInfo(userIds);

  return (data || []).map(incident => {
    const sla = calculateSLA(incident as Incident);
    return {
      ...incident,
      creator: incident.created_by ? usersMap.get(incident.created_by) || null : null,
      assignee: incident.assigned_to ? usersMap.get(incident.assigned_to) || null : null,
      resolver: incident.resolved_by ? usersMap.get(incident.resolved_by) || null : null,
      response_sla_breached: sla.response_breached,
      resolution_sla_breached: sla.resolution_breached,
      response_time_remaining: sla.response_time_remaining,
      resolution_time_remaining: sla.resolution_time_remaining,
    } as Incident;
  });
}

export async function getIncident(id: string): Promise<Incident | null> {
  const { data, error } = await supabase
    .from("incidents")
    .select(`
      *,
      priority:incident_priorities(id, name, color, sort_order, is_active, response_sla_minutes, resolution_sla_minutes, created_at, updated_at),
      category:incident_categories(id, name, description, parent_id, category_level, sort_order, is_active, created_at, updated_at),
      incident_project:incident_projects(id, name, project_key),
      template:incident_templates(id, name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const userIds = [data.created_by, data.assigned_to, data.resolved_by].filter(Boolean);
  const usersMap = await getCreatorsInfo(userIds);

  const incident = {
    ...data,
    creator: data.created_by ? usersMap.get(data.created_by) || null : null,
    assignee: data.assigned_to ? usersMap.get(data.assigned_to) || null : null,
    resolver: data.resolved_by ? usersMap.get(data.resolved_by) || null : null,
  } as Incident;

  const sla = calculateSLA(incident);
  return {
    ...incident,
    response_sla_breached: sla.response_breached,
    resolution_sla_breached: sla.resolution_breached,
    response_time_remaining: sla.response_time_remaining,
    resolution_time_remaining: sla.resolution_time_remaining,
  };
}

export async function getPriorities(): Promise<IncidentPriority[]> {
  const { data, error } = await supabase
    .from("incident_priorities")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data || [];
}

export async function getCategories(): Promise<IncidentCategory[]> {
  const { data, error } = await supabase
    .from("incident_categories")
    .select(`
      *,
      parent:incident_categories!parent_id(id, name),
      subcategories:incident_categories!parent_id(id, name, description)
    `)
    .eq("is_active", true)
    .order("category_level, sort_order");

  if (error) throw error;
  return (data || []) as unknown as IncidentCategory[];
}

export async function getIncidentComments(incidentId: string): Promise<IncidentComment[]> {
  const { data, error } = await supabase
    .from("incident_comments")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at");

  if (error) throw error;

  const authorIds = (data || []).map(c => c.create_by).filter(Boolean);
  const authorsMap = await getCreatorsInfo(authorIds);

  return (data || []).map(dbComment => ({
    id: dbComment.id,
    incident_id: dbComment.incident_id,
    content: dbComment.comment,
    is_internal: dbComment.is_internal,
    created_by: dbComment.create_by,
    created_at: dbComment.created_at,
    attachments: dbComment.attachments,
    author: dbComment.create_by ? authorsMap.get(dbComment.create_by) || null : null,
  }));
}

export async function getIncidentProjectStats(projectId: string): Promise<IncidentProjectStats> {
  const { data, error } = await supabase
    .from("incidents")
    .select("id, status, priority_id, sla_due_date, response_time_minutes, resolution_time_minutes")
    .eq("incident_project_id", projectId);

  if (error) throw error;

  const incidents = data || [];
  const now = new Date();

  const openIncidents = incidents.filter(i => i.status !== "Closed" && i.status !== "Resolved").length;
  const closedIncidents = incidents.filter(i => i.status === "Closed" || i.status === "Resolved").length;
  const criticalIncidents = incidents.filter(
    i => i.priority_id && ["critical", "high"].some(p => i.priority_id?.includes(p))
  ).length;
  const overdueIncidents = incidents.filter(
    i => i.sla_due_date && new Date(i.sla_due_date) < now
  ).length;

  const resolvedIncidents = incidents.filter(i => i.response_time_minutes || i.resolution_time_minutes);
  const avgResponseTime =
    resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.response_time_minutes || 0), 0) /
        resolvedIncidents.length
      : 0;
  const avgResolutionTime =
    resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.resolution_time_minutes || 0), 0) /
        resolvedIncidents.length
      : 0;

  return {
    total_incidents: incidents.length,
    open_incidents: openIncidents,
    closed_incidents: closedIncidents,
    critical_incidents: criticalIncidents,
    overdue_incidents: overdueIncidents,
    sla_breached_incidents: overdueIncidents,
    avg_response_time: Math.round(avgResponseTime),
    avg_resolution_time: Math.round(avgResolutionTime),
  };
}

export async function getAssignableUsers(): Promise<Array<{ id: string; full_name?: string; email?: string }>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name");

  if (error) throw error;
  return data || [];
}

export async function getProjectMembers(
  projectId: string
): Promise<Array<{ id: string; full_name?: string; email?: string; user_type: "employee" | "customer" }>> {
  const { data: project, error: projectError } = await supabase
    .from("incident_projects")
    .select("id, customer_id, lead_id")
    .eq("id", projectId)
    .single();

  if (projectError) {
    console.error("Error fetching project for members:", projectError);
    return [];
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("incident_project_assignments")
    .select("user_id, user:profiles!user_id(id, full_name, email)")
    .eq("incident_project_id", projectId);

  if (assignmentsError) {
    console.error("Error fetching project assignments:", assignmentsError);
  }

  type ProfileJoin = { id: string; full_name: string | null; email: string | null };
  const staffMembers = (assignments || [])
    .filter(a => {
      const profile = Array.isArray(a.user) ? (a.user as ProfileJoin[])[0] : (a.user as ProfileJoin | null);
      return profile?.id;
    })
    .map(a => {
      const profile = Array.isArray(a.user) ? (a.user as ProfileJoin[])[0] : (a.user as ProfileJoin | null);
      return {
        id: profile!.id,
        full_name: profile?.full_name ?? undefined,
        email: profile?.email ?? undefined,
        user_type: "employee" as const,
      };
    });

  if (project?.lead_id && !staffMembers.some(m => m.id === project.lead_id)) {
    const { data: leadProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", project.lead_id)
      .maybeSingle();

    if (leadProfile) {
      staffMembers.unshift({
        id: leadProfile.id,
        full_name: leadProfile.full_name ?? undefined,
        email: leadProfile.email ?? undefined,
        user_type: "employee" as const,
      });
    }
  }

  let customers: Array<{ id: string; full_name?: string; email?: string; user_type: "customer" }> = [];
  if (project?.customer_id) {
    const { data: logins, error: loginsError } = await supabase
      .from("customer_logins")
      .select("user_id, full_name, email")
      .eq("company_id", project.customer_id)
      .eq("is_active", true);

    if (loginsError) {
      console.error("Error fetching customer logins:", loginsError);
    } else {
      customers = (logins || [])
        .filter(cl => cl.user_id)
        .map(cl => ({
          id: cl.user_id!,
          full_name: cl.full_name ?? undefined,
          email: cl.email,
          user_type: "customer" as const,
        }));
    }
  }

  return [...staffMembers, ...customers];
}

export async function getProjectReporters(projectId: string) {
  return getProjectMembers(projectId);
}

export async function getIncidentTemplates(): Promise<IncidentTemplate[]> {
  const { data: templates, error: templatesError } = await supabase
    .from("incident_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (templatesError) throw templatesError;
  if (!templates || templates.length === 0) return [];

  const priorityIds = [...new Set(templates.map(t => t.default_priority_id).filter(Boolean))];
  const categoryIds = [...new Set(templates.map(t => t.default_category_id).filter(Boolean))];
  const assigneeIds = [...new Set(templates.map(t => t.auto_assign_to).filter(Boolean))];

  const [prioritiesResult, categoriesResult, assigneesResult] = await Promise.all([
    priorityIds.length > 0
      ? supabase.from("incident_priorities").select("id, name, color").in("id", priorityIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? supabase.from("incident_categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    assigneeIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", assigneeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const prioritiesMap = new Map((prioritiesResult.data || []).map(p => [p.id, p]));
  const categoriesMap = new Map((categoriesResult.data || []).map(c => [c.id, c]));
  const assigneesMap = new Map((assigneesResult.data || []).map(a => [a.id, a]));

  return templates.map(template => ({
    ...template,
    default_priority: template.default_priority_id
      ? prioritiesMap.get(template.default_priority_id) || null
      : null,
    default_category: template.default_category_id
      ? categoriesMap.get(template.default_category_id) || null
      : null,
    auto_assignee: template.auto_assign_to ? assigneesMap.get(template.auto_assign_to) || null : null,
  })) as unknown as IncidentTemplate[];
}

export async function getIncidentAssignments(incidentId: string): Promise<IncidentAssignment[]> {
  const { data, error } = await supabase
    .from("incident_assignments")
    .select(`
      *,
      assignee:profiles!assigned_to(id, full_name, email),
      assigner:profiles!assigned_by(id, full_name, email)
    `)
    .eq("incident_id", incidentId)
    .order("assigned_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getIncidentStatusTransitions(incidentId: string): Promise<IncidentStatusTransition[]> {
  const { data, error } = await supabase
    .from("incident_status_transitions")
    .select(`
      *,
      transitioner:profiles(id, full_name, email)
    `)
    .eq("incident_id", incidentId)
    .order("transitioned_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getIncidentParticipants(incidentId: string) {
  const { data, error } = await supabase
    .from("incident_participants")
    .select("id, incident_id, user_id, added_by, added_at, user:profiles!user_id(id, full_name, email)")
    .eq("incident_id", incidentId)
    .order("added_at");
  if (error) throw error;
  return data || [];
}

export async function getAutoAssignmentRules(): Promise<IncidentAutoAssignmentRule[]> {
  const { data, error } = await supabase
    .from("incident_auto_assignment_rules")
    .select("*")
    .eq("is_active", true)
    .order("rule_order");

  if (error) throw error;
  return (data || []) as unknown as IncidentAutoAssignmentRule[];
}
