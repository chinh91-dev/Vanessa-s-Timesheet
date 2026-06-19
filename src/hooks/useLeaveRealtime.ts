import { useRealtimeSubscription } from "./useRealtimeSubscription";

/**
 * Hook to subscribe to real-time leave application updates.
 * Automatically invalidates React Query cache when leave applications change.
 */
export function useLeaveRealtime() {
  useRealtimeSubscription({
    table: 'leave_applications',
    queryKeys: [
      'leave-applications',
      'pending-leaves',
      ['leave-applications'],
    ],
    channelName: 'leave-realtime',
  });
}
