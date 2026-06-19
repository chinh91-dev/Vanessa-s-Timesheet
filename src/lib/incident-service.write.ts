import { supabase } from "@/integrations/supabase/client";
import type {
  Incident,
  IncidentProject,
  IncidentComment,
  IncidentTemplate,
  IncidentAssignment,
  IncidentStatus,
  CreateIncidentProjectRequest,
  UpdateIncidentProjectRequest,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  CreateIncidentCommentRequest,
  CreateIncidentTemplateRequest,
  UpdateIncidentTemplateRequest,
  CreateAssignmentRequest,
} from "@/types/incident-types";
import { getCreatorInfo, getCreatorsInfo } from "./incident-service.utils";
import { getAutoAssignmentRules } from "./incident-service.read";

async function generateNextIncidentNumber(projectId: string): Promise<string> {
  const { data: projectData } = await supabase
    .from("incident_projects")
    .select("project_key")
    .eq("id", projectId)
    .single();

  const projectKey = projectData?.project_key || "INC";

  const { data: existingIncidents } = await supabase
    .from("incidents")
    .select("incident_number")
    .eq("incident_project_id", projectId)
    .like("incident_number", `${projectKey}-%`)
    .order("incident_number", { ascending: false });

  let nextNumber = 1;

  if (existingIncidents && existingIncidents.length > 0) {
    const numbers = existingIncidents
      .map(incident => {
        const match = incident.incident_number.match(new RegExp(`^${projectKey}-(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    }
  }

  return `${projectKey}-${nextNumber}`;
}

async function sendNotification(
  type: string,
  incidentId: string,
  additionalData?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.functions.invoke("send-incident-notifications", {
      body: { type, incident_id: incidentId, additional_data: additionalData },
    });
  } catch (err) {
    console.error("Failed to invoke send-incident-notifications:", err);
  }
}

export async function applyAutoAssignment(incident: CreateIncidentRequest): Promise<string | undefined> {
  const rules = await getAutoAssignmentRules();

  for (const rule of rules) {
    let matches = true;
    if (rule.priority_id && rule.priority_id !== incident.priority_id) matches = false;
    if (rule.category_id && rule.category_id !== incident.category_id) matches = false;
    if (rule.project_id && rule.project_id !== incident.incident_project_id) matches = false;
    if (matches && rule.assign_to_user_id) return rule.assign_to_user_id;
  }

  return undefined;
}

export async function createIncidentProject(
  project: CreateIncidentProjectRequest
): Promise<IncidentProject> {
  const { data: user } = await supabase.auth.getUser();

  const { data: existingProject } = await supabase
    .from("incident_projects")
    .select("id")
    .eq("project_key", project.project_key)
    .single();

  if (existingProject) {
    throw new Error("Project key already exists. Please choose a different key.");
  }

  const { data, error } = await supabase
    .from("incident_projects")
    .insert({
      name: project.name,
      description: project.description,
      lead_id: project.lead_id,
      customer_id: project.customer_id,
      timesheet_project_id: project.timesheet_project_id,
      contract_id: project.contract_id,
      created_by: user.user?.id ?? null,
      project_key: project.project_key,
    })
    .select(`
      *,
      lead:profiles!lead_id(id, full_name, email),
      customer:customers(id, name)
    `)
    .single();

  if (error) throw error;

  if (user.user?.id && data.id) {
    await supabase.from("incident_project_assignments").insert({
      incident_project_id: data.id,
      user_id: user.user.id,
      role: "admin",
      assigned_by: user.user.id,
    });
  }

  try {
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminUsers && adminUsers.length > 0) {
      const adminAssignments = adminUsers
        .filter(admin => admin.user_id !== user.user?.id)
        .map(admin => ({
          incident_project_id: data.id,
          user_id: admin.user_id,
          role: "admin",
          assigned_by: user.user?.id,
        }));

      if (adminAssignments.length > 0) {
        await supabase
          .from("incident_project_assignments")
          .upsert(adminAssignments, { onConflict: "incident_project_id,user_id" });
      }
    }
  } catch (err) {
    console.warn("Failed to auto-add admin users to project:", err);
  }

  return data;
}

export async function updateIncidentProject(
  id: string,
  updates: UpdateIncidentProjectRequest
): Promise<IncidentProject> {
  const { data, error } = await supabase
    .from("incident_projects")
    .update(updates)
    .eq("id", id)
    .select(`
      *,
      lead:profiles!lead_id(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function createIncident(incident: CreateIncidentRequest): Promise<Incident> {
  const { data: user } = await supabase.auth.getUser();

  const { data: customerLogin } = await supabase
    .from("customer_logins")
    .select("id")
    .eq("user_id", user.user?.id)
    .maybeSingle();

  let finalAssignedTo: string | null = incident.assigned_to || null;
  let isAutoAssigned = false;
  let isCustomerTicket = false;

  if (customerLogin) {
    isCustomerTicket = true;
    const { data: project } = await supabase
      .from("incident_projects")
      .select("lead_id")
      .eq("id", incident.incident_project_id)
      .single();

    finalAssignedTo = project?.lead_id || null;
    isAutoAssigned = !!finalAssignedTo;
  } else {
    try {
      const autoAssignedTo = await applyAutoAssignment(incident);
      if (autoAssignedTo) {
        finalAssignedTo = autoAssignedTo;
        isAutoAssigned = true;
      }
    } catch (err) {
      console.warn("Auto-assignment check failed, continuing without auto-assignment:", err);
    }

    if (!finalAssignedTo) {
      const { data: project } = await supabase
        .from("incident_projects")
        .select("lead_id")
        .eq("id", incident.incident_project_id)
        .single();
      if (project?.lead_id) {
        finalAssignedTo = project.lead_id;
        isAutoAssigned = true;
      }
    }
  }

  const incidentNumber = await generateNextIncidentNumber(incident.incident_project_id);

  const { data: insertedData, error: insertError } = await supabase
    .from("incidents")
    .insert({
      ...incident,
      incident_number: incidentNumber,
      assigned_to: finalAssignedTo,
      auto_assigned: isAutoAssigned,
      created_by: user.user?.id ?? null,
    })
    .select(`
      *,
      priority:incident_priorities(id, name, color, sort_order, is_active, response_sla_minutes, resolution_sla_minutes, created_at, updated_at),
      category:incident_categories(id, name, description, parent_id, category_level, sort_order, is_active, created_at, updated_at),
      incident_project:incident_projects(id, name, project_key),
      template:incident_templates(id, name)
    `)
    .single();

  if (insertError) throw insertError;

  let assigneeData = null;
  if (insertedData.assigned_to) {
    const { data: assignee } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", insertedData.assigned_to)
      .single();
    assigneeData = assignee;
  }

  const data = { ...insertedData, assignee: assigneeData, creator: null };

  if (data.assigned_to) {
    try {
      await createAssignment({
        incident_id: data.id,
        assigned_to: data.assigned_to,
        assignment_reason: isCustomerTicket
          ? "Auto-assigned to project lead (customer ticket)"
          : isAutoAssigned
          ? "Auto-assigned by rule"
          : "Initial assignment",
      });
    } catch (err) {
      console.warn("Failed to create assignment record:", err);
    }
  }

  sendNotification("ticket_created", data.id).catch(err =>
    console.warn("Failed to send new ticket notification:", err)
  );

  return data as Incident;
}

export async function updateIncident(id: string, updates: UpdateIncidentRequest): Promise<Incident> {
  const { data: user } = await supabase.auth.getUser();

  const { data: oldIncident, error: oldIncidentError } = await supabase
    .from("incidents")
    .select("id, status, assigned_to, priority_id, category_id")
    .eq("id", id)
    .single();

  if (oldIncidentError) {
    console.error("[History Debug] Failed to fetch old incident:", oldIncidentError);
  }

  const { data, error } = await supabase
    .from("incidents")
    .update(updates)
    .eq("id", id)
    .select(`
      *,
      priority:incident_priorities(id, name, color, sort_order, is_active, response_sla_minutes, resolution_sla_minutes, created_at, updated_at),
      category:incident_categories(id, name, description, parent_id, category_level, sort_order, is_active, created_at, updated_at),
      incident_project:incident_projects(id, name, project_key),
      template:incident_templates(id, name)
    `)
    .single();

  if (error) throw error;

  if (oldIncident) {
    const historyEntries: {
      incident_id: string;
      user_id: string | undefined;
      field_name: string;
      old_value: string | null | undefined;
      new_value: string | null | undefined;
      old_display_value: string;
      new_display_value: string;
    }[] = [];

    if (updates.status && oldIncident.status !== updates.status) {
      historyEntries.push({
        incident_id: id,
        user_id: user.user?.id,
        field_name: "status",
        old_value: oldIncident.status,
        new_value: updates.status,
        old_display_value: oldIncident.status,
        new_display_value: updates.status,
      });
    }

    const oldAssignedTo = oldIncident.assigned_to || null;
    const newAssignedTo = updates.assigned_to === undefined ? undefined : updates.assigned_to || null;
    const assignedToInUpdates = "assigned_to" in updates;

    if (assignedToInUpdates && oldAssignedTo !== newAssignedTo) {
      let oldDisplayValue = "Unassigned";
      let newDisplayValue = "Unassigned";

      if (oldAssignedTo) {
        const oldAssignee = await getCreatorInfo(oldAssignedTo);
        oldDisplayValue = oldAssignee?.full_name || oldAssignee?.email || "Unknown";
      }
      if (newAssignedTo) {
        const newAssignee = await getCreatorInfo(newAssignedTo);
        newDisplayValue = newAssignee?.full_name || newAssignee?.email || "Unknown";
      }

      historyEntries.push({
        incident_id: id,
        user_id: user.user?.id,
        field_name: "assigned_to",
        old_value: oldAssignedTo,
        new_value: newAssignedTo,
        old_display_value: oldDisplayValue,
        new_display_value: newDisplayValue,
      });
    }

    if (historyEntries.length > 0) {
      const { error: historyError } = await supabase
        .from("incident_history")
        .insert(historyEntries)
        .select();
      if (historyError) console.error("[History Debug] Insert failed:", historyError);
    }

    if (assignedToInUpdates && newAssignedTo && oldAssignedTo !== newAssignedTo) {
      sendNotification("new_assignment", id, {
        old_assignee_id: oldAssignedTo ?? undefined,
      }).catch(err => console.warn("[Notification] Failed to send reassignment email:", err));
    }
  }

  const userIds = [data.created_by, data.assigned_to, data.resolved_by].filter(Boolean);
  const usersMap = await getCreatorsInfo(userIds);

  return {
    ...data,
    creator: data.created_by ? usersMap.get(data.created_by) || null : null,
    assignee: data.assigned_to ? usersMap.get(data.assigned_to) || null : null,
    resolver: data.resolved_by ? usersMap.get(data.resolved_by) || null : null,
  } as Incident;
}

export async function deleteIncident(id: string): Promise<void> {
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteIncidentProject(id: string): Promise<void> {
  const { error } = await supabase.from("incident_projects").delete().eq("id", id);
  if (error) throw error;
}

export async function addComment(comment: CreateIncidentCommentRequest): Promise<IncidentComment> {
  const { data: user } = await supabase.auth.getUser();
  const userId = user.user?.id || "";

  const { data, error } = await supabase
    .from("incident_comments")
    .insert({
      incident_id: comment.incident_id,
      comment: comment.content,
      create_by: userId,
      is_internal: comment.is_internal || false,
      attachments: comment.attachments || null,
    })
    .select("*")
    .single();

  if (error) throw error;

  const author = userId ? await getCreatorInfo(userId) : null;

  if (!comment.is_internal) {
    const { data: incident } = await supabase
      .from("incidents")
      .select("first_response_at")
      .eq("id", comment.incident_id)
      .single();

    if (incident && !incident.first_response_at) {
      await supabase
        .from("incidents")
        .update({ first_response_at: new Date().toISOString() })
        .eq("id", comment.incident_id);
    }

    sendNotification("new_comment", comment.incident_id, {
      comment_author_id: userId,
      comment_content: comment.content,
    }).catch(err => console.warn("Failed to send comment notification:", err));
  }

  return {
    id: data.id,
    incident_id: data.incident_id,
    content: data.comment,
    is_internal: data.is_internal,
    created_by: data.create_by,
    created_at: data.created_at,
    attachments: data.attachments,
    author,
  };
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("incident_comments")
    .update({ comment: content, edited_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) throw error;
}

export async function createIncidentTemplate(
  template: CreateIncidentTemplateRequest
): Promise<IncidentTemplate> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("incident_templates")
    .insert({ ...template, created_by: user.user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateIncidentTemplate(
  id: string,
  updates: UpdateIncidentTemplateRequest
): Promise<IncidentTemplate> {
  const { data, error } = await supabase
    .from("incident_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIncidentTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("incident_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function createAssignment(assignment: CreateAssignmentRequest): Promise<IncidentAssignment> {
  const { data: user } = await supabase.auth.getUser();

  await supabase
    .from("incident_assignments")
    .update({ is_current: false })
    .eq("incident_id", assignment.incident_id);

  const { data, error } = await supabase
    .from("incident_assignments")
    .insert({ ...assignment, assigned_by: user.user?.id, is_current: true })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("incidents")
    .update({ assigned_to: assignment.assigned_to })
    .eq("id", assignment.incident_id);

  return data;
}

export async function addParticipant(incidentId: string, userId: string): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("incident_participants")
    .upsert({ incident_id: incidentId, user_id: userId, added_by: me.user?.id }, { onConflict: "incident_id,user_id" });
  if (error) throw error;
}

export async function removeParticipant(incidentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("incident_participants")
    .delete()
    .eq("incident_id", incidentId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateIncidentStatus(
  incidentId: string,
  newStatus: IncidentStatus,
  reason?: string
): Promise<Incident> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("incidents")
    .update({
      status: newStatus,
      resolved_at: newStatus === "Resolved" ? new Date().toISOString() : undefined,
      resolved_by: newStatus === "Resolved" ? user.user?.id : undefined,
    })
    .eq("id", incidentId)
    .select()
    .single();

  if (error) throw error;

  if (newStatus === "Resolved") {
    sendNotification("incident_resolved", incidentId, { new_status: newStatus }).catch(err =>
      console.warn("Failed to send resolved notification:", err)
    );
  }

  return data;
}
