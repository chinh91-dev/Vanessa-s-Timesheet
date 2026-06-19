import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseIncidentRealtimeOptions {
  projectId?: string;
}

/**
 * Hook to subscribe to real-time incident updates.
 * Automatically invalidates relevant React Query cache when incidents change.
 */
export function useIncidentRealtime(options?: UseIncidentRealtimeOptions) {
  const queryClient = useQueryClient();
  const { projectId } = options || {};

  useEffect(() => {
    const channelName = projectId 
      ? `incident-realtime-${projectId}` 
      : 'incident-realtime-all';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
          ...(projectId && { filter: `incident_project_id=eq.${projectId}` })
        },
        (payload) => {
          console.log('[Realtime] Incident change detected:', payload.eventType);
          
          // Invalidate all incident-related queries
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
          queryClient.invalidateQueries({ queryKey: ['my-assigned-incidents'] });
          queryClient.invalidateQueries({ queryKey: ['customer-incidents'] });
          
          // Invalidate specific incident if we have the ID
          const incidentId = (payload.new as any)?.id || (payload.old as any)?.id;
          if (incidentId) {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['customer-incident', incidentId] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up subscription:', channelName);
      supabase.removeChannel(channel);
    };
  }, [queryClient, projectId]);
}
