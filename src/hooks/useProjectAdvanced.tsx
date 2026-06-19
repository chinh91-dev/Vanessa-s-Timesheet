import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdvancedProjectService } from "@/lib/project/advanced-project-service";
import type { 
  CreateProjectSlaConfigRequest,
  UpdateProjectAssignmentRequest,
  CreateIncidentRelationshipRequest
} from "@/types/project-types";
import { toast } from "sonner";

// Query keys
const ADVANCED_PROJECT_QUERY_KEYS = {
  slaConfigs: (projectId: string) => ['project-sla-configs', projectId] as const,
  assignments: (projectId: string) => ['project-assignments-enhanced', projectId] as const,
  analytics: (projectId: string, startDate: string, endDate: string) => 
    ['project-analytics', projectId, startDate, endDate] as const,
  incidentRelationships: (incidentId: string) => ['incident-relationships', incidentId] as const,
  projectPermission: (userId: string, projectId: string, permission: string) => 
    ['project-permission', userId, projectId, permission] as const,
};

// Project SLA Configuration hooks
export function useProjectSlaConfigs(projectId: string) {
  return useQuery({
    queryKey: ADVANCED_PROJECT_QUERY_KEYS.slaConfigs(projectId),
    queryFn: () => AdvancedProjectService.getProjectSlaConfigs(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProjectSlaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: CreateProjectSlaConfigRequest) => 
      AdvancedProjectService.createProjectSlaConfig(config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ADVANCED_PROJECT_QUERY_KEYS.slaConfigs(data.project_id) 
      });
      toast.success("SLA configuration created successfully");
    },
    onError: (error) => {
      console.error("Error creating SLA config:", error);
      toast.error("Failed to create SLA configuration");
    },
  });
}

export function useUpdateProjectSlaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateProjectSlaConfigRequest> }) => 
      AdvancedProjectService.updateProjectSlaConfig(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ADVANCED_PROJECT_QUERY_KEYS.slaConfigs(data.project_id) 
      });
      toast.success("SLA configuration updated successfully");
    },
    onError: (error) => {
      console.error("Error updating SLA config:", error);
      toast.error("Failed to update SLA configuration");
    },
  });
}

export function useDeleteProjectSlaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdvancedProjectService.deleteProjectSlaConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sla-configs'] });
      toast.success("SLA configuration deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting SLA config:", error);
      toast.error("Failed to delete SLA configuration");
    },
  });
}

// Enhanced Project Assignment hooks
export function useProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: ADVANCED_PROJECT_QUERY_KEYS.assignments(projectId),
    queryFn: () => AdvancedProjectService.getProjectAssignments(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateProjectAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateProjectAssignmentRequest }) => 
      AdvancedProjectService.updateProjectAssignment(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ADVANCED_PROJECT_QUERY_KEYS.assignments(data.project_id) 
      });
      toast.success("Assignment updated successfully");
    },
    onError: (error) => {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    },
  });
}

export function useAssignUserToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      projectId, 
      userId, 
      role, 
      permissions 
    }: { 
      projectId: string; 
      userId: string; 
      role?: 'lead' | 'member' | 'viewer';
      permissions?: any;
    }) => 
      AdvancedProjectService.assignUserToProject(projectId, userId, role, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ADVANCED_PROJECT_QUERY_KEYS.assignments(data.project_id) 
      });
      toast.success("User assigned to project successfully");
    },
    onError: (error) => {
      console.error("Error assigning user:", error);
      toast.error("Failed to assign user to project");
    },
  });
}

// Project Analytics hooks
export function useProjectAnalytics(projectId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ADVANCED_PROJECT_QUERY_KEYS.analytics(projectId, startDate, endDate),
    queryFn: () => AdvancedProjectService.getProjectAnalytics(projectId, startDate, endDate),
    enabled: !!projectId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRefreshProjectAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, startDate, endDate }: { 
      projectId: string; 
      startDate: string; 
      endDate: string;
    }) => 
      AdvancedProjectService.refreshProjectAnalytics(projectId, startDate, endDate),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ADVANCED_PROJECT_QUERY_KEYS.analytics(
          variables.projectId, 
          variables.startDate, 
          variables.endDate
        ) 
      });
      toast.success("Analytics refreshed successfully");
    },
    onError: (error) => {
      console.error("Error refreshing analytics:", error);
      toast.error("Failed to refresh analytics");
    },
  });
}

// Incident Relationship hooks
export function useIncidentRelationships(incidentId: string) {
  return useQuery({
    queryKey: ADVANCED_PROJECT_QUERY_KEYS.incidentRelationships(incidentId),
    queryFn: () => AdvancedProjectService.getIncidentRelationships(incidentId),
    enabled: !!incidentId,
  });
}

export function useCreateIncidentRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (relationship: CreateIncidentRelationshipRequest) => 
      AdvancedProjectService.createIncidentRelationship(relationship),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ADVANCED_PROJECT_QUERY_KEYS.incidentRelationships(data.incident_id) 
      });
      toast.success("Incident relationship created successfully");
    },
    onError: (error) => {
      console.error("Error creating relationship:", error);
      toast.error("Failed to create incident relationship");
    },
  });
}

export function useDeleteIncidentRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdvancedProjectService.deleteIncidentRelationship(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-relationships'] });
      toast.success("Incident relationship deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting relationship:", error);
      toast.error("Failed to delete incident relationship");
    },
  });
}

// Project Permission hook
export function useProjectPermission(userId: string, projectId: string, permission: string) {
  return useQuery({
    queryKey: ADVANCED_PROJECT_QUERY_KEYS.projectPermission(userId, projectId, permission),
    queryFn: () => AdvancedProjectService.checkProjectPermission(userId, projectId, permission),
    enabled: !!userId && !!projectId && !!permission,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}