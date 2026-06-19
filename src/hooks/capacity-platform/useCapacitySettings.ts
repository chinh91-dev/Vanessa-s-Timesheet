// ============================================================================
// useCapacitySettings — capacity_settings hooks
// ----------------------------------------------------------------------------
// Mutations to RAG thresholds or fte_hours_per_week change downstream
// capacity numbers, so a write invalidates live + kpis as well as settings.
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  getCapacitySetting,
  listCapacitySettings,
  setCapacitySetting,
  type SettingKey,
} from "@/lib/capacity-platform/settings";
import type { CapacitySettingRow } from "@/lib/capacity-platform/types";
import { capacityKeys } from "./queryKeys";

export const useCapacitySettings = (staleTime = 5 * 60_000) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: capacityKeys.settings.all,
    queryFn: listCapacitySettings,
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};

export const useCapacitySetting = <T = unknown>(
  key: SettingKey | undefined,
  staleTime = 5 * 60_000
) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: key
      ? capacityKeys.settings.detail(key)
      : ["capacity", "settings", "detail", "noop"],
    queryFn: () =>
      key ? getCapacitySetting<T>(key) : Promise.resolve(null as T | null),
    enabled: !!session?.user?.id && !!key,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};

export const useSetCapacitySetting = () => {
  const qc = useQueryClient();
  return useMutation<
    CapacitySettingRow,
    Error,
    { key: SettingKey; value: unknown; description?: string }
  >({
    mutationFn: ({ key, value, description }) =>
      setCapacitySetting(key, value, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.settings.all });
      // RAG / FTE settings feed get_capacity_live + get_dashboard_kpis.
      qc.invalidateQueries({ queryKey: ["capacity", "live"] });
      qc.invalidateQueries({ queryKey: ["capacity", "kpis"] });
      qc.invalidateQueries({ queryKey: ["capacity", "fte-loss"] });
    },
  });
};
