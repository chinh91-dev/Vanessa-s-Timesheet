import { supabase } from "@/integrations/supabase/client";

export interface Contract {
  id: string;
  name: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'pending_renewal' | 'expired' | 'renewed';
  is_active?: boolean;
  file_id?: string;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  uploaded_at?: string;
  created_at: string;
  updated_at: string;
  services?: Service[];
  days_until_expiry?: number;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTimeEntry {
  id: string;
  user_id: string;
  contract_id: string;
  entry_date: string;
  hours_logged: number;
  notes?: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
  contract?: Contract;
}

export const fetchServices = async (): Promise<Service[]> => {
  try {
    console.log("Fetching services...");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching services:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} services`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchServices:", error);
    throw error;
  }
};

export const fetchUserContracts = async (): Promise<Contract[]> => {
  try {
    console.log("Fetching contracts for current user...");
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // First, get the contract IDs the user is assigned to
    const { data: assignments } = await supabase
      .from('contract_assignments')
      .select('contract_id')
      .eq('user_id', user.id);

    const contractIds = assignments?.map(a => a.contract_id) || [];
    
    // If user has no assignments, return empty array
    if (contractIds.length === 0) {
      console.log("User has no contract assignments");
      return [];
    }

    // Filter contracts by the assigned contract IDs
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .in('id', contractIds)
      .eq('is_active', true)
      .in('status', ['active', 'pending_renewal'])
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching user contracts:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} assigned contracts for user`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchUserContracts:", error);
    throw error;
  }
};

export const fetchContracts = async (filters?: {
  status?: string;
  statusIn?: string[];
  customerId?: string;
  searchTerm?: string;
  isActive?: boolean;
}): Promise<Contract[]> => {
  try {
    console.log("Fetching contracts with filters:", filters);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    let query = supabase
      .from("contracts")
      .select(`
        *,
        customers(name)
      `);

    // Apply filters
    if (filters?.statusIn && filters.statusIn.length > 0) {
      query = query.in("status", filters.statusIn);
    } else if (filters?.status && filters.status !== 'all') {
      query = query.eq("status", filters.status);
    }

    if (filters?.customerId && filters.customerId !== 'all') {
      query = query.eq("customer_id", filters.customerId);
    }

    if (filters?.searchTerm) {
      query = query.ilike("name", `%${filters.searchTerm}%`);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    const { data, error } = await query
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching contracts:", error);
      throw error;
    }

    // Transform data to include customer_name and calculate days_until_expiry
    const transformedData = (data || []).map((contract) => {
      const endDate = new Date(contract.end_date);
      const today = new Date();
      const timeDiff = endDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return {
        ...contract,
        customer_name: (contract as { customers?: { name?: string } }).customers?.name,
        days_until_expiry: daysDiff,
        services: [] // Will be populated separately if needed
      } as Contract;
    });

    console.log(`Fetched ${transformedData.length} contracts`);
    return transformedData;
  } catch (error) {
    console.error("Error in fetchContracts:", error);
    throw error;
  }
};

export const saveContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>, serviceIds?: string[]): Promise<Contract> => {
  try {
    console.log("Creating new contract:", contractData);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("contracts")
      .insert([{
        ...contractData,
        is_active: contractData.is_active ?? true
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating contract:", error);
      throw new Error(`Failed to create contract: ${error.message}`);
    }

    // Handle service associations if provided
    if (serviceIds && serviceIds.length > 0) {
      const serviceAssociations = serviceIds.map(serviceId => ({
        contract_id: data.id,
        service_id: serviceId
      }));

      const { error: serviceError } = await supabase
        .from("contract_services")
        .insert(serviceAssociations);

      if (serviceError) {
        console.error("Error associating services:", serviceError);
        // Don't fail the entire operation, just log the error
      }
    }

    console.log("Contract created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in saveContract:", error);
    throw error;
  }
};

export const updateContract = async (contractId: string, contractData: Partial<Omit<Contract, 'id' | 'created_at' | 'updated_at'>>, serviceIds?: string[]): Promise<Contract> => {
  try {
    console.log("Updating contract:", contractId, contractData);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Update the contract data
    const { data, error } = await supabase
      .from("contracts")
      .update({
        ...contractData,
        updated_at: new Date().toISOString()
      })
      .eq("id", contractId)
      .select()
      .single();

    if (error) {
      console.error("Error updating contract:", error);
      throw new Error(`Failed to update contract: ${error.message}`);
    }

    // Handle service associations if provided
    if (serviceIds !== undefined) {
      // First, remove existing service associations
      const { error: deleteError } = await supabase
        .from("contract_services")
        .delete()
        .eq("contract_id", contractId);

      if (deleteError) {
        console.error("Error removing existing service associations:", deleteError);
      }

      // Then add new service associations
      if (serviceIds.length > 0) {
        const serviceAssociations = serviceIds.map(serviceId => ({
          contract_id: contractId,
          service_id: serviceId
        }));

        const { error: insertError } = await supabase
          .from("contract_services")
          .insert(serviceAssociations);

        if (insertError) {
          console.error("Error adding new service associations:", insertError);
        }
      }
    }

    console.log("Contract updated successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in updateContract:", error);
    throw error;
  }
};

export const deleteContract = async (contractId: string): Promise<void> => {
  try {
    console.log("Deleting contract:", contractId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contractId);

    if (error) {
      console.error("Error deleting contract:", error);
      throw new Error(`Failed to delete contract: ${error.message}`);
    }

    console.log("Contract deleted successfully");
  } catch (error) {
    console.error("Error in deleteContract:", error);
    throw error;
  }
};

export const uploadContractFile = async (file: File, contractId?: string): Promise<{ path: string; url: string }> => {
  try {
    console.log("Uploading contract file:", file.name);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
    const filePath = contractId ? `${contractId}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Error uploading file:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Return file path instead of signed URL (signed URLs expire)
    // The path will be used to generate signed URLs on-demand when viewing
    console.log("File uploaded successfully:", data.path);
    return {
      path: data.path,
      url: data.path // Store path instead of signed URL
    };
  } catch (error) {
    console.error("Error in uploadContractFile:", error);
    throw error;
  }
};

export const deleteContractFile = async (filePath: string): Promise<void> => {
  try {
    console.log("Deleting contract file:", filePath);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase.storage
      .from('contracts')
      .remove([filePath]);

    if (error) {
      console.error("Error deleting file:", error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log("File deleted successfully");
  } catch (error) {
    console.error("Error in deleteContractFile:", error);
    throw error;
  }
};

export const removeContractFile = async (contractId: string): Promise<void> => {
  try {
    console.log("Removing file from contract:", contractId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the current contract to find the file path
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('file_url, file_id')
      .eq('id', contractId)
      .single();

    if (fetchError) {
      console.error("Error fetching contract:", fetchError);
      throw new Error(`Failed to fetch contract: ${fetchError.message}`);
    }

    // If there's a file, try to delete it from storage
    if (contract?.file_url && contract?.file_id) {
      // Extract the file path from the URL or use the file_id
      const filePath = contract.file_url.split('/').pop();
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('contracts')
          .remove([filePath]);
        
        if (storageError) {
          console.warn("Could not delete file from storage:", storageError);
          // Don't fail the operation if storage deletion fails
        }
      }
    }

    // Update the contract record to remove file information
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        file_id: null,
        file_name: null,
        file_type: null,
        file_size: null,
        file_url: null,
        uploaded_at: null
      })
      .eq('id', contractId);

    if (updateError) {
      console.error("Error updating contract:", updateError);
      throw new Error(`Failed to remove file from contract: ${updateError.message}`);
    }

    console.log("File removed from contract successfully");
  } catch (error) {
    console.error("Error in removeContractFile:", error);
    throw error;
  }
};
