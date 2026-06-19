// Enhanced project types for Phase 5 features

export interface ProjectSlaConfig {
  id: string;
  project_id: string;
  priority_id: string;
  response_sla_hours: number;
  resolution_sla_hours: number;
  escalation_hours?: number;
  escalation_to?: string;
  business_hours_only: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  priority?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role: 'lead' | 'member' | 'viewer';
  permissions: {
    can_create_incidents: boolean;
    can_assign_incidents: boolean;
    can_modify_settings: boolean;
  };
  assigned_at: string;
  assigned_by?: string;
  created_at: string;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    role?: string;
  };
}

export interface ProjectAnalytics {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  sla_breached_incidents: number;
  avg_resolution_time_hours?: number;
  avg_response_time_hours?: number;
  incidents_by_priority: Record<string, number>;
  incidents_by_status: Record<string, number>;
  team_activity: Record<string, {
    assigned_incidents: number;
    resolved_incidents: number;
    avg_resolution_hours?: number;
  }>;
  calculated_at: string;
}

export interface IncidentRelationship {
  id: string;
  incident_id: string;
  related_incident_id: string;
  relationship_type: 'duplicate' | 'related' | 'blocks' | 'blocked_by' | 'child_of' | 'parent_of';
  created_at: string;
  created_by: string;
  related_incident?: {
    id: string;
    incident_number: string;
    title: string;
    status: string;
    priority?: {
      name: string;
      color: string;
    };
  };
}

export interface CreateProjectSlaConfigRequest {
  project_id: string;
  priority_id: string;
  response_sla_hours: number;
  resolution_sla_hours: number;
  escalation_hours?: number;
  escalation_to?: string;
  business_hours_only: boolean;
}

export interface CreateProjectSlaConfigFormData {
  priority_id?: string;
  response_sla_hours?: number;
  resolution_sla_hours?: number;
  escalation_hours?: number;
  business_hours_only?: boolean;
}

export interface UpdateProjectAssignmentRequest {
  role: 'lead' | 'member' | 'viewer';
  permissions: {
    can_create_incidents: boolean;
    can_assign_incidents: boolean;
    can_modify_settings: boolean;
  };
}

export interface CreateIncidentRelationshipRequest {
  incident_id: string;
  related_incident_id: string;
  relationship_type: 'duplicate' | 'related' | 'blocks' | 'blocked_by' | 'child_of' | 'parent_of';
}