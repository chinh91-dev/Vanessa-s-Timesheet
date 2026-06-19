import { useRealtimeSubscription } from "./useRealtimeSubscription";

/**
 * Hook to subscribe to real-time expense updates.
 * Automatically invalidates React Query cache when expenses change.
 */
export function useExpenseRealtime() {
  useRealtimeSubscription({
    table: 'expenses',
    queryKeys: [
      'expenses',
      'user-expenses',
      ['expenses'],
    ],
    channelName: 'expense-realtime',
  });
}
