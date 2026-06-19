import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IncidentService } from "@/lib/incident-service";
import { useToast } from "@/hooks/use-toast";
import type {
  IncidentProject,
  Incident,
  IncidentPriority,
  IncidentCategory,
  IncidentComment,
  CreateIncidentProjectRequest,
  UpdateIncidentProjectRequest,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  CreateIncidentCommentRequest,
  IncidentFilters,
  IncidentProjectStats
} from "@/types/incident-types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isManagerOrAbove } from "@/utils/roles";

// Query Keys
const INCIDENT_QUERY_KEYS = {
  incidentProjects: ['incident-projects'] as const,
  incidentProject: (id: string) => ['incident-projects', id] as const,
  incidents: (filters?: IncidentFilters) => ['incidents', filters] as const,
  incident: (id: string) => ['incidents', id] as const,
  priorities: ['incident-priorities'] as const,
  categories: ['incident-categories'] as const,
  comments: (incidentId: string) => ['incident-comments', incidentId] as const,
  projectStats: (projectId: string) => ['incident-project-stats', projectId] as const,
  assignableUsers: ['assignable-users'] as const,
  templates: ['incident-templates'] as const,
};

// Incident Projects
export function useIncidentProjects() {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.incidentProjects,
    queryFn: () => IncidentService.getIncidentProjects(),
  });
}

export function useIncidentProject(id: string) {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.incidentProject(id),
    queryFn: () => IncidentService.getIncidentProject(id),
    enabled: !!id,
  });
}

export function useCreateIncidentProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (project: CreateIncidentProjectRequest) => 
      IncidentService.createIncidentProject(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.incidentProjects });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      toast.success("Incident project created successfully");
    },
    onError: (error: any) => {
      console.error("Error creating incident project:", error);
      toast.error(error.message || "Failed to create incident project");
    },
  });
}

export function useUpdateIncidentProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateIncidentProjectRequest }) => 
      IncidentService.updateIncidentProject(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.incidentProjects });
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.incidentProject(data.id) });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      toast.success("Project updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating incident project:", error);
      toast.error(error.message || "Failed to update project");
    },
  });
}

// Incidents
export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.incidents(filters),
    queryFn: () => IncidentService.getIncidents(filters),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (incident: CreateIncidentRequest) => 
      IncidentService.createIncident(incident),
    onSuccess: () => {
      // Invalidate all incidents queries with any filters
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      // Also invalidate incident projects to update counts
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.incidentProjects });
      toast.success("Incident created successfully");
    },
    onError: (error) => {
      console.error("Error creating incident:", error);
      toast.error("Failed to create incident");
    },
  });
}

// Supporting Data - with staleTime caching to prevent unnecessary refetches
export function useIncidentPriorities() {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.priorities,
    queryFn: () => IncidentService.getPriorities(),
    staleTime: 5 * 60 * 1000, // 5 minutes - priorities rarely change
  });
}

export function useIncidentCategories() {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.categories,
    queryFn: () => IncidentService.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes - categories rarely change
  });
}

export function useAssignableUsers() {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.assignableUsers,
    queryFn: () => IncidentService.getAssignableUsers(),
    staleTime: 2 * 60 * 1000, // 2 minutes - users change occasionally
  });
}

export function useProjectReporters(projectId?: string) {
  return useQuery({
    queryKey: ['project-reporters', projectId],
    queryFn: () => IncidentService.getProjectReporters(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => IncidentService.getProjectMembers(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useIncidentTemplates() {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.templates,
    queryFn: () => IncidentService.getIncidentTemplates(),
    staleTime: 5 * 60 * 1000, // 5 minutes - templates rarely change
  });
}

export function useCreateIncidentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: IncidentService.createIncidentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.templates });
      toast.success("Template created successfully");
    },
    onError: (error: any) => {
      console.error("Error creating template:", error);
      toast.error(error.message || "Failed to create template");
    },
  });
}

export function useUpdateIncidentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      IncidentService.updateIncidentTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.templates });
      toast.success("Template updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating template:", error);
      toast.error(error.message || "Failed to update template");
    },
  });
}

export function useDeleteIncidentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: IncidentService.deleteIncidentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.templates });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting template:", error);
      toast.error(error.message || "Failed to delete template");
    },
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: () => IncidentService.getIncident(id),
    enabled: !!id,
  });
}

export function useIncidentComments(incidentId: string) {
  return useQuery({
    queryKey: ['incident-comments', incidentId],
    queryFn: () => IncidentService.getIncidentComments(incidentId),
    enabled: !!incidentId,
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      IncidentService.updateIncident(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', data.id] });
      // Ensure Activity/History tab refreshes immediately after updates like assignment
      queryClient.invalidateQueries({ queryKey: ['incident-history', data.id] });
      queryClient.invalidateQueries({ queryKey: ['incident-comments', data.id] });
      toast({
        title: "Incident updated",
        description: "The incident has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: IncidentService.addComment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', data.incident_id] });
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// User assigned incidents for timesheet task ID selection
export function useUserAssignedIncidents(userId: string) {
  return useQuery({
    queryKey: ['user-assigned-incidents', userId],
    queryFn: () => IncidentService.getIncidents({ 
      assigned_to: userId,
      status: ['New', 'Triaged', 'In Progress'] // Exclude closed/resolved
    }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// My assigned incidents for Dashboard - shows user's assigned incidents
export function useMyAssignedIncidents() {
  return useQuery({
    queryKey: ['my-assigned-incidents'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return IncidentService.getIncidents({ 
        assigned_to: user.id 
      });
    },
    staleTime: 30_000,
  });
}

// My projects - shows projects user is assigned to (admin sees all)
export function useMyProjects() {
  return useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      // Check if user is manager or above (admin, manager, sale_manager see all projects)
      const userIsManagerOrAbove = await isManagerOrAbove(user);

      // If manager or above, return all projects
      if (userIsManagerOrAbove) {
        return IncidentService.getIncidentProjects();
      }
      
      // Otherwise, get projects user is assigned to
      const { data: assignments } = await supabase
        .from("incident_project_assignments")
        .select("incident_project_id")
        .eq("user_id", user.id);
      
      if (!assignments || assignments.length === 0) return [];
      
      const projectIds = assignments.map(a => a.incident_project_id);
      
      // Fetch only assigned projects
      const allProjects = await IncidentService.getIncidentProjects();
      return allProjects.filter(p => projectIds.includes(p.id));
    },
    staleTime: 30_000,
  });
}
// Hook to get assets linked to an incident
export function useIncidentAssets(incidentId: string) {
  return useQuery({
    queryKey: ['incident-assets', incidentId],
    queryFn: async () => {
      const { AssetService } = await import("@/lib/asset-service");
      return AssetService.getIncidentAssets(incidentId);
    },
    enabled: !!incidentId,
  });
}

// Hook to check if current user is assigned to an incident's project
export function useDeleteIncidentProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => IncidentService.deleteIncidentProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.incidentProjects });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      toast.success("Project deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting incident project:", error);
      toast.error(error.message || "Failed to delete project");
    },
  });
}

export function useIsUserInProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['user-in-project', projectId],
    queryFn: async () => {
      if (!projectId) return false;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check assignment
      const { data: assignment } = await supabase
        .from("incident_project_assignments")
        .select("id")
        .eq("incident_project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (assignment) return true;

      // Check if user is project lead
      const { data: project } = await supabase
        .from("incident_projects")
        .select("lead_id")
        .eq("id", projectId)
        .maybeSingle();

      return project?.lead_id === user.id;
    },
    enabled: !!projectId,
  });
}

export function useIncidentParticipants(incidentId: string) {
  return useQuery({
    queryKey: ['incident-participants', incidentId],
    queryFn: () => IncidentService.getIncidentParticipants(incidentId),
    enabled: !!incidentId,
  });
}

export function useAddParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, userId }: { incidentId: string; userId: string }) =>
      IncidentService.addParticipant(incidentId, userId),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident-participants', incidentId] });
    },
  });
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, userId }: { incidentId: string; userId: string }) =>
      IncidentService.removeParticipant(incidentId, userId),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident-participants', incidentId] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content, incidentId }: { commentId: string; content: string; incidentId: string }) =>
      IncidentService.updateComment(commentId, content),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', incidentId] });
    },
  });
}
