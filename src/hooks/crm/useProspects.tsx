import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import type { Prospect, CreateProspectDTO, UpdateProspectDTO } from "@/lib/crm/types";

const PROSPECT_SELECT = `
  *,
  account:account_id(id, name),
  owner:owner_id(id, full_name, email),
  creator:created_by(id, full_name, email),
  prospect_contacts(
    id, prospect_id, contact_id, is_primary, role_label, created_at,
    contact:contact_id(id, contact_name, company_name, email)
  )
`;

export const useProspects = () => {
  return useQuery({
    queryKey: ["crm", "prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select(PROSPECT_SELECT)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Prospect[];
    },
    staleTime: 30000,
    gcTime: 300000,
  });
};

export const useProspect = (id: string | undefined) => {
  return useQuery({
    queryKey: ["crm", "prospects", id],
    queryFn: async () => {
      if (!id) throw new Error("Prospect ID is required");

      const { data, error } = await supabase
        .from("prospects")
        .select(PROSPECT_SELECT)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Prospect;
    },
    enabled: !!id,
  });
};

export const useCreateProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospect: CreateProspectDTO) => {
      const { data, error } = await supabase
        .from("prospects")
        .insert(prospect)
        .select(PROSPECT_SELECT)
        .single();

      if (error) throw error;
      return data as Prospect;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });

      logCRMAuditEvent({
        action: "prospect_created",
        entityName: `Prospect: ${data.name}`,
        description: `Created new prospect: ${data.name}`,
        details: { prospect_id: data.id, stage: data.stage, account_id: data.account_id },
      });

      toast({ title: "Prospect created", description: data.name });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create prospect", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateProspectDTO }) => {
      const { data, error } = await supabase
        .from("prospects")
        .update(updates)
        .eq("id", id)
        .select(PROSPECT_SELECT)
        .single();

      if (error) throw error;
      return data as Prospect;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects", data.id] });

      logCRMAuditEvent({
        action: "prospect_updated",
        entityName: `Prospect: ${data.name}`,
        description: `Updated prospect: ${data.name}`,
        details: { prospect_id: data.id, stage: data.stage },
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update prospect", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("prospects")
        .delete()
        .eq("id", id)
        .select("id, name")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });

      logCRMAuditEvent({
        action: "prospect_deleted",
        entityName: `Prospect: ${data.name}`,
        description: `Deleted prospect: ${data.name}`,
        details: { prospect_id: data.id },
      });

      toast({ title: "Prospect deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete prospect", description: error.message, variant: "destructive" });
    },
  });
};
