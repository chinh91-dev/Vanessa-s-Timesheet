// Types for incident project team assignments

export type IncidentProjectAssignmentRole = 'admin' | 'member';

export interface IncidentProjectAssignment {
  id: string;
  incident_project_id: string;
  user_id: string;
  role: IncidentProjectAssignmentRole;
  assigned_at: string;
  assigned_by?: string;
  created_at: string;
  // Related data from joins
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  assigned_by_user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface CreateIncidentProjectAssignment {
  incident_project_id: string;
  user_id: string;
  role?: IncidentProjectAssignmentRole;
}

export interface IncidentProjectTeamMember {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  role: IncidentProjectAssignmentRole | 'customer';
  assigned_at?: string;
  assignment_id?: string; // For internal staff, the ID from incident_project_assignments
}
