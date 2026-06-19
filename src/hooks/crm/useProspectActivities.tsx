import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import type { ProspectActivity, CreateProspectActivityDTO } from "@/lib/crm/types";

export const useProspectActivities = (prospectId: string | undefined) => {
  return useQuery({
    queryKey: ["crm", "prospect-activities", prospectId],
    queryFn: async () => {
      if (!prospectId) throw new Error("Prospect ID is required");

      const { data, error } = await supabase
        .from("prospect_activities")
        .select(`
          *,
          owner:owner_id(id, full_name)
        `)
        .eq("prospect_id", prospectId)
        .order("activity_at", { ascending: false });

      if (error) throw error;
      return data as ProspectActivity[];
    },
    enabled: !!prospectId,
  });
};

export const useLogProspectActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: CreateProspectActivityDTO) => {
      const { data, error } = await supabase
        .from("prospect_activities")
        .insert(activity)
        .select("*")
        .single();

      if (error) throw error;

      // Update last_activity_at on the prospect
      const { error: updateError } = await supabase
        .from("prospects")
        .update({ last_activity_at: activity.activity_at || new Date().toISOString() })
        .eq("id", activity.prospect_id);

      if (updateError) console.error("Failed to update last_activity_at:", updateError);

      return data as ProspectActivity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospect-activities", data.prospect_id] });
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects", data.prospect_id] });
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });

      logCRMAuditEvent({
        action: "prospect_activity_logged",
        entityName: `Prospect Activity`,
        description: `Logged ${data.activity_type} activity`,
        details: { prospect_id: data.prospect_id, activity_type: data.activity_type },
      });

      toast({ title: "Activity logged" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log activity", description: error.message, variant: "destructive" });
    },
  });
};
