import { supabase } from "@/integrations/supabase/client";
import { todayLocalYMD } from "@/lib/date-utils";
import { Project } from "./types";
import { ProjectWithAssignees } from "../project/assignment-types";

export const fetchUserProjects = async (): Promise<Project[]> => {
  try {
    console.log("Fetching projects for current user...");
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // For ALL users (including admins), only fetch projects they're assigned to
    // First, get the project IDs the user is assigned to
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('user_id', user.id);

    const projectIds = assignments?.map(a => a.project_id) || [];
    
    // If user has no assignments, return empty array
    if (projectIds.length === 0) {
      console.log("User has no project assignments");
      return [];
    }

    // Filter projects by the assigned project IDs - only show active projects with no past end_date
    const today = todayLocalYMD();
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, budget_hours, start_date, end_date, is_active, customer_id, is_internal, has_budget_limit")
      .in('id', projectIds)
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} assigned projects for user`);
    console.log("Projects data:", data);
    
    // Fetch hours used for each project
    const projectsWithHours = await Promise.all(
      (data || []).map(async (project) => {
        const hours = await getProjectHoursUsed(project.id);
        return {
          ...project,
          hours_used: hours
        };
      })
    );
    
    return projectsWithHours;
  } catch (error) {
    console.error("Error in fetchUserProjects:", error);
    throw error;
  }
};

export const fetchProjects = async (filters?: {
  searchTerm?: string;
  statusFilter?: 'all' | 'active' | 'inactive';
  typeFilter?: 'all' | 'internal' | 'client';
  customerId?: string;
  budgetFilter?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
}): Promise<Project[]> => {
  try {
    console.log("Fetching projects with filters:", filters);
    
    let query = supabase
      .from("projects")
      .select("id, name, description, budget_hours, start_date, end_date, is_active, customer_id, is_internal, has_budget_limit");

    // Filter by status
    if (filters?.statusFilter === 'active') {
      query = query.eq("is_active", true);
    } else if (filters?.statusFilter === 'inactive') {
      query = query.eq("is_active", false);
    }
    // 'all' = no filter applied

    // Filter by type
    if (filters?.typeFilter === 'internal') {
      query = query.eq("is_internal", true);
    } else if (filters?.typeFilter === 'client') {
      query = query.eq("is_internal", false);
    }
    // 'all' = no filter applied

    // Apply search filter
    if (filters?.searchTerm) {
      query = query.ilike("name", `%${filters.searchTerm}%`);
    }

    // Apply customer filter
    if (filters?.customerId) {
      query = query.eq("customer_id", filters.customerId);
    }

    // Apply budget filter
    if (filters?.budgetFilter) {
      switch (filters.budgetFilter) {
        case 'limited':
          query = query.eq("has_budget_limit", true);
          break;
        case 'unlimited':
          query = query.eq("has_budget_limit", false);
          break;
        // Note: over_budget and under_budget would need additional logic
        // as they require comparing hours_used vs budget_hours
      }
    }

    // Apply start date range filter
    if (filters?.startDateFrom) {
      query = query.gte("start_date", filters.startDateFrom);
    }
    if (filters?.startDateTo) {
      query = query.lte("start_date", filters.startDateTo);
    }

    // Apply end date range filter
    if (filters?.endDateFrom) {
      query = query.gte("end_date", filters.endDateFrom);
    }
    if (filters?.endDateTo) {
      query = query.lte("end_date", filters.endDateTo);
    }

    const { data, error } = await query
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} projects`);
    
    // Fetch hours used for each project
    const projectsWithHours = await Promise.all(
      (data || []).map(async (project) => {
        const hours = await getProjectHoursUsed(project.id);
        return {
          ...project,
          hours_used: hours
        };
      })
    );
    
    return projectsWithHours;
  } catch (error) {
    console.error("Error in fetchProjects:", error);
    throw error;
  }
};

export const fetchProjectsWithAssignees = async (filters?: { 
  searchTerm?: string; 
  activeOnly?: boolean;
  internalOnly?: boolean;
}): Promise<ProjectWithAssignees[]> => {
  try {
    console.log("Fetching projects with assignees, filters:", filters);
    
    let query = supabase
      .from("projects")
      .select(`
        id, name, description, budget_hours, start_date, end_date, is_active, customer_id, is_internal, has_budget_limit,
        project_assignments!inner(
          user:profiles!project_assignments_user_id_fkey(id, full_name, email)
        )
      `);

    // Apply active filter
    if (filters?.activeOnly) {
      query = query.eq("is_active", true);
    }

    // Apply internal filter
    if (filters?.internalOnly) {
      query = query.eq("is_internal", true);
    }

    // Apply search filter
    if (filters?.searchTerm) {
      query = query.ilike("name", `%${filters.searchTerm}%`);
    }

    const { data, error } = await query
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching projects with assignees:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} projects with assignees`);
    
    // Transform the data to include assignees properly
    const projectsWithAssignees = await Promise.all(
      (data || []).map(async (project: any) => {
        const hours = await getProjectHoursUsed(project.id);
        
        // Extract unique assignees
        const assignees = Array.isArray(project.project_assignments) 
          ? project.project_assignments.map((assignment: any) => assignment.user).filter(Boolean)
          : [];

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          budget_hours: project.budget_hours,
          start_date: project.start_date,
          end_date: project.end_date,
          is_active: project.is_active,
          customer_id: project.customer_id,
          is_internal: project.is_internal,
          has_budget_limit: project.has_budget_limit,
          hours_used: hours,
          assignees: assignees
        };
      })
    );
    
    return projectsWithAssignees;
  } catch (error) {
    console.error("Error in fetchProjectsWithAssignees:", error);
    throw error;
  }
};

export const saveProject = async (projectData: Omit<Project, 'id' | 'hours_used'>): Promise<Project> => {
  try {
    console.log("Saving project:", projectData);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from("projects")
      .insert([{
        name: projectData.name,
        description: projectData.description,
        budget_hours: projectData.budget_hours,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        customer_id: projectData.customer_id,
        is_active: projectData.is_active ?? true,
        is_internal: projectData.is_internal ?? false,
        has_budget_limit: projectData.has_budget_limit ?? true,
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error("Error saving project:", error);
      throw new Error(`Failed to save project: ${error.message}`);
    }

    console.log("Project saved successfully:", data);
    return { ...data, hours_used: 0 };
  } catch (error) {
    console.error("Error in saveProject:", error);
    throw error;
  }
};

export const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'hours_used'>>): Promise<Project> => {
  try {
    console.log("Updating project:", projectId, projectData);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Update the project data
    const { data, error } = await supabase
      .from("projects")
      .update({
        ...projectData,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      console.error("Error updating project:", error);
      throw new Error(`Failed to update project: ${error.message}`);
    }

    console.log("Project updated successfully:", data);
    
    // Fetch current hours used
    const hours = await getProjectHoursUsed(projectId);
    return { ...data, hours_used: hours };
  } catch (error) {
    console.error("Error in updateProject:", error);
    throw error;
  }
};

export const getProjectHoursUsed = async (projectId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("timesheet_entries")
      .select("hours_logged")
      .eq("project_id", projectId);
      
    if (error) {
      console.error("Error fetching project hours:", error);
      return 0;
    }
    
    // Sum up all hours logged for the project
    const totalHours = data?.reduce((sum, entry) => sum + entry.hours_logged, 0) || 0;
    console.log(`Project ${projectId} has ${totalHours} hours used`);
    return totalHours;
  } catch (error) {
    console.error("Error in getProjectHoursUsed:", error);
    return 0;
  }
};

export const updateProjectStatus = async (projectId: string, isActive: boolean): Promise<void> => {
  try {
    console.log(`Updating project ${projectId} status to ${isActive ? 'active' : 'inactive'}`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    const { error } = await supabase
      .from("projects")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) {
      console.error("Error updating project status:", error);
      throw new Error(`Failed to update project status: ${error.message}`);
    }
    
    console.log(`Project ${projectId} status updated successfully`);
  } catch (error) {
    console.error("Error in updateProjectStatus:", error);
    throw error;
  }
};
