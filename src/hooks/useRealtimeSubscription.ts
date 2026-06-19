import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseRealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  queryKeys: (string | string[])[];
  channelName?: string;
  enabled?: boolean;
}

/**
 * Generic hook for subscribing to real-time database changes.
 * Automatically invalidates specified React Query keys when changes occur.
 *
 * Stability notes (fix for re-subscription churn):
 *  - The channel name is generated once per mount (when not supplied
 *    explicitly). Previously each render produced a new Math.random()
 *    suffix, which combined with `JSON.stringify(queryKeys)` in the
 *    dependency array would tear down and re-create the websocket
 *    subscription on every render of any consumer that passed an inline
 *    array literal.
 *  - The latest queryKeys are read through a ref inside the change
 *    handler so callers can pass inline arrays without forcing a
 *    re-subscribe on every render.
 */
export function useRealtimeSubscription({
  table,
  filter,
  queryKeys,
  channelName,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();

  // Keep latest queryKeys in a ref so we don't include them in deps.
  const queryKeysRef = useRef(queryKeys);
  queryKeysRef.current = queryKeys;

  // Stable channel name across renders unless caller supplies one.
  const fallbackChannelRef = useRef<string | null>(null);
  if (fallbackChannelRef.current === null) {
    fallbackChannelRef.current = `realtime-${table}-${Math.random().toString(36).slice(2)}`;
  }

  useEffect(() => {
    if (!enabled) return;

    const channel = channelName || fallbackChannelRef.current!;

    const subscription = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          console.log(`[Realtime] ${table} change detected:`, payload.eventType);

          // Invalidate all specified query keys (read latest from ref).
          queryKeysRef.current.forEach((key) => {
            const queryKey = Array.isArray(key) ? key : [key];
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
      });

    return () => {
      console.log(`[Realtime] Cleaning up ${table} subscription`);
      supabase.removeChannel(subscription);
    };
    // queryKeys intentionally excluded — handled via ref to avoid churn.
  }, [queryClient, table, filter, enabled, channelName]);
}
