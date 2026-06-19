import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import type { Account, CreateAccountDTO, UpdateAccountDTO } from "@/lib/crm/types";

export const useAccounts = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['crm', 'accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          parent_account:parent_account_id(id, name),
          converted_customer:converted_to_customer_id(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Account[];
    },
    enabled: options?.enabled !== false,
  });
};

export const useAccount = (id: string | undefined) => {
  return useQuery({
    queryKey: ['crm', 'accounts', id],
    queryFn: async () => {
      if (!id) throw new Error('Account ID is required');
      
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          parent_account:parent_account_id(id, name),
          converted_customer:converted_to_customer_id(id, name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Account;
    },
    enabled: !!id,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (account: CreateAccountDTO) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert(account)
        .select()
        .single();
      
      if (error) throw error;
      return data as Account;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "account_created",
        entityName: `Account: ${data.name}`,
        description: `Created new account`,
        details: {
          account_id: data.id,
          account_name: data.name,
          industry: data.industry,
          segment: data.segment,
        },
      });
      
      toast({
        title: "Success",
        description: "Account created successfully",
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

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateAccountDTO }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Account;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts', variables.id] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "account_updated",
        entityName: `Account: ${data.name}`,
        description: `Updated account details`,
        details: {
          account_id: data.id,
          account_name: data.name,
          updated_fields: Object.keys(variables.updates),
        },
      });
      
      toast({
        title: "Success",
        description: "Account updated successfully",
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

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get account info before deleting for audit log
      const { data: account } = await supabase
        .from('accounts')
        .select('name')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, account };
    },
    onSuccess: ({ id, account }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "account_deleted",
        entityName: `Account: ${account?.name || 'Unknown'}`,
        description: `Deleted account`,
        details: {
          account_id: id,
          account_name: account?.name,
        },
      });
      
      toast({
        title: "Success",
        description: "Account deleted successfully",
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
