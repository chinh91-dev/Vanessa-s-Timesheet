import { useRealtimeSubscription } from "./useRealtimeSubscription";

/**
 * Hook to subscribe to real-time incident comment updates.
 * Filters by incident ID for efficient updates.
 */
export function useIncidentCommentRealtime(incidentId?: string) {
  useRealtimeSubscription({
    table: 'incident_comments',
    filter: incidentId ? `incident_id=eq.${incidentId}` : undefined,
    queryKeys: [
      incidentId ? ['incident-comments', incidentId] : 'incident-comments',
      incidentId ? ['customer-incident-comments', incidentId] : 'customer-incident-comments',
      incidentId ? ['incident-history', incidentId] : 'incident-history',
    ],
    channelName: incidentId ? `incident-comments-${incidentId}` : 'incident-comments-all',
    enabled: !!incidentId,
  });
}
