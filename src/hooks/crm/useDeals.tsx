import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import { coerceEmptyUuidsToNull } from "@/lib/crm/sanitize";
import type { Deal, CreateDealDTO, UpdateDealDTO } from "@/lib/crm/types";

export const useDeals = () => {
  return useQuery({
    queryKey: ['crm', 'deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          primary_contact:primary_contact_id(id, contact_name, company_name),
          pipeline_stage:pipeline_stage_id(id, name, default_probability),
          owner:owner_id(id, full_name, email),
          creator:created_by(id, full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Deal[];
    },
    staleTime: 30000,
    gcTime: 300000,
  });
};

export const useDeal = (id: string | undefined) => {
  return useQuery({
    queryKey: ['crm', 'deals', id],
    queryFn: async () => {
      if (!id) throw new Error('Deal ID is required');
      
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          primary_contact:primary_contact_id(id, contact_name, company_name),
          opportunity:opportunity_id(id, name),
          owner:owner_id(id, full_name, email),
          creator:created_by(id, full_name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Deal;
    },
    enabled: !!id,
  });
};

export const useCreateDeal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deal: CreateDealDTO) => {
      const { data, error } = await supabase
        .from('deals')
        .insert(coerceEmptyUuidsToNull(deal as Record<string, unknown>))
        .select()
        .single();
      
      if (error) throw error;
      return data as Deal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "deal_created",
        entityName: `Deal: ${data.name || data.deal_number || 'Untitled'}`,
        description: `Created new deal${data.amount ? ` worth $${data.amount.toLocaleString()}` : ''}`,
        details: {
          deal_id: data.id,
          deal_number: data.deal_number,
          amount: data.amount,
          primary_contact_id: data.primary_contact_id,
        },
      });
      
      toast({
        title: "Success",
        description: "Deal created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateDealDTO }) => {
      const { data, error } = await supabase
        .from('deals')
        .update(coerceEmptyUuidsToNull(updates as Record<string, unknown>))
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Deal;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "deal_updated",
        entityName: `Deal: ${data.name || data.deal_number || 'Untitled'}`,
        description: `Updated deal details`,
        details: {
          deal_id: data.id,
          deal_number: data.deal_number,
          updated_fields: Object.keys(variables.updates),
        },
      });
      
      toast({
        title: "Success",
        description: "Deal updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteDeal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get deal info before deleting for audit log
      const { data: deal } = await supabase
        .from('deals')
        .select('name, deal_number, amount')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, deal };
    },
    onSuccess: ({ id, deal }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "deal_deleted",
        entityName: `Deal: ${deal?.name || deal?.deal_number || 'Unknown'}`,
        description: `Deleted deal`,
        details: {
          deal_id: id,
          deal_number: deal?.deal_number,
          amount: deal?.amount,
        },
      });
      
      toast({
        title: "Success",
        description: "Deal deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMoveDealToStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      dealId, 
      stageId,
      accountId,
      primaryContactId,
      isClosedWon,
      clearNextStep = true,
      clearContractDetails = false
    }: { 
      dealId: string; 
      stageId: string;
      accountId?: string;
      primaryContactId?: string;
      isClosedWon?: boolean;
      clearNextStep?: boolean;
      clearContractDetails?: boolean;
    }) => {
      // Get stage name for audit log
      const { data: stage } = await supabase
        .from('pipeline_stages')
        .select('name')
        .eq('id', stageId)
        .single();
      
      const updateData: Record<string, unknown> = { pipeline_stage_id: stageId };
      
      // Clear next step fields when moving stages
      if (clearNextStep) {
        updateData.next_step = null;
        updateData.next_step_due_date = null;
      }
      
      // Clear contract details when moving from Proposal to Negotiation
      if (clearContractDetails) {
        updateData.contract_value = null;
        updateData.billing_cadence = null;
        updateData.contract_type = null;
      }
      
      const { data, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Return extra info for customer conversion and audit
      return { 
        deal: data as Deal, 
        accountId, 
        primaryContactId,
        isClosedWon,
        stageName: stage?.name,
      };
    },
    onSuccess: ({ deal, stageName, isClosedWon }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] });
      
      // Log audit event
      const action = isClosedWon ? "deal_won" : "deal_stage_moved";
      logCRMAuditEvent({
        action,
        entityName: `Deal: ${deal.name || deal.deal_number || 'Untitled'}`,
        description: isClosedWon 
          ? `Deal closed won${deal.contract_value ? ` - $${deal.contract_value.toLocaleString()}` : ''}`
          : `Moved deal to ${stageName || 'new stage'}`,
        details: {
          deal_id: deal.id,
          deal_number: deal.deal_number,
          new_stage: stageName,
          is_closed_won: isClosedWon,
          contract_value: deal.contract_value,
        },
      });
      
      toast({
        title: "Success",
        description: "Deal moved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
