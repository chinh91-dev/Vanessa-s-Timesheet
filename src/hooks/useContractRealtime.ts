import { useRealtimeSubscription } from "./useRealtimeSubscription";

/**
 * Hook to subscribe to real-time contract updates.
 * Automatically invalidates React Query cache when contracts change.
 */
export function useContractRealtime() {
  useRealtimeSubscription({
    table: 'contracts',
    queryKeys: [
      'contracts',
      ['contracts'],
    ],
    channelName: 'contract-realtime',
  });
}
