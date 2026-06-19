import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import { formatDate } from "@/lib/date-utils";
import type { Contact, CreateContactDTO, UpdateContactDTO } from "@/lib/crm/types";

export const useContacts = () => {
  return useQuery({
    queryKey: ['crm', 'contacts'],
    queryFn: async () => {
      // Fetch contacts with basic relations
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          converted_account:converted_to_account_id(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (contactsError) throw contactsError;
      
      // Fetch category assignments with category details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('contact_category_assignments')
        .select(`
          contact_id,
          category:category_id(id, name, color, sort_order)
        `);
      
      if (assignmentsError) {
        // If table doesn't exist yet, just return contacts without categories
        console.warn('Could not fetch category assignments:', assignmentsError.message);
        return contactsData as Contact[];
      }
      
      // Group categories by contact_id
      const categoriesByContact: Record<string, any[]> = {};
      assignmentsData?.forEach((assignment: any) => {
        if (assignment.category) {
          if (!categoriesByContact[assignment.contact_id]) {
            categoriesByContact[assignment.contact_id] = [];
          }
          categoriesByContact[assignment.contact_id].push(assignment.category);
        }
      });
      
      // Merge categories into contacts
      const contactsWithCategories = contactsData?.map((contact: any) => ({
        ...contact,
        categories: categoriesByContact[contact.id] || [],
      }));
      
      return contactsWithCategories as Contact[];
    },
  });
};

export const useContact = (id: string | undefined) => {
  return useQuery({
    queryKey: ['crm', 'contacts', id],
    queryFn: async () => {
      if (!id) throw new Error('Contact ID is required');
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          converted_account:converted_to_account_id(id, name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
};

// Extended type that includes the optional existing_account_id from the form
type CreateContactInput = CreateContactDTO & { existing_account_id?: string };

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contact: CreateContactInput) => {
      // Step 1: Check for duplicate contacts (by contact_name and optional company_name)
      let duplicateQuery = supabase
        .from('contacts')
        .select('id, contact_name, company_name')
        .eq('contact_name', contact.contact_name.trim());
      
      if (contact.company_name?.trim()) {
        duplicateQuery = duplicateQuery.eq('company_name', contact.company_name.trim());
      } else {
        duplicateQuery = duplicateQuery.is('company_name', null);
      }
      
      const { data: existingContacts, error: checkError } = await duplicateQuery;
      
      if (checkError) throw checkError;
      
      if (existingContacts && existingContacts.length > 0) {
        const companyInfo = contact.company_name ? ` at "${contact.company_name}"` : '';
        throw new Error(
          `A contact already exists for "${contact.contact_name}"${companyInfo}.`
        );
      }

      // Step 2: Determine which account to use
      let accountId: string | undefined;
      let createdNewAccount = false;
      let linkedToCustomer = false;
      
      // If existing_account_id is provided, use that directly
      if (contact.existing_account_id) {
        accountId = contact.existing_account_id;
      } 
      // Otherwise, check if we need to create/find an account based on company_name
      else if (contact.company_name?.trim()) {
        // First, check if a customer exists with this name
        const { data: existingCustomers, error: customerCheckError } = await supabase
          .from('customers')
          .select('id, name')
          .ilike('name', contact.company_name.trim())
          .eq('is_active', true)
          .limit(1);
        
        if (customerCheckError) throw customerCheckError;
        
        // Check if an account already exists with same name
        const { data: existingAccounts, error: accountsCheckError } = await supabase
          .from('accounts')
          .select('id, converted_to_customer_id')
          .ilike('name', contact.company_name.trim())
          .eq('is_active', true)
          .limit(1);

        if (accountsCheckError) throw accountsCheckError;
        
        if (existingAccounts && existingAccounts.length > 0) {
          // Use existing account
          accountId = existingAccounts[0].id;
          linkedToCustomer = !!existingAccounts[0].converted_to_customer_id;
        } else {
          // Create new account, linking to customer if one exists
          const { data: user } = await supabase.auth.getUser();
          const customerId = existingCustomers?.[0]?.id || null;
          
          const { data: newAccount, error: accountError } = await supabase
            .from('accounts')
            .insert({
              name: contact.company_name.trim(),
              is_active: true,
              created_by: user?.user?.id,
              converted_to_customer_id: customerId,
              // Set conversion_date if linking to existing customer
              conversion_date: customerId ? formatDate(new Date()) : null,
            })
            .select()
            .single();
          
          if (accountError) throw accountError;
          accountId = newAccount.id;
          createdNewAccount = true;
          linkedToCustomer = !!customerId;
        }
      }

      // Step 3: Create contact with account reference
      // Remove the non-standard field before inserting
      const { existing_account_id: _, ...contactData } = contact;
      
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            ...contactData,
            converted_to_account_id: accountId,
          })
          .select()
          .single();

        if (error) throw error;
        return { contact: data as Contact, createdNewAccount, linkedToCustomer };

      } catch (error) {
        // Rollback: Delete created account if contact creation fails
        if (createdNewAccount && accountId) {
          await supabase.from('accounts').delete().eq('id', accountId);
        }
        throw error;
      }
    },
    onSuccess: ({ contact, createdNewAccount, linkedToCustomer }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      
      // Log audit event
      const entityName = contact.company_name 
        ? `Contact: ${contact.contact_name} (${contact.company_name})`
        : `Contact: ${contact.contact_name}`;
      
      let description = `Created new contact`;
      if (createdNewAccount && linkedToCustomer) {
        description = `Created new contact and account linked to existing customer`;
      } else if (createdNewAccount) {
        description = `Created new contact and associated account (new prospect)`;
      } else if (linkedToCustomer) {
        description = `Created new contact linked to existing customer account`;
      }
      
      logCRMAuditEvent({
        action: "contact_created",
        entityName,
        description,
        details: {
          contact_id: contact.id,
          contact_name: contact.contact_name,
          company_name: contact.company_name || null,
          email: contact.email,
          created_new_account: createdNewAccount,
          linked_to_customer: linkedToCustomer,
        },
      });
      
      toast({
        title: "Success",
        description: linkedToCustomer 
          ? "Contact created and linked to existing customer" 
          : "Contact created successfully",
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

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      categoryIds,
    }: {
      id: string;
      updates: UpdateContactDTO;
      /**
       * Optional category sync. When provided, replaces every existing
       * contact_category_assignments row for this contact with the listed
       * category ids. Pass [] to clear all categories.
       *
       * Accepts:
       *   - explicit `categoryIds: string[]` (preferred), OR
       *   - `updates.categories` containing string ids or { id } objects.
       */
      categoryIds?: string[];
    }) => {
      // `categories` is a relation surfaced on the Contact type for reads —
      // it must not be part of the `contacts` UPDATE body.
      const { categories: rawCategories, ...patchBody } = updates as
        & UpdateContactDTO
        & { categories?: unknown };

      const resolvedCategoryIds: string[] | undefined = (() => {
        if (Array.isArray(categoryIds)) return categoryIds;
        if (Array.isArray(rawCategories)) {
          return (rawCategories as Array<string | { id?: string }>)
            .map((c) => (typeof c === "string" ? c : c?.id))
            .filter((v): v is string => typeof v === "string" && v.length > 0);
        }
        return undefined;
      })();

      // Get current contact for audit logging
      const { data: currentContact } = await supabase
        .from('contacts')
        .select('contact_name, company_name')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('contacts')
        .update(patchBody)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Sync category assignments when caller provided a list.
      if (resolvedCategoryIds !== undefined) {
        const { data: userResult } = await supabase.auth.getUser();
        const created_by = userResult?.user?.id ?? null;

        const { error: deleteErr } = await supabase
          .from('contact_category_assignments')
          .delete()
          .eq('contact_id', id);
        if (deleteErr) throw deleteErr;

        if (resolvedCategoryIds.length > 0) {
          const { error: insertErr } = await supabase
            .from('contact_category_assignments')
            .insert(
              resolvedCategoryIds.map((category_id) => ({
                contact_id: id,
                category_id,
                created_by,
              }))
            );
          if (insertErr) throw insertErr;
        }
      }

      return {
        contact: data as Contact,
        syncedCategoryIds: resolvedCategoryIds,
      };
    },
    onSuccess: ({ contact, syncedCategoryIds }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      if (syncedCategoryIds !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ['crm', 'contact-category-assignments', variables.id],
        });
      }

      // Log audit event
      const entityName = contact.company_name
        ? `Contact: ${contact.contact_name} (${contact.company_name})`
        : `Contact: ${contact.contact_name}`;

      const updatedFields = Object.keys(variables.updates).filter(
        (k) => k !== 'categories'
      );
      if (syncedCategoryIds !== undefined) updatedFields.push('categories');

      logCRMAuditEvent({
        action: "contact_updated",
        entityName,
        description: `Updated contact details`,
        details: {
          contact_id: contact.id,
          contact_name: contact.contact_name,
          company_name: contact.company_name || null,
          updated_fields: updatedFields,
          category_count:
            syncedCategoryIds !== undefined ? syncedCategoryIds.length : undefined,
        },
      });

      toast({
        title: "Success",
        description: "Contact updated successfully",
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

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get contact info before deleting for audit log
      const { data: contact } = await supabase
        .from('contacts')
        .select('contact_name, company_name')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, contact };
    },
    onSuccess: ({ id, contact }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "contact_deleted",
        entityName: `Contact: ${contact?.contact_name || 'Unknown'} (${contact?.company_name || 'Unknown'})`,
        description: `Deleted contact`,
        details: {
          contact_id: id,
          contact_name: contact?.contact_name,
          company_name: contact?.company_name,
        },
      });
      
      toast({
        title: "Success",
        description: "Contact deleted successfully",
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

// Hook to fetch deal counts per contact
export const useContactDealCounts = () => {
  return useQuery({
    queryKey: ['crm', 'contact-deal-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('primary_contact_id')
        .not('primary_contact_id', 'is', null);
      
      if (error) throw error;
      
      // Aggregate counts by contact
      const counts: Record<string, number> = {};
      data?.forEach(deal => {
        if (deal.primary_contact_id) {
          counts[deal.primary_contact_id] = (counts[deal.primary_contact_id] || 0) + 1;
        }
      });
      return counts;
    },
  });
};

// Legacy aliases for backward compatibility
export const useLeads = useContacts;
export const useLead = useContact;
export const useCreateLead = useCreateContact;
export const useUpdateLead = useUpdateContact;
export const useDeleteLead = useDeleteContact;
