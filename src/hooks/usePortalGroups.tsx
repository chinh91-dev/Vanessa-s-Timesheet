import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortalGroup {
  id: string;
  customer_id: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
  };
  request_types?: string[];
}

export interface PortalGroupRequestType {
  id: string;
  portal_group_id: string;
  request_type_id: string;
  sort_order: number;
  created_at: string;
}

export function usePortalGroups(customerId?: string) {
  return useQuery({
    queryKey: ["portal-groups", customerId],
    queryFn: async () => {
      let query = supabase
        .from("portal_groups")
        .select(`
          *,
          customer:customers(id, name)
        `)
        .order("sort_order");

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get request type assignments for each group
      const groupIds = data?.map((g) => g.id) || [];
      if (groupIds.length > 0) {
        const { data: assignments, error: assignError } = await supabase
          .from("portal_group_request_types")
          .select("portal_group_id, request_type_id")
          .in("portal_group_id", groupIds);

        if (assignError) throw assignError;

        // Map assignments to groups
        const assignmentMap = new Map<string, string[]>();
        assignments?.forEach((a) => {
          const current = assignmentMap.get(a.portal_group_id) || [];
          assignmentMap.set(a.portal_group_id, [...current, a.request_type_id]);
        });

        return (data as any[]).map((g) => ({
          ...g,
          request_types: assignmentMap.get(g.id) || [],
        })) as PortalGroup[];
      }

      return (data as any[]).map((g) => ({
        ...g,
        request_types: [],
      })) as PortalGroup[];
    },
  });
}

export function useCreatePortalGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<PortalGroup, "id" | "created_at" | "updated_at" | "customer" | "request_types">
    ) => {
      const { data: result, error } = await supabase
        .from("portal_groups")
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-groups"] });
      toast.success("Portal group created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create portal group: " + error.message);
    },
  });
}

export function useUpdatePortalGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<PortalGroup> & { id: string }) => {
      const { customer, request_types, ...updateData } = data as any;
      const { data: result, error } = await supabase
        .from("portal_groups")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-groups"] });
      toast.success("Portal group updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update portal group: " + error.message);
    },
  });
}

export function useDeletePortalGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("portal_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-groups"] });
      toast.success("Portal group deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete portal group: " + error.message);
    },
  });
}

export function useUpdatePortalGroupRequestTypes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      requestTypeIds,
    }: {
      groupId: string;
      requestTypeIds: string[];
    }) => {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from("portal_group_request_types")
        .delete()
        .eq("portal_group_id", groupId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (requestTypeIds.length > 0) {
        const insertData = requestTypeIds.map((rtId, index) => ({
          portal_group_id: groupId,
          request_type_id: rtId,
          sort_order: index,
        }));

        const { error: insertError } = await supabase
          .from("portal_group_request_types")
          .insert(insertData);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-groups"] });
      queryClient.invalidateQueries({ queryKey: ["portal-request-types"] });
      toast.success("Request types updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update request types: " + error.message);
    },
  });
}
