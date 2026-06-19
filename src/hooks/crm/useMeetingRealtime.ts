import { useRealtimeSubscription } from "../useRealtimeSubscription";

/**
 * Hook to subscribe to real-time meeting updates.
 * Automatically invalidates React Query cache when meetings change.
 */
export function useMeetingRealtime() {
  useRealtimeSubscription({
    table: 'crm_meetings',
    queryKeys: [
      ['crm-meetings'],
      ['crm-meeting-notes'],
      ['upcoming-meetings'],
    ],
    channelName: 'crm-meetings-realtime',
  });
}
