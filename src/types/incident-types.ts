// Enhanced incident management types with Phase 1 improvements

export type IncidentStatus = 'New' | 'Triaged' | 'In Progress' | 'Pending' | 'Resolved' | 'Cancelled' | 'Closed';

export interface IncidentPriority {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  response_sla_minutes: number;
  resolution_sla_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface IncidentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string; // "Incidents" or "Service requests"
  form_schema?: {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
      placeholder?: string;
      options?: string[];
    }>;
  };
  parent_id?: string;
  category_level: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Related data from joins
  parent?: IncidentCategory;
  subcategories?: IncidentCategory[];
}

export interface IncidentProject {
  id: string;
  name: string;
  project_key: string;
  description?: string;
  lead_id?: string;
  customer_id?: string;
  timesheet_project_id?: string;
  contract_id?: string;
  icon_color?: string;
  support_email_prefix?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Related data from joins
  lead?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  customer?: {
    id: string;
    name: string;
    email?: string;
    company?: string;
  };
  timesheet_project?: {
    id: string;
    name: string;
    description?: string;
  };
  incident_count?: number;
  open_incident_count?: number;
}

export type IncidentSource = 'web' | 'email' | 'sms' | 'api';

export interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description?: string;
  status: IncidentStatus;
  priority_id?: string;
  category_id?: string;
  incident_project_id: string;
  assigned_to?: string;
  created_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  sla_due_date?: string;
  impact_description?: string;
  response_time_minutes?: number;
  resolution_time_minutes?: number;
  first_response_at?: string;
  escalated_at?: string;
  escalation_reason?: string;
  auto_assigned: boolean;
  template_id?: string;
  source?: IncidentSource;
  created_at: string;
  updated_at: string;
  // Related data from joins
  priority?: IncidentPriority;
  category?: IncidentCategory;
  incident_project?: IncidentProject;
  template?: IncidentTemplate;
  assignee?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  creator?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  resolver?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  // SLA calculations
  response_sla_breached?: boolean;
  resolution_sla_breached?: boolean;
  response_time_remaining?: number;
  resolution_time_remaining?: number;
}

export interface CommentAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  content: string;
  is_internal: boolean;
  created_by: string;
  created_at: string;
  edited_at?: string;
  attachments?: CommentAttachment[];
  // Related data from joins
  author?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface IncidentParticipant {
  id: string;
  incident_id: string;
  user_id: string;
  added_by?: string;
  added_at: string;
  // Related data from joins
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

// Request types
export interface CreateIncidentProjectRequest {
  name: string;
  description?: string;
  lead_id?: string;
  customer_id?: string;
  timesheet_project_id?: string;
  contract_id?: string;
  project_key: string;
  icon_color?: string;
}

export interface UpdateIncidentProjectRequest {
  name?: string;
  description?: string;
  lead_id?: string;
  customer_id?: string;
  timesheet_project_id?: string;
  contract_id?: string;
  project_key?: string;
  icon_color?: string;
  support_email_prefix?: string;
  is_active?: boolean;
}

// New types for Phase 1 enhancements
export interface IncidentTemplate {
  id: string;
  name: string;
  description?: string;
  title_template: string;
  description_template?: string;
  default_priority_id?: string;
  default_category_id?: string;
  auto_assign_to?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Related data from joins
  default_priority?: IncidentPriority;
  default_category?: IncidentCategory;
  auto_assignee?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface IncidentAssignment {
  id: string;
  incident_id: string;
  assigned_to?: string;
  assigned_from?: string;
  assigned_by?: string;
  assignment_reason?: string;
  assigned_at: string;
  is_current: boolean;
  created_at: string;
  // Related data from joins
  assignee?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  assigner?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface IncidentStatusTransition {
  id: string;
  incident_id: string;
  from_status?: IncidentStatus;
  to_status: IncidentStatus;
  transitioned_by?: string;
  transition_reason?: string;
  is_auto_transition: boolean;
  transitioned_at: string;
  // Related data from joins
  transitioner?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface IncidentAutoAssignmentRule {
  id: string;
  name: string;
  priority_id?: string;
  category_id?: string;
  project_id?: string;
  assign_to_user_id?: string;
  assign_to_team?: string;
  is_active: boolean;
  rule_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Related data from joins
  priority?: IncidentPriority;
  category?: IncidentCategory;
  project?: IncidentProject;
  assignee?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  priority_id?: string;
  category_id?: string;
  incident_project_id: string;
  assigned_to?: string;
  impact_description?: string;
  template_id?: string;
  source?: IncidentSource;
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  priority_id?: string;
  category_id?: string;
  assigned_to?: string;
  created_by?: string;
  impact_description?: string;
  escalation_reason?: string;
  transition_reason?: string;
}

export interface CreateIncidentCommentRequest {
  incident_id: string;
  content: string;
  is_internal?: boolean;
  attachments?: CommentAttachment[];
}

// Template and assignment request types
export interface CreateIncidentTemplateRequest {
  name: string;
  description?: string;
  title_template: string;
  description_template?: string;
  default_priority_id?: string;
  default_category_id?: string;
  auto_assign_to?: string;
}

export interface UpdateIncidentTemplateRequest {
  name?: string;
  description?: string;
  title_template?: string;
  description_template?: string;
  default_priority_id?: string;
  default_category_id?: string;
  auto_assign_to?: string;
  is_active?: boolean;
}

export interface CreateAssignmentRequest {
  incident_id: string;
  assigned_to?: string;
  assignment_reason?: string;
}

// Enhanced filter types
export interface IncidentFilters {
  status?: IncidentStatus | IncidentStatus[];
  priority_id?: string | string[];
  category_id?: string | string[];
  incident_project_id?: string | string[];
  assigned_to?: string | string[];
  created_by?: string | string[];
  template_id?: string | string[];
  search?: string;
  sla_breached?: boolean;
  auto_assigned?: boolean;
  escalated?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface IncidentProjectStats {
  total_incidents: number;
  open_incidents: number;
  closed_incidents: number;
  critical_incidents: number;
  overdue_incidents: number;
  sla_breached_incidents: number;
  avg_response_time: number;
  avg_resolution_time: number;
}

// SLA and timing utilities
export interface SLACalculation {
  response_due_at?: string;
  resolution_due_at?: string;
  response_breached: boolean;
  resolution_breached: boolean;
  response_time_remaining: number;
  resolution_time_remaining: number;
}

// Status workflow utilities
export const INCIDENT_STATUS_FLOW: Record<IncidentStatus, IncidentStatus[]> = {
  'New': ['Triaged', 'In Progress', 'Pending', 'Cancelled', 'Closed'],
  'Triaged': ['In Progress', 'Pending', 'Resolved', 'Cancelled', 'Closed'],
  'In Progress': ['Resolved', 'Triaged', 'Pending', 'Cancelled', 'Closed'],
  'Pending': ['In Progress', 'Triaged', 'Resolved', 'Cancelled', 'Closed'],
  'Resolved': ['Closed', 'In Progress'],
  'Cancelled': ['New', 'In Progress'],
  'Closed': ['In Progress'],
};

export const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  'New': 'hsl(var(--destructive))',
  'Triaged': 'hsl(var(--warning))',
  'In Progress': 'hsl(var(--info))',
  'Pending': 'hsl(var(--warning))',
  'Resolved': 'hsl(var(--success))',
  'Cancelled': 'hsl(var(--muted-foreground))',
  'Closed': 'hsl(var(--muted-foreground))',
};