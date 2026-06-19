// ============================================================================
// useWorkRequests — work_requests CRUD hooks (queue + kanban)
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  createWorkRequest,
  deleteWorkRequest,
  getWorkRequest,
  getWorkRequestByCode,
  listWorkRequests,
  transitionWorkRequestStatus,
  updateWorkRequest,
  type ListWorkRequestsFilter,
} from "@/lib/capacity-platform/workRequests";
import type {
  WorkRequestInsert,
  WorkRequestRow,
  WorkRequestStatus,
  WorkRequestUpdate,
} from "@/lib/capacity-platform/types";
import { capacityKeys } from "./queryKeys";

export const useWorkRequests = (
  filter: ListWorkRequestsFilter = {},
  staleTime = 30_000
) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: capacityKeys.workRequests.list(filter),
    queryFn: () => listWorkRequests(filter),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};

export const useWorkRequest = (id: string | undefined) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: id
      ? capacityKeys.workRequests.detail(id)
      : ["capacity", "work-requests", "detail", "noop"],
    queryFn: () => (id ? getWorkRequest(id) : Promise.resolve(null)),
    enabled: !!session?.user?.id && !!id,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useWorkRequestByCode = (code: string | undefined) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: code
      ? capacityKeys.workRequests.byCode(code)
      : ["capacity", "work-requests", "code", "noop"],
    queryFn: () => (code ? getWorkRequestByCode(code) : Promise.resolve(null)),
    enabled: !!session?.user?.id && !!code,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateWorkRequest = () => {
  const qc = useQueryClient();
  return useMutation<WorkRequestRow, Error, WorkRequestInsert>({
    mutationFn: createWorkRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.workRequests.all });
    },
  });
};

export const useUpdateWorkRequest = () => {
  const qc = useQueryClient();
  return useMutation<
    WorkRequestRow,
    Error,
    { id: string; patch: WorkRequestUpdate }
  >({
    mutationFn: ({ id, patch }) => updateWorkRequest(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.workRequests.all });
    },
  });
};

export const useTransitionWorkRequestStatus = () => {
  const qc = useQueryClient();
  return useMutation<
    WorkRequestRow,
    Error,
    {
      id: string;
      status: WorkRequestStatus;
      extra?: Omit<WorkRequestUpdate, "status">;
    }
  >({
    mutationFn: ({ id, status, extra }) =>
      transitionWorkRequestStatus(id, status, extra),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.workRequests.all });
    },
  });
};

export const useDeleteWorkRequest = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteWorkRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.workRequests.all });
    },
  });
};
