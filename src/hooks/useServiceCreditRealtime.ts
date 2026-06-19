import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to subscribe to real-time service credit and SLA agreement updates.
 */
export function useServiceCreditRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('service-credit-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_credits',
        },
        (payload) => {
          console.log('[Realtime] Service credit change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['service-credits'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_sla_agreements',
        },
        (payload) => {
          console.log('[Realtime] SLA agreement change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['customer-sla-agreements'] });
          queryClient.invalidateQueries({ queryKey: ['sla-agreements'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Service credit subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up service credit subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
