import { useRealtimeSubscription } from "../useRealtimeSubscription";

/**
 * Hook to subscribe to real-time account updates.
 * Automatically invalidates React Query cache when accounts change.
 */
export function useAccountRealtime() {
  useRealtimeSubscription({
    table: 'accounts',
    queryKeys: [
      ['crm', 'accounts'],
      ['accounts-for-meeting'],
    ],
    channelName: 'crm-accounts-realtime',
  });
}
