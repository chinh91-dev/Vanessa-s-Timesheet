import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

interface ConvertAccountToCustomerParams {
  accountId: string;
  contactId?: string;
}

/**
 * Hook to convert a CRM Account to a Timesheet Customer when a deal is Closed Won.
 * Maps account and contact data to customer fields.
 */
export const useConvertAccountToCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, contactId }: ConvertAccountToCustomerParams) => {
      // 1. Fetch the account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;
      if (!account) throw new Error('Account not found');

      // Check if already converted
      if (account.converted_to_customer_id) {
        return { 
          customer: null, 
          alreadyConverted: true,
          customerId: account.converted_to_customer_id 
        };
      }

      // 2. Fetch the contact for email/phone if provided
      let contact = null;
      if (contactId) {
        const { data: contactData } = await supabase
          .from('contacts')
          .select('email, phone, contact_name')
          .eq('id', contactId)
          .single();
        contact = contactData;
      }

      // 3. Check for existing customer with same name
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('name', account.name)
        .maybeSingle();

      let customerId: string;

      if (existingCustomer) {
        // Link to existing customer
        customerId = existingCustomer.id;
      } else {
        // 4. Create new customer with mapped fields
        const customerData = {
          name: account.name,
          company: account.name,
          abn: account.abn,
          industry: account.industry,
          state_au: account.state_au,
          segment: account.segment,
          website: account.website,
          notes: account.notes,
          is_active: true,
          // Get email/phone from contact if available
          email: contact?.email || null,
          phone: contact?.phone || null,
        };

        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert(customerData)
          .select('id')
          .single();

        if (createError) throw createError;
        customerId = newCustomer.id;
      }

      // 5. Update account with converted_to_customer_id
      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          converted_to_customer_id: customerId,
          conversion_date: formatDate(new Date()),
        })
        .eq('id', accountId);

      if (updateError) throw updateError;

      return { 
        customer: { id: customerId }, 
        alreadyConverted: false,
        wasExisting: !!existingCustomer 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] });
      
      if (result.alreadyConverted) {
        // Don't show toast - already converted
        return;
      }
      
      toast({
        title: "Customer Created",
        description: result.wasExisting 
          ? "Account linked to existing customer" 
          : "New customer created from closed deal",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to convert account to customer:", error);
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
