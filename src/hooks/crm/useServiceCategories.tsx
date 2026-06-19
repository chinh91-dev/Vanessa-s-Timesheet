import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

// Fetch active categories only (for selection dropdowns)
export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['crm', 'service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ServiceCategory[];
    },
  });
};

// Fetch all categories (including inactive) for management
export const useAllServiceCategories = () => {
  return useQuery({
    queryKey: ['crm', 'service-categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ServiceCategory[];
    },
  });
};

// Create new category
export const useCreateServiceCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: { name: string; description?: string; color?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from('service_categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      
      const { data, error } = await supabase
        .from('service_categories')
        .insert({
          ...category,
          sort_order: (maxOrder?.sort_order || 0) + 1,
          created_by: user?.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ServiceCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'service-categories'] });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Update category
export const useUpdateServiceCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceCategory> }) => {
      const { data, error } = await supabase
        .from('service_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ServiceCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'service-categories'] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Delete category
export const useDeleteServiceCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'service-categories'] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
