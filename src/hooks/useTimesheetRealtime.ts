import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface UseTimesheetRealtimeOptions {
  userId?: string;
}

/**
 * Hook to subscribe to real-time timesheet entry updates.
 * Optionally filter by user ID for user-specific updates.
 */
export function useTimesheetRealtime(options?: UseTimesheetRealtimeOptions) {
  const { userId } = options || {};

  useRealtimeSubscription({
    table: 'timesheet_entries',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    queryKeys: [
      'timesheet-entries',
      'weekly-schedule',
      'simple-weekly-schedule',
      ['timesheet-entries'],
    ],
    channelName: userId ? `timesheet-realtime-${userId}` : 'timesheet-realtime-all',
  });
}
