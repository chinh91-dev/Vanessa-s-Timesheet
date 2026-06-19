import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalRequestType } from "./usePortalRequestTypes";

export function usePortalGroupRequestTypes(groupId: string | null) {
  return useQuery({
    queryKey: ["portal-group-request-types", groupId],
    queryFn: async () => {
      if (!groupId) return [];

      // Get request type IDs for this group with sort order
      const { data: assignments, error: assignError } = await supabase
        .from("portal_group_request_types")
        .select("request_type_id, sort_order")
        .eq("portal_group_id", groupId)
        .order("sort_order");

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const requestTypeIds = assignments.map((a) => a.request_type_id);

      // Get the actual request types
      const { data: requestTypes, error } = await supabase
        .from("portal_request_types")
        .select("*")
        .in("id", requestTypeIds)
        .eq("is_active", true);

      if (error) throw error;

      // Sort by the sort_order from portal_group_request_types
      const sortOrderMap = new Map(
        assignments.map((a) => [a.request_type_id, a.sort_order])
      );

      return (requestTypes as any[])
        .map((rt) => ({
          ...rt,
          form_schema: rt.form_schema || { fields: [] },
        }))
        .sort(
          (a, b) =>
            (sortOrderMap.get(a.id) || 0) - (sortOrderMap.get(b.id) || 0)
        ) as PortalRequestType[];
    },
    enabled: !!groupId,
  });
}
