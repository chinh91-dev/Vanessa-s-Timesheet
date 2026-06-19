import { useRealtimeSubscription } from "./useRealtimeSubscription";

/**
 * Hook to subscribe to real-time project updates.
 * Automatically invalidates React Query cache when projects change.
 */
export function useProjectRealtime() {
  useRealtimeSubscription({
    table: 'projects',
    queryKeys: [
      'projects',
      ['projects'],
    ],
    channelName: 'project-realtime',
  });
}
