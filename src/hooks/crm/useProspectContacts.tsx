import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useLinkContactToProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      prospectId,
      contactId,
      isPrimary = false,
      roleLabel,
    }: {
      prospectId: string;
      contactId: string;
      isPrimary?: boolean;
      roleLabel?: string;
    }) => {
      // If setting as primary, clear existing primary first
      if (isPrimary) {
        await supabase
          .from("prospect_contacts")
          .update({ is_primary: false })
          .eq("prospect_id", prospectId);
      }

      const { data, error } = await supabase
        .from("prospect_contacts")
        .insert({ prospect_id: prospectId, contact_id: contactId, is_primary: isPrimary, role_label: roleLabel })
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects", variables.prospectId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });
      toast({ title: "Contact linked" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to link contact", description: error.message, variant: "destructive" });
    },
  });
};

export const useUnlinkContactFromProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectContactId, prospectId }: { prospectContactId: string; prospectId: string }) => {
      const { error } = await supabase
        .from("prospect_contacts")
        .delete()
        .eq("id", prospectContactId);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects", data.prospectId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });
      toast({ title: "Contact removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove contact", description: error.message, variant: "destructive" });
    },
  });
};

export const useSetPrimaryContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, prospectContactId }: { prospectId: string; prospectContactId: string }) => {
      // Clear all primary flags for this prospect
      await supabase
        .from("prospect_contacts")
        .update({ is_primary: false })
        .eq("prospect_id", prospectId);

      // Set new primary
      const { error } = await supabase
        .from("prospect_contacts")
        .update({ is_primary: true })
        .eq("id", prospectContactId);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects", data.prospectId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to set primary contact", description: error.message, variant: "destructive" });
    },
  });
};
