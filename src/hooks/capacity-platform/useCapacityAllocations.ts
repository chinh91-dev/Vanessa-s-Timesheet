// ============================================================================
// useCapacityAllocations — capacity_allocations CRUD hooks
// ----------------------------------------------------------------------------
// Mutations invalidate:
//   - capacityKeys.allocations.all  (every list / detail query)
//   - capacityKeys.live(*) and capacityKeys.kpis(*) — allocation totals
//     feed get_capacity_live, so any mutation must refresh those views.
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  createCapacityAllocation,
  deleteCapacityAllocation,
  getCapacityAllocation,
  listCapacityAllocations,
  updateCapacityAllocation,
  type ListAllocationsFilter,
} from "@/lib/capacity-platform/allocations";
import type {
  CapacityAllocationInsert,
  CapacityAllocationRow,
  CapacityAllocationUpdate,
} from "@/lib/capacity-platform/types";
import { capacityKeys } from "./queryKeys";

const invalidateLiveAndKpis = (
  qc: ReturnType<typeof useQueryClient>
): void => {
  // Prefix invalidation: any ['capacity', 'live', ...] or ['capacity', 'kpis', ...]
  qc.invalidateQueries({ queryKey: ["capacity", "live"] });
  qc.invalidateQueries({ queryKey: ["capacity", "kpis"] });
};

export const useCapacityAllocations = (
  filter: ListAllocationsFilter = {},
  staleTime = 60_000
) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: capacityKeys.allocations.list(filter),
    queryFn: () => listCapacityAllocations(filter),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};

export const useCapacityAllocation = (id: string | undefined) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: id
      ? capacityKeys.allocations.detail(id)
      : ["capacity", "allocations", "detail", "noop"],
    queryFn: () => (id ? getCapacityAllocation(id) : Promise.resolve(null)),
    enabled: !!session?.user?.id && !!id,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateCapacityAllocation = () => {
  const qc = useQueryClient();
  return useMutation<CapacityAllocationRow, Error, CapacityAllocationInsert>({
    mutationFn: createCapacityAllocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.allocations.all });
      invalidateLiveAndKpis(qc);
    },
  });
};

export const useUpdateCapacityAllocation = () => {
  const qc = useQueryClient();
  return useMutation<
    CapacityAllocationRow,
    Error,
    { id: string; patch: CapacityAllocationUpdate }
  >({
    mutationFn: ({ id, patch }) => updateCapacityAllocation(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.allocations.all });
      invalidateLiveAndKpis(qc);
    },
  });
};

export const useDeleteCapacityAllocation = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteCapacityAllocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.allocations.all });
      invalidateLiveAndKpis(qc);
    },
  });
};
