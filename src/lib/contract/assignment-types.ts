
// Types for contract assignments
export interface ContractAssignment {
  id: string;
  contract_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by?: string;
  created_at: string;
  // Related data from joins
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  contract?: {
    id: string;
    name: string;
  };
}

export interface CreateContractAssignment {
  contract_id: string;
  user_id: string;
}

export interface ContractWithAssignees {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'pending_renewal' | 'renewed';
  is_active?: boolean;
  customer_id?: string;
  customer_name?: string;
  days_until_expiry?: number;
  services?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  assignees?: Array<{
    id: string;
    full_name?: string;
    email?: string;
  }>;
}
