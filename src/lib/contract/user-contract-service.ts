
import { supabase } from "@/integrations/supabase/client";
import { Contract } from "../contract-service";

export const fetchUserContracts = async (): Promise<Contract[]> => {
  try {
    console.log("=== DEBUGGING CONTRACT FETCH ===");
    console.log("Fetching ALL contracts assigned to current user (no status filters)...");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Authentication error:", userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error("No authenticated user found");
      throw new Error("User not authenticated");
    }

    console.log("Authenticated user details:", {
      id: user.id,
      email: user.email,
      aud: user.aud
    });

    // First, get the contract IDs the user is assigned to
    console.log("Querying contract_assignments for user:", user.id);
    const { data: assignments, error: assignmentError } = await supabase
      .from('contract_assignments')
      .select('contract_id')
      .eq('user_id', user.id);

    if (assignmentError) {
      console.error("Error fetching contract assignments:", assignmentError);
      throw assignmentError;
    }

    console.log("Raw assignment data:", assignments);
    const contractIds = assignments?.map(a => a.contract_id) || [];
    console.log("Extracted contract IDs:", contractIds);
    
    // If user has no assignments, return empty array
    if (contractIds.length === 0) {
      console.log("User has no contract assignments");
      return [];
    }

    // Fetch active contracts the user is assigned to
    console.log("Fetching active assigned contracts with IDs:", contractIds);
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

    console.log("Final contracts fetched:", data);
    console.log(`Successfully fetched ${data?.length || 0} assigned contracts for user (all statuses included)`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchUserContracts:", error);
    throw error;
  }
};
