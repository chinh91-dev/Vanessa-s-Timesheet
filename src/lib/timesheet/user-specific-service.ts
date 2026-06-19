
import { supabase } from "@/integrations/supabase/client";
import { Project } from "./types";
import { todayLocalYMD } from "@/lib/date-utils";
import { Contract } from "../contract-service";
import { getUserRole } from "@/utils/roles";

export const fetchUserProjectsById = async (userId: string): Promise<Project[]> => {
  try {
    console.log("Fetching projects for user:", userId);
    
    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get current user's role
    const userRole = await getUserRole(currentUser.id);

    // Only allow admins to fetch other users' projects
    if (userRole !== 'admin' && userId !== currentUser.id) {
      throw new Error("Unauthorized to fetch projects for other users");
    }

    // Get the project IDs the specified user is assigned to
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('user_id', userId);

    const projectIds = assignments?.map(a => a.project_id) || [];
    
    // If user has no assignments, return empty array
    if (projectIds.length === 0) {
      console.log("User has no project assignments");
      return [];
    }

    // Fetch projects assigned to the specified user - only show active projects with no past end_date
    const today = todayLocalYMD();
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, budget_hours, start_date, end_date, is_active, customer_id, is_internal, has_budget_limit")
      .in('id', projectIds)
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching user projects:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} assigned projects for user ${userId}`);
    
    // Add hours_used for each project (for budget tracking)
    const projectsWithHours = await Promise.all(
      (data || []).map(async (project) => {
        // Get hours used for this project by this specific user
        const { data: entries } = await supabase
          .from("timesheet_entries")
          .select("hours_logged")
          .eq("project_id", project.id);
          
        const hours_used = entries?.reduce((sum, entry) => sum + entry.hours_logged, 0) || 0;
        
        return {
          ...project,
          hours_used
        };
      })
    );
    
    return projectsWithHours;
  } catch (error) {
    console.error("Error in fetchUserProjectsById:", error);
    throw error;
  }
};

export const fetchUserContractsById = async (userId: string): Promise<Contract[]> => {
  try {
    console.log("Fetching contracts for user:", userId);
    
    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get current user's role
    const userRole = await getUserRole(currentUser.id);

    // Only allow admins to fetch other users' contracts
    if (userRole !== 'admin' && userId !== currentUser.id) {
      throw new Error("Unauthorized to fetch contracts for other users");
    }

    // Get the contract IDs the specified user is assigned to
    const { data: assignments } = await supabase
      .from('contract_assignments')
      .select('contract_id')
      .eq('user_id', userId);

    const contractIds = assignments?.map(a => a.contract_id) || [];
    
    // If user has no assignments, return empty array
    if (contractIds.length === 0) {
      console.log("User has no contract assignments");
      return [];
    }

    // Fetch contracts assigned to the specified user
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .in('id', contractIds)
      .eq('is_active', true)
      .in('status', ['active', 'pending_renewal'])
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching user contracts:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} assigned contracts for user ${userId}`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchUserContractsById:", error);
    throw error;
  }
};
