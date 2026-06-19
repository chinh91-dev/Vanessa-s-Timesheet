import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineItem } from "@/lib/crm/types";

/**
 * Unified pipeline hook - fetches deals-only pipeline with stage history
 */
export const usePipeline = () => {
  return useQuery({
    queryKey: ['crm', 'pipeline'],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      // Fetch deals from RPC
      const { data, error } = await supabase.rpc('get_deals_for_pipeline');

      if (error) throw error;
      if (!data) return [];

      // Fetch pipeline stages to get actual is_closed_won/is_closed_lost flags
      const { data: pipelineStages } = await supabase
        .from('pipeline_stages')
        .select('id, is_closed_won, is_closed_lost');

      const stageFlags = new Map<string, { is_closed_won: boolean; is_closed_lost: boolean }>();
      if (pipelineStages) {
        for (const stage of pipelineStages) {
          stageFlags.set(stage.id, {
            is_closed_won: stage.is_closed_won,
            is_closed_lost: stage.is_closed_lost,
          });
        }
      }

      // Fetch stage history to determine when each deal entered its current stage
      const dealIds = data.map((item: any) => item.deal_id);
      const { data: stageHistory } = await supabase
        .from('deal_stage_history')
        .select('deal_id, to_stage_id, changed_at')
        .in('deal_id', dealIds)
        .order('changed_at', { ascending: false });

      // Create a map of deal_id -> latest stage entry timestamp
      const stageEntryMap = new Map<string, string>();
      if (stageHistory) {
        for (const history of stageHistory) {
          // Only record the first (most recent) entry for each deal
          if (!stageEntryMap.has(history.deal_id)) {
            stageEntryMap.set(history.deal_id, history.changed_at);
          }
        }
      }

      // Transform RPC data into PipelineItem format
      const items: PipelineItem[] = data.map((item: any): PipelineItem => ({
        id: item.deal_id,
        stage_id: item.stage_id,
        stage_name: item.stage_name || 'No Stage',
        stage_order: item.stage_order || 0,
        stage_probability: item.stage_probability || 0,
        deal_name: item.deal_name || 'Untitled Deal',
        account_name: item.account_name,
        account_id: item.account_id,
        amount: item.amount,
        close_date: item.close_date,
        next_step: item.next_step,
        next_step_due_date: item.next_step_due_date,
        source: item.source,
        contract_value: item.contract_value,
        billing_cadence: item.billing_cadence,
        contract_type: item.contract_type,
        owner_id: item.owner_id,
        owner_name: item.owner_name,
        primary_contact_id: item.primary_contact_id,
        primary_contact_name: item.primary_contact_name,
        deal_notes: item.deal_notes,
        lead_notes: item.lead_notes,
        // Proposal document fields
        proposal_file_id: item.proposal_file_id,
        proposal_file_name: item.proposal_file_name,
        proposal_file_type: item.proposal_file_type,
        proposal_file_size: item.proposal_file_size,
        proposal_file_url: item.proposal_file_url,
        proposal_uploaded_at: item.proposal_uploaded_at,
        // Stage tracking - use stage history or fall back to created_at
        stage_entered_at: stageEntryMap.get(item.deal_id) || item.created_at,
        // FY tracking flags - use actual stage flags from pipeline_stages table
        is_closed_won: stageFlags.get(item.stage_id)?.is_closed_won ?? false,
        is_closed_lost: stageFlags.get(item.stage_id)?.is_closed_lost ?? false,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      return items;
    },
  });
};
