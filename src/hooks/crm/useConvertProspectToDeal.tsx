import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import type { Prospect } from "@/lib/crm/types";

export interface ConvertProspectToDealInput {
  prospect: Prospect;
  dealName: string;
  pipelineStageId: string;
  closeDateStr: string; // yyyy-MM-dd
  notes?: string;
  userId: string;
}

export const useConvertProspectToDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConvertProspectToDealInput) => {
      const { prospect, dealName, pipelineStageId, closeDateStr, notes, userId } = input;

      // Guard: must already be converted check
      if (prospect.converted_to_deal_id) {
        throw new Error("This prospect has already been converted to a deal.");
      }

      // Guard: must be qualified
      if (prospect.stage !== "qualified") {
        throw new Error("Only qualified prospects can be converted to deals.");
      }

      // Guard: must have at least one primary contact
      const primaryContact = prospect.prospect_contacts?.find((pc) => pc.is_primary);
      if (!primaryContact) {
        throw new Error("A primary contact must be linked before converting to a deal.");
      }

      // Create the deal
      const { data: newDeal, error: dealError } = await supabase
        .from("deals")
        .insert({
          name: dealName,
          account_id: prospect.account_id,
          pipeline_stage_id: pipelineStageId,
          primary_contact_id: primaryContact.contact_id,
          source: prospect.source || null,
          owner_id: prospect.owner_id,
          created_by: userId,
          close_date: closeDateStr,
          notes: notes || null,
        })
        .select("id, name, deal_number")
        .single();

      if (dealError) throw dealError;

      // Update the prospect with conversion info
      const { error: updateError } = await supabase
        .from("prospects")
        .update({
          converted_to_deal_id: newDeal.id,
          converted_at: new Date().toISOString(),
        })
        .eq("id", prospect.id);

      if (updateError) throw updateError;

      return { deal: newDeal, prospect };
    },
    onSuccess: ({ deal, prospect }) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects", prospect.id] });
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "pipeline"] });

      logCRMAuditEvent({
        action: "prospect_converted_to_deal",
        entityName: `Prospect: ${prospect.name}`,
        description: `Converted prospect "${prospect.name}" to deal "${deal.name}"`,
        details: {
          prospect_id: prospect.id,
          deal_id: deal.id,
          deal_number: deal.deal_number,
        },
      });

      toast({
        title: "Converted to Deal",
        description: `Deal "${deal.name}" created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
