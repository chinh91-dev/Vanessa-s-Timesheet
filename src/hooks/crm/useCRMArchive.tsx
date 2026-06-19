import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/lib/crm/types";

export const useClosedLostDeals = () => {
  return useQuery({
    queryKey: ['crm', 'archived-deals'],
    queryFn: async () => {
      // First get the Closed Lost stage ID
      const { data: closedLostStage, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('is_closed_lost', true)
        .single();
      
      if (stageError) throw stageError;
      if (!closedLostStage) return [];

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          account:account_id(id, name),
          pipeline_stage:pipeline_stage_id(id, name, is_closed_lost),
          owner:owner_id(id, full_name, email),
          primary_contact:primary_contact_id(id, contact_name, company_name)
        `)
        .eq('pipeline_stage_id', closedLostStage.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Deal[];
    },
    staleTime: 30000,
    gcTime: 300000,
  });
};
