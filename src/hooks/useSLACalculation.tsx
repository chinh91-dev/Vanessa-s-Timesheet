import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SLAData {
  response_sla_minutes: number;
  resolution_sla_minutes: number;
  response_time_remaining: number;
  resolution_time_remaining: number;
  response_sla_breached: boolean;
  resolution_sla_breached: boolean;
  business_hours_id?: string;
  source?: 'project_sla' | 'priority_sla' | 'none';
}

/**
 * Calculate SLA for an incident.
 *
 * Resolution order:
 *  1. DB function `calculate_incident_sla_metrics` — uses project-level SLA overrides
 *     if they exist.
 *  2. Fallback: priority-level `response_sla_minutes` / `resolution_sla_minutes` from
 *     `incident_priorities`, calculated client-side against `created_at`.
 */
export function useSLACalculation(incidentId: string) {
  const [slaData, setSlaData] = useState<SLAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const calculateSLA = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Try the DB function first (uses project SLA if configured)
        const { data, error: dbError } = await supabase
          .rpc('calculate_incident_sla_metrics', {
            p_incident_id: incidentId,
          });

        if (dbError) {
          console.warn('[SLA] DB function error, falling back to priority SLA:', dbError.message);
        }

        if (!dbError && data && data.length > 0 && data[0].response_sla_minutes > 0) {
          if (mounted) {
            setSlaData({ ...data[0], source: 'project_sla' });
          }
          return;
        }

        // 2. Fallback: use priority SLA values directly
        const { data: incident, error: incidentError } = await supabase
          .from('incidents')
          .select(`
            id,
            created_at,
            first_response_at,
            resolved_at,
            priority:incident_priorities(
              response_sla_minutes,
              resolution_sla_minutes
            )
          `)
          .eq('id', incidentId)
          .maybeSingle();

        if (incidentError || !incident) {
          if (mounted) setLoading(false);
          return;
        }

        const priority = incident.priority as any;
        const responseSla: number = priority?.response_sla_minutes || 0;
        const resolutionSla: number = priority?.resolution_sla_minutes || 0;

        if (responseSla === 0 && resolutionSla === 0) {
          // No SLA defined at all
          if (mounted) setSlaData(null);
          setLoading(false);
          return;
        }

        const createdAt = new Date(incident.created_at).getTime();
        const now = Date.now();
        const elapsedMinutes = Math.floor((now - createdAt) / 60000);

        const responseRemaining = incident.first_response_at
          ? responseSla  // already responded
          : responseSla - elapsedMinutes;

        const resolutionRemaining = incident.resolved_at
          ? resolutionSla
          : resolutionSla - elapsedMinutes;

        if (mounted) {
          setSlaData({
            response_sla_minutes: responseSla,
            resolution_sla_minutes: resolutionSla,
            response_time_remaining: responseRemaining,
            resolution_time_remaining: resolutionRemaining,
            response_sla_breached: !incident.first_response_at && elapsedMinutes > responseSla,
            resolution_sla_breached: !incident.resolved_at && elapsedMinutes > resolutionSla,
            source: 'priority_sla',
          });
        }
      } catch (err) {
        console.error('[SLA] Error calculating SLA:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (incidentId) {
      calculateSLA();

      // Refresh every 30 seconds for real-time countdown
      const interval = setInterval(calculateSLA, 30000);

      return () => {
        mounted = false;
        clearInterval(interval);
      };
    } else {
      setLoading(false);
    }
  }, [incidentId]);

  return { slaData, loading, error };
}
