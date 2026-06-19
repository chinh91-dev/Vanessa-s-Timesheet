import { useRealtimeSubscription } from "../useRealtimeSubscription";

export function useProspectRealtime() {
  useRealtimeSubscription({
    table: 'prospects',
    queryKeys: [
      ['crm', 'prospects'],
    ],
    channelName: 'crm-prospects-realtime',
  });

  useRealtimeSubscription({
    table: 'prospect_notes',
    queryKeys: [
      ['prospect-notes'],
    ],
    channelName: 'crm-prospect-notes-realtime',
  });
}
