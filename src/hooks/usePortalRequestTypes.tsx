import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortalRequestType {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  form_schema: {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
    }>;
  };
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  group_count?: number;
}

export function usePortalRequestTypes() {
  return useQuery({
    queryKey: ["portal-request-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_request_types")
        .select("*")
        .order("category")
        .order("sort_order");

      if (error) throw error;

      // Get group counts for each request type
      const { data: groupCounts, error: countError } = await supabase
        .from("portal_group_request_types")
        .select("request_type_id");

      if (countError) throw countError;

      // Count groups per request type
      const countMap = new Map<string, number>();
      groupCounts?.forEach((item) => {
        const current = countMap.get(item.request_type_id) || 0;
        countMap.set(item.request_type_id, current + 1);
      });

      return (data as any[]).map((rt) => ({
        ...rt,
        form_schema: rt.form_schema || { fields: [] },
        group_count: countMap.get(rt.id) || 0,
      })) as PortalRequestType[];
    },
  });
}

export function useCreatePortalRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<PortalRequestType, "id" | "created_at" | "updated_at" | "group_count">
    ) => {
      const { data: result, error } = await supabase
        .from("portal_request_types")
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-request-types"] });
      toast.success("Request type created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create request type: " + error.message);
    },
  });
}

export function useUpdatePortalRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<PortalRequestType> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("portal_request_types")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-request-types"] });
      toast.success("Request type updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update request type: " + error.message);
    },
  });
}

export function useDeletePortalRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("portal_request_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-request-types"] });
      toast.success("Request type deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete request type: " + error.message);
    },
  });
}
