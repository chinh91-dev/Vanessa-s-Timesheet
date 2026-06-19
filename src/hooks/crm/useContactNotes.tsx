import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export interface ContactNote {
  id: string;
  contact_id: string;
  note_content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface CreateContactNoteDTO {
  contact_id: string;
  note_content: string;
}

const CONTACT_NOTES_KEY = "contact-notes";

export function useContactNotes(contactId: string | undefined) {
  return useQuery({
    queryKey: [CONTACT_NOTES_KEY, contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContactNote[];
    },
    enabled: !!contactId,
  });
}

export function useCreateContactNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateContactNoteDTO) => {
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
        .from("contact_notes")
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;
      return note as ContactNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONTACT_NOTES_KEY, variables.contact_id],
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
