import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { todayLocalYMD } from "@/lib/date-utils";

interface CreateTimeEntryFromIncidentParams {
  incidentId: string;
  hours: number;
  notes: string;
  startTime?: string;
  endTime?: string;
  entryDate?: string;
}

interface CreateTimeEntryFromTaskParams {
  taskId: string;
  taskTitle: string;
  hours: number;
  notes: string;
  startTime?: string;
  endTime?: string;
  projectId?: string;
  entryDate?: string;
}

export function useQuickTimeEntry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFromIncident = useMutation({
    mutationFn: async (params: CreateTimeEntryFromIncidentParams) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!params.hours || params.hours <= 0) {
        throw new Error("Hours must be greater than 0");
      }

      // Fetch incident to get project info
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .select(`
          id,
          incident_number,
          title,
          incident_project_id,
          incident_projects!inner (
            id,
            project_key,
            name,
            timesheet_project_id
          )
        `)
        .eq("id", params.incidentId)
        .single();

      if (incidentError) {
        console.error("Failed to fetch incident:", incidentError);
        throw new Error("Failed to fetch incident details");
      }

      // incident_projects is returned as an object due to !inner join
      const incidentProject = incident.incident_projects as unknown as {
        id: string;
        project_key: string;
        name: string;
        timesheet_project_id: string | null;
      };
      
      const projectId = incidentProject?.timesheet_project_id;
      
      if (!projectId) {
        throw new Error("This incident's project is not linked to a timesheet project. Please configure the project first.");
      }

      // Create the timesheet entry
      const entryData = {
        user_id: user.id,
        entry_type: "project" as const,
        project_id: projectId,
        entry_date: params.entryDate || todayLocalYMD(),
        hours_logged: params.hours,
        notes: params.notes,
        jira_task_id: `${incidentProject?.project_key}-${incident.incident_number}`,
        start_time: params.startTime || "",
        end_time: params.endTime || "",
        incident_id: params.incidentId,
      };

      console.log("Creating timesheet entry from incident:", entryData);

      const { data, error } = await supabase
        .from("timesheet_entries")
        .insert(entryData)
        .select()
        .single();

      if (error) {
        console.error("Failed to create timesheet entry:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      toast({
        title: "Time logged",
        description: "Your time has been added to your timesheet.",
      });
    },
    onError: (error: Error) => {
      console.error("Quick time entry error:", error);
      toast({
        title: "Failed to log time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createFromTask = useMutation({
    mutationFn: async (params: CreateTimeEntryFromTaskParams) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!params.hours || params.hours <= 0) {
        throw new Error("Hours must be greater than 0");
      }

      if (!params.projectId) {
        throw new Error("No project selected for time entry. Please select a project.");
      }

      // Create the timesheet entry
      const entryData = {
        user_id: user.id,
        entry_type: "project" as const,
        project_id: params.projectId,
        entry_date: params.entryDate || todayLocalYMD(),
        hours_logged: params.hours,
        notes: `Task: ${params.taskTitle}\n${params.notes}`.trim(),
        jira_task_id: params.taskId,
        start_time: params.startTime || "",
        end_time: params.endTime || "",
      };

      console.log("Creating timesheet entry from task:", entryData);

      const { data, error } = await supabase
        .from("timesheet_entries")
        .insert(entryData)
        .select()
        .single();

      if (error) {
        console.error("Failed to create timesheet entry:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      toast({
        title: "Time logged",
        description: "Your time has been added to your timesheet.",
      });
    },
    onError: (error: Error) => {
      console.error("Quick time entry error:", error);
      toast({
        title: "Failed to log time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createFromIncident,
    createFromTask,
    isLoading: createFromIncident.isPending || createFromTask.isPending,
  };
}
