
import { supabase } from "@/integrations/supabase/client";
import { ContractAssignment, CreateContractAssignment } from "./assignment-types";

export const fetchContractAssignments = async (contractId?: string): Promise<ContractAssignment[]> => {
  try {
    console.log("Fetching contract assignments for contract:", contractId);
    
    let query = supabase
      .from("contract_assignments")
      .select(`
        *,
        user:profiles!contract_assignments_user_id_fkey(id, full_name, email),
        contract:contracts!contract_assignments_contract_id_fkey(id, name)
      `);

    if (contractId) {
      query = query.eq("contract_id", contractId);
    }

    const { data, error } = await query.order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching contract assignments:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} contract assignments`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchContractAssignments:", error);
    throw error;
  }
};

export const createContractAssignment = async (assignment: CreateContractAssignment): Promise<ContractAssignment> => {
  try {
    console.log("Creating contract assignment:", assignment);
    
    const { data, error } = await supabase
      .from("contract_assignments")
      .insert({
        contract_id: assignment.contract_id,
        user_id: assignment.user_id,
        assigned_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        user:profiles!contract_assignments_user_id_fkey(id, full_name, email),
        contract:contracts!contract_assignments_contract_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error("Error creating contract assignment:", error);
      throw error;
    }

    console.log("Contract assignment created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in createContractAssignment:", error);
    throw error;
  }
};

export const deleteContractAssignment = async (assignmentId: string): Promise<void> => {
  try {
    console.log("Deleting contract assignment:", assignmentId);
    
    const { error } = await supabase
      .from("contract_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("Error deleting contract assignment:", error);
      throw error;
    }

    console.log("Contract assignment deleted successfully");
  } catch (error) {
    console.error("Error in deleteContractAssignment:", error);
    throw error;
  }
};

export const bulkAssignUsersToContract = async (contractId: string, userIds: string[]): Promise<void> => {
  try {
    console.log("Bulk assigning users to contract:", { contractId, userIds });
    
    const currentUser = (await supabase.auth.getUser()).data.user;
    
    const assignments = userIds.map(userId => ({
      contract_id: contractId,
      user_id: userId,
      assigned_by: currentUser?.id
    }));

    const { error } = await supabase
      .from("contract_assignments")
      .insert(assignments)
      .select()
      .throwOnError();

    if (error) {
      console.error("Error bulk assigning users:", error);
      throw error;
    }

    console.log("Users assigned to contract successfully");
  } catch (error) {
    console.error("Error in bulkAssignUsersToContract:", error);
    throw error;
  }
};

export const removeUserFromContract = async (contractId: string, userId: string): Promise<void> => {
  try {
    console.log("Removing user from contract:", { contractId, userId });
    
    const { error } = await supabase
      .from("contract_assignments")
      .delete()
      .eq("contract_id", contractId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing user from contract:", error);
      throw error;
    }

    console.log("User removed from contract successfully");
  } catch (error) {
    console.error("Error in removeUserFromContract:", error);
    throw error;
  }
};
