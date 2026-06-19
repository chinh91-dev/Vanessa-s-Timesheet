import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostCalculatorTier {
  id: string;
  tier_key: string;
  label: string;
  sub_label: string | null;
  rate_per_user: number;
  min_monthly: number;
  devices_per_user: number;
  margin: number;
  security_included: boolean;
  recommended_min_users: number | null;
  sort_order: number;
  is_active: boolean;
  features: CostCalculatorTierFeature[];
}

export interface CostCalculatorTierFeature {
  id: string;
  tier_id: string;
  feature: string;
  sort_order: number;
}

export interface CostCalculatorCompanySize {
  id: string;
  label: string;
  sub_label: string | null;
  default_users: number;
  sort_order: number;
  is_active: boolean;
}

export interface CostCalculatorInhouseConfig {
  id: string;
  tier_id: string;
  service_desk_per_users: number;
  sys_admin_per_users: number | null;
  manager_per_users: number;
}

export interface CostCalculatorSalary {
  id: string;
  role_key: string;
  role_name: string;
  annual_salary: number;
  sort_order: number;
}

export interface CostCalculatorSettings {
  [key: string]: string;
}

// Fetch tiers with features
export function useCostCalculatorTiers() {
  return useQuery({
    queryKey: ['cost-calculator-tiers'],
    queryFn: async () => {
      const { data: tiers, error: tiersError } = await supabase
        .from('cost_calculator_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (tiersError) throw tiersError;
      
      const { data: features, error: featuresError } = await supabase
        .from('cost_calculator_tier_features')
        .select('*')
        .order('sort_order');
      
      if (featuresError) throw featuresError;
      
      // Combine tiers with their features
      return (tiers || []).map(tier => ({
        ...tier,
        features: (features || []).filter(f => f.tier_id === tier.id)
      })) as CostCalculatorTier[];
    }
  });
}

// Fetch company sizes
export function useCostCalculatorCompanySizes() {
  return useQuery({
    queryKey: ['cost-calculator-company-sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_company_sizes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as CostCalculatorCompanySize[];
    }
  });
}

// Fetch in-house config
export function useCostCalculatorInhouseConfig() {
  return useQuery({
    queryKey: ['cost-calculator-inhouse-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_inhouse_config')
        .select('*');
      
      if (error) throw error;
      return data as CostCalculatorInhouseConfig[];
    }
  });
}

// Fetch salaries
export function useCostCalculatorSalaries() {
  return useQuery({
    queryKey: ['cost-calculator-salaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_salaries')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as CostCalculatorSalary[];
    }
  });
}

// Fetch settings as key-value object
export function useCostCalculatorSettings() {
  return useQuery({
    queryKey: ['cost-calculator-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_settings')
        .select('*');
      
      if (error) throw error;
      
      // Convert array to object
      const settings: CostCalculatorSettings = {};
      (data || []).forEach(item => {
        settings[item.key] = item.value;
      });
      return settings;
    }
  });
}
