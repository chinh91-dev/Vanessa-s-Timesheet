import { supabase } from "@/integrations/supabase/client";
import type { 
  IncidentProjectAssignment, 
  CreateIncidentProjectAssignment,
  IncidentProjectTeamMember,
  IncidentProjectAssignmentRole 
} from "@/types/incident-project-assignment-types";

export class IncidentProjectAssignmentService {
  // Get all team members for an incident project (staff assignments + customer logins)
  static async getProjectTeam(projectId: string): Promise<IncidentProjectTeamMember[]> {
    // Get the project to find customer_id and lead_id
    const { data: project, error: projectError } = await supabase
      .from("incident_projects")
      .select("id, customer_id, lead_id")
      .eq("id", projectId)
      .single();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      return [];
    }

    // Get assigned staff from incident_project_assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("incident_project_assignments")
      .select(`
        id,
        user_id,
        role,
        assigned_at,
        user:profiles!user_id(id, full_name, email)
      `)
      .eq("incident_project_id", projectId);

    if (assignmentsError) {
      console.error("Error fetching project assignments:", assignmentsError);
    }

    // Get customer logins if project has a customer
    let customerMembers: IncidentProjectTeamMember[] = [];
    if (project?.customer_id) {
      const { data: customerLogins, error: customerError } = await supabase
        .from("customer_logins")
        .select("user_id, full_name, email")
        .eq("company_id", project.customer_id)
        .eq("is_active", true);

      if (customerError) {
        console.error("Error fetching customer logins:", customerError);
      } else {
        customerMembers = (customerLogins || [])
          .filter(cl => cl.user_id)
          .map(cl => ({
            id: cl.user_id!,
            user_id: cl.user_id!,
            full_name: cl.full_name || undefined,
            email: cl.email,
            role: 'customer' as const,
          }));
      }
    }

    // Map staff assignments to team members
    type ProfileJoin = { id: string; full_name: string | null; email: string | null };
    const staffMembers: IncidentProjectTeamMember[] = (assignments || []).map(a => {
      const profile = Array.isArray(a.user) ? (a.user as ProfileJoin[])[0] : (a.user as ProfileJoin | null);
      return {
        id: a.user_id,
        user_id: a.user_id,
        full_name: profile?.full_name ?? undefined,
        email: profile?.email ?? undefined,
        role: a.role as IncidentProjectAssignmentRole,
        assigned_at: a.assigned_at,
        assignment_id: a.id,
      };
    });

    // Ensure the project lead is always included in the team list
    // even if they haven't been explicitly added to incident_project_assignments
    if (project?.lead_id) {
      const leadAlreadyIncluded = staffMembers.some(m => m.user_id === project.lead_id);
      if (!leadAlreadyIncluded) {
        const { data: leadProfile } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", project.lead_id)
          .maybeSingle();

        if (leadProfile) {
          staffMembers.unshift({
            id: leadProfile.id,
            user_id: leadProfile.id,
            full_name: leadProfile.full_name || undefined,
            email: leadProfile.email,
            role: 'admin' as IncidentProjectAssignmentRole,
            assignment_id: undefined,
          });
        }
      }
    }

    return [...staffMembers, ...customerMembers];
  }

  // Get staff assignments only (for management purposes)
  static async getProjectAssignments(projectId: string): Promise<IncidentProjectAssignment[]> {
    const { data, error } = await supabase
      .from("incident_project_assignments")
      .select(`
        *,
        user:profiles!user_id(id, full_name, email),
        assigned_by_user:profiles!assigned_by(id, full_name, email)
      `)
      .eq("incident_project_id", projectId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching project assignments:", error);
      throw error;
    }

    return data || [];
  }

  // Assign a user to an incident project
  static async assignUserToProject(
    projectId: string, 
    userId: string, 
    role: IncidentProjectAssignmentRole = 'member'
  ): Promise<IncidentProjectAssignment> {
    const { data: currentUser } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("incident_project_assignments")
      .insert({
        incident_project_id: projectId,
        user_id: userId,
        role,
        assigned_by: currentUser.user?.id,
      })
      .select(`
        *,
        user:profiles!user_id(id, full_name, email)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error("User is already assigned to this project");
      }
      throw error;
    }

    return data;
  }

  // Remove a user from an incident project
  static async removeUserFromProject(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from("incident_project_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) throw error;
  }

  // Bulk assign users to a project
  static async bulkAssignUsersToProject(
    projectId: string, 
    userIds: string[], 
    role: IncidentProjectAssignmentRole = 'member'
  ): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();

    const assignments = userIds.map(userId => ({
      incident_project_id: projectId,
      user_id: userId,
      role,
      assigned_by: currentUser.user?.id,
    }));

    const { error } = await supabase
      .from("incident_project_assignments")
      .upsert(assignments, { 
        onConflict: 'incident_project_id,user_id',
        ignoreDuplicates: true 
      });

    if (error) throw error;
  }

  // Update a user's role in a project
  static async updateUserRole(
    assignmentId: string, 
    role: IncidentProjectAssignmentRole
  ): Promise<void> {
    const { error } = await supabase
      .from("incident_project_assignments")
      .update({ role })
      .eq("id", assignmentId);

    if (error) throw error;
  }

  // Get available users to assign (profiles not already assigned)
  static async getAvailableUsers(projectId: string): Promise<Array<{
    id: string;
    full_name?: string;
    email?: string;
  }>> {
    // Get already assigned user IDs
    const { data: assignments } = await supabase
      .from("incident_project_assignments")
      .select("user_id")
      .eq("incident_project_id", projectId);

    const assignedUserIds = (assignments || []).map(a => a.user_id);

    // Get all active profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.error("Error fetching available users:", error);
      return [];
    }

    // Filter out already assigned users
    return (profiles || []).filter(p => !assignedUserIds.includes(p.id));
  }
}
