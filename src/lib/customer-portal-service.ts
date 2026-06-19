import { supabase } from '@/integrations/supabase/client';

export interface SLAMetrics {
  performance: number;
  resolutionRate: number;
  breachCount: number;
  eligibleCredits: number;
}

export interface ServiceCredit {
  id: string;
  credit_amount: number;
  credit_type: string;
  breach_type?: string;
  status: string;
  incident_id?: string;
  created_at: string;
}

export interface CustomerSLAAgreement {
  id: string;
  incident_project_id: string;
  priority_id: string;
  response_sla_minutes: number;
  resolution_sla_minutes: number;
  service_credit_rate: number;
  monthly_service_fee: number;
  effective_from: string;
  effective_until?: string;
}

class CustomerPortalService {
  async getSLAMetrics(customerId: string): Promise<SLAMetrics> {
    try {
      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Fetch incidents for the customer in current month
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select(`
          *,
          incident_project:incident_projects!inner(customer_id),
          priority:incident_priorities(*)
        `)
        .eq('incident_project.customer_id', customerId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (error) throw error;

      // Calculate SLA metrics - using existing SLA calculation approach
      const totalIncidents = incidents?.length || 0;
      
      // For now, use mock data for SLA breaches calculation
      // This would be replaced with actual SLA calculation logic
      const breachedIncidents = Math.floor(totalIncidents * 0.06); // Mock 6% breach rate

      const performance = totalIncidents > 0 ? 
        ((totalIncidents - breachedIncidents) / totalIncidents) * 100 : 100;

      const resolvedIncidents = incidents?.filter(incident => 
        incident.status === 'Resolved' || incident.status === 'Closed'
      ).length || 0;

      const resolutionRate = totalIncidents > 0 ? 
        (resolvedIncidents / totalIncidents) * 100 : 100;

      // Calculate eligible credits
      const { data: credits } = await supabase
        .from('service_credits')
        .select('credit_amount')
        .eq('customer_id', customerId)
        .eq('status', 'pending');

      const eligibleCredits = credits?.reduce((sum, credit) => 
        sum + Number(credit.credit_amount), 0) || 0;

      return {
        performance,
        resolutionRate,
        breachCount: breachedIncidents,
        eligibleCredits
      };
    } catch (error) {
      console.error('Error fetching SLA metrics:', error);
      throw error;
    }
  }

  async getServiceCredits(customerId: string): Promise<ServiceCredit[]> {
    try {
      const { data, error } = await supabase
        .from('service_credits')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching service credits:', error);
      throw error;
    }
  }

  async getSLAAgreements(customerId: string): Promise<CustomerSLAAgreement[]> {
    try {
      const { data, error } = await supabase
        .from('customer_sla_agreements')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching SLA agreements:', error);
      throw error;
    }
  }

  async calculateSLACredit(
    customerId: string, 
    incidentId: string, 
    breachType: 'response_sla' | 'resolution_sla'
  ): Promise<number> {
    try {
      // Get incident details
      const { data: incident } = await supabase
        .from('incidents')
        .select(`
          *,
          incident_project:incident_projects!inner(customer_id),
          priority:incident_priorities(*)
        `)
        .eq('id', incidentId)
        .eq('incident_project.customer_id', customerId)
        .single();

      if (!incident) return 0;

      // Get SLA agreement for this customer/project/priority
      const { data: agreement } = await supabase
        .from('customer_sla_agreements')
        .select('*')
        .eq('customer_id', customerId)
        .eq('incident_project_id', incident.incident_project_id)
        .eq('priority_id', incident.priority_id)
        .eq('is_active', true)
        .single();

      if (!agreement) return 0;

      // Calculate credit based on breach type and service fee
      const creditRate = agreement.service_credit_rate;
      const monthlyFee = agreement.monthly_service_fee;
      
      return monthlyFee * creditRate;
    } catch (error) {
      console.error('Error calculating SLA credit:', error);
      return 0;
    }
  }
}

export const customerPortalService = new CustomerPortalService();