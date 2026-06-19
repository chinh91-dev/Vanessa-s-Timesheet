import { supabase } from '@/integrations/supabase/client';

export interface CustomerLogin {
  id: string;
  company_id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    company?: string;
  };
}

export interface CreateCustomerLoginInput {
  company_id: string;
  email: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export interface UpdateCustomerLoginInput {
  id: string;
  company_id?: string;
  email?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

// Fetch all customer logins with company information
export async function fetchCustomerLogins(): Promise<CustomerLogin[]> {
  const { data, error } = await supabase
    .from('customer_logins')
    .select(`
      *,
      customer:customers(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer logins:', error);
    throw error;
  }

  return data || [];
}

// Fetch customer logins by company
export async function fetchCustomerLoginsByCompany(companyId: string): Promise<CustomerLogin[]> {
  const { data, error } = await supabase
    .from('customer_logins')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer logins by company:', error);
    throw error;
  }

  return data || [];
}

// Fetch single customer login by ID
export async function fetchCustomerLoginById(id: string): Promise<CustomerLogin | null> {
  const { data, error } = await supabase
    .from('customer_logins')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching customer login:', error);
    throw error;
  }

  return data;
}

// Fetch customer login by email
export async function fetchCustomerLoginByEmail(email: string): Promise<CustomerLogin | null> {
  const { data, error } = await supabase
    .from('customer_logins')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching customer login by email:', error);
    throw error;
  }

  return data;
}

// Create new customer login (legacy - creates account immediately)
export async function createCustomerLogin(input: CreateCustomerLoginInput): Promise<CustomerLogin> {
  const { data, error } = await supabase
    .from('customer_logins')
    .insert({
      company_id: input.company_id,
      email: input.email,
      full_name: input.full_name,
      role: input.role || 'user',
      is_active: input.is_active ?? true,
    })
    .select(`
      *,
      customer:customers(*)
    `)
    .single();

  if (error) {
    console.error('Error creating customer login:', error);
    throw error;
  }

  return data;
}

// Update customer login
export async function updateCustomerLogin(input: UpdateCustomerLoginInput): Promise<CustomerLogin> {
  const { id, ...updateData } = input;
  
  const { data, error } = await supabase
    .from('customer_logins')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      customer:customers(*)
    `)
    .single();

  if (error) {
    console.error('Error updating customer login:', error);
    throw error;
  }

  return data;
}

// Delete customer login
export async function deleteCustomerLogin(id: string): Promise<void> {
  const { error } = await supabase
    .from('customer_logins')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer login:', error);
    throw error;
  }
}

// Check if email already exists (for validation)
export async function checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('customer_logins')
    .select('id')
    .eq('email', email);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking email existence:', error);
    throw error;
  }

  return (data?.length || 0) > 0;
}