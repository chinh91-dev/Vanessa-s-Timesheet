import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import type { ProspectNote, CreateProspectNoteDTO } from "@/lib/crm/types";

export type { ProspectNote, CreateProspectNoteDTO };

const PROSPECT_NOTES_KEY = "prospect-notes";

export function useProspectNotes(prospectId: string | undefined) {
  return useQuery({
    queryKey: [PROSPECT_NOTES_KEY, prospectId],
    queryFn: async () => {
      if (!prospectId) return [];

      const { data, error } = await supabase
        .from("prospect_notes")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProspectNote[];
    },
    enabled: !!prospectId,
  });
}

export function useCreateProspectNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateProspectNoteDTO) => {
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
        .from("prospect_notes")
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;
      return note as ProspectNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PROSPECT_NOTES_KEY, variables.prospect_id],
      });
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
