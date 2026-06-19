import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAssetRealtimeOptions {
  groupId?: string;
}

/**
 * Hook to subscribe to real-time asset and asset group updates.
 * Optionally filter by group ID for group-specific pages.
 */
export function useAssetRealtime(options?: UseAssetRealtimeOptions) {
  const queryClient = useQueryClient();
  const { groupId } = options || {};

  useEffect(() => {
    const channelName = groupId 
      ? `asset-realtime-${groupId}` 
      : 'asset-realtime-all';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assets',
          ...(groupId && { filter: `group_id=eq.${groupId}` })
        },
        (payload) => {
          console.log('[Realtime] Asset change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['assets'] });
          queryClient.invalidateQueries({ queryKey: ['asset-groups'] });
          if (groupId) {
            queryClient.invalidateQueries({ queryKey: ['asset-group', groupId] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_groups',
        },
        (payload) => {
          console.log('[Realtime] Asset group change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['asset-groups'] });
          const groupIdFromPayload = (payload.new as any)?.id || (payload.old as any)?.id;
          if (groupIdFromPayload) {
            queryClient.invalidateQueries({ queryKey: ['asset-group', groupIdFromPayload] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Asset subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up asset subscription:', channelName);
      supabase.removeChannel(channel);
    };
  }, [queryClient, groupId]);
}
