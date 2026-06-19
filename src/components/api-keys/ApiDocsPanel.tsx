import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api-gateway`;

const endpointGroups = [
  {
    group: "Utility / AI-Agent",
    endpoints: [
      { method: "GET", path: "/resolve", desc: "Cross-entity name lookup. Params: q (required), type (deal,account,contact,stage,customer,project)" },
      { method: "GET", path: "/search", desc: "Grouped cross-CRM search. Params: q (required). Returns { deals, accounts, contacts, customers, projects }" },
      { method: "GET", path: "/meta/:resource", desc: "Field metadata, required fields, allowed values, FK resolution hints" },
      { method: "GET", path: "/version", desc: "API version" },
      { method: "GET", path: "/changelog", desc: "Breaking changes log" },
    ],
  },
  {
    group: "Timesheet",
    endpoints: [
      { method: "GET", path: "/timesheet-entries", desc: "List entries. Filters: user_id, project_id, contract_id, entry_type, incident_id, from_date, to_date, limit" },
      { method: "POST", path: "/timesheet-entries", desc: "Create timesheet entry. Required: entry_type, entry_date, hours_logged, notes (non-admin only). If entry_type=project: project_id required. If entry_type=contract: contract_id required. user_id auto-filled from API key. Non-admin: referenced project/contract must be ACTIVE and the caller must be assigned to it. Admin bypasses these and the notes requirement." },
      { method: "PATCH", path: "/timesheet-entries/:id", desc: "Update entry" },
      { method: "DELETE", path: "/timesheet-entries/:id", desc: "Delete entry" },
      { method: "GET", path: "/projects", desc: "List timesheet projects. Admin sees all; other roles see only ACTIVE projects they are assigned to (project_assignments)." },
      { method: "POST", path: "/projects", desc: "Create project. budget_hours defaults to 0 if not provided" },
      { method: "PATCH", path: "/projects/:id", desc: "Update project" },
      { method: "DELETE", path: "/projects/:id", desc: "Delete project" },
      { method: "GET", path: "/contracts", desc: "List contracts. Filters: status, customer_id, deal_id, limit. Returns customer_name, deal_name labels. Admin sees all; other roles see only ACTIVE contracts they are assigned to (contract_assignments)." },
      { method: "POST", path: "/contracts", desc: "Create contract. Required: name, start_date, end_date, status. Accepts customer_name, deal_name (auto-resolves to IDs)" },
      { method: "PATCH", path: "/contracts/:id", desc: "Update contract. Accepts customer_name, deal_name" },
      { method: "DELETE", path: "/contracts/:id", desc: "Delete contract" },
      { method: "GET", path: "/leaves", desc: "List leave applications. Filters: status, limit. Admin/manager also support user_id filter and see all records; other roles are scoped to their own leave only." },
      { method: "POST", path: "/leaves", desc: "Create leave. Required: leave_type_id, start_date, end_date, business_days_count, reason. user_id auto-filled from API key. Casual/temporary employees can only submit Unpaid Leave (403 CASUAL_UNPAID_ONLY otherwise)" },
      { method: "PATCH", path: "/leaves/:id", desc: "Update leave application" },
      { method: "DELETE", path: "/leaves/:id", desc: "Delete leave application" },
      { method: "GET", path: "/leaves/:id/attachments", desc: "List attachments for a leave application" },
      { method: "POST", path: "/leaves/:id/attachments", desc: "Upload supporting document. Accepts multipart/form-data (field 'file') OR application/json ({ file_base64, file_name, file_type }). Max 10MB. MIME: pdf/jpeg/png/gif/doc/docx" },
      { method: "DELETE", path: "/leaves/:id/attachments", desc: "Delete attachment. Required query: attachment_id=<uuid>" },
      { method: "GET", path: "/leave-types", desc: "List active leave types. Query: include_inactive=true to include disabled. Read-only. Uses leaves:read scope. Casual/temporary employees only see Unpaid Leave." },
      { method: "GET", path: "/leave-types/:id", desc: "Fetch a single leave type" },
      { method: "GET", path: "/expenses", desc: "List expenses. Filters: user_id, category_id, subcategory_id, status, account_id, deal_id, from_date, to_date, limit. Responses include enriched category_name and subcategory_name." },
      { method: "GET", path: "/expenses/:id", desc: "Fetch a single expense with enriched category_name and subcategory_name." },
      { method: "POST", path: "/expenses", desc: "Create expense. Required: amount (>0), expense_date (YYYY-MM-DD), category_id (or category_name to auto-resolve). user_id auto-filled from API key. Optional: subcategory_id, subcategory_name, description, merchant_name, notes, expense_type, tax_amount, account_id, deal_id, status" },
      { method: "PATCH", path: "/expenses/:id", desc: "Update expense. Accepts category_name / subcategory_name for auto-resolve." },
      { method: "DELETE", path: "/expenses/:id", desc: "Delete expense" },
      { method: "GET", path: "/expense-categories", desc: "List active expense categories (id, name, description, sort_order). Read-only. Uses expenses:read scope." },
      { method: "GET", path: "/expense-categories/:id", desc: "Fetch a single expense category." },
      { method: "GET", path: "/expense-subcategories", desc: "List active expense subcategories. Optional filter: category_id. Read-only. Uses expenses:read scope." },
      { method: "GET", path: "/expense-subcategories/:id", desc: "Fetch a single expense subcategory." },
      { method: "POST", path: "/expenses/:id/attachments", desc: "Upload a receipt file. Accepts multipart/form-data (field 'file') OR application/json ({ file_base64, file_name, file_type }). Max 10MB. Allowed: image/jpeg, image/png, image/webp, application/pdf. Stores file in expense-receipts bucket and records it in expense_attachments." },
      { method: "GET", path: "/expenses/:id/attachments", desc: "List attachments for an expense (id, file_name, file_url storage path, file_type, file_size, uploaded_at)." },
      { method: "DELETE", path: "/expenses/:id/attachments", desc: "Delete an attachment. Query: attachment_id=<uuid>. Removes both the DB row and the storage object." },
      { method: "GET", path: "/customers", desc: "List customers. Filters: limit" },
      { method: "POST", path: "/customers", desc: "Create customer. Required: name" },
      { method: "PATCH", path: "/customers/:id", desc: "Update customer" },
      { method: "DELETE", path: "/customers/:id", desc: "Delete customer" },
      { method: "GET", path: "/work-schedules", desc: "List work schedules. Admin sees all and supports ?user_id filter; other staff roles are auto-scoped to their own record only (user_id filter ignored). Filters: user_id (admin only), limit." },
      { method: "POST", path: "/work-schedules", desc: "Create work schedule. Admin only (no work-schedules:write scope for other roles). user_id auto-filled from API key if not provided." },
      { method: "PATCH", path: "/work-schedules/:id", desc: "Update work schedule. Admin only." },
      { method: "DELETE", path: "/work-schedules/:id", desc: "Delete work schedule. Admin only." },
      { method: "GET", path: "/weekly-work-schedules", desc: "List weekly per-week overrides of the default pattern. Admin sees all and supports ?user_id filter; other staff roles are auto-scoped to their own rows. Filters: user_id (admin only), week_start_date, limit." },
      { method: "POST", path: "/weekly-work-schedules", desc: "Create weekly schedule override. Admin only. Required: week_start_date. user_id auto-filled from API key." },
      { method: "PATCH", path: "/weekly-work-schedules/:id", desc: "Update weekly schedule override. Admin only." },
      { method: "DELETE", path: "/weekly-work-schedules/:id", desc: "Delete weekly schedule override. Admin only." },
      { method: "GET", path: "/daily-location-checkins", desc: "List daily location check-ins. Non-admin: returns own check-ins only. Admin: returns all users (filter by user_id, date, from_date, to_date, limit). Returns user_name, user_email" },
      { method: "GET", path: "/daily-location-checkins/:id", desc: "Get single check-in by ID" },
      { method: "POST", path: "/daily-location-checkins", desc: "Create daily check-in. Required: actual_location, check_in_date. user_id auto-filled from API key. actual_location: jolimont | collins_square | wfh | client | meetings | not_in_work" },
      { method: "PATCH", path: "/daily-location-checkins/:id", desc: "Update check-in (actual_location, end_time, notes, location_change_reason, etc.)" },
      { method: "DELETE", path: "/daily-location-checkins/:id", desc: "Delete check-in" },
      { method: "GET", path: "/team-members", desc: "List team members. Filters: incident_project_id, user_id, limit. Returns user profile data" },
      { method: "POST", path: "/team-members", desc: "Assign team member. Required: incident_project_id. user_id auto-filled from API key. role defaults to 'member'" },
      { method: "PATCH", path: "/team-members/:id", desc: "Update team member role" },
      { method: "DELETE", path: "/team-members/:id", desc: "Remove team member" },
    ],
  },
  {
    group: "CRM",
    endpoints: [
      { method: "GET", path: "/contacts", desc: "List CRM contacts. Filters: limit, category (name or ID). Response includes categories array [{id, name}]" },
      { method: "GET", path: "/contacts/:id", desc: "Get single contact by ID. Response includes categories array [{id, name}]" },
      { method: "POST", path: "/contacts", desc: "Create contact. Required: contact_name (or first_name+last_name, auto-composed), source (website|referral|linkedin|email_campaign|event|cold_outreach|partner|existing_client). Optional: company_name (auto-creates/links account), categories (array of names or IDs)" },
      { method: "PATCH", path: "/contacts/:id", desc: "Update contact. Optional: categories (array of names or IDs — replaces all existing assignments)" },
      { method: "DELETE", path: "/contacts/:id", desc: "Delete contact (admin only)" },
      { method: "GET", path: "/accounts", desc: "List CRM accounts" },
      { method: "POST", path: "/accounts", desc: "Create account" },
      { method: "PATCH", path: "/accounts/:id", desc: "Update account" },
      { method: "DELETE", path: "/accounts/:id", desc: "Delete account" },
      { method: "GET", path: "/deals", desc: "List deals. Filters: stage_id, stage_name, account_id, limit. Returns pipeline_stage_name, account_name, primary_contact_name" },
      { method: "POST", path: "/deals", desc: "Create deal. Accepts stage_name, account_name, contact_name (auto-resolves to IDs)" },
      { method: "PATCH", path: "/deals/:id", desc: "Update deal. Accepts stage_name, account_name, contact_name" },
      { method: "DELETE", path: "/deals/:id", desc: "Delete deal" },
      { method: "POST", path: "/deals/:id/transition", desc: "Workflow-safe stage move. Body: { to_stage: 'Discovery' }" },
      { method: "GET", path: "/deals/:id/notes", desc: "List deal stage notes (stage_name, created_by_name, note_content, created_at). Params: limit" },
      { method: "POST", path: "/deals/:id/notes", desc: "Add a deal stage note. Required: note_content. Optional: stage_name, stage_id, lost_reason, lost_reason_other" },
      { method: "GET", path: "/deals/:id/history", desc: "List deal stage transition history with from/to stage names. Params: limit" },
      { method: "GET", path: "/pipeline-stages", desc: "List pipeline stages (sorted by stage_order)" },
      { method: "GET", path: "/meetings", desc: "List meetings. Filters: contact_id, deal_id, status, from_date, to_date, limit. Returns contact_display_name, deal_name, account_name" },
      { method: "POST", path: "/meetings", desc: "Create meeting. Required: title, meeting_date, start_time, meeting_type (new_contact|existing_client|follow_up). owner_id always auto-filled from API key user (cannot be overridden). Accepts contact_name, account_name, deal_name (auto-resolves)" },
      { method: "PATCH", path: "/meetings/:id", desc: "Update meeting. Accepts name-based fields" },
      { method: "DELETE", path: "/meetings/:id", desc: "Delete meeting" },
      { method: "GET", path: "/meetings/:id/notes", desc: "List meeting notes (crm_meeting_notes). Params: limit (default 50)" },
      { method: "POST", path: "/meetings/:id/notes", desc: "Add meeting note. Required: content (or note_content alias). Optional: note_type (default 'general'), note_date. created_by auto-filled from API key user" },
      { method: "PATCH", path: "/meetings/:id/notes", desc: "Update a meeting note. Query: note_id=<uuid>. Accepts content, note_type, note_date" },
      { method: "DELETE", path: "/meetings/:id/notes", desc: "Delete a meeting note. Query: note_id=<uuid>" },
      { method: "GET", path: "/prospects", desc: "List prospect pursuits. Filters: account_id, stage, priority, owner_id, limit. Returns account_name, owner_name" },
      { method: "GET", path: "/prospects/:id", desc: "Get single prospect by ID" },
      { method: "POST", path: "/prospects", desc: "Create prospect. Required: name. Optional: account_id (or account_name, auto-resolves). owner_id + created_by auto-filled from API key user" },
      { method: "PATCH", path: "/prospects/:id", desc: "Update prospect. Accepts account_name, owner_name" },
      { method: "DELETE", path: "/prospects/:id", desc: "Delete prospect" },
      { method: "GET", path: "/prospect-contacts", desc: "List prospect-contact links. Filters: prospect_id, contact_id, limit. Returns contact_name" },
      { method: "POST", path: "/prospect-contacts", desc: "Link contact to prospect. Required: prospect_id, contact_id. Optional: is_primary, role_label" },
      { method: "PATCH", path: "/prospect-contacts/:id", desc: "Update link (is_primary, role_label)" },
      { method: "DELETE", path: "/prospect-contacts/:id", desc: "Remove contact link from prospect" },
      { method: "GET", path: "/prospects/:id/notes", desc: "List prospect notes (note_content, created_by_name, created_at). Params: limit" },
      { method: "POST", path: "/prospects/:id/notes", desc: "Add a prospect note. Required: note_content. created_by + created_by_name auto-filled from API key user" },
      { method: "DELETE", path: "/prospects/:id/notes?note_id=<uuid>", desc: "Delete a specific prospect note. Required query param: note_id" },
    ],
  },
  {
    group: "Incident Management",
    endpoints: [
      { method: "GET", path: "/incidents", desc: "List incidents. Filters: status, incident_project_id, priority_id, category_id, assigned_to, created_by, limit. Returns enriched: priority_name, priority_color, category_name, assignee_name, project_name" },
      { method: "POST", path: "/incidents", desc: "Create incident. Required: title, incident_project_id. status defaults to 'New'. incident_number auto-generated. created_by auto-filled from API key" },
      { method: "PATCH", path: "/incidents/:id", desc: "Update incident" },
      { method: "DELETE", path: "/incidents/:id", desc: "Delete incident" },
      { method: "GET", path: "/incidents/:id/comments", desc: "List comments for an incident. Filters: is_internal, limit. Returns author_name" },
      { method: "POST", path: "/incidents/:id/comments", desc: "Add comment. Required: content. Optional: is_internal. created_by auto-filled from API key" },
      { method: "GET", path: "/incident-projects", desc: "List incident projects. Filters: customer_id, is_active. Returns lead_name" },
      { method: "POST", path: "/incident-projects", desc: "Create incident project. Required: name, project_key" },
      { method: "PATCH", path: "/incident-projects/:id", desc: "Update incident project. Optional: description, lead_id, customer_id, icon_color, support_email_prefix, is_active" },
      { method: "DELETE", path: "/incident-projects/:id", desc: "Delete incident project" },
      { method: "GET", path: "/incident-priorities", desc: "List active incident priorities (read-only)" },
      { method: "GET", path: "/incident-categories", desc: "List active incident categories (read-only)" },
      { method: "GET", path: "/incident-templates", desc: "List active incident templates with default_priority_name, default_category_name (read-only)" },
      { method: "GET", path: "/customer-logins", desc: "List customer portal logins. Filters: company_id, is_active, email, limit. Returns company_name" },
      { method: "POST", path: "/customer-logins", desc: "Create customer login. Required: company_id (or company_name, auto-resolves), email. Optional: full_name, role (user|admin), is_active" },
      { method: "PATCH", path: "/customer-logins/:id", desc: "Update customer login" },
      { method: "DELETE", path: "/customer-logins/:id", desc: "Delete customer login" },
      { method: "GET", path: "/assets", desc: "List assets. Filters: search (label/serial_number/asset_key), type_id, status_id, group_id, owner_user_id, warranty_expiring_days, page, limit. Returns enriched: type_name, status_name, status_colour, group_name, owner_name" },
      { method: "GET", path: "/assets/:id", desc: "Get single asset by ID with enriched labels" },
      { method: "POST", path: "/assets", desc: "Create asset. Required: label, type_id, status_id. Optional: group_id, owner_user_id, location, serial_number, purchase_date, warranty_expiry, cost, notes. asset_key auto-generated from group prefix if group_id provided. created_by auto-filled from API key" },
      { method: "PATCH", path: "/assets/:id", desc: "Update asset" },
      { method: "DELETE", path: "/assets/:id", desc: "Delete asset (hard delete)" },
      { method: "GET", path: "/asset-groups", desc: "List active asset groups. Filter: customer_id. Returns customer_name" },
      { method: "GET", path: "/asset-groups/:id", desc: "Get single asset group" },
      { method: "POST", path: "/asset-groups", desc: "Create asset group. Required: name. Optional: description, color, customer_id, sort_order" },
      { method: "PATCH", path: "/asset-groups/:id", desc: "Update asset group" },
      { method: "DELETE", path: "/asset-groups/:id", desc: "Soft-delete asset group (sets is_active=false, preserves linked assets)" },
      { method: "GET", path: "/asset-types", desc: "List all asset types (read-only lookup)" },
      { method: "GET", path: "/asset-statuses", desc: "List all asset statuses. is_terminal=true indicates a final state (e.g. Decommissioned) (read-only lookup)" },
      { method: "GET", path: "/portal-groups", desc: "List active portal groups. Filter: customer_id. Sorted by sort_order" },
      { method: "GET", path: "/portal-groups/:id", desc: "Get single portal group" },
      { method: "POST", path: "/portal-groups", desc: "Create portal group. Required: name. Optional: customer_id, description, icon, sort_order" },
      { method: "PATCH", path: "/portal-groups/:id", desc: "Update portal group" },
      { method: "DELETE", path: "/portal-groups/:id", desc: "Soft-delete portal group (sets is_active=false)" },
      { method: "GET", path: "/portal-request-types", desc: "List active portal request types. Filter: category (Incidents | Service requests). Sorted by sort_order" },
      { method: "GET", path: "/portal-request-types/:id", desc: "Get single portal request type" },
      { method: "POST", path: "/portal-request-types", desc: "Create portal request type. Required: name. Optional: description, icon, category, form_schema, sort_order" },
      { method: "PATCH", path: "/portal-request-types/:id", desc: "Update portal request type" },
      { method: "DELETE", path: "/portal-request-types/:id", desc: "Soft-delete portal request type (sets is_active=false)" },
      { method: "GET", path: "/portal-group-request-types", desc: "List portal group ↔ request type links. Filters: portal_group_id, request_type_id. Returns enriched portal_group and request_type names" },
      { method: "GET", path: "/portal-group-request-types/:id", desc: "Get single link" },
      { method: "POST", path: "/portal-group-request-types", desc: "Link a request type to a portal group. Required: portal_group_id, request_type_id. Optional: sort_order" },
      { method: "PATCH", path: "/portal-group-request-types/:id", desc: "Update link (e.g. sort_order)" },
      { method: "DELETE", path: "/portal-group-request-types/:id", desc: "Remove request type from portal group" },
    ],
  },
  {
    group: "Timesheet",
    endpoints: [
      { method: "GET", path: "/ohs-hazard-reports", desc: "List hazard reports. Filters: status, limit" },
      { method: "POST", path: "/ohs-hazard-reports", desc: "Create hazard report. Required: title, site_area, category, consequence. created_by auto-filled from API key" },
      { method: "PATCH", path: "/ohs-hazard-reports/:id", desc: "Update hazard report" },
      { method: "DELETE", path: "/ohs-hazard-reports/:id", desc: "Delete hazard report" },
      { method: "GET", path: "/ohs-hr-incidents", desc: "List HR incidents. Filters: status, limit" },
      { method: "POST", path: "/ohs-hr-incidents", desc: "Create HR incident. Required: description, incident_date, location, prepared_by" },
      { method: "PATCH", path: "/ohs-hr-incidents/:id", desc: "Update HR incident" },
      { method: "DELETE", path: "/ohs-hr-incidents/:id", desc: "Delete HR incident" },
      { method: "GET", path: "/ohs-injury-registers", desc: "List injury registers. Filters: status, limit" },
      { method: "POST", path: "/ohs-injury-registers", desc: "Create injury register. Required: injured_person_name, incident_date, incident_time, location, injury_description, injury_severity, body_parts_affected, is_am_pm, entry_maker_name, entry_maker_position, entry_maker_date. created_by auto-filled from API key" },
      { method: "PATCH", path: "/ohs-injury-registers/:id", desc: "Update injury register" },
      { method: "DELETE", path: "/ohs-injury-registers/:id", desc: "Delete injury register" },
      { method: "GET", path: "/ohs-workplace-inspections", desc: "List inspections. Filters: overall_status, limit" },
      { method: "POST", path: "/ohs-workplace-inspections", desc: "Create inspection. Required: inspection_date, site_area. inspector_id and created_by auto-filled from API key" },
      { method: "PATCH", path: "/ohs-workplace-inspections/:id", desc: "Update inspection" },
      { method: "DELETE", path: "/ohs-workplace-inspections/:id", desc: "Delete inspection" },
    ],
  },
  {
    group: "General",
    endpoints: [
      { method: "GET", path: "/profiles", desc: "List user profiles (includes role)" },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "text-green-600 dark:text-green-400",
  POST: "text-blue-600 dark:text-blue-400",
  PATCH: "text-amber-600 dark:text-amber-400",
  DELETE: "text-red-600 dark:text-red-400",
};

const ApiDocsPanel = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Include your API key in the <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code> header with every request.
          </p>
          <div className="bg-muted p-3 rounded-lg">
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -H "x-api-key: sk_your_key_here" \\
  "${BASE_URL}/incidents"`}</pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm bg-muted px-2 py-1 rounded break-all">{BASE_URL}</code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-Agent Features (v2.5.0)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong>Auto-fill user fields:</strong> <code className="bg-muted px-1 rounded">user_id</code>, <code className="bg-muted px-1 rounded">created_by</code>, <code className="bg-muted px-1 rounded">inspector_id</code>, and <code className="bg-muted px-1 rounded">manager_taking_report</code> are automatically filled from the API key's assigned user when omitted. No need to send them explicitly.</p>
          <p><strong>Enum normalization:</strong> Enum values are case-insensitive. <code className="bg-muted px-1 rounded">slip_trip_fall</code>, <code className="bg-muted px-1 rounded">Slip-Trip-Fall</code>, and <code className="bg-muted px-1 rounded">SLIP_TRIP_FALL</code> are all accepted and normalized automatically.</p>
          <p><strong>user_id alias:</strong> For <code className="bg-muted px-1 rounded">projects</code> and <code className="bg-muted px-1 rounded">contracts</code>, sending <code className="bg-muted px-1 rounded">user_id</code> in the request body is silently aliased to <code className="bg-muted px-1 rounded">created_by</code>.</p>
          <p><strong>Name-based writes:</strong> Use <code className="bg-muted px-1 rounded">account_name</code>, <code className="bg-muted px-1 rounded">contact_name</code>, <code className="bg-muted px-1 rounded">customer_name</code>, <code className="bg-muted px-1 rounded">company_name</code>, <code className="bg-muted px-1 rounded">deal_name</code>, <code className="bg-muted px-1 rounded">stage_name</code> in POST/PATCH — the API auto-resolves to IDs.</p>
          <p><strong>Enriched GETs:</strong> Deals return <code className="bg-muted px-1 rounded">pipeline_stage_name</code>, <code className="bg-muted px-1 rounded">account_name</code>, <code className="bg-muted px-1 rounded">primary_contact_name</code>. Meetings return <code className="bg-muted px-1 rounded">contact_display_name</code>, <code className="bg-muted px-1 rounded">deal_name</code>. Contracts return <code className="bg-muted px-1 rounded">customer_name</code>, <code className="bg-muted px-1 rounded">deal_name</code>. Incidents return <code className="bg-muted px-1 rounded">assignee_name</code>, <code className="bg-muted px-1 rounded">project_name</code>, <code className="bg-muted px-1 rounded">priority_name</code>, <code className="bg-muted px-1 rounded">category_name</code>. Comments return <code className="bg-muted px-1 rounded">author_name</code>, <code className="bg-muted px-1 rounded">author_email</code>.</p>
          <p><strong>Idempotency:</strong> Send <code className="bg-muted px-1 rounded">Idempotency-Key</code> header on POST to prevent duplicate creates.</p>
          <p><strong>API-key auth:</strong> All write operations work with API-key authentication (no user session required). Audit triggers gracefully skip logging when no session is present.</p>
          <p><strong>⚠️ Key scopes:</strong> API-key permissions are set at creation time based on the assigned user's role. If new scopes are added to the system (e.g. <code className="bg-muted px-1 rounded">ohs</code>, <code className="bg-muted px-1 rounded">work-schedules</code>), you must <strong>recreate the API key</strong> to include them — existing keys do not auto-update.</p>
          <p><strong>Structured errors:</strong> All errors return <code className="bg-muted px-1 rounded">{`{ error: { code, message, hint, fix_example } }`}</code></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {endpointGroups.map((group) => (
              <div key={group.group}>
                <h4 className="font-semibold text-sm mb-2">{group.group}</h4>
                <div className="space-y-1">
                  {group.endpoints.map((ep, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0 text-sm">
                      <span className={`font-mono font-bold w-16 shrink-0 ${methodColors[ep.method]}`}>
                        {ep.method}
                      </span>
                      <code className="text-foreground shrink-0">{ep.path}</code>
                      <span className="text-muted-foreground">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Resolve a name to ID</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -H "x-api-key: sk_your_key_here" \\
  "${BASE_URL}/resolve?q=CSL&type=deal,account"`}</pre>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Cross-CRM search</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -H "x-api-key: sk_your_key_here" \\
  "${BASE_URL}/search?q=Acme"`}</pre>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create a leave application</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"leave_type_id":"uuid","start_date":"2026-03-10","end_date":"2026-03-12","business_days_count":3,"reason":"Family event"}' \\
  "${BASE_URL}/leaves"`}</pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1"><code className="bg-muted px-1 rounded">user_id</code> auto-filled from API key's assigned user</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create an expense</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":150.00,"expense_date":"2026-03-05","description":"Client lunch"}' \\
  "${BASE_URL}/expenses"`}</pre>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create a customer</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Acme Corp","industry":"Technology","email":"info@acme.com"}' \\
  "${BASE_URL}/customers"`}</pre>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create an asset (asset_key auto-generated)</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"label":"Dell Laptop #42","type_id":"uuid","status_id":"uuid","group_id":"uuid","serial_number":"SN-12345","location":"Level 3 - IT Storage"}' \\
  "${BASE_URL}/assets"`}</pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1"><code className="bg-muted px-1 rounded">asset_key</code> is auto-generated from the group prefix when <code className="bg-muted px-1 rounded">group_id</code> is provided. <code className="bg-muted px-1 rounded">created_by</code> auto-filled from API key.</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create an OHS hazard report</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Wet floor","site_area":"Reception","category":"Slip-Trip-Fall","consequence":"Minor"}' \\
  "${BASE_URL}/ohs-hazard-reports"`}</pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1"><code className="bg-muted px-1 rounded">created_by</code> auto-filled. Enum values are case-insensitive.</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Assign a team member to an incident project</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"incident_project_id":"uuid","role":"admin"}' \\
  "${BASE_URL}/team-members"`}</pre>
            </div>
             <p className="text-xs text-muted-foreground mt-1"><code className="bg-muted px-1 rounded">user_id</code> auto-filled from API key's assigned user</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create a customer login (using company_name)</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"company_name":"Acme Corp","email":"john@acme.com","full_name":"John Smith","role":"user"}' \\
  "${BASE_URL}/customer-logins"`}</pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1"><code className="bg-muted px-1 rounded">company_name</code> auto-resolves to <code className="bg-muted px-1 rounded">company_id</code> via the customers table. You can also pass <code className="bg-muted px-1 rounded">company_id</code> directly.</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create a timesheet entry</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"entry_type":"project","project_id":"uuid","entry_date":"2026-02-10","hours_logged":2,"notes":"Bot entry"}' \\
  "${BASE_URL}/timesheet-entries"`}</pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1"><code className="bg-muted px-1 rounded">entry_type</code> is required: <code className="bg-muted px-1 rounded">"project"</code> or <code className="bg-muted px-1 rounded">"contract"</code></p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Create an incident (incident_number auto-generated)</p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  -H "x-api-key: sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Server down","status":"open","incident_project_id":"uuid"}' \\
  "${BASE_URL}/incidents"`}</pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1"><code className="bg-muted px-1 rounded">incident_number</code> is auto-generated from the project key (e.g. <code className="bg-muted px-1 rounded">PROJ-0001</code>). Do not send it.</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Scope Reference</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><code className="bg-muted px-1 rounded">incidents:read</code> / <code className="bg-muted px-1 rounded">incidents:write</code> — Incidents, Incident Projects, Priorities, Categories, Templates, Comments, Team Members, Assets, Asset Groups, Asset Types, Asset Statuses, Portal Groups, Portal Request Types, Portal Group Request Types</p>
              <p><code className="bg-muted px-1 rounded">timesheet:read</code> / <code className="bg-muted px-1 rounded">timesheet:write</code> — Timesheet Entries</p>
              <p><code className="bg-muted px-1 rounded">projects:read</code> / <code className="bg-muted px-1 rounded">projects:write</code> — Projects</p>
              <p><code className="bg-muted px-1 rounded">contacts:read</code> / <code className="bg-muted px-1 rounded">contacts:write</code> — CRM Contacts</p>
              <p><code className="bg-muted px-1 rounded">accounts:read</code> / <code className="bg-muted px-1 rounded">accounts:write</code> — CRM Accounts</p>
              <p><code className="bg-muted px-1 rounded">deals:read</code> / <code className="bg-muted px-1 rounded">deals:write</code> — CRM Deals, Pipeline Stages, Transitions</p>
              <p><code className="bg-muted px-1 rounded">prospects:read</code> / <code className="bg-muted px-1 rounded">prospects:write</code> — CRM Prospects, Prospect Contacts, Prospect Notes</p>
              <p><code className="bg-muted px-1 rounded">meetings:read</code> / <code className="bg-muted px-1 rounded">meetings:write</code> — CRM Meetings, Meeting Notes</p>
              <p><code className="bg-muted px-1 rounded">contracts:read</code> / <code className="bg-muted px-1 rounded">contracts:write</code> — Contracts</p>
              <p><code className="bg-muted px-1 rounded">leaves:read</code> / <code className="bg-muted px-1 rounded">leaves:write</code> — Leave Applications</p>
              <p><code className="bg-muted px-1 rounded">expenses:read</code> / <code className="bg-muted px-1 rounded">expenses:write</code> — Expenses</p>
              <p><code className="bg-muted px-1 rounded">customers:read</code> / <code className="bg-muted px-1 rounded">customers:write</code> — Customers</p>
              <p><code className="bg-muted px-1 rounded">ohs:read</code> / <code className="bg-muted px-1 rounded">ohs:write</code> — OHS Hazard Reports, HR Incidents, Injury Registers, Workplace Inspections</p>
              <p><code className="bg-muted px-1 rounded">work-schedules:read</code> / <code className="bg-muted px-1 rounded">work-schedules:write</code> — Work Schedules, Weekly Work Schedules. Read: all staff roles (self-scoped — non-admin callers only see their own rows). Write: admin only.</p>
              <p><code className="bg-muted px-1 rounded">work-location:read</code> / <code className="bg-muted px-1 rounded">work-location:write</code> — Daily Location Check-ins (all roles)</p>
              <p><code className="bg-muted px-1 rounded">profiles:read</code> — User Profiles</p>
              <p><code className="bg-muted px-1 rounded">*:*</code> — Full access (all resources)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role → Scope Matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Effective scopes = intersection of the API key's configured scopes and the assigned user's role scopes. R = read, W = write.</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-2 font-semibold text-foreground">Scope</th>
                  <th className="py-1 px-1 font-semibold text-foreground">admin</th>
                  <th className="py-1 px-1 font-semibold text-foreground">manager</th>
                  <th className="py-1 px-1 font-semibold text-foreground">sale_manager</th>
                  <th className="py-1 px-1 font-semibold text-foreground">sale_user</th>
                  <th className="py-1 px-1 font-semibold text-foreground">employee</th>
                  <th className="py-1 px-1 font-semibold text-foreground">customer</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["incidents", "RW", "RW", "RW", "RW", "RW", "R"],
                  ["timesheet", "RW", "RW", "RW", "RW", "RW", "—"],
                  ["projects", "RW", "RW", "R", "R", "R", "—"],
                  ["contacts", "RW", "—", "RW", "RW", "—", "—"],
                  ["accounts", "RW", "—", "RW", "RW", "—", "—"],
                  ["deals", "RW", "—", "RW", "RW", "—", "—"],
                  ["meetings", "RW", "—", "RW", "RW", "—", "—"],
                  ["prospects", "RW", "—", "RW", "RW", "—", "—"],
                  ["contracts", "RW", "RW", "R", "R", "R", "—"],
                  ["leaves", "RW", "RW", "RW", "RW", "RW", "—"],
                  ["expenses", "RW", "RW", "RW", "RW", "RW", "—"],
                  ["customers", "RW", "RW", "RW", "R", "—", "—"],
                  ["assets", "RW", "RW", "RW", "R", "RW", "—"],
                  ["work-schedules", "RW", "R", "R", "R", "R", "—"],
                  ["work-location", "RW", "RW", "RW", "RW", "RW", "—"],
                  ["profiles", "R", "R", "R", "R", "R", "R"],
                  ["ohs", "RW", "—", "—", "—", "—", "—"],
                ].map(([scope, ...cells]) => (
                  <tr key={scope} className="border-b">
                    <td className="py-1 pr-2"><code className="bg-muted px-1 rounded">{scope}</code></td>
                    {cells.map((c, i) => (
                      <td key={i} className="py-1 px-1 text-center">{c === "—" ? <span className="text-muted-foreground/50">—</span> : <span className="text-foreground font-medium">{c}</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs">Notes: <code className="bg-muted px-1 rounded">work-schedules:write</code> is admin-only even when the :read scope is granted. <code className="bg-muted px-1 rounded">customer</code> role gets <code className="bg-muted px-1 rounded">incidents:read</code> only (no write). Row-level ownership is enforced by RLS on top of scopes.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-1">403 INSUFFICIENT_SCOPE</p>
            <p>API key scopes are frozen at creation time based on the assigned user's role. If new scopes were added after the key was created (e.g. <code className="bg-muted px-1 rounded">ohs:read</code>, <code className="bg-muted px-1 rounded">work-schedules:read</code>, <code className="bg-muted px-1 rounded">customers:write</code>, <code className="bg-muted px-1 rounded">leaves:write</code>, <code className="bg-muted px-1 rounded">expenses:write</code>, <code className="bg-muted px-1 rounded">assets:write</code>, <code className="bg-muted px-1 rounded">incidents:read</code>), the key won't have them. <span className="text-foreground">v2.12.1 added <code className="bg-muted px-1 rounded">expenses:write</code> and <code className="bg-muted px-1 rounded">assets:write</code> to the employee role. v2.12.2 added <code className="bg-muted px-1 rounded">work-schedules:read</code> to manager, sale_manager, sale_user and employee (self-scoped reads). Regenerate affected keys after each release.</span></p>
            <p className="mt-1"><strong className="text-foreground">Fix:</strong> Delete and recreate the API key. The new key will inherit the full scope set from the assigned user's current role.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">400 MISSING_REQUIRED_FIELD</p>
            <p><strong className="text-foreground">Fixed in v2.1.7:</strong> <code className="bg-muted px-1 rounded">user_id</code>, <code className="bg-muted px-1 rounded">created_by</code>, <code className="bg-muted px-1 rounded">inspector_id</code> are now auto-filled from the API key and no longer required in the request body. PATCH requests auto-strip unknown fields.</p>
            <p className="mt-1">Use <code className="bg-muted px-1 rounded">GET /meta/:resource</code> to discover valid fields for any resource.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">400 INVALID_ENUM_VALUE</p>
            <p><strong className="text-foreground">Fixed in v2.1.7:</strong> Enum values are now case-insensitive. <code className="bg-muted px-1 rounded">slip_trip_fall</code>, <code className="bg-muted px-1 rounded">Slip-Trip-Fall</code>, and <code className="bg-muted px-1 rounded">SLIP_TRIP_FALL</code> are all accepted.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiDocsPanel;
