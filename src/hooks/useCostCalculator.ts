import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SupportType {
  id: string;
  name: string;
  code: string;
  rate_per_person: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ComplexityFactor {
  id: string;
  name: string;
  multiplier: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch active support types (for calculator use)
export function useSupportTypes() {
  return useQuery({
    queryKey: ["cost-calculator-support-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_calculator_support_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as SupportType[];
    },
  });
}

// Fetch active complexity factors (for calculator use)
export function useComplexityFactors() {
  return useQuery({
    queryKey: ["cost-calculator-complexity-factors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_calculator_complexity_factors")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as ComplexityFactor[];
    },
  });
}

// Fetch all support types (for admin settings - includes inactive)
export function useAllSupportTypes() {
  return useQuery({
    queryKey: ["cost-calculator-support-types-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_calculator_support_types")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as SupportType[];
    },
  });
}

// Fetch all complexity factors (for admin settings - includes inactive)
export function useAllComplexityFactors() {
  return useQuery({
    queryKey: ["cost-calculator-complexity-factors-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_calculator_complexity_factors")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as ComplexityFactor[];
    },
  });
}

// Support Type Mutations
export function useSupportTypeMutations() {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["cost-calculator-support-types"] });
    queryClient.invalidateQueries({ queryKey: ["cost-calculator-support-types-all"] });
  };

  const createSupportType = useMutation({
    mutationFn: async (data: Omit<SupportType, "id" | "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("cost_calculator_support_types")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Support type created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create support type", description: error.message, variant: "destructive" });
    },
  });

  const updateSupportType = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SupportType> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("cost_calculator_support_types")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Support type updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update support type", description: error.message, variant: "destructive" });
    },
  });

  const deleteSupportType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cost_calculator_support_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Support type deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete support type", description: error.message, variant: "destructive" });
    },
  });

  return { createSupportType, updateSupportType, deleteSupportType };
}

// Complexity Factor Mutations
export function useComplexityFactorMutations() {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["cost-calculator-complexity-factors"] });
    queryClient.invalidateQueries({ queryKey: ["cost-calculator-complexity-factors-all"] });
  };

  const createComplexityFactor = useMutation({
    mutationFn: async (data: Omit<ComplexityFactor, "id" | "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("cost_calculator_complexity_factors")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Complexity factor created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create complexity factor", description: error.message, variant: "destructive" });
    },
  });

  const updateComplexityFactor = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ComplexityFactor> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("cost_calculator_complexity_factors")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Complexity factor updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update complexity factor", description: error.message, variant: "destructive" });
    },
  });

  const deleteComplexityFactor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cost_calculator_complexity_factors")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Complexity factor deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete complexity factor", description: error.message, variant: "destructive" });
    },
  });

  return { createComplexityFactor, updateComplexityFactor, deleteComplexityFactor };
}
