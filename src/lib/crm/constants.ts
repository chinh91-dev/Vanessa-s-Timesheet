/**
 * CRM Constants, Enums, and Display Values
 * Australian English copy
 */

import type {
  AccountSegment,
  ContactSource,
  DealStatus,
  BillingCadence,
  BillingType,
  LastContactType,
  SignatureStatus,
  TaskStatus,
  TaskPriority,
  ApprovalStatus,
  IntegrationJobType,
  IntegrationJobStatus,
} from "./types";

// ============================================================================
// ACCOUNT
// ============================================================================

export const ACCOUNT_SEGMENTS: Record<AccountSegment, string> = {
  enterprise: "Enterprise",
  mid_market: "Mid-Market",
  small_business: "Small Business",
  startup: "Startup",
};

export const AUSTRALIAN_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

export const INDUSTRIES = [
  "Agriculture",
  "Construction",
  "Education",
  "Finance & Insurance",
  "Healthcare",
  "Hospitality",
  "Information Technology",
  "Manufacturing",
  "Mining",
  "Professional Services",
  "Real Estate",
  "Retail",
  "Telecommunications",
  "Transport & Logistics",
  "Utilities",
  "Other",
];

// ============================================================================
// CONTACTS
// ============================================================================

export const CONTACT_SOURCES: Record<ContactSource, string> = {
  website: "Website",
  referral: "Referral",
  linkedin: "LinkedIn",
  email_campaign: "Email Campaign",
  event: "Event",
  cold_outreach: "Cold Outreach",
  partner: "Partner",
  existing_client: "Existing Client",
};

// Legacy alias for backward compatibility
export const LEAD_SOURCES = CONTACT_SOURCES;

export const LAST_CONTACT_TYPES: Record<LastContactType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
};

// ============================================================================
// DEALS
// ============================================================================

export const DEAL_STATUSES: Record<DealStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "hsl(var(--muted))" },
  pending_approval: { label: "Pending Approval", color: "hsl(var(--warning))" },
  approved: { label: "Approved", color: "hsl(var(--success))" },
  active: { label: "Active", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--muted))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--destructive))" },
};

// Alias for easier access
export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const BILLING_CADENCES: Record<BillingCadence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  one_time: "One-Time",
};

export const BILLING_TYPES: Record<BillingType, string> = {
  monthly: "Monthly",
  one_off: "One-off",
  t_and_m: "T&M",
};

export const SIGNATURE_STATUSES: Record<SignatureStatus, { label: string; color: string }> = {
  not_sent: { label: "Not Sent", color: "hsl(var(--muted))" },
  sent: { label: "Sent", color: "hsl(var(--chart-1))" },
  signed: { label: "Signed", color: "hsl(var(--success))" },
  declined: { label: "Declined", color: "hsl(var(--destructive))" },
};

// ============================================================================
// TASKS
// ============================================================================

export const TASK_STATUSES: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "hsl(var(--muted))" },
  in_progress: { label: "In Progress", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--success))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--destructive))" },
};

export const TASK_PRIORITIES: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "hsl(var(--muted))" },
  medium: { label: "Medium", color: "hsl(var(--chart-2))" },
  high: { label: "High", color: "hsl(var(--warning))" },
  urgent: { label: "Urgent", color: "hsl(var(--destructive))" },
};

// ============================================================================
// INTEGRATIONS
// ============================================================================

export const INTEGRATION_JOB_TYPES: Record<IntegrationJobType, string> = {
  jira_sync: "Jira Sync",
  outlook_sync: "Outlook Sync",
  esignature_sync: "E-signature Sync",
  webhook: "Webhook",
};

export const INTEGRATION_JOB_STATUSES: Record<IntegrationJobStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "hsl(var(--muted))" },
  running: { label: "Running", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--success))" },
  failed: { label: "Failed", color: "hsl(var(--destructive))" },
};

export const APPROVAL_STATUSES: Record<ApprovalStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "hsl(var(--muted))" },
  approved: { label: "Approved", color: "hsl(var(--success))" },
  archived: { label: "Archived", color: "hsl(var(--muted))" },
};

// ============================================================================
// PIPELINE STAGE COLORS
// ============================================================================

export const PIPELINE_STAGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const DEFAULT_DATE_FORMAT = "dd/MM/yyyy";
export const DEFAULT_DATETIME_FORMAT = "dd/MM/yyyy h:mm a";

export const TIMEZONE = "Australia/Melbourne";

// ============================================================================
// COPY (AUSTRALIAN ENGLISH)
// ============================================================================

export const EMPTY_STATE_COPY = {
  accounts: {
    title: "No accounts yet",
    description: "Let's create your first account to get started.",
    action: "Create Account",
  },
  deals: {
    title: "No deals yet",
    description: "Create deals to manage sales contracts.",
    action: "Create Deal",
  },
  contacts: {
    title: "No contacts yet",
    description: "Start capturing contacts to grow your pipeline.",
    action: "Create Contact",
  },
  // Legacy alias
  leads: {
    title: "No contacts yet",
    description: "Start capturing contacts to grow your pipeline.",
    action: "Create Contact",
  },
  services: {
    title: "No services yet",
    description: "Add services to your catalogue to use in deals.",
    action: "Create Service",
  },
  tasks: {
    title: "No tasks assigned to you",
    description: "Enjoy your day! You're all caught up.",
    action: null,
  },
};

export const PERMISSION_DENIED_MESSAGES = {
  view: "You don't have permission to view this.",
  create: "You don't have permission to create this.",
  edit: "You don't have permission to edit this.",
  delete: "You don't have permission to delete this.",
  approve: "You don't have permission to approve this.",
  assign: "You don't have permission to assign this.",
  access_admin: "You don't have permission to access the admin console.",
  access_crm: "You don't have permission to access CRM.",
};

// ============================================================================
// MEETINGS
// ============================================================================

import type { MeetingType, MeetingStatus, MeetingNoteType } from "./types";

export const MEETING_TYPES: Record<MeetingType, { label: string; color: string }> = {
  new_contact: { label: "New Contact", color: "hsl(142, 71%, 45%)" },      // Green
  existing_client: { label: "Existing Client", color: "hsl(262, 83%, 58%)" },  // Purple
  follow_up: { label: "Follow-up", color: "hsl(38, 92%, 50%)" },     // Orange
};

export const MEETING_STATUSES: Record<MeetingStatus, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--success))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--muted))" },
  no_show: { label: "No Show", color: "hsl(var(--destructive))" },
};

export const MEETING_NOTE_TYPES: Record<MeetingNoteType, { label: string; icon: string }> = {
  summary: { label: "Summary", icon: "FileText" },
  follow_up: { label: "Follow-up", icon: "ArrowRight" },
  reminder: { label: "Reminder", icon: "Bell" },
};

// ============================================================================
// PROSPECTS
// ============================================================================

import type { ProspectStage, ProspectPriority, ProspectActivityType } from "./types";

export const PROSPECT_STAGES: Record<ProspectStage, { label: string; color: string; description: string }> = {
  new:              { label: "New",              color: "hsl(var(--muted))",        description: "Added, no work done yet" },
  researched:       { label: "Researched",       color: "hsl(217, 91%, 60%)",       description: "Account reviewed, key contacts found, notes added" },
  outreach_started: { label: "Outreach Started", color: "hsl(38, 92%, 50%)",        description: "First email, call, or LinkedIn touch made" },
  engaged:          { label: "Engaged",          color: "hsl(262, 83%, 58%)",       description: "Replied or meaningfully interacted" },
  qualified:        { label: "Qualified",        color: "hsl(142, 71%, 45%)",       description: "Real opportunity — ready to convert to Deal" },
  nurture:          { label: "Nurture",          color: "hsl(var(--chart-4))",      description: "Not ready now, follow up later" },
  disqualified:     { label: "Disqualified",     color: "hsl(var(--destructive))",  description: "Wrong fit, no need, or dead lead" },
};

export const PROSPECT_PRIORITIES: Record<ProspectPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "hsl(var(--muted))" },
  medium: { label: "Medium", color: "hsl(38, 92%, 50%)" },
  high:   { label: "High",   color: "hsl(var(--destructive))" },
};

export const PROSPECT_ACTIVITY_TYPES: Record<ProspectActivityType, { label: string; icon: string }> = {
  email:           { label: "Email",           icon: "Mail" },
  call:            { label: "Call",            icon: "Phone" },
  linkedin:        { label: "LinkedIn",        icon: "Linkedin" },
  meeting_request: { label: "Meeting Request", icon: "Calendar" },
  stage_change:    { label: "Stage Change",    icon: "ArrowRight" },
  follow_up_task:  { label: "Follow-up Task",  icon: "CheckSquare" },
};

// Which stages require a next_action to be set
export const PROSPECT_STAGES_REQUIRING_NEXT_ACTION: ProspectStage[] = [
  "new",
  "researched",
  "outreach_started",
  "engaged",
  "qualified",
  "nurture",
];

// Which stages are considered terminal (converted or closed)
export const PROSPECT_TERMINAL_STAGES: ProspectStage[] = ["disqualified"];

// Stale threshold in days — warn if no activity logged within this period
export const PROSPECT_STALE_DAYS = 7;
