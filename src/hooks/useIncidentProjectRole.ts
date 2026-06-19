import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectRoleResult {
  role: 'admin' | 'member' | null;
  isAdmin: boolean;
  isMember: boolean;
  isLoading: boolean;
}

export function useIncidentProjectRole(projectId: string): ProjectRoleResult {
  const { data, isLoading } = useQuery({
    queryKey: ["incident-project-role", projectId],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) return { role: null, isLead: false };

      // Check if user is project lead
      const { data: project } = await supabase
        .from("incident_projects")
        .select("lead_id")
        .eq("id", projectId)
        .maybeSingle();

      const isLead = project?.lead_id === user.user.id;

      // Check assignment role
      const { data: assignment, error } = await supabase
        .from("incident_project_assignments")
        .select("role")
        .eq("incident_project_id", projectId)
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching project role:", error);
      }

      return {
        role: assignment?.role as 'admin' | 'member' | null,
        isLead,
      };
    },
    enabled: !!projectId,
  });

  const role = data?.role ?? null;
  const isLead = data?.isLead ?? false;

  return {
    role,
    isAdmin: role === 'admin' || isLead,
    isMember: role === 'member' || role === 'admin' || isLead,
    isLoading,
  };
}
