import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export interface DealStageNote {
  id: string;
  deal_id: string;
  stage_id: string;
  stage_name: string;
  note_content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  lost_reason?: string;
  lost_reason_other?: string;
}

export interface CreateDealStageNoteDTO {
  deal_id: string;
  stage_id: string;
  stage_name: string;
  note_content: string;
  lost_reason?: string;
  lost_reason_other?: string;
}

const DEAL_STAGE_NOTES_KEY = "deal-stage-notes";

/**
 * Fetch all stage notes for a deal
 */
export function useDealStageNotes(dealId: string | undefined) {
  return useQuery({
    queryKey: [DEAL_STAGE_NOTES_KEY, dealId],
    queryFn: async () => {
      if (!dealId) return [];
      
      const { data, error } = await supabase
        .from("deal_stage_notes")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DealStageNote[];
    },
    enabled: !!dealId,
  });
}

/**
 * Create a new stage note
 */
export function useCreateDealStageNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDealStageNoteDTO) => {
      // Get current user's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id || "")
        .single();

      const noteData = {
        ...data,
        created_by: user?.id,
        created_by_name: profile?.full_name || "Unknown User",
      };

      const { data: note, error } = await supabase
        .from("deal_stage_notes")
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;
      return note as DealStageNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DEAL_STAGE_NOTES_KEY, variables.deal_id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add note",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Common lost reasons for Close Lost deals
 */
export const LOST_REASONS = [
  { value: "pricing", label: "Pricing too high" },
  { value: "timing", label: "Bad timing" },
  { value: "competitor", label: "Lost to competitor" },
  { value: "no_budget", label: "No budget" },
  { value: "no_decision", label: "No decision made" },
  { value: "requirements", label: "Requirements not met" },
  { value: "relationship", label: "Relationship issues" },
  { value: "other", label: "Other" },
] as const;

export type LostReason = typeof LOST_REASONS[number]["value"];
