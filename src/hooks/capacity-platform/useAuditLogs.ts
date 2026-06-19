// ============================================================================
// useAuditLogs — capacity-scoped audit_logs reader
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  listCapacityAuditLogs,
  type CapacityAuditRow,
  type ListAuditLogsFilter,
} from "@/lib/capacity-platform/auditLogs";

export const useCapacityAuditLogs = (filter: ListAuditLogsFilter = {}) => {
  const { session } = useAuth();
  return useQuery<CapacityAuditRow[]>({
    queryKey: ["capacity", "audit-logs", filter] as const,
    queryFn: () => listCapacityAuditLogs(filter),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
  });
};
