import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to subscribe to real-time contact category updates.
 * Listens to both contact_categories and contact_category_assignments tables.
 * Automatically invalidates React Query cache when changes occur.
 */
export function useContactCategoryRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('crm-contact-categories-realtime')
      // Listen to contact_categories table
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_categories',
        },
        (payload) => {
          console.log('[Realtime] Contact category change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['crm', 'contact-categories'] });
        }
      )
      // Listen to contact_category_assignments table
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_category_assignments',
        },
        (payload) => {
          console.log('[Realtime] Category assignment change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['crm', 'contact-category-assignments'] });
          queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Contact categories subscription:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up contact categories subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
