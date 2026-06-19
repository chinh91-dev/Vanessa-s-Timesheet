import { supabase } from "@/integrations/supabase/client";

export interface Customer {
  id: string;
  name: string;
  
  // Business identification
  abn?: string;
  acn?: string;
  has_trading_name?: boolean;
  trading_name?: string;
  
  // Business details
  industry?: string;
  segment?: string;
  website?: string;
  
  // Main/Street address
  street_address?: string;
  suburb?: string;
  state_au?: string;
  postcode?: string;
  
  // Postal address (if different)
  postal_different?: boolean;
  postal_street_address?: string;
  postal_suburb?: string;
  postal_state?: string;
  postal_postcode?: string;
  
  // Contact
  email?: string;
  account_email?: string;
  phone?: string;
  
  // Legacy fields (keep for backward compatibility)
  company?: string;
  liaison_title?: string | null;
  
  created_at?: string;
}

export interface CustomerLiaison {
  id: string;
  customer_id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

const CUSTOMER_SELECT_FIELDS = `
  id, name, company, liaison_title, email, phone, created_at,
  abn, acn, has_trading_name, trading_name,
  industry, segment, website,
  street_address, suburb, state_au, postcode,
  postal_different, postal_street_address, postal_suburb, postal_state, postal_postcode,
  account_email
`;

export const fetchCustomers = async (): Promise<Customer[]> => {
  try {
    console.log("Fetching customers...");
    const { data, error } = await supabase
      .from("customers")
      .select(CUSTOMER_SELECT_FIELDS)
      .order("name");

    if (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} customers`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchCustomers:", error);
    throw error;
  }
};

export const fetchCustomerById = async (customerId: string): Promise<Customer | null> => {
  try {
    console.log(`Fetching customer with id: ${customerId}`);
    const { data, error } = await supabase
      .from("customers")
      .select(CUSTOMER_SELECT_FIELDS)
      .eq("id", customerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`No customer found with id: ${customerId}`);
        return null;
      }
      console.error(`Error fetching customer with id ${customerId}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in fetchCustomerById:", error);
    throw error;
  }
};

export const checkCustomerNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  try {
    console.log(`Checking if customer name exists: ${name}`);
    
    let query = supabase
      .from("customers")
      .select("id")
      .ilike("name", name.trim());
    
    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error checking customer name:", error);
      throw error;
    }

    const exists = data && data.length > 0;
    console.log(`Customer name exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error("Error in checkCustomerNameExists:", error);
    throw error;
  }
};

export const saveCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
  try {
    console.log("Saving customer:", customer);
    
    if (customer.name) {
      const nameExists = await checkCustomerNameExists(customer.name, customer.id);
      if (nameExists) {
        throw new Error(`A customer with the name "${customer.name}" already exists. Please choose a different name.`);
      }
    }
    
    const customerData = {
      name: customer.name,
      company: customer.company || null,
      liaison_title: customer.liaison_title || null,
      email: customer.email || null,
      phone: customer.phone || null,
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
      account_email: customer.account_email || null,
    };
    
    if (customer.id) {
      const { data, error } = await supabase
        .from("customers")
        .update({
          ...customerData,
          updated_at: new Date().toISOString()
        })
        .eq("id", customer.id)
        .select(CUSTOMER_SELECT_FIELDS);

      if (error) {
        if (error.code === '23505' && error.message.includes('idx_customers_name_unique')) {
          throw new Error(`A customer with the name "${customer.name}" already exists. Please choose a different name.`);
        }
        console.error("Error updating customer:", error);
        throw error;
      }
      
      console.log("Customer updated successfully:", data?.[0]);
      return data?.[0] as Customer;
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert(customerData)
        .select(CUSTOMER_SELECT_FIELDS);

      if (error) {
        if (error.code === '23505' && error.message.includes('idx_customers_name_unique')) {
          throw new Error(`A customer with the name "${customer.name}" already exists. Please choose a different name.`);
        }
        console.error("Error creating customer:", error);
        throw error;
      }
      
      console.log("Customer created successfully:", data?.[0]);
      return data?.[0] as Customer;
    }
  } catch (error) {
    console.error("Error in saveCustomer:", error);
    throw error;
  }
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    console.log(`Deleting customer ${customerId}`);
    
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
    
    console.log(`Customer ${customerId} deleted successfully`);
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    throw error;
  }
};

// ============ Customer Liaison Functions ============

export const fetchCustomerLiaisons = async (customerId: string): Promise<CustomerLiaison[]> => {
  try {
    console.log(`Fetching liaisons for customer: ${customerId}`);
    const { data, error } = await supabase
      .from("customer_liaisons")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_primary", { ascending: false })
      .order("name");

    if (error) {
      console.error("Error fetching liaisons:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} liaisons`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchCustomerLiaisons:", error);
    throw error;
  }
};

export const saveLiaison = async (liaison: Partial<CustomerLiaison>): Promise<CustomerLiaison> => {
  try {
    console.log("Saving liaison:", liaison);
    
    if (liaison.id) {
      const { data, error } = await supabase
        .from("customer_liaisons")
        .update({
          name: liaison.name,
          title: liaison.title || null,
          email: liaison.email || null,
          phone: liaison.phone || null,
          is_primary: liaison.is_primary || false,
          updated_at: new Date().toISOString()
        })
        .eq("id", liaison.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating liaison:", error);
        throw error;
      }
      
      console.log("Liaison updated successfully:", data);
      return data as CustomerLiaison;
    } else {
      const { data, error } = await supabase
        .from("customer_liaisons")
        .insert({
          customer_id: liaison.customer_id,
          name: liaison.name,
          title: liaison.title || null,
          email: liaison.email || null,
          phone: liaison.phone || null,
          is_primary: liaison.is_primary || false
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating liaison:", error);
        throw error;
      }
      
      console.log("Liaison created successfully:", data);
      return data as CustomerLiaison;
    }
  } catch (error) {
    console.error("Error in saveLiaison:", error);
    throw error;
  }
};

export const deleteLiaison = async (liaisonId: string): Promise<void> => {
  try {
    console.log(`Deleting liaison ${liaisonId}`);
    
    const { error } = await supabase
      .from("customer_liaisons")
      .delete()
      .eq("id", liaisonId);

    if (error) {
      console.error("Error deleting liaison:", error);
      throw error;
    }
    
    console.log(`Liaison ${liaisonId} deleted successfully`);
  } catch (error) {
    console.error("Error in deleteLiaison:", error);
    throw error;
  }
};

export const setPrimaryLiaison = async (customerId: string, liaisonId: string): Promise<void> => {
  try {
    console.log(`Setting liaison ${liaisonId} as primary for customer ${customerId}`);
    
    // First, unset all primary flags for this customer
    const { error: unsetError } = await supabase
      .from("customer_liaisons")
      .update({ is_primary: false })
      .eq("customer_id", customerId);

    if (unsetError) {
      console.error("Error unsetting primary liaisons:", unsetError);
      throw unsetError;
    }

    // Then set the new primary
    const { error: setError } = await supabase
      .from("customer_liaisons")
      .update({ is_primary: true })
      .eq("id", liaisonId);

    if (setError) {
      console.error("Error setting primary liaison:", setError);
      throw setError;
    }
    
    console.log(`Liaison ${liaisonId} set as primary successfully`);
  } catch (error) {
    console.error("Error in setPrimaryLiaison:", error);
    throw error;
  }
};
