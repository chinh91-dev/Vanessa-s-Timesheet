import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PipelineStage } from "@/lib/crm/types";

export const usePipelineStages = () => {
  return useQuery({
    queryKey: ['crm', 'pipeline-stages'],
    staleTime: 60000, // 1 minute - stages rarely change
    gcTime: 600000,   // 10 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('stage_order', { ascending: true });
      
      if (error) throw error;
      return data as PipelineStage[];
    },
  });
};

export const useUpdatePipelineStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PipelineStage> }) => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline-stages'] });
      toast({
        title: "Success",
        description: "Pipeline stage updated successfully",
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

export const useReorderPipelineStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      // Get current stage and all stages
      const { data: stages, error: fetchError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('stage_order', { ascending: true });
      
      if (fetchError) throw fetchError;
      if (!stages) throw new Error("No stages found");

      const currentStage = stages.find(s => s.id === id);
      if (!currentStage) throw new Error("Stage not found");

      const currentIndex = stages.findIndex(s => s.id === id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= stages.length) {
        throw new Error("Cannot move stage beyond boundaries");
      }

      const targetStage = stages[targetIndex];

      // Swap the stage_order values
      const updates = [
        supabase
          .from('pipeline_stages')
          .update({ stage_order: targetStage.stage_order })
          .eq('id', currentStage.id),
        supabase
          .from('pipeline_stages')
          .update({ stage_order: currentStage.stage_order })
          .eq('id', targetStage.id),
      ];

      const results = await Promise.all(updates);
      
      const error = results.find(r => r.error);
      if (error?.error) throw error.error;

      return { currentStage, targetStage };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline-stages'] });
      toast({
        title: "Success",
        description: "Stage order updated successfully",
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

export const useToggleStageActive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline-stages'] });
      toast({
        title: "Success",
        description: `Stage ${data.is_active ? 'activated' : 'deactivated'} successfully`,
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
