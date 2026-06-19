// ============================================================================
// useQuarterlyForecast — quarterly_forecast hooks
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  deleteQuarterlyForecast,
  getQuarterlyForecastByMonth,
  listQuarterlyForecasts,
  updateQuarterlyForecast,
  upsertQuarterlyForecast,
  type ListForecastFilter,
} from "@/lib/capacity-platform/forecast";
import type {
  QuarterlyForecastInsert,
  QuarterlyForecastRow,
  QuarterlyForecastUpdate,
} from "@/lib/capacity-platform/types";
import { capacityKeys } from "./queryKeys";

export const useQuarterlyForecasts = (
  filter: ListForecastFilter = {},
  staleTime = 60_000
) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: capacityKeys.forecast.list(filter),
    queryFn: () => listQuarterlyForecasts(filter),
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime,
  });
};

export const useQuarterlyForecastByMonth = (month: string | undefined) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: month
      ? capacityKeys.forecast.byMonth(month)
      : ["capacity", "forecast", "month", "noop"],
    queryFn: () =>
      month ? getQuarterlyForecastByMonth(month) : Promise.resolve(null),
    enabled: !!session?.user?.id && !!month,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useUpsertQuarterlyForecast = () => {
  const qc = useQueryClient();
  return useMutation<QuarterlyForecastRow, Error, QuarterlyForecastInsert>({
    mutationFn: upsertQuarterlyForecast,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.forecast.all });
    },
  });
};

export const useUpdateQuarterlyForecast = () => {
  const qc = useQueryClient();
  return useMutation<
    QuarterlyForecastRow,
    Error,
    { id: string; patch: QuarterlyForecastUpdate }
  >({
    mutationFn: ({ id, patch }) => updateQuarterlyForecast(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.forecast.all });
    },
  });
};

export const useDeleteQuarterlyForecast = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteQuarterlyForecast,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: capacityKeys.forecast.all });
    },
  });
};
