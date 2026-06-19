
// Types for project assignments
export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by?: string;
  created_at: string;
  // Related data from joins
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface CreateProjectAssignment {
  project_id: string;
  user_id: string;
}

export interface ProjectWithAssignees {
  id: string;
  name: string;
  description?: string;
  budget_hours: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  hours_used?: number;
  customer_id?: string;
  assignees?: Array<{
    id: string;
    full_name?: string;
    email?: string;
  }>;
}
