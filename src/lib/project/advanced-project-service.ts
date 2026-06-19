import { supabase } from "@/integrations/supabase/client";
import type { 
  ProjectSlaConfig, 
  CreateProjectSlaConfigRequest,
  ProjectAssignment,
  UpdateProjectAssignmentRequest,
  ProjectAnalytics,
  IncidentRelationship,
  CreateIncidentRelationshipRequest
} from "@/types/project-types";

export class AdvancedProjectService {
  // Project SLA Configuration methods
  static async getProjectSlaConfigs(projectId: string): Promise<ProjectSlaConfig[]> {
    const { data, error } = await supabase
      .from('project_sla_configs')
      .select(`
        *
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ProjectSlaConfig[];
  }

  static async createProjectSlaConfig(config: CreateProjectSlaConfigRequest): Promise<ProjectSlaConfig> {
    const { data, error } = await supabase
      .from('project_sla_configs')
      .insert([{ ...config, created_by: (await supabase.auth.getUser()).data.user?.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProjectSlaConfig(
    id: string, 
    updates: Partial<CreateProjectSlaConfigRequest>
  ): Promise<ProjectSlaConfig> {
    const { data, error } = await supabase
      .from('project_sla_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteProjectSlaConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_sla_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Enhanced Project Assignment methods
  static async getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    const { data, error } = await supabase
      .from('project_assignments')
      .select(`
        *,
        user:profiles!project_assignments_user_id_fkey(id, full_name, email, role)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ProjectAssignment[];
  }

  static async updateProjectAssignment(
    id: string, 
    updates: any
  ): Promise<ProjectAssignment> {
    const { data, error } = await supabase
      .from('project_assignments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:profiles!project_assignments_user_id_fkey(id, full_name, email, role)
      `)
      .single();

    if (error) throw error;
    return data as ProjectAssignment;
  }

  static async assignUserToProject(
    projectId: string, 
    userId: string, 
    role: 'lead' | 'member' | 'viewer' = 'member',
    permissions?: any
  ): Promise<ProjectAssignment> {
    const { data, error } = await supabase
      .from('project_assignments')
      .insert({
        project_id: projectId,
        user_id: userId,
        assigned_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        user:profiles!project_assignments_user_id_fkey(id, full_name, email, role)
      `)
      .single();

    if (error) throw error;
    return data as ProjectAssignment;
  }

  // Project Analytics methods
  static async getProjectAnalytics(
    projectId: string, 
    startDate: string, 
    endDate: string
  ): Promise<ProjectAnalytics | null> {
    // Generate analytics from incident data
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select(`
        *,
        priority:incident_priorities(name),
        status
      `)
      .eq('incident_project_id', projectId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const total_incidents = incidents?.length || 0;
    const open_incidents = incidents?.filter(i => !['Resolved', 'Closed'].includes(i.status)).length || 0;
    const resolved_incidents = incidents?.filter(i => i.status === 'Resolved').length || 0;
    
    return {
      id: `analytics-${projectId}`,
      project_id: projectId,
      period_start: startDate,
      period_end: endDate,
      total_incidents,
      open_incidents,
      resolved_incidents,
      sla_breached_incidents: 0,
      incidents_by_priority: {},
      incidents_by_status: {},
      team_activity: {},
      calculated_at: new Date().toISOString()
    };
  }

  static async refreshProjectAnalytics(
    projectId: string, 
    startDate: string, 
    endDate: string
  ): Promise<ProjectAnalytics | null> {
    return this.getProjectAnalytics(projectId, startDate, endDate);
  }

  // Incident Relationship methods
  static async getIncidentRelationships(incidentId: string): Promise<IncidentRelationship[]> {
    const { data, error } = await supabase
      .from('incident_relationships')
      .select(`
        *,
        related_incident:incidents!related_incident_id(
          id, incident_number, title, status,
          priority:incident_priorities(name, color)
        )
      `)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      relationship_type: item.relationship_type as 'duplicate' | 'related' | 'blocks' | 'blocked_by' | 'child_of' | 'parent_of'
    })) as IncidentRelationship[];
  }

  static async createIncidentRelationship(
    relationship: CreateIncidentRelationshipRequest
  ): Promise<IncidentRelationship> {
    const { data, error } = await supabase
      .from('incident_relationships')
      .insert([{ ...relationship, created_by: (await supabase.auth.getUser()).data.user?.id }])
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      relationship_type: data.relationship_type as 'duplicate' | 'related' | 'blocks' | 'blocked_by' | 'child_of' | 'parent_of'
    };
  }

  static async deleteIncidentRelationship(id: string): Promise<void> {
    const { error } = await supabase
      .from('incident_relationships')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Permission checking
  static async checkProjectPermission(
    userId: string, 
    projectId: string, 
    permission: string
  ): Promise<boolean> {
    // Check if user is assigned to project
    const { data, error } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;
    return true; // All assigned users have permissions for now
  }
}
