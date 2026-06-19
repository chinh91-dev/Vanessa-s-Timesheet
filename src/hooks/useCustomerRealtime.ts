import { useRealtimeSubscription } from "./useRealtimeSubscription";

/**
 * Hook to subscribe to real-time customer updates.
 * Automatically invalidates React Query cache when customers change.
 */
export function useCustomerRealtime() {
  useRealtimeSubscription({
    table: 'customers',
    queryKeys: [
      'customers',
      ['customers'],
    ],
    channelName: 'customer-realtime',
  });
}
