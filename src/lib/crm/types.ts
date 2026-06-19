/**
 * TypeScript types for CRM entities
 * Maps directly to Supabase database schema
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type AccountSegment = 
  | "enterprise" 
  | "mid_market" 
  | "small_business" 
  | "startup";

// ContactStatus removed - no longer used

export type ContactSource = 
  | "website" 
  | "referral" 
  | "linkedin" 
  | "email_campaign" 
  | "event" 
  | "cold_outreach" 
  | "partner"
  | "existing_client";

// Legacy alias for backward compatibility
export type LeadSource = ContactSource;

export type DealStatus = 
  | "draft" 
  | "pending_approval" 
  | "approved" 
  | "active" 
  | "completed" 
  | "cancelled";

export type BillingCadence = 
  | "monthly" 
  | "quarterly" 
  | "annually" 
  | "one_time";

export type SignatureStatus = 
  | "not_sent" 
  | "sent" 
  | "signed" 
  | "declined";

export type TaskStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "cancelled";

export type TaskPriority = 
  | "low" 
  | "medium" 
  | "high" 
  | "urgent";

export type ApprovalStatus = 
  | "draft" 
  | "approved" 
  | "archived";

export type IntegrationJobType = 
  | "jira_sync" 
  | "outlook_sync" 
  | "esignature_sync" 
  | "webhook";

export type IntegrationJobStatus = 
  | "pending" 
  | "running" 
  | "completed" 
  | "failed";

export type BillingType = 
  | "monthly" 
  | "one_off" 
  | "t_and_m";

export const BILLING_TYPE_OPTIONS: BillingType[] = ["monthly", "one_off", "t_and_m"];

export type LastContactType = 
  | "call" 
  | "email" 
  | "meeting";

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface Account {
  id: string;
  name: string;
  
  // Business identification
  abn?: string;
  acn?: string;
  has_trading_name?: boolean;
  trading_name?: string;
  
  // General contact
  website?: string;
  email?: string;
  account_email?: string; // For invoicing
  
  // Legacy phone field (keep for backward compatibility)
  phone?: string;
  
  // Business details
  industry?: string;
  segment?: AccountSegment;
  description?: string;
  
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
  
  // Legacy address fields (keep for backward compatibility)
  billing_address?: string;
  shipping_address?: string;
  
  parent_account_id?: string;
  converted_to_customer_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  owner_id?: string; // Account owner for RLS access control
  
  // Relationships
  parent_account?: Account;
  customer?: any; // From customers table
  owner?: any; // From profiles via owner_id
}

export interface PipelineStage {
  id: string;
  name: string;
  stage_order: number;
  default_probability: number;
  color?: string;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Contact {
  id: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  work_phone?: string;
  mobile_phone?: string;
  title?: string;
  source?: string;
  converted_to_account_id?: string;
  conversion_date?: string;
  owner_id?: string;
  last_contacted?: string;
  last_contact_type?: LastContactType;
  created_at: string;
  updated_at: string;
  
  // Compatibility aliases for legacy components
  first_name?: string;
  last_name?: string;
  company?: string;
  lead_source?: ContactSource;
  
  // Relationships
  owner?: any; // From profiles
  converted_account?: Account;
  categories?: ContactCategory[];
}

// Legacy alias for backward compatibility
export type Lead = Contact;

export interface Deal {
  id: string;
  deal_number?: string;
  account_id?: string;
  name?: string;
  amount?: number;
  close_date?: string;
  pipeline_stage_id?: string;
  contract_value?: number;
  contract_term_months?: number;
  term_months?: number;
  billing_cadence?: string;
  contract_type?: string;
  gst_treatment?: string;
  signature_status: string;
  approval_status: string;
  signed_date?: string;
  signature_url?: string;
  next_step?: string;
  next_step_due_date?: string;
  source?: string;
  handover_notes?: string;
  primary_contact_id?: string;
  owner_id?: string;
  notes?: string;
  status?: DealStatus;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  
  // Proposal document fields
  proposal_file_id?: string;
  proposal_file_name?: string;
  proposal_file_type?: string;
  proposal_file_size?: number;
  proposal_file_url?: string;
  proposal_uploaded_at?: string;
  
  // Relationships
  account?: Account;
  pipeline_stage?: PipelineStage;
  deal_items?: DealItem[];
  primary_contact?: Contact;
  owner?: any; // From profiles via owner_id
  creator?: any; // From profiles via created_by
  approved_by_user?: any;
  
  // Legal review fields
  legal_review_completed?: boolean;
  legal_review_completed_at?: string;
  legal_review_completed_by?: string;
}

export interface DealItem {
  id: string;
  deal_id: string;
  service_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number; // Generated
  line_total_with_discount: number; // Generated
  tax_amount: number; // Generated
  final_total: number; // Generated
  created_at: string;
  updated_at: string;
  
  // Relationships
  deal?: Deal;
  service?: Service;
}

export interface Service {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  billing_types?: string[];
  unit_cost?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  account_id?: string;
  deal_id?: string;
  meeting_id?: string;
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Auto-generated task tracking fields
  is_auto_generated?: boolean;
  original_due_date?: string;
  due_date_extended_by?: string;
  due_date_extended_at?: string;
  
  // Relationships
  assigned_to_user?: any; // From profiles
  account?: Account;
  deal?: Deal;
  meeting?: CRMMeeting;
}

export interface IntegrationJob {
  id: string;
  job_type: IntegrationJobType;
  entity_type?: string;
  entity_id?: string;
  external_id?: string;
  status: IntegrationJobStatus;
  payload?: any; // JSONB
  error_message?: string;
  retry_count: number;
  max_retries: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REPORTING VIEWS
// ============================================================================

export interface WeightedPipelineForecastView {
  deal_id: string;
  deal_name: string;
  account_name: string;
  deal_amount: number;
  stage_name: string;
  probability: number;
  weighted_value: number;
  close_date?: string;
  owner_id?: string;
  owner_name?: string;
  source?: string;
  created_at: string;
}

// ============================================================================
// FORM DTOs
// ============================================================================

export type CreateAccountDTO = Omit<Account, "id" | "created_at" | "updated_at" | "created_by">;
export type UpdateAccountDTO = Partial<CreateAccountDTO>;

export type CreateDealDTO = Omit<Deal, "id" | "created_at" | "updated_at" | "created_by" | "deal_number" | "creator" | "approved_by_user">;
export type UpdateDealDTO = Partial<CreateDealDTO>;

export type CreateContactDTO = Omit<Contact, "id" | "created_at" | "updated_at" | "first_name" | "last_name" | "company" | "lead_source">;
export type UpdateContactDTO = Partial<CreateContactDTO>;

// Legacy aliases for backward compatibility
export type CreateLeadDTO = CreateContactDTO;
export type UpdateLeadDTO = UpdateContactDTO;

export type CreateTaskDTO = Omit<Task, "id" | "created_at" | "updated_at" | "created_by">;
export type UpdateTaskDTO = Partial<CreateTaskDTO>;

export type CreateServiceDTO = Omit<Service, "id" | "created_at" | "updated_at">;
export type UpdateServiceDTO = Partial<CreateServiceDTO>;

// ============================================================================
// PIPELINE TYPES
// ============================================================================

/**
 * Unified pipeline item for deals-only pipeline view
 */
export interface PipelineItem {
  id: string;
  stage_id?: string;
  stage_name: string;
  stage_order: number;
  stage_probability: number;
  
  // Deal fields
  deal_name: string;
  account_name?: string;
  account_id?: string;
  amount?: number;
  close_date?: string;
  next_step?: string;
  next_step_due_date?: string;
  source?: string;
  
  // Contract details
  contract_value?: number;
  billing_cadence?: string;
  contract_type?: string;
  
  // Owner info
  owner_id?: string;
  owner_name?: string;
  
  // Primary contact info
  primary_contact_id?: string;
  primary_contact_name?: string;
  
  
  // Notes (stage notes are stored in deal_stage_notes table)
  deal_notes?: string;
  contact_notes?: string;
  lead_notes?: string;
  
  // Proposal document fields
  proposal_file_id?: string;
  proposal_file_name?: string;
  proposal_file_type?: string;
  proposal_file_size?: number;
  proposal_file_url?: string;
  proposal_uploaded_at?: string;
  
  // Stage tracking for deal age indicator
  stage_entered_at?: string;
  
  // FY tracking flags
  is_closed_won?: boolean;
  is_closed_lost?: boolean;
  
  // Legal review fields
  legal_review_completed?: boolean;
  legal_review_completed_at?: string;
  legal_review_completed_by?: string;
  
  created_at: string;
  updated_at: string;
  
  // Original deal record for editing
  _raw?: Deal;
}

/**
 * Mark deal as lost
 */
export interface MarkAsLostDTO {
  reason: string;
  notes?: string;
}

// ============================================================================
// MEETINGS
// ============================================================================

export type MeetingType = "new_contact" | "existing_client" | "follow_up";
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type MeetingNoteType = "summary" | "follow_up" | "reminder";

export interface CRMMeeting {
  id: string;
  title: string;
  meeting_type: MeetingType;
  meeting_date: string;
  start_time: string;
  end_time?: string;
  location?: string;
  description?: string;
  contact_id?: string;
  account_id?: string;
  deal_id?: string;
  prospect_id?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  status: MeetingStatus;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relationships
  contact?: Contact;
  account?: Account;
  deal?: Deal;
  prospect?: Prospect;
  owner?: any;

  // Legacy aliases
  lead_id?: string;
  lead?: Contact;
}

export interface CRMMeetingNote {
  id: string;
  meeting_id: string;
  note_type: MeetingNoteType;
  content: string;
  note_date: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  creator?: any;
}

export type CreateMeetingDTO = Omit<CRMMeeting, "id" | "created_at" | "updated_at" | "created_by" | "contact" | "account" | "deal" | "prospect" | "owner" | "lead">;
export type UpdateMeetingDTO = Partial<CreateMeetingDTO>;

export type CreateMeetingNoteDTO = Omit<CRMMeetingNote, "id" | "created_at" | "updated_at" | "created_by" | "creator">;
export type UpdateMeetingNoteDTO = Partial<CreateMeetingNoteDTO>;

// ============================================================================
// PROSPECTS
// ============================================================================

export type ProspectStage =
  | "new"
  | "researched"
  | "outreach_started"
  | "engaged"
  | "qualified"
  | "nurture"
  | "disqualified";

export type ProspectPriority = "low" | "medium" | "high";

export type ProspectActivityType =
  | "email"
  | "call"
  | "linkedin"
  | "meeting_request"
  | "stage_change"
  | "follow_up_task";

export interface Prospect {
  id: string;
  name: string;
  account_id?: string | null;
  owner_id: string;
  stage: ProspectStage;
  summary?: string;
  source?: ContactSource;
  segment?: AccountSegment;
  priority: ProspectPriority;
  qualification_notes?: string;
  next_action?: string;
  next_action_due_date?: string;
  last_activity_at?: string;
  converted_to_deal_id?: string;
  converted_at?: string;
  nurture_reason?: string;
  disqualified_reason?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Relations
  account?: { id: string; name: string };
  owner?: { id: string; full_name: string; email: string };
  creator?: { id: string; full_name: string; email: string };
  prospect_contacts?: ProspectContact[];
}

export interface ProspectContact {
  id: string;
  prospect_id: string;
  contact_id: string;
  is_primary: boolean;
  role_label?: string;
  created_at: string;
  contact?: { id: string; contact_name: string; company_name?: string; email?: string };
}

export interface ProspectActivity {
  id: string;
  prospect_id: string;
  activity_type: ProspectActivityType;
  activity_summary: string;
  activity_at: string;
  owner_id: string;
  created_by: string;
  created_at: string;
  owner?: { id: string; full_name: string };
}

export type CreateProspectDTO = Omit<
  Prospect,
  "id" | "created_at" | "updated_at" | "account" | "owner" | "creator" | "prospect_contacts"
>;
export type UpdateProspectDTO = Partial<CreateProspectDTO>;

export type CreateProspectActivityDTO = Omit<ProspectActivity, "id" | "created_at" | "owner">;

export interface ProspectNote {
  id: string;
  prospect_id: string;
  note_content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface CreateProspectNoteDTO {
  prospect_id: string;
  note_content: string;
}
