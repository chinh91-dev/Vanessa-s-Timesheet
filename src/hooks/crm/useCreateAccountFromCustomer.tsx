import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import { formatDate } from "@/lib/date-utils";
import type { Customer, CustomerLiaison } from "@/lib/customer-service";
import type { Account, Contact } from "@/lib/crm/types";

interface CreateAccountFromCustomerResult {
  account: Account;
  contact: Contact;
  wasExistingAccount: boolean;
  wasExistingContact: boolean;
}

interface CreateAccountFromCustomerInput {
  customer: Customer;
  liaison?: CustomerLiaison;
  /** Manual contact info if no liaison is selected */
  manualContact?: {
    name: string;
    email?: string;
    phone?: string;
    title?: string;
  };
  ownerId: string;
}

export const useCreateAccountFromCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ customer, liaison, manualContact, ownerId }: CreateAccountFromCustomerInput): Promise<CreateAccountFromCustomerResult> => {
      // Step 1: Check if account already exists for this customer
      let account: Account | null = null;
      let wasExistingAccount = false;
      
      const { data: existingAccounts, error: accountCheckError } = await supabase
        .from('accounts')
        .select('*')
        .eq('converted_to_customer_id', customer.id)
        .eq('is_active', true)
        .limit(1);
      
      if (accountCheckError) throw accountCheckError;
      
      if (existingAccounts && existingAccounts.length > 0) {
        account = existingAccounts[0] as Account;
        wasExistingAccount = true;
      } else {
        // Create new account from customer data
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts')
          .insert({
            name: customer.name,
            abn: customer.abn || null,
            acn: customer.acn || null,
            has_trading_name: customer.has_trading_name || false,
            trading_name: customer.trading_name || null,
            industry: customer.industry || null,
            segment: customer.segment || null,
            website: customer.website || null,
            street_address: customer.street_address || null,
            suburb: customer.suburb || null,
            state_au: customer.state_au || null,
            postcode: customer.postcode || null,
            postal_different: customer.postal_different || false,
            postal_street_address: customer.postal_street_address || null,
            postal_suburb: customer.postal_suburb || null,
            postal_state: customer.postal_state || null,
            postal_postcode: customer.postal_postcode || null,
            email: customer.email || null,
            account_email: customer.account_email || null,
            phone: customer.phone || null,
            is_active: true,
            created_by: ownerId,
            converted_to_customer_id: customer.id,
            conversion_date: formatDate(new Date()),
          })
          .select()
          .single();
        
        if (accountError) throw accountError;
        account = newAccount as Account;
      }
      
      if (!account) throw new Error('Failed to create or find account');
      
      // Step 2: Create contact from liaison or manual info
      let contact: Contact | null = null;
      let wasExistingContact = false;
      
      const contactName = liaison?.name || manualContact?.name;
      const contactEmail = liaison?.email || manualContact?.email;
      const contactPhone = liaison?.phone || manualContact?.phone;
      const contactTitle = liaison?.title || manualContact?.title;
      
      if (!contactName) {
        throw new Error('Contact name is required');
      }
      
      // Check if contact already exists for this account with same name
      const { data: existingContacts, error: contactCheckError } = await supabase
        .from('contacts')
        .select('*')
        .eq('converted_to_account_id', account.id)
        .ilike('contact_name', contactName)
        .limit(1);
      
      if (contactCheckError) throw contactCheckError;
      
      if (existingContacts && existingContacts.length > 0) {
        contact = existingContacts[0] as unknown as Contact;
        wasExistingContact = true;
      } else {
        // Create new contact
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            contact_name: contactName,
            company_name: customer.name,
            email: contactEmail || null,
            phone: contactPhone || null,
            title: contactTitle || null,
            source: 'referral', // Default source for existing customer
            owner_id: ownerId,
            converted_to_account_id: account.id,
          })
          .select()
          .single();
        
        if (contactError) throw contactError;
        contact = newContact as unknown as Contact;
      }
      
      if (!contact) throw new Error('Failed to create or find contact');
      
      return {
        account,
        contact,
        wasExistingAccount,
        wasExistingContact,
      };
    },
    onSuccess: ({ account, contact, wasExistingAccount, wasExistingContact }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "account_created_from_customer",
        entityName: `Account: ${account.name}`,
        description: wasExistingAccount 
          ? `Used existing account for customer deal flow`
          : `Created account from existing customer`,
        details: {
          account_id: account.id,
          account_name: account.name,
          contact_id: contact.id,
          contact_name: contact.contact_name,
          was_existing_account: wasExistingAccount,
          was_existing_contact: wasExistingContact,
        },
      });
      
      const message = wasExistingAccount && wasExistingContact
        ? "Using existing account and contact"
        : wasExistingAccount
          ? "Contact created for existing account"
          : "Account and contact created from customer";
      
      toast({
        title: "Success",
        description: message,
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
