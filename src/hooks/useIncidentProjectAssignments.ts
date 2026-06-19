import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IncidentProjectAssignmentService } from "@/lib/incident-project-assignment-service";
import { toast } from "sonner";
import type { IncidentProjectAssignmentRole } from "@/types/incident-project-assignment-types";
import { supabase } from "@/integrations/supabase/client";

// Query keys
const INCIDENT_PROJECT_TEAM_KEY = "incident-project-team";
const INCIDENT_PROJECT_ASSIGNMENTS_KEY = "incident-project-assignments";
const AVAILABLE_USERS_KEY = "available-users-for-project";

// Real-time subscription hook for project team changes
export function useProjectTeamRealtime(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-team-realtime-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_project_assignments',
          filter: `incident_project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_TEAM_KEY, projectId] });
          queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_ASSIGNMENTS_KEY, projectId] });
          queryClient.invalidateQueries({ queryKey: [AVAILABLE_USERS_KEY, projectId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_logins',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_TEAM_KEY, projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, projectId]);
}

// Hook to get the full team (staff + customers)
export function useIncidentProjectTeam(projectId: string) {
  return useQuery({
    queryKey: [INCIDENT_PROJECT_TEAM_KEY, projectId],
    queryFn: () => IncidentProjectAssignmentService.getProjectTeam(projectId),
    enabled: !!projectId,
    staleTime: 0,
  });
}

// Hook to get just staff assignments
export function useIncidentProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: [INCIDENT_PROJECT_ASSIGNMENTS_KEY, projectId],
    queryFn: () => IncidentProjectAssignmentService.getProjectAssignments(projectId),
    enabled: !!projectId,
  });
}

// Hook to get available users to assign
export function useAvailableUsersForProject(projectId: string) {
  return useQuery({
    queryKey: [AVAILABLE_USERS_KEY, projectId],
    queryFn: () => IncidentProjectAssignmentService.getAvailableUsers(projectId),
    enabled: !!projectId,
  });
}

// Hook to assign a user to a project
export function useAssignUserToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId, role }: {
      projectId: string;
      userId: string;
      role?: IncidentProjectAssignmentRole;
    }) => IncidentProjectAssignmentService.assignUserToProject(projectId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_TEAM_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_ASSIGNMENTS_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_USERS_KEY, variables.projectId] });
      toast.success("Team member added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add team member");
    },
  });
}

// Hook to remove a user from a project
export function useRemoveUserFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, projectId }: { assignmentId: string; projectId: string }) =>
      IncidentProjectAssignmentService.removeUserFromProject(assignmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_TEAM_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_ASSIGNMENTS_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_USERS_KEY, variables.projectId] });
      toast.success("Team member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove team member");
    },
  });
}

// Hook to update a user's role
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, role, projectId }: {
      assignmentId: string;
      role: IncidentProjectAssignmentRole;
      projectId: string;
    }) => IncidentProjectAssignmentService.updateUserRole(assignmentId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_TEAM_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_ASSIGNMENTS_KEY, variables.projectId] });
      toast.success("Role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });
}

// Hook to bulk assign users
export function useBulkAssignUsersToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userIds, role }: {
      projectId: string;
      userIds: string[];
      role?: IncidentProjectAssignmentRole;
    }) => IncidentProjectAssignmentService.bulkAssignUsersToProject(projectId, userIds, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_TEAM_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [INCIDENT_PROJECT_ASSIGNMENTS_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_USERS_KEY, variables.projectId] });
      toast.success("Team members added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add team members");
    },
  });
}
