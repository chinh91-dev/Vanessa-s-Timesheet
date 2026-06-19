import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ============= Types =============

export interface Tier {
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
  created_at: string | null;
  updated_at: string | null;
}

export interface TierFeature {
  id: string;
  tier_id: string;
  feature: string;
  sort_order: number;
  created_at: string | null;
}

export interface CompanySize {
  id: string;
  label: string;
  sub_label: string | null;
  default_users: number;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Salary {
  id: string;
  role_key: string;
  role_name: string;
  annual_salary: number;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface InhouseConfig {
  id: string;
  tier_id: string;
  service_desk_per_users: number;
  sys_admin_per_users: number | null;
  manager_per_users: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============= Tier Hooks =============

export function useAllTiers() {
  return useQuery({
    queryKey: ['cost-calculator-tiers-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_tiers')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as Tier[];
    }
  });
}

export function useTierMutations() {
  const queryClient = useQueryClient();

  const createTier = useMutation({
    mutationFn: async (tier: Omit<Tier, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cost_calculator_tiers')
        .insert(tier)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers-all'] });
      toast({ title: "Tier created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create tier", description: error.message, variant: "destructive" });
    }
  });

  const updateTier = useMutation({
    mutationFn: async ({ id, ...tier }: Partial<Tier> & { id: string }) => {
      const { data, error } = await supabase
        .from('cost_calculator_tiers')
        .update(tier)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers-all'] });
      toast({ title: "Tier updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update tier", description: error.message, variant: "destructive" });
    }
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_calculator_tiers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers-all'] });
      toast({ title: "Tier deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete tier", description: error.message, variant: "destructive" });
    }
  });

  return { createTier, updateTier, deleteTier };
}

// ============= Tier Feature Hooks =============

export function useAllTierFeatures() {
  return useQuery({
    queryKey: ['cost-calculator-tier-features-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_tier_features')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as TierFeature[];
    }
  });
}

export function useTierFeatureMutations() {
  const queryClient = useQueryClient();

  const createFeature = useMutation({
    mutationFn: async (feature: Omit<TierFeature, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('cost_calculator_tier_features')
        .insert(feature)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tier-features'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tier-features-all'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers'] });
      toast({ title: "Feature created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create feature", description: error.message, variant: "destructive" });
    }
  });

  const updateFeature = useMutation({
    mutationFn: async ({ id, ...feature }: Partial<TierFeature> & { id: string }) => {
      const { data, error } = await supabase
        .from('cost_calculator_tier_features')
        .update(feature)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tier-features'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tier-features-all'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers'] });
      toast({ title: "Feature updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update feature", description: error.message, variant: "destructive" });
    }
  });

  const deleteFeature = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_calculator_tier_features')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tier-features'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tier-features-all'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-tiers'] });
      toast({ title: "Feature deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete feature", description: error.message, variant: "destructive" });
    }
  });

  return { createFeature, updateFeature, deleteFeature };
}

// ============= Company Size Hooks =============

export function useAllCompanySizes() {
  return useQuery({
    queryKey: ['cost-calculator-company-sizes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_company_sizes')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as CompanySize[];
    }
  });
}

export function useCompanySizeMutations() {
  const queryClient = useQueryClient();

  const createCompanySize = useMutation({
    mutationFn: async (size: Omit<CompanySize, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cost_calculator_company_sizes')
        .insert(size)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-company-sizes'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-company-sizes-all'] });
      toast({ title: "Company size created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create company size", description: error.message, variant: "destructive" });
    }
  });

  const updateCompanySize = useMutation({
    mutationFn: async ({ id, ...size }: Partial<CompanySize> & { id: string }) => {
      const { data, error } = await supabase
        .from('cost_calculator_company_sizes')
        .update(size)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-company-sizes'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-company-sizes-all'] });
      toast({ title: "Company size updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update company size", description: error.message, variant: "destructive" });
    }
  });

  const deleteCompanySize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_calculator_company_sizes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-company-sizes'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-company-sizes-all'] });
      toast({ title: "Company size deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete company size", description: error.message, variant: "destructive" });
    }
  });

  return { createCompanySize, updateCompanySize, deleteCompanySize };
}

// ============= Salary Hooks =============

export function useAllSalaries() {
  return useQuery({
    queryKey: ['cost-calculator-salaries-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_salaries')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as Salary[];
    }
  });
}

export function useSalaryMutations() {
  const queryClient = useQueryClient();

  const createSalary = useMutation({
    mutationFn: async (salary: Omit<Salary, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cost_calculator_salaries')
        .insert(salary)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-salaries'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-salaries-all'] });
      toast({ title: "Salary created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create salary", description: error.message, variant: "destructive" });
    }
  });

  const updateSalary = useMutation({
    mutationFn: async ({ id, ...salary }: Partial<Salary> & { id: string }) => {
      const { data, error } = await supabase
        .from('cost_calculator_salaries')
        .update(salary)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-salaries'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-salaries-all'] });
      toast({ title: "Salary updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update salary", description: error.message, variant: "destructive" });
    }
  });

  const deleteSalary = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_calculator_salaries')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-salaries'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-salaries-all'] });
      toast({ title: "Salary deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete salary", description: error.message, variant: "destructive" });
    }
  });

  return { createSalary, updateSalary, deleteSalary };
}

// ============= In-house Config Hooks =============

export function useAllInhouseConfig() {
  return useQuery({
    queryKey: ['cost-calculator-inhouse-config-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_inhouse_config')
        .select('*');
      
      if (error) throw error;
      return data as InhouseConfig[];
    }
  });
}

export function useInhouseConfigMutations() {
  const queryClient = useQueryClient();

  const createConfig = useMutation({
    mutationFn: async (config: Omit<InhouseConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cost_calculator_inhouse_config')
        .insert(config)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-inhouse-config'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-inhouse-config-all'] });
      toast({ title: "FTE config created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create FTE config", description: error.message, variant: "destructive" });
    }
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, ...config }: Partial<InhouseConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('cost_calculator_inhouse_config')
        .update(config)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-inhouse-config'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-inhouse-config-all'] });
      toast({ title: "FTE config updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update FTE config", description: error.message, variant: "destructive" });
    }
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_calculator_inhouse_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-inhouse-config'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-inhouse-config-all'] });
      toast({ title: "FTE config deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete FTE config", description: error.message, variant: "destructive" });
    }
  });

  return { createConfig, updateConfig, deleteConfig };
}

// ============= Settings Hooks =============

export function useAllSettings() {
  return useQuery({
    queryKey: ['cost-calculator-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_calculator_settings')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as Setting[];
    }
  });
}

export function useSettingsMutations() {
  const queryClient = useQueryClient();

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase
        .from('cost_calculator_settings')
        .update({ value })
        .eq('key', key)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-settings'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-settings-all'] });
      toast({ title: "Setting updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update setting", description: error.message, variant: "destructive" });
    }
  });

  const createSetting = useMutation({
    mutationFn: async (setting: Omit<Setting, 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cost_calculator_settings')
        .insert(setting)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-settings'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-settings-all'] });
      toast({ title: "Setting created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create setting", description: error.message, variant: "destructive" });
    }
  });

  const deleteSetting = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from('cost_calculator_settings')
        .delete()
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-settings'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator-settings-all'] });
      toast({ title: "Setting deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete setting", description: error.message, variant: "destructive" });
    }
  });

  return { updateSetting, createSetting, deleteSetting };
}
