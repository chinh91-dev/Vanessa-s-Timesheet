import { useRealtimeSubscription } from "../useRealtimeSubscription";

/**
 * Hook to subscribe to real-time contact updates.
 * Automatically invalidates React Query cache when contacts change.
 */
export function useContactRealtime() {
  useRealtimeSubscription({
    table: 'contacts',
    queryKeys: [
      ['crm', 'contacts'],
      ['crm', 'contact-deal-counts'],
    ],
    channelName: 'crm-contacts-realtime',
  });
}
