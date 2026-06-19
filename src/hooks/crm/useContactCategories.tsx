import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ContactCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ContactCategoryAssignment {
  id: string;
  contact_id: string;
  category_id: string;
  created_at: string;
  created_by?: string;
  category?: ContactCategory;
}

// Fetch all active categories
export const useContactCategories = () => {
  return useQuery({
    queryKey: ['crm', 'contact-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ContactCategory[];
    },
  });
};

// Fetch all categories (including inactive) for management
export const useAllContactCategories = () => {
  return useQuery({
    queryKey: ['crm', 'contact-categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ContactCategory[];
    },
  });
};

// Create new category
export const useCreateContactCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: { name: string; description?: string; color?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from('contact_categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      
      const { data, error } = await supabase
        .from('contact_categories')
        .insert({
          ...category,
          sort_order: (maxOrder?.sort_order || 0) + 1,
          created_by: user?.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ContactCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact-categories'] });
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
export const useUpdateContactCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContactCategory> }) => {
      const { data, error } = await supabase
        .from('contact_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ContactCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact-categories'] });
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
export const useDeleteContactCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact-categories'] });
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

// Fetch category assignments for a contact
export const useContactCategoryAssignments = (contactId: string | undefined) => {
  return useQuery({
    queryKey: ['crm', 'contact-category-assignments', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_category_assignments')
        .select(`
          *,
          category:category_id(*)
        `)
        .eq('contact_id', contactId);
      
      if (error) throw error;
      return data as ContactCategoryAssignment[];
    },
    enabled: !!contactId,
  });
};

// Assign category to contact
export const useAssignContactCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ contactId, categoryId }: { contactId: string; categoryId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contact_category_assignments')
        .insert({
          contact_id: contactId,
          category_id: categoryId,
          created_by: user?.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact-category-assignments', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
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

// Remove category from contact
export const useRemoveContactCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ contactId, categoryId }: { contactId: string; categoryId: string }) => {
      const { error } = await supabase
        .from('contact_category_assignments')
        .delete()
        .eq('contact_id', contactId)
        .eq('category_id', categoryId);
      
      if (error) throw error;
      return { contactId, categoryId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact-category-assignments', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
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

// Bulk update contact categories
export const useUpdateContactCategories = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ contactId, categoryIds }: { contactId: string; categoryIds: string[] }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Delete existing assignments
      await supabase
        .from('contact_category_assignments')
        .delete()
        .eq('contact_id', contactId);
      
      // Insert new assignments
      if (categoryIds.length > 0) {
        const { error } = await supabase
          .from('contact_category_assignments')
          .insert(
            categoryIds.map(categoryId => ({
              contact_id: contactId,
              category_id: categoryId,
              created_by: user?.user?.id,
            }))
          );
        
        if (error) throw error;
      }
      
      return { contactId, categoryIds };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact-category-assignments', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
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
