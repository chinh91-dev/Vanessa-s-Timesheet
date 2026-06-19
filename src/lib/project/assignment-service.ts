import { supabase } from "@/integrations/supabase/client";
import { ProjectAssignment, CreateProjectAssignment } from "./assignment-types";

export const fetchProjectAssignments = async (projectId?: string): Promise<ProjectAssignment[]> => {
  try {
    console.log("Fetching project assignments for project:", projectId);
    
    let query = supabase
      .from("project_assignments")
      .select("*")                                // only base columns, no joins
      .order("assigned_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching project assignments:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} project assignments`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchProjectAssignments:", error);
    throw error;
  }
};

export const createProjectAssignment = async (assignment: CreateProjectAssignment): Promise<ProjectAssignment> => {
  try {
    console.log("Creating project assignment:", assignment);
    
    const { data, error } = await supabase
      .from("project_assignments")
      .insert({
        project_id: assignment.project_id,
        user_id: assignment.user_id,
        assigned_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select("*")  // simplified to only return base columns
      .single();

    if (error) {
      console.error("Error creating project assignment:", error);
      throw error;
    }

    console.log("Project assignment created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in createProjectAssignment:", error);
    throw error;
  }
};

export const deleteProjectAssignment = async (assignmentId: string): Promise<void> => {
  try {
    console.log("Deleting project assignment:", assignmentId);
    
    const { error } = await supabase
      .from("project_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("Error deleting project assignment:", error);
      throw error;
    }

    console.log("Project assignment deleted successfully");
  } catch (error) {
    console.error("Error in deleteProjectAssignment:", error);
    throw error;
  }
};

export const bulkAssignUsersToProject = async (projectId: string, userIds: string[]): Promise<void> => {
  try {
    console.log("Bulk assigning users to project:", { projectId, userIds });
    
    const currentUser = (await supabase.auth.getUser()).data.user;
    
    const assignments = userIds.map(userId => ({
      project_id: projectId,
      user_id: userId,
      assigned_by: currentUser?.id
    }));

    const { error } = await supabase
      .from("project_assignments")
      .insert(assignments)
      .select()
      .throwOnError();

    if (error) {
      console.error("Error bulk assigning users:", error);
      throw error;
    }

    console.log("Users assigned to project successfully");
  } catch (error) {
    console.error("Error in bulkAssignUsersToProject:", error);
    throw error;
  }
};

export const removeUserFromProject = async (projectId: string, userId: string): Promise<void> => {
  try {
    console.log("Removing user from project:", { projectId, userId });
    
    const { error } = await supabase
      .from("project_assignments")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing user from project:", error);
      throw error;
    }

    console.log("User removed from project successfully");
  } catch (error) {
    console.error("Error in removeUserFromProject:", error);
    throw error;
  }
};
