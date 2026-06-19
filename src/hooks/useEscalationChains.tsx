import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EscalationLevel {
  level: number;
  name: string;
  triggerAfterMinutes: number;
  escalateToUserId?: string;
  escalateToRole?: string;
  autoReassign: boolean;
  notifyEscalationTarget: boolean;
  notifyOriginalAssignee: boolean;
  escalationMessage?: string;
}

export interface EscalationChain {
  id?: string;
  name: string;
  description?: string;
  incident_project_id?: string;
  priority_id?: string;
  category_id?: string;
  chain_levels: EscalationLevel[];
  auto_escalate_minutes: number;
  notify_on_escalation: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

const ESCALATION_CHAIN_QUERY_KEYS = {
  escalationChains: ['escalation-chains'] as const,
  escalationChain: (id: string) => ['escalation-chains', id] as const,
};

// Get all escalation chains
export function useEscalationChains() {
  return useQuery({
    queryKey: ESCALATION_CHAIN_QUERY_KEYS.escalationChains,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_chains')
        .select(`
          *,
          incident_project:incident_projects(id, name),
          priority:incident_priorities(id, name, color),
          category:incident_categories(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our interface
      return data.map(item => ({
        ...item,
        chain_levels: (item.chain_levels as any[]).map((level: any) => ({
          level: level.level,
          name: level.name,
          triggerAfterMinutes: level.triggerAfterMinutes,
          escalateToUserId: level.escalateToUserId,
          escalateToRole: level.escalateToRole,
          autoReassign: level.autoReassign,
          notifyEscalationTarget: level.notifyEscalationTarget,
          notifyOriginalAssignee: level.notifyOriginalAssignee,
          escalationMessage: level.escalationMessage,
        }))
      })) as EscalationChain[];
    },
  });
}

// Get single escalation chain
export function useEscalationChain(id: string) {
  return useQuery({
    queryKey: ESCALATION_CHAIN_QUERY_KEYS.escalationChain(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_chains')
        .select(`
          *,
          incident_project:incident_projects(id, name),
          priority:incident_priorities(id, name, color),
          category:incident_categories(id, name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Transform the data to match our interface
      return {
        ...data,
        chain_levels: (data.chain_levels as any[]).map((level: any) => ({
          level: level.level,
          name: level.name,
          triggerAfterMinutes: level.triggerAfterMinutes,
          escalateToUserId: level.escalateToUserId,
          escalateToRole: level.escalateToRole,
          autoReassign: level.autoReassign,
          notifyEscalationTarget: level.notifyEscalationTarget,
          notifyOriginalAssignee: level.notifyOriginalAssignee,
          escalationMessage: level.escalationMessage,
        }))
      } as EscalationChain;
    },
    enabled: !!id,
  });
}

// Create escalation chain
export function useCreateEscalationChain() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (chain: Omit<EscalationChain, 'id' | 'created_at' | 'updated_at'>) => {
      // Convert chain_levels to the format expected by Supabase
      const chainData = {
        ...chain,
        chain_levels: chain.chain_levels as any
      };
      
      const { data, error } = await supabase
        .from('escalation_chains')
        .insert([chainData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ESCALATION_CHAIN_QUERY_KEYS.escalationChains });
      toast({
        title: "Success",
        description: "Escalation chain created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create escalation chain",
        variant: "destructive",
      });
    },
  });
}

// Update escalation chain
export function useUpdateEscalationChain() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EscalationChain> & { id: string }) => {
      // Convert chain_levels to the format expected by Supabase if it exists
      const updateData: any = { ...updates };
      if (updates.chain_levels) {
        updateData.chain_levels = updates.chain_levels;
      }
        
      const { data, error } = await supabase
        .from('escalation_chains')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ESCALATION_CHAIN_QUERY_KEYS.escalationChains });
      queryClient.invalidateQueries({ queryKey: ESCALATION_CHAIN_QUERY_KEYS.escalationChain(data.id) });
      toast({
        title: "Success",
        description: "Escalation chain updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update escalation chain",
        variant: "destructive",
      });
    },
  });
}

// Delete escalation chain
export function useDeleteEscalationChain() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('escalation_chains')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ESCALATION_CHAIN_QUERY_KEYS.escalationChains });
      toast({
        title: "Success",
        description: "Escalation chain deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete escalation chain",
        variant: "destructive",
      });
    },
  });
}