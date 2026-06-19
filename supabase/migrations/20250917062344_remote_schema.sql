create extension if not exists "pgjwt" with schema "extensions";

drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

create type "public"."consequence_level" as enum ('Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic');

create type "public"."control_hierarchy" as enum ('Eliminate', 'Substitute', 'Isolate', 'Engineer', 'Administration', 'PPE');

create type "public"."employment_status" as enum ('full-time', 'part-time');

create type "public"."expense_status" as enum ('draft', 'submitted', 'approved', 'rejected');

create type "public"."hazard_category" as enum ('Physical', 'Chemical', 'Biological', 'Mechanical-Electrical', 'Psychological');

create type "public"."hierarchy_of_control" as enum ('Elimination', 'Substitution', 'Engineering Controls', 'Administrative Controls', 'PPE');

create type "public"."injury_severity" as enum ('First Aid', 'Medical Treatment', 'Lost Time', 'Permanent Disability', 'Fatality');

create type "public"."inspection_status" as enum ('Compliant', 'Non-Compliant', 'Not Applicable', 'Requires Action');

create type "public"."leave_status" as enum ('pending', 'approved', 'rejected', 'cancelled');

create type "public"."likelihood_level" as enum ('Very Unlikely', 'Unlikely', 'Possible', 'Likely', 'Very Likely');

create type "public"."ohs_status" as enum ('Open', 'In Progress', 'Under Review', 'Closed', 'Cancelled');

create type "public"."user_role" as enum ('employee', 'manager', 'admin');

create type "public"."work_location" as enum ('jolimont', 'southbank', 'wfh', 'client', 'meetings', 'not_in_work');


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "user_name" text,
    "action" text not null,
    "entity_name" text,
    "description" text,
    "details" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."contract_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "contract_id" uuid not null,
    "user_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now(),
    "assigned_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."contract_assignments" enable row level security;


  create table "public"."contract_services" (
    "id" uuid not null default gen_random_uuid(),
    "contract_id" uuid not null,
    "service_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."contract_services" enable row level security;


  create table "public"."contracts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "start_date" date not null,
    "end_date" date not null,
    "status" text not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "file_id" uuid,
    "file_name" text,
    "file_url" text,
    "file_size" integer,
    "file_type" text,
    "uploaded_at" timestamp with time zone default now(),
    "customer_id" uuid
      );


alter table "public"."contracts" enable row level security;


  create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text,
    "phone" text,
    "company" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."customers" enable row level security;


  create table "public"."daily_location_checkins" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "check_in_date" date not null,
    "planned_location" work_location,
    "actual_location" work_location not null,
    "check_in_time" timestamp with time zone not null default now(),
    "location_change_reason" text,
    "notes" text,
    "late_checkin" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "end_time" timestamp with time zone
      );


alter table "public"."daily_location_checkins" enable row level security;


  create table "public"."expense_attachments" (
    "id" uuid not null default gen_random_uuid(),
    "expense_id" uuid not null,
    "file_name" text not null,
    "file_url" text not null,
    "file_type" text,
    "file_size" integer,
    "uploaded_at" timestamp with time zone not null default now()
      );


alter table "public"."expense_attachments" enable row level security;


  create table "public"."expense_categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."expense_categories" enable row level security;


  create table "public"."expense_subcategories" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid not null,
    "name" text not null,
    "description" text,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."expense_subcategories" enable row level security;


  create table "public"."expenses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "category_id" uuid not null,
    "subcategory_id" uuid,
    "amount" numeric(10,2) not null,
    "description" text,
    "expense_date" date not null,
    "receipt_url" text,
    "status" expense_status not null default 'draft'::expense_status,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "approved_by" uuid,
    "rejection_reason" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."expenses" enable row level security;


  create table "public"."leave_application_attachments" (
    "id" uuid not null default gen_random_uuid(),
    "application_id" uuid not null,
    "file_name" text not null,
    "file_url" text not null,
    "file_type" text not null,
    "file_size" integer,
    "uploaded_at" timestamp with time zone not null default now()
      );


alter table "public"."leave_application_attachments" enable row level security;


  create table "public"."leave_applications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "leave_type_id" uuid not null,
    "start_date" date not null,
    "end_date" date not null,
    "business_days_count" numeric(4,1) not null,
    "reason" text,
    "status" leave_status not null default 'pending'::leave_status,
    "submitted_at" timestamp with time zone not null default now(),
    "approved_at" timestamp with time zone,
    "approved_by" uuid,
    "manager_comments" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."leave_applications" enable row level security;


  create table "public"."leave_balance_operations" (
    "id" uuid not null default gen_random_uuid(),
    "operation_type" text not null,
    "user_id" uuid,
    "leave_type_id" uuid,
    "year" integer not null,
    "amount" numeric not null,
    "reason" text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "details" jsonb
      );


alter table "public"."leave_balance_operations" enable row level security;


  create table "public"."leave_balances" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "leave_type_id" uuid not null,
    "year" integer not null default EXTRACT(year FROM CURRENT_DATE),
    "total_days" numeric(5,1) not null default 0,
    "used_days" numeric(5,1) not null default 0,
    "remaining_days" numeric(5,1) generated always as ((total_days - used_days)) stored,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."leave_balances" enable row level security;


  create table "public"."leave_types" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "requires_attachment" boolean not null default false,
    "default_balance_days" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "max_carry_over_days" integer default 0,
    "carry_over_expiry_months" integer default 12
      );


alter table "public"."leave_types" enable row level security;


  create table "public"."ohs_attachments" (
    "id" uuid not null default gen_random_uuid(),
    "entity_type" text not null,
    "entity_id" uuid not null,
    "file_name" text not null,
    "file_url" text not null,
    "file_type" text,
    "file_size" integer,
    "uploaded_by" uuid not null,
    "uploaded_at" timestamp with time zone not null default now()
      );


alter table "public"."ohs_attachments" enable row level security;


  create table "public"."ohs_hazard_reports" (
    "id" uuid not null default gen_random_uuid(),
    "employee_reporter_name" text not null,
    "employee_reporter_contact" text,
    "intake_source" text not null,
    "manager_taking_report" uuid not null,
    "site_area" text not null,
    "exact_location" text not null,
    "title" text not null,
    "description" text not null,
    "category" hazard_category not null,
    "exposure" text,
    "likelihood" likelihood_level not null,
    "consequence" consequence_level not null,
    "initial_risk_rating" integer not null,
    "hierarchy_of_control" control_hierarchy not null,
    "control_justification" text not null,
    "rp_likelihood_factor" text,
    "rp_degree_of_harm" text,
    "rp_knowledge_factor" text,
    "rp_available_methods" text,
    "rp_cost_factor" text,
    "action_owner" uuid,
    "due_date" date,
    "consultation_notes" text,
    "residual_likelihood" likelihood_level,
    "residual_consequence" consequence_level,
    "residual_risk_rating" integer,
    "review_date" date,
    "status" ohs_status not null default 'Open'::ohs_status,
    "signed_off_by" uuid,
    "signed_off_at" timestamp with time zone,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ohs_hazard_reports" enable row level security;


  create table "public"."ohs_injury_registers" (
    "id" uuid not null default gen_random_uuid(),
    "incident_date" date not null,
    "incident_time" time without time zone not null,
    "is_am_pm" text not null,
    "location" text not null,
    "injured_person_name" text not null,
    "injured_person_contact" text,
    "injury_description" text not null,
    "body_parts_affected" text not null,
    "injury_severity" injury_severity not null,
    "medical_treatment_required" boolean not null default false,
    "medical_provider" text,
    "equipment_involved" boolean not null default false,
    "equipment_details" text,
    "witnesses_present" boolean not null default false,
    "witness_names" text,
    "witness_contacts" text,
    "immediate_action_taken" text,
    "first_aid_provided" boolean not null default false,
    "first_aid_provider" text,
    "emergency_services_called" boolean not null default false,
    "entry_maker_name" text not null,
    "entry_maker_position" text not null,
    "entry_maker_signature" text,
    "entry_maker_date" date not null,
    "manager_investigation" text,
    "contributing_factors" text,
    "controls_implemented" text,
    "manager_name" text,
    "manager_signature" text,
    "manager_date" date,
    "employer_confirmation" text,
    "employer_signature" text,
    "employer_date" date,
    "follow_up_required" boolean not null default false,
    "follow_up_notes" text,
    "follow_up_date" date,
    "status" ohs_status not null default 'Open'::ohs_status,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ohs_injury_registers" enable row level security;


  create table "public"."ohs_inspection_items" (
    "id" uuid not null default gen_random_uuid(),
    "category" text not null,
    "item_name" text not null,
    "description" text,
    "is_mandatory" boolean not null default true,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ohs_inspection_items" enable row level security;


  create table "public"."ohs_inspection_results" (
    "id" uuid not null default gen_random_uuid(),
    "inspection_id" uuid not null,
    "inspection_item_id" uuid not null,
    "status" inspection_status not null,
    "notes" text,
    "photo_urls" text[],
    "hazard_raised" boolean not null default false,
    "hazard_report_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ohs_inspection_results" enable row level security;


  create table "public"."ohs_workplace_inspections" (
    "id" uuid not null default gen_random_uuid(),
    "inspection_date" date not null,
    "inspector_id" uuid not null,
    "site_area" text not null,
    "overall_status" inspection_status not null default 'Compliant'::inspection_status,
    "notes" text,
    "completed_at" timestamp with time zone,
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ohs_workplace_inspections" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "organization" text,
    "time_zone" text,
    "role" user_role default 'employee'::user_role,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "email" text,
    "employment_type" employment_status default 'full-time'::employment_status,
    "employee_card_id" text,
    "employee_id" character varying,
    "default_monday_office" boolean default false,
    "default_tuesday_office" boolean default false,
    "default_wednesday_office" boolean default false,
    "default_thursday_office" boolean default false,
    "default_friday_office" boolean default false,
    "is_active" boolean not null default true,
    "deactivated_at" timestamp with time zone,
    "deactivated_by" uuid,
    "deactivation_reason" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."project_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "user_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now(),
    "assigned_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."project_assignments" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "budget_hours" numeric(10,2) not null,
    "start_date" date,
    "end_date" date,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "customer_id" uuid,
    "is_internal" boolean default false,
    "has_budget_limit" boolean not null default true
      );


alter table "public"."projects" enable row level security;


  create table "public"."public_holidays" (
    "id" uuid not null default gen_random_uuid(),
    "date" date not null,
    "name" text not null,
    "state" text not null default 'VIC'::text,
    "year" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."public_holidays" enable row level security;


  create table "public"."services" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."services" enable row level security;


  create table "public"."timesheet_entries" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "project_id" uuid,
    "entry_date" date not null,
    "hours_logged" numeric(5,2) not null,
    "notes" text,
    "jira_task_id" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "start_time" character varying(10),
    "end_time" character varying(10),
    "entry_type" text default 'project'::text,
    "contract_id" uuid,
    "user_full_name" text
      );


alter table "public"."timesheet_entries" enable row level security;


  create table "public"."user_holiday_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "holiday_id" uuid not null,
    "is_allowed" boolean not null default false,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "notes" text
      );


alter table "public"."user_holiday_permissions" enable row level security;


  create table "public"."weekly_work_schedules" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "week_start_date" date not null,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "monday_location" work_location,
    "tuesday_location" work_location,
    "wednesday_location" work_location,
    "thursday_location" work_location,
    "friday_location" work_location,
    "saturday_location" work_location,
    "sunday_location" work_location,
    "weekend_work_approved" boolean default false,
    "weekend_work_approved_by" uuid,
    "weekend_work_approved_at" timestamp with time zone,
    "weekend_work_reason" text,
    "holiday_work_approved" boolean default false,
    "holiday_work_approved_by" uuid,
    "holiday_work_approved_at" timestamp with time zone,
    "holiday_work_reason" text,
    "monday_working" boolean default false,
    "tuesday_working" boolean default false,
    "wednesday_working" boolean default false,
    "thursday_working" boolean default false,
    "friday_working" boolean default false,
    "saturday_working" boolean default false,
    "sunday_working" boolean default false
      );


alter table "public"."weekly_work_schedules" enable row level security;


  create table "public"."work_schedules" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "working_days" integer not null default 5,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "allow_weekend_entries" boolean not null default false,
    "locked_until_date" date,
    "lock_reason" text,
    "locked_at" timestamp with time zone,
    "locked_by" uuid,
    "allow_holiday_entries" boolean not null default false,
    "default_monday_location" work_location,
    "default_tuesday_location" work_location,
    "default_wednesday_location" work_location,
    "default_thursday_location" work_location,
    "default_friday_location" work_location,
    "default_saturday_location" work_location,
    "default_sunday_location" work_location
      );


alter table "public"."work_schedules" enable row level security;

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX contract_assignments_contract_id_user_id_key ON public.contract_assignments USING btree (contract_id, user_id);

CREATE UNIQUE INDEX contract_assignments_pkey ON public.contract_assignments USING btree (id);

CREATE UNIQUE INDEX contract_services_contract_id_service_id_key ON public.contract_services USING btree (contract_id, service_id);

CREATE UNIQUE INDEX contract_services_pkey ON public.contract_services USING btree (id);

CREATE UNIQUE INDEX contracts_pkey ON public.contracts USING btree (id);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX daily_location_checkins_pkey ON public.daily_location_checkins USING btree (id);

CREATE UNIQUE INDEX expense_attachments_pkey ON public.expense_attachments USING btree (id);

CREATE UNIQUE INDEX expense_categories_pkey ON public.expense_categories USING btree (id);

CREATE UNIQUE INDEX expense_subcategories_pkey ON public.expense_subcategories USING btree (id);

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

CREATE INDEX idx_audit_logs_action_created_at ON public.audit_logs USING btree (action, created_at DESC);

CREATE INDEX idx_audit_logs_user_created_at ON public.audit_logs USING btree (user_id, created_at DESC);

CREATE INDEX idx_contract_assignments_user_contract ON public.contract_assignments USING btree (user_id, contract_id);

CREATE INDEX idx_contracts_customer_id ON public.contracts USING btree (customer_id);

CREATE INDEX idx_contracts_name_search ON public.contracts USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_customers_name_search ON public.customers USING gin (to_tsvector('english'::regconfig, name));

CREATE UNIQUE INDEX idx_customers_name_unique ON public.customers USING btree (lower(name));

CREATE INDEX idx_daily_location_checkins_user_date ON public.daily_location_checkins USING btree (user_id, check_in_date DESC);

CREATE INDEX idx_expenses_user_status_date ON public.expenses USING btree (user_id, status, expense_date DESC);

CREATE INDEX idx_leave_applications_user_status_date ON public.leave_applications USING btree (user_id, status, start_date DESC);

CREATE INDEX idx_leave_balance_operations_type ON public.leave_balance_operations USING btree (operation_type);

CREATE INDEX idx_leave_balance_operations_user_year ON public.leave_balance_operations USING btree (user_id, year);

CREATE INDEX idx_ohs_hazard_reports_status_created ON public.ohs_hazard_reports USING btree (status, created_at DESC);

CREATE INDEX idx_ohs_injury_registers_date_severity ON public.ohs_injury_registers USING btree (incident_date DESC, injury_severity);

CREATE INDEX idx_ohs_workplace_inspections_date_status ON public.ohs_workplace_inspections USING btree (inspection_date DESC, overall_status);

CREATE UNIQUE INDEX idx_profiles_employee_card_id_unique ON public.profiles USING btree (employee_card_id) WHERE (employee_card_id IS NOT NULL);

CREATE INDEX idx_profiles_is_active ON public.profiles USING btree (is_active);

CREATE INDEX idx_project_assignments_project_id ON public.project_assignments USING btree (project_id);

CREATE INDEX idx_project_assignments_user_id ON public.project_assignments USING btree (user_id);

CREATE INDEX idx_project_assignments_user_project ON public.project_assignments USING btree (user_id, project_id);

CREATE INDEX idx_projects_name_search ON public.projects USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_public_holidays_date ON public.public_holidays USING btree (date);

CREATE INDEX idx_public_holidays_year_state ON public.public_holidays USING btree (year, state);

CREATE INDEX idx_timesheet_entries_contract_date_range ON public.timesheet_entries USING btree (contract_id, entry_date DESC) WHERE (contract_id IS NOT NULL);

CREATE INDEX idx_timesheet_entries_project_date_range ON public.timesheet_entries USING btree (project_id, entry_date DESC) WHERE (project_id IS NOT NULL);

CREATE INDEX idx_timesheet_entries_user_date_range ON public.timesheet_entries USING btree (user_id, entry_date DESC);

CREATE INDEX idx_user_holiday_permissions_holiday ON public.user_holiday_permissions USING btree (holiday_id);

CREATE INDEX idx_user_holiday_permissions_user_holiday ON public.user_holiday_permissions USING btree (user_id, holiday_id);

CREATE INDEX idx_weekly_work_schedules_user_week ON public.weekly_work_schedules USING btree (user_id, week_start_date);

CREATE INDEX idx_work_schedules_user_active ON public.work_schedules USING btree (user_id) WHERE (locked_until_date IS NULL);

CREATE UNIQUE INDEX leave_application_attachments_pkey ON public.leave_application_attachments USING btree (id);

CREATE UNIQUE INDEX leave_applications_pkey ON public.leave_applications USING btree (id);

CREATE UNIQUE INDEX leave_balance_operations_pkey ON public.leave_balance_operations USING btree (id);

CREATE UNIQUE INDEX leave_balances_pkey ON public.leave_balances USING btree (id);

CREATE UNIQUE INDEX leave_balances_user_id_leave_type_id_year_key ON public.leave_balances USING btree (user_id, leave_type_id, year);

CREATE UNIQUE INDEX leave_types_name_key ON public.leave_types USING btree (name);

CREATE UNIQUE INDEX leave_types_pkey ON public.leave_types USING btree (id);

CREATE UNIQUE INDEX ohs_attachments_pkey ON public.ohs_attachments USING btree (id);

CREATE UNIQUE INDEX ohs_hazard_reports_pkey ON public.ohs_hazard_reports USING btree (id);

CREATE UNIQUE INDEX ohs_injury_registers_pkey ON public.ohs_injury_registers USING btree (id);

CREATE UNIQUE INDEX ohs_inspection_items_pkey ON public.ohs_inspection_items USING btree (id);

CREATE UNIQUE INDEX ohs_inspection_results_pkey ON public.ohs_inspection_results USING btree (id);

CREATE UNIQUE INDEX ohs_workplace_inspections_pkey ON public.ohs_workplace_inspections USING btree (id);

CREATE UNIQUE INDEX profiles_employee_id_unique ON public.profiles USING btree (employee_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX project_assignments_pkey ON public.project_assignments USING btree (id);

CREATE UNIQUE INDEX project_assignments_project_id_user_id_key ON public.project_assignments USING btree (project_id, user_id);

CREATE UNIQUE INDEX project_assignments_unique ON public.project_assignments USING btree (project_id, user_id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX public_holidays_pkey ON public.public_holidays USING btree (id);

CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id);

CREATE UNIQUE INDEX timesheet_entries_pkey ON public.timesheet_entries USING btree (id);

CREATE UNIQUE INDEX unique_holiday_per_date_state ON public.public_holidays USING btree (date, state);

CREATE UNIQUE INDEX unique_user_holiday_permission ON public.user_holiday_permissions USING btree (user_id, holiday_id);

CREATE UNIQUE INDEX unique_user_leave_type_year ON public.leave_balances USING btree (user_id, leave_type_id, year);

CREATE UNIQUE INDEX user_holiday_permissions_pkey ON public.user_holiday_permissions USING btree (id);

CREATE UNIQUE INDEX weekly_work_schedules_pkey ON public.weekly_work_schedules USING btree (id);

CREATE UNIQUE INDEX weekly_work_schedules_user_id_week_start_date_key ON public.weekly_work_schedules USING btree (user_id, week_start_date);

CREATE UNIQUE INDEX work_schedules_pkey ON public.work_schedules USING btree (id);

CREATE UNIQUE INDEX work_schedules_user_id_key ON public.work_schedules USING btree (user_id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."contract_assignments" add constraint "contract_assignments_pkey" PRIMARY KEY using index "contract_assignments_pkey";

alter table "public"."contract_services" add constraint "contract_services_pkey" PRIMARY KEY using index "contract_services_pkey";

alter table "public"."contracts" add constraint "contracts_pkey" PRIMARY KEY using index "contracts_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."daily_location_checkins" add constraint "daily_location_checkins_pkey" PRIMARY KEY using index "daily_location_checkins_pkey";

alter table "public"."expense_attachments" add constraint "expense_attachments_pkey" PRIMARY KEY using index "expense_attachments_pkey";

alter table "public"."expense_categories" add constraint "expense_categories_pkey" PRIMARY KEY using index "expense_categories_pkey";

alter table "public"."expense_subcategories" add constraint "expense_subcategories_pkey" PRIMARY KEY using index "expense_subcategories_pkey";

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."leave_application_attachments" add constraint "leave_application_attachments_pkey" PRIMARY KEY using index "leave_application_attachments_pkey";

alter table "public"."leave_applications" add constraint "leave_applications_pkey" PRIMARY KEY using index "leave_applications_pkey";

alter table "public"."leave_balance_operations" add constraint "leave_balance_operations_pkey" PRIMARY KEY using index "leave_balance_operations_pkey";

alter table "public"."leave_balances" add constraint "leave_balances_pkey" PRIMARY KEY using index "leave_balances_pkey";

alter table "public"."leave_types" add constraint "leave_types_pkey" PRIMARY KEY using index "leave_types_pkey";

alter table "public"."ohs_attachments" add constraint "ohs_attachments_pkey" PRIMARY KEY using index "ohs_attachments_pkey";

alter table "public"."ohs_hazard_reports" add constraint "ohs_hazard_reports_pkey" PRIMARY KEY using index "ohs_hazard_reports_pkey";

alter table "public"."ohs_injury_registers" add constraint "ohs_injury_registers_pkey" PRIMARY KEY using index "ohs_injury_registers_pkey";

alter table "public"."ohs_inspection_items" add constraint "ohs_inspection_items_pkey" PRIMARY KEY using index "ohs_inspection_items_pkey";

alter table "public"."ohs_inspection_results" add constraint "ohs_inspection_results_pkey" PRIMARY KEY using index "ohs_inspection_results_pkey";

alter table "public"."ohs_workplace_inspections" add constraint "ohs_workplace_inspections_pkey" PRIMARY KEY using index "ohs_workplace_inspections_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."project_assignments" add constraint "project_assignments_pkey" PRIMARY KEY using index "project_assignments_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."public_holidays" add constraint "public_holidays_pkey" PRIMARY KEY using index "public_holidays_pkey";

alter table "public"."services" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_pkey" PRIMARY KEY using index "timesheet_entries_pkey";

alter table "public"."user_holiday_permissions" add constraint "user_holiday_permissions_pkey" PRIMARY KEY using index "user_holiday_permissions_pkey";

alter table "public"."weekly_work_schedules" add constraint "weekly_work_schedules_pkey" PRIMARY KEY using index "weekly_work_schedules_pkey";

alter table "public"."work_schedules" add constraint "work_schedules_pkey" PRIMARY KEY using index "work_schedules_pkey";

alter table "public"."contract_assignments" add constraint "contract_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."contract_assignments" validate constraint "contract_assignments_assigned_by_fkey";

alter table "public"."contract_assignments" add constraint "contract_assignments_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE not valid;

alter table "public"."contract_assignments" validate constraint "contract_assignments_contract_id_fkey";

alter table "public"."contract_assignments" add constraint "contract_assignments_contract_id_user_id_key" UNIQUE using index "contract_assignments_contract_id_user_id_key";

alter table "public"."contract_assignments" add constraint "contract_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."contract_assignments" validate constraint "contract_assignments_user_id_fkey";

alter table "public"."contract_services" add constraint "contract_services_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE not valid;

alter table "public"."contract_services" validate constraint "contract_services_contract_id_fkey";

alter table "public"."contract_services" add constraint "contract_services_contract_id_service_id_key" UNIQUE using index "contract_services_contract_id_service_id_key";

alter table "public"."contracts" add constraint "fk_contracts_customer" FOREIGN KEY (customer_id) REFERENCES customers(id) not valid;

alter table "public"."contracts" validate constraint "fk_contracts_customer";

alter table "public"."daily_location_checkins" add constraint "daily_location_checkins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."daily_location_checkins" validate constraint "daily_location_checkins_user_id_fkey";

alter table "public"."expense_attachments" add constraint "expense_attachments_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE not valid;

alter table "public"."expense_attachments" validate constraint "expense_attachments_expense_id_fkey";

alter table "public"."expense_subcategories" add constraint "expense_subcategories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE not valid;

alter table "public"."expense_subcategories" validate constraint "expense_subcategories_category_id_fkey";

alter table "public"."expenses" add constraint "expenses_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."expenses" validate constraint "expenses_amount_check";

alter table "public"."expenses" add constraint "expenses_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id) not valid;

alter table "public"."expenses" validate constraint "expenses_approved_by_fkey";

alter table "public"."expenses" add constraint "expenses_category_id_fkey" FOREIGN KEY (category_id) REFERENCES expense_categories(id) not valid;

alter table "public"."expenses" validate constraint "expenses_category_id_fkey";

alter table "public"."expenses" add constraint "expenses_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES expense_subcategories(id) not valid;

alter table "public"."expenses" validate constraint "expenses_subcategory_id_fkey";

alter table "public"."expenses" add constraint "expenses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."expenses" validate constraint "expenses_user_id_fkey";

alter table "public"."leave_application_attachments" add constraint "leave_application_attachments_application_id_fkey" FOREIGN KEY (application_id) REFERENCES leave_applications(id) ON DELETE CASCADE not valid;

alter table "public"."leave_application_attachments" validate constraint "leave_application_attachments_application_id_fkey";

alter table "public"."leave_applications" add constraint "leave_applications_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."leave_applications" validate constraint "leave_applications_approved_by_fkey";

alter table "public"."leave_applications" add constraint "leave_applications_leave_type_id_fkey" FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT not valid;

alter table "public"."leave_applications" validate constraint "leave_applications_leave_type_id_fkey";

alter table "public"."leave_applications" add constraint "leave_applications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."leave_applications" validate constraint "leave_applications_user_id_fkey";

alter table "public"."leave_applications" add constraint "valid_business_days" CHECK ((business_days_count > (0)::numeric)) not valid;

alter table "public"."leave_applications" validate constraint "valid_business_days";

alter table "public"."leave_applications" add constraint "valid_date_range" CHECK ((end_date >= start_date)) not valid;

alter table "public"."leave_applications" validate constraint "valid_date_range";

alter table "public"."leave_balance_operations" add constraint "leave_balance_operations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."leave_balance_operations" validate constraint "leave_balance_operations_created_by_fkey";

alter table "public"."leave_balance_operations" add constraint "leave_balance_operations_leave_type_id_fkey" FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE not valid;

alter table "public"."leave_balance_operations" validate constraint "leave_balance_operations_leave_type_id_fkey";

alter table "public"."leave_balance_operations" add constraint "leave_balance_operations_operation_type_check" CHECK ((operation_type = ANY (ARRAY['annual_reset'::text, 'carry_over'::text, 'manual_adjustment'::text]))) not valid;

alter table "public"."leave_balance_operations" validate constraint "leave_balance_operations_operation_type_check";

alter table "public"."leave_balance_operations" add constraint "leave_balance_operations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."leave_balance_operations" validate constraint "leave_balance_operations_user_id_fkey";

alter table "public"."leave_balances" add constraint "leave_balances_leave_type_id_fkey" FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE not valid;

alter table "public"."leave_balances" validate constraint "leave_balances_leave_type_id_fkey";

alter table "public"."leave_balances" add constraint "leave_balances_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."leave_balances" validate constraint "leave_balances_user_id_fkey";

alter table "public"."leave_balances" add constraint "leave_balances_user_id_leave_type_id_year_key" UNIQUE using index "leave_balances_user_id_leave_type_id_year_key";

alter table "public"."leave_balances" add constraint "unique_user_leave_type_year" UNIQUE using index "unique_user_leave_type_year";

alter table "public"."leave_types" add constraint "leave_types_name_key" UNIQUE using index "leave_types_name_key";

alter table "public"."ohs_attachments" add constraint "ohs_attachments_entity_type_check" CHECK ((entity_type = ANY (ARRAY['hazard_report'::text, 'inspection'::text, 'injury_register'::text]))) not valid;

alter table "public"."ohs_attachments" validate constraint "ohs_attachments_entity_type_check";

alter table "public"."ohs_attachments" add constraint "ohs_attachments_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id) not valid;

alter table "public"."ohs_attachments" validate constraint "ohs_attachments_uploaded_by_fkey";

alter table "public"."ohs_hazard_reports" add constraint "ohs_hazard_reports_action_owner_fkey" FOREIGN KEY (action_owner) REFERENCES profiles(id) not valid;

alter table "public"."ohs_hazard_reports" validate constraint "ohs_hazard_reports_action_owner_fkey";

alter table "public"."ohs_hazard_reports" add constraint "ohs_hazard_reports_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."ohs_hazard_reports" validate constraint "ohs_hazard_reports_created_by_fkey";

alter table "public"."ohs_hazard_reports" add constraint "ohs_hazard_reports_intake_source_check" CHECK ((intake_source = ANY (ARRAY['verbal'::text, 'email'::text, 'phone'::text]))) not valid;

alter table "public"."ohs_hazard_reports" validate constraint "ohs_hazard_reports_intake_source_check";

alter table "public"."ohs_hazard_reports" add constraint "ohs_hazard_reports_manager_taking_report_fkey" FOREIGN KEY (manager_taking_report) REFERENCES profiles(id) not valid;

alter table "public"."ohs_hazard_reports" validate constraint "ohs_hazard_reports_manager_taking_report_fkey";

alter table "public"."ohs_hazard_reports" add constraint "ohs_hazard_reports_signed_off_by_fkey" FOREIGN KEY (signed_off_by) REFERENCES profiles(id) not valid;

alter table "public"."ohs_hazard_reports" validate constraint "ohs_hazard_reports_signed_off_by_fkey";

alter table "public"."ohs_injury_registers" add constraint "ohs_injury_registers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."ohs_injury_registers" validate constraint "ohs_injury_registers_created_by_fkey";

alter table "public"."ohs_injury_registers" add constraint "ohs_injury_registers_is_am_pm_check" CHECK ((is_am_pm = ANY (ARRAY['AM'::text, 'PM'::text]))) not valid;

alter table "public"."ohs_injury_registers" validate constraint "ohs_injury_registers_is_am_pm_check";

alter table "public"."ohs_inspection_results" add constraint "ohs_inspection_results_hazard_report_id_fkey" FOREIGN KEY (hazard_report_id) REFERENCES ohs_hazard_reports(id) not valid;

alter table "public"."ohs_inspection_results" validate constraint "ohs_inspection_results_hazard_report_id_fkey";

alter table "public"."ohs_inspection_results" add constraint "ohs_inspection_results_inspection_id_fkey" FOREIGN KEY (inspection_id) REFERENCES ohs_workplace_inspections(id) ON DELETE CASCADE not valid;

alter table "public"."ohs_inspection_results" validate constraint "ohs_inspection_results_inspection_id_fkey";

alter table "public"."ohs_inspection_results" add constraint "ohs_inspection_results_inspection_item_id_fkey" FOREIGN KEY (inspection_item_id) REFERENCES ohs_inspection_items(id) not valid;

alter table "public"."ohs_inspection_results" validate constraint "ohs_inspection_results_inspection_item_id_fkey";

alter table "public"."ohs_workplace_inspections" add constraint "ohs_workplace_inspections_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."ohs_workplace_inspections" validate constraint "ohs_workplace_inspections_created_by_fkey";

alter table "public"."ohs_workplace_inspections" add constraint "ohs_workplace_inspections_inspector_id_fkey" FOREIGN KEY (inspector_id) REFERENCES profiles(id) not valid;

alter table "public"."ohs_workplace_inspections" validate constraint "ohs_workplace_inspections_inspector_id_fkey";

alter table "public"."ohs_workplace_inspections" add constraint "ohs_workplace_inspections_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) not valid;

alter table "public"."ohs_workplace_inspections" validate constraint "ohs_workplace_inspections_reviewed_by_fkey";

alter table "public"."profiles" add constraint "fk_profiles_deactivated_by" FOREIGN KEY (deactivated_by) REFERENCES profiles(id) not valid;

alter table "public"."profiles" validate constraint "fk_profiles_deactivated_by";

alter table "public"."profiles" add constraint "profiles_employee_id_unique" UNIQUE using index "profiles_employee_id_unique";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."project_assignments" add constraint "project_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) not valid;

alter table "public"."project_assignments" validate constraint "project_assignments_assigned_by_fkey";

alter table "public"."project_assignments" add constraint "project_assignments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_assignments" validate constraint "project_assignments_project_id_fkey";

alter table "public"."project_assignments" add constraint "project_assignments_project_id_user_id_key" UNIQUE using index "project_assignments_project_id_user_id_key";

alter table "public"."project_assignments" add constraint "project_assignments_unique" UNIQUE using index "project_assignments_unique";

alter table "public"."project_assignments" add constraint "project_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."project_assignments" validate constraint "project_assignments_user_id_fkey";

alter table "public"."projects" add constraint "projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."projects" validate constraint "projects_created_by_fkey";

alter table "public"."projects" add constraint "projects_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) not valid;

alter table "public"."projects" validate constraint "projects_customer_id_fkey";

alter table "public"."public_holidays" add constraint "unique_holiday_per_date_state" UNIQUE using index "unique_holiday_per_date_state";

alter table "public"."timesheet_entries" add constraint "check_entry_type" CHECK ((((entry_type = 'project'::text) AND (project_id IS NOT NULL) AND (contract_id IS NULL)) OR ((entry_type = 'contract'::text) AND (contract_id IS NOT NULL) AND (project_id IS NULL)))) not valid;

alter table "public"."timesheet_entries" validate constraint "check_entry_type";

alter table "public"."timesheet_entries" add constraint "fk_timesheet_entries_contract" FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE not valid;

alter table "public"."timesheet_entries" validate constraint "fk_timesheet_entries_contract";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."timesheet_entries" validate constraint "timesheet_entries_project_id_fkey";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_single_reference_check" CHECK ((((project_id IS NOT NULL) AND (contract_id IS NULL) AND (entry_type = 'project'::text)) OR ((contract_id IS NOT NULL) AND (project_id IS NULL) AND (entry_type = 'contract'::text)))) not valid;

alter table "public"."timesheet_entries" validate constraint "timesheet_entries_single_reference_check";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."timesheet_entries" validate constraint "timesheet_entries_user_id_fkey";

alter table "public"."user_holiday_permissions" add constraint "unique_user_holiday_permission" UNIQUE using index "unique_user_holiday_permission";

alter table "public"."user_holiday_permissions" add constraint "user_holiday_permissions_holiday_id_fkey" FOREIGN KEY (holiday_id) REFERENCES public_holidays(id) ON DELETE CASCADE not valid;

alter table "public"."user_holiday_permissions" validate constraint "user_holiday_permissions_holiday_id_fkey";

alter table "public"."weekly_work_schedules" add constraint "weekly_work_schedules_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."weekly_work_schedules" validate constraint "weekly_work_schedules_created_by_fkey";

alter table "public"."weekly_work_schedules" add constraint "weekly_work_schedules_holiday_work_approved_by_fkey" FOREIGN KEY (holiday_work_approved_by) REFERENCES profiles(id) not valid;

alter table "public"."weekly_work_schedules" validate constraint "weekly_work_schedules_holiday_work_approved_by_fkey";

alter table "public"."weekly_work_schedules" add constraint "weekly_work_schedules_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."weekly_work_schedules" validate constraint "weekly_work_schedules_user_id_fkey";

alter table "public"."weekly_work_schedules" add constraint "weekly_work_schedules_user_id_week_start_date_key" UNIQUE using index "weekly_work_schedules_user_id_week_start_date_key";

alter table "public"."weekly_work_schedules" add constraint "weekly_work_schedules_weekend_work_approved_by_fkey" FOREIGN KEY (weekend_work_approved_by) REFERENCES profiles(id) not valid;

alter table "public"."weekly_work_schedules" validate constraint "weekly_work_schedules_weekend_work_approved_by_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_created_by_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_locked_by_fkey" FOREIGN KEY (locked_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_locked_by_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_user_id_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_user_id_key" UNIQUE using index "work_schedules_user_id_key";

alter table "public"."work_schedules" add constraint "work_schedules_working_days_check" CHECK (((working_days >= 0) AND (working_days <= 7))) not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_working_days_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.auto_calculate_risk_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate initial risk rating
  NEW.initial_risk_rating := public.calculate_risk_rating(NEW.likelihood, NEW.consequence);
  
  -- Calculate residual risk rating if both factors are provided
  IF NEW.residual_likelihood IS NOT NULL AND NEW.residual_consequence IS NOT NULL THEN
    NEW.residual_risk_rating := public.calculate_risk_rating(NEW.residual_likelihood, NEW.residual_consequence);
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_business_days(p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  iter_date DATE;
  business_days INTEGER := 0;
  day_of_week INTEGER;
BEGIN
  iter_date := p_start_date;
  
  WHILE iter_date <= p_end_date LOOP
    day_of_week := EXTRACT(DOW FROM iter_date);
    
    -- Check if it's a weekday (Monday=1 to Friday=5)
    IF day_of_week BETWEEN 1 AND 5 THEN
      -- Check if it's not a public holiday
      IF NOT is_public_holiday(iter_date) THEN
        business_days := business_days + 1;
      END IF;
    END IF;
    
    iter_date := iter_date + 1;
  END LOOP;
  
  RETURN business_days;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_business_days(start_date date, end_date date, target_state text DEFAULT 'VIC'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  business_days NUMERIC := 0;
  iter_date DATE;
BEGIN
  iter_date := start_date;
  
  WHILE iter_date <= end_date LOOP
    -- Skip weekends (Saturday = 6, Sunday = 0)
    IF EXTRACT(DOW FROM iter_date) NOT IN (0, 6) THEN
      -- Skip public holidays
      IF NOT is_public_holiday(iter_date, target_state) THEN
        business_days := business_days + 1;
      END IF;
    END IF;
    
    iter_date := iter_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN business_days;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_risk_rating(p_likelihood likelihood_level, p_consequence consequence_level)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  likelihood_score INTEGER;
  consequence_score INTEGER;
BEGIN
  -- Convert likelihood to numeric score
  likelihood_score := CASE p_likelihood
    WHEN 'Very Unlikely' THEN 1
    WHEN 'Unlikely' THEN 2
    WHEN 'Possible' THEN 3
    WHEN 'Likely' THEN 4
    WHEN 'Very Likely' THEN 5
  END;
  
  -- Convert consequence to numeric score
  consequence_score := CASE p_consequence
    WHEN 'Insignificant' THEN 1
    WHEN 'Minor' THEN 2
    WHEN 'Moderate' THEN 3
    WHEN 'Major' THEN 4
    WHEN 'Catastrophic' THEN 5
  END;
  
  RETURN likelihood_score * consequence_score;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_date_lock_status(p_user_id uuid, p_date date)
 RETURNS TABLE(is_locked boolean, lock_reason text, locked_until date, can_override boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  schedule_record RECORD;
BEGIN
  -- Get user role for override check
  SELECT role::TEXT INTO user_role FROM profiles WHERE id = p_user_id;
  
  -- Check work schedule locks
  SELECT * INTO schedule_record
  FROM work_schedules ws
  WHERE ws.user_id = p_user_id 
    AND ws.locked_until_date IS NOT NULL 
    AND p_date <= ws.locked_until_date;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      true,
      COALESCE(schedule_record.lock_reason, 'Date is locked'),
      schedule_record.locked_until_date,
      (user_role = 'admin');
  ELSE
    RETURN QUERY SELECT false, NULL::TEXT, NULL::DATE, true;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_holiday_permission(p_user_id uuid, p_date date)
 RETURNS TABLE(is_allowed boolean, message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  holiday_record RECORD;
  permission_record RECORD;
BEGIN
  -- Check if the date is a public holiday
  SELECT * INTO holiday_record
  FROM public.public_holidays 
  WHERE date = p_date AND state = 'VIC';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 'Not a public holiday'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user has specific permission for this holiday
  SELECT * INTO permission_record
  FROM public.user_holiday_permissions uhp
  WHERE uhp.user_id = p_user_id AND uhp.holiday_id = holiday_record.id;
  
  IF FOUND THEN
    RETURN QUERY SELECT permission_record.is_allowed, 
      CASE 
        WHEN permission_record.is_allowed THEN 'Holiday work approved'::TEXT
        ELSE 'Holiday work not permitted'::TEXT
      END;
  ELSE
    -- Default: holiday work not allowed without explicit permission
    RETURN QUERY SELECT false, 'Holiday work requires approval'::TEXT;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_holiday_permission(p_user_id uuid, p_holiday_date date, p_target_state text DEFAULT 'VIC'::text)
 RETURNS TABLE(is_allowed boolean, permission_source text, holiday_name text, message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  holiday_record RECORD;
  user_role TEXT;
  specific_permission BOOLEAN;
  general_permission BOOLEAN;
BEGIN
  -- Check if the date is a public holiday
  SELECT ph.id, ph.name INTO holiday_record
  FROM public.public_holidays ph
  WHERE ph.date = p_holiday_date AND ph.state = p_target_state;
  
  -- If not a holiday, allow entry
  IF holiday_record.id IS NULL THEN
    RETURN QUERY SELECT true, 'not_holiday'::TEXT, NULL::TEXT, 'Not a public holiday'::TEXT;
    RETURN;
  END IF;
  
  -- Get user role for admin override
  SELECT role::TEXT INTO user_role
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Admin override: admins can always log holiday entries
  IF user_role = 'admin' THEN
    RETURN QUERY SELECT 
      true, 
      'admin_override'::TEXT, 
      holiday_record.name, 
      'Admin privilege allows holiday entries'::TEXT;
    RETURN;
  END IF;
  
  -- Check for specific holiday permission (highest priority)
  SELECT uhp.is_allowed INTO specific_permission
  FROM public.user_holiday_permissions uhp
  WHERE uhp.user_id = p_user_id AND uhp.holiday_id = holiday_record.id;
  
  -- If specific permission exists, use it
  IF specific_permission IS NOT NULL THEN
    IF specific_permission THEN
      RETURN QUERY SELECT 
        true, 
        'specific_permission'::TEXT, 
        holiday_record.name, 
        'Specific permission granted for this holiday'::TEXT;
    ELSE
      RETURN QUERY SELECT 
        false, 
        'specific_permission'::TEXT, 
        holiday_record.name, 
        'Specifically blocked from working on ' || holiday_record.name || '. Contact your administrator.'::TEXT;
    END IF;
    RETURN;
  END IF;
  
  -- Fall back to general holiday permission
  SELECT ws.allow_holiday_entries INTO general_permission
  FROM public.work_schedules ws
  WHERE ws.user_id = p_user_id;
  
  -- Use general permission or default to false
  general_permission := COALESCE(general_permission, false);
  
  IF general_permission THEN
    RETURN QUERY SELECT 
      true, 
      'general_permission'::TEXT, 
      holiday_record.name, 
      'General holiday permission allows entry'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      false, 
      'general_permission'::TEXT, 
      holiday_record.name, 
      'Holiday entries not allowed for ' || holiday_record.name || '. Contact your administrator for approval.'::TEXT;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_work_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  default_days integer;
BEGIN
  -- Get default working days based on employment type
  SELECT CASE 
    WHEN employment_type = 'part-time' THEN 3
    ELSE 5
  END INTO default_days
  FROM public.profiles 
  WHERE id = NEW.id;
  
  -- If no employment type found, default to 5 days
  IF default_days IS NULL THEN
    default_days := 5;
  END IF;

  -- Insert work schedule with NULL locations (no default office)
  -- Users can set their own default locations through the interface
  INSERT INTO public.work_schedules (
    user_id, 
    working_days, 
    created_by,
    default_monday_location,
    default_tuesday_location,
    default_wednesday_location,
    default_thursday_location,
    default_friday_location,
    default_saturday_location,
    default_sunday_location
  )
  VALUES (
    NEW.id, 
    default_days, 
    NEW.id,
    -- All locations set to NULL - users choose their own defaults
    NULL, -- Monday
    NULL, -- Tuesday  
    NULL, -- Wednesday
    NULL, -- Thursday
    NULL, -- Friday
    NULL, -- Saturday
    NULL  -- Sunday
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only admins can deactivate users
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can deactivate users';
  END IF;

  -- Update the user profile
  UPDATE public.profiles 
  SET 
    is_active = false,
    deactivated_at = now(),
    deactivated_by = auth.uid(),
    deactivation_reason = p_reason
  WHERE id = p_user_id;

  -- Log the deactivation
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    auth.uid(),
    get_user_display_name(auth.uid()),
    'user_deactivated',
    'User Profile',
    'Deactivated user: ' || get_user_display_name(p_user_id),
    jsonb_build_object(
      'deactivated_user_id', p_user_id,
      'deactivated_user_name', get_user_display_name(p_user_id),
      'reason', p_reason
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_action_types()
 RETURNS text[]
 LANGUAGE sql
 STABLE
AS $function$
  SELECT ARRAY[
    'entry_created',
    'entry_updated', 
    'entry_deleted',
    'project_created',
    'project_updated',
    'project_deleted',
    'contract_created',
    'contract_updated',
    'contract_deleted',
    'user_assigned',
    'user_unassigned',
    'member_created',
    'member_updated',
    'member_deleted',
    'report_generated',
    'audit_report_generated',
    -- Leave application actions
    'leave_application_created',
    'leave_application_updated',
    'leave_application_cancelled',
    'leave_application_approved',
    'leave_application_rejected',
    -- Leave balance actions
    'leave_balance_created',
    'leave_balance_updated',
    'leave_balance_deleted',
    -- Holiday permission actions
    'holiday_permission_granted',
    'holiday_permission_revoked',
    'holiday_permission_updated',
    -- Custom holiday actions
    'custom_holiday_created',
    'custom_holiday_updated',
    'custom_holiday_deleted',
    -- Document actions
    'document_uploaded',
    'document_deleted'
  ];
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_logs_direct(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id text, user_id uuid, user_name text, action text, entity_name text, description text, details jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'audit_' || al.id::text as id,
    al.user_id,
    al.user_name,
    al.action,
    al.entity_name,
    al.description,
    al.details,
    al.created_at
  FROM audit_logs al
  WHERE (p_start_date IS NULL OR al.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at::date <= p_end_date)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
  ORDER BY al.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
    'employee'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_daily_location_status(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(planned_location work_location, actual_location work_location, has_checked_in boolean, is_late_checkin boolean, check_in_time timestamp with time zone, location_changed boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  day_of_week INTEGER;
  week_start DATE;
  planned_loc work_location;
  checkin_record RECORD;
BEGIN
  -- Get day of week (0 = Sunday, 1 = Monday, etc.)
  day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get week start date (Monday)
  week_start := date_trunc('week', p_date + interval '1 day') - interval '1 day';
  
  -- First, try to get planned location from weekly schedule override
  SELECT 
    CASE day_of_week
      WHEN 0 THEN sunday_location
      WHEN 1 THEN monday_location
      WHEN 2 THEN tuesday_location
      WHEN 3 THEN wednesday_location
      WHEN 4 THEN thursday_location
      WHEN 5 THEN friday_location
      WHEN 6 THEN saturday_location
    END INTO planned_loc
  FROM weekly_work_schedules
  WHERE user_id = p_user_id AND week_start_date = week_start;
  
  -- If no weekly schedule found, fall back to default locations from work_schedules
  IF planned_loc IS NULL THEN
    SELECT 
      CASE day_of_week
        WHEN 0 THEN default_sunday_location
        WHEN 1 THEN default_monday_location
        WHEN 2 THEN default_tuesday_location
        WHEN 3 THEN default_wednesday_location
        WHEN 4 THEN default_thursday_location
        WHEN 5 THEN default_friday_location
        WHEN 6 THEN default_saturday_location
      END INTO planned_loc
    FROM work_schedules
    WHERE user_id = p_user_id;
  END IF;
  
  -- Get check-in record
  SELECT dlc.*, dlc.check_in_time > (p_date + interval '10:00') as is_late
  INTO checkin_record
  FROM daily_location_checkins dlc
  WHERE dlc.user_id = p_user_id AND dlc.check_in_date = p_date;
  
  RETURN QUERY SELECT
    planned_loc as planned_location,
    checkin_record.actual_location,
    checkin_record.id IS NOT NULL as has_checked_in,
    COALESCE(checkin_record.is_late, false) as is_late_checkin,
    checkin_record.check_in_time,
    (planned_loc IS DISTINCT FROM checkin_record.actual_location) as location_changed;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_global_lock_status()
 RETURNS TABLE(total_users_locked bigint, earliest_lock_date date, latest_lock_date date, most_common_reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    COUNT(*) as total_users_locked,
    MIN(locked_until_date) as earliest_lock_date,
    MAX(locked_until_date) as latest_lock_date,
    MODE() WITHIN GROUP (ORDER BY lock_reason) as most_common_reason
  FROM public.work_schedules 
  WHERE locked_until_date IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.get_holiday_permission_matrix(p_year integer DEFAULT NULL::integer)
 RETURNS TABLE(holiday_id uuid, holiday_name text, holiday_date date, user_id uuid, user_name text, user_email text, specific_permission boolean, general_permission boolean, effective_permission boolean, permission_source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  target_year INTEGER;
BEGIN
  -- Default to current year if not specified
  target_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  
  RETURN QUERY
  SELECT 
    ph.id as holiday_id,
    ph.name as holiday_name,
    ph.date as holiday_date,
    p.id as user_id,
    COALESCE(p.full_name, p.email, 'Unknown User') as user_name,
    p.email as user_email,
    uhp.is_allowed as specific_permission,
    ws.allow_holiday_entries as general_permission,
    CASE 
      -- Admin always allowed
      WHEN p.role = 'admin' THEN true
      -- Specific permission takes priority
      WHEN uhp.is_allowed IS NOT NULL THEN uhp.is_allowed
      -- Fall back to general permission
      ELSE COALESCE(ws.allow_holiday_entries, false)
    END as effective_permission,
    CASE 
      WHEN p.role = 'admin' THEN 'admin_override'
      WHEN uhp.is_allowed IS NOT NULL THEN 'specific_permission'
      ELSE 'general_permission'
    END as permission_source
  FROM public.public_holidays ph
  CROSS JOIN public.profiles p
  LEFT JOIN public.user_holiday_permissions uhp ON uhp.user_id = p.id AND uhp.holiday_id = ph.id
  LEFT JOIN public.work_schedules ws ON ws.user_id = p.id
  WHERE ph.year = target_year AND ph.state = 'VIC'
  ORDER BY ph.date, p.full_name, p.email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_holiday_name(entry_date date, target_state text DEFAULT 'VIC'::text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT name 
  FROM public.public_holidays 
  WHERE date = entry_date 
    AND state = target_state
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_timesheet_summary(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_hours numeric, total_entries bigint, unique_users bigint, unique_projects bigint, unique_contracts bigint, avg_hours_per_entry numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT 
    COALESCE(SUM(hours_logged), 0) as total_hours,
    COUNT(*) as total_entries,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT project_id) as unique_projects,
    COUNT(DISTINCT contract_id) as unique_contracts,
    COALESCE(AVG(hours_logged), 0) as avg_hours_per_entry
  FROM public.timesheet_entries
  WHERE (p_start_date IS NULL OR entry_date >= p_start_date)
    AND (p_end_date IS NULL OR entry_date <= p_end_date)
    AND (p_user_id IS NULL OR user_id = p_user_id);
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_activities(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id text, user_id uuid, user_name text, action text, entity_name text, description text, details jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  -- Timesheet entry activities
  SELECT 
    'te_' || te.id::text as id,
    te.user_id,
    COALESCE(p.full_name, p.email, 'Unknown User') as user_name,
    CASE 
      WHEN te.created_at = te.updated_at THEN 'entry_created'
      ELSE 'entry_updated'
    END as action,
    COALESCE(proj.name, cont.name, 'Unknown Project/Contract') as entity_name,
    CASE 
      WHEN te.created_at = te.updated_at THEN 
        'Created timesheet entry for ' || COALESCE(proj.name, cont.name, 'Unknown Project/Contract') || ' (' || te.hours_logged || ' hours on ' || te.entry_date || ')'
      ELSE 
        'Updated timesheet entry for ' || COALESCE(proj.name, cont.name, 'Unknown Project/Contract') || ' (' || te.hours_logged || ' hours on ' || te.entry_date || ')'
    END as description,
    jsonb_build_object(
      'project_id', te.project_id,
      'contract_id', te.contract_id,
      'project_name', proj.name,
      'contract_name', cont.name,
      'hours_logged', te.hours_logged,
      'entry_date', te.entry_date,
      'entry_type', te.entry_type,
      'notes', te.notes
    ) as details,
    GREATEST(te.created_at, te.updated_at) as created_at
  FROM timesheet_entries te
  LEFT JOIN profiles p ON p.id = te.user_id
  LEFT JOIN projects proj ON proj.id = te.project_id
  LEFT JOIN contracts cont ON cont.id = te.contract_id
  WHERE (p_start_date IS NULL OR te.entry_date >= p_start_date)
    AND (p_end_date IS NULL OR te.entry_date <= p_end_date)
    AND (p_user_id IS NULL OR te.user_id = p_user_id)

  UNION ALL

  -- Project creation/updates
  SELECT 
    'proj_' || proj.id::text as id,
    COALESCE(proj.created_by, auth.uid()) as user_id,
    COALESCE(p.full_name, p.email, 'System') as user_name,
    CASE 
      WHEN proj.created_at = proj.updated_at THEN 'project_created'
      ELSE 'project_updated'
    END as action,
    proj.name as entity_name,
    CASE 
      WHEN proj.created_at = proj.updated_at THEN 
        'Created project: ' || proj.name
      ELSE 
        'Updated project: ' || proj.name
    END as description,
    jsonb_build_object(
      'project_id', proj.id,
      'project_name', proj.name,
      'budget_hours', proj.budget_hours,
      'customer_id', proj.customer_id,
      'is_internal', proj.is_internal
    ) as details,
    GREATEST(proj.created_at, proj.updated_at) as created_at
  FROM projects proj
  LEFT JOIN profiles p ON p.id = proj.created_by
  WHERE (p_start_date IS NULL OR proj.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR proj.created_at::date <= p_end_date)
    AND (p_user_id IS NULL OR proj.created_by = p_user_id)

  UNION ALL

  -- Contract creation/updates
  SELECT 
    'cont_' || cont.id::text as id,
    auth.uid() as user_id,
    COALESCE(p.full_name, p.email, 'System') as user_name,
    CASE 
      WHEN cont.created_at = cont.updated_at THEN 'contract_created'
      ELSE 'contract_updated'
    END as action,
    cont.name as entity_name,
    CASE 
      WHEN cont.created_at = cont.updated_at THEN 
        'Created contract: ' || cont.name
      ELSE 
        'Updated contract: ' || cont.name
    END as description,
    jsonb_build_object(
      'contract_id', cont.id,
      'contract_name', cont.name,
      'customer_id', cont.customer_id,
      'start_date', cont.start_date,
      'end_date', cont.end_date,
      'status', cont.status
    ) as details,
    GREATEST(cont.created_at, cont.updated_at) as created_at
  FROM contracts cont
  LEFT JOIN profiles p ON p.id = auth.uid()
  WHERE (p_start_date IS NULL OR cont.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR cont.created_at::date <= p_end_date)
    AND (p_user_id IS NULL OR auth.uid() = p_user_id)

  UNION ALL

  -- Project assignments
  SELECT 
    'pa_' || pa.id::text as id,
    COALESCE(pa.assigned_by, pa.user_id) as user_id,
    COALESCE(p.full_name, p.email, 'System') as user_name,
    'user_assigned' as action,
    proj.name as entity_name,
    'Assigned ' || COALESCE(assigned_user.full_name, assigned_user.email, 'Unknown User') || ' to project: ' || proj.name as description,
    jsonb_build_object(
      'project_id', pa.project_id,
      'project_name', proj.name,
      'assigned_user_id', pa.user_id,
      'assigned_user_name', COALESCE(assigned_user.full_name, assigned_user.email, 'Unknown User')
    ) as details,
    pa.assigned_at as created_at
  FROM project_assignments pa
  LEFT JOIN profiles p ON p.id = pa.assigned_by
  LEFT JOIN profiles assigned_user ON assigned_user.id = pa.user_id
  LEFT JOIN projects proj ON proj.id = pa.project_id
  WHERE (p_start_date IS NULL OR pa.assigned_at::date >= p_start_date)
    AND (p_end_date IS NULL OR pa.assigned_at::date <= p_end_date)
    AND (p_user_id IS NULL OR pa.assigned_by = p_user_id OR pa.user_id = p_user_id)

  UNION ALL

  -- Contract assignments
  SELECT 
    'ca_' || ca.id::text as id,
    COALESCE(ca.assigned_by, ca.user_id) as user_id,
    COALESCE(p.full_name, p.email, 'System') as user_name,
    'user_assigned' as action,
    cont.name as entity_name,
    'Assigned ' || COALESCE(assigned_user.full_name, assigned_user.email, 'Unknown User') || ' to contract: ' || cont.name as description,
    jsonb_build_object(
      'contract_id', ca.contract_id,
      'contract_name', cont.name,
      'assigned_user_id', ca.user_id,
      'assigned_user_name', COALESCE(assigned_user.full_name, assigned_user.email, 'Unknown User')
    ) as details,
    ca.assigned_at as created_at
  FROM contract_assignments ca
  LEFT JOIN profiles p ON p.id = ca.assigned_by
  LEFT JOIN profiles assigned_user ON assigned_user.id = ca.user_id
  LEFT JOIN contracts cont ON cont.id = ca.contract_id
  WHERE (p_start_date IS NULL OR ca.assigned_at::date >= p_start_date)
    AND (p_end_date IS NULL OR ca.assigned_at::date <= p_end_date)
    AND (p_user_id IS NULL OR ca.assigned_by = p_user_id OR ca.user_id = p_user_id)

  UNION ALL

  -- Audit logs (deletions and other tracked events)
  SELECT 
    'audit_' || al.id::text as id,
    al.user_id,
    al.user_name,
    al.action,
    al.entity_name,
    al.description,
    al.details,
    al.created_at
  FROM audit_logs al
  WHERE (p_start_date IS NULL OR al.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at::date <= p_end_date)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)

  ORDER BY created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_assignments(p_user_id uuid)
 RETURNS TABLE(project_id uuid, project_name text, contract_id uuid, contract_name text, customer_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT 
    p.id as project_id,
    p.name as project_name,
    NULL::uuid as contract_id,
    NULL::text as contract_name,
    c.name as customer_name
  FROM public.project_assignments pa
  JOIN public.projects p ON p.id = pa.project_id
  LEFT JOIN public.customers c ON c.id = p.customer_id
  WHERE pa.user_id = p_user_id AND p.is_active = true
  
  UNION ALL
  
  SELECT 
    NULL::uuid as project_id,
    NULL::text as project_name,
    ct.id as contract_id,
    ct.name as contract_name,
    c.name as customer_name
  FROM public.contract_assignments ca
  JOIN public.contracts ct ON ct.id = ca.contract_id
  LEFT JOIN public.customers c ON c.id = ct.customer_id
  WHERE ca.user_id = p_user_id AND ct.is_active = true;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_display_name(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(full_name, email, 'Unknown User')
  FROM public.profiles 
  WHERE id = p_user_id
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_leave_entitlement(p_user_id uuid, p_year integer, p_leave_type_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  entitlement NUMERIC := 0;
  leave_type_record RECORD;
BEGIN
  -- Get leave type details
  SELECT * INTO leave_type_record FROM leave_types WHERE id = p_leave_type_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check if user has a specific balance record
  SELECT total_days INTO entitlement
  FROM leave_balances
  WHERE user_id = p_user_id 
    AND year = p_year 
    AND leave_type_id = p_leave_type_id;
  
  -- If no specific balance, use default from leave type
  IF entitlement IS NULL THEN
    entitlement := leave_type_record.default_balance_days;
  END IF;
  
  RETURN COALESCE(entitlement, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_users_missing_timesheet_entries(p_week_start_date date DEFAULT NULL::date)
 RETURNS TABLE(user_id uuid, email text, full_name text, organization text, time_zone text, expected_days integer, logged_days bigint, missing_days integer, week_start_date date, week_end_date date, missing_specific_days text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  week_start date;
  week_end date;
BEGIN
  -- If no week provided, use current week (Monday to Sunday)
  IF p_week_start_date IS NULL THEN
    week_start := date_trunc('week', CURRENT_DATE);
  ELSE
    week_start := p_week_start_date;
  END IF;
  
  week_end := week_start + interval '6 days';
  
  RETURN QUERY
  WITH user_schedule_data AS (
    SELECT 
      p.id as user_id,
      p.email,
      p.full_name,
      p.organization,
      p.time_zone,
      -- Get weekly schedule override or fall back to default schedule
      COALESCE(wws.monday_working, 
        CASE WHEN COALESCE(ws.working_days, 5) >= 1 THEN true ELSE false END) as monday_working,
      COALESCE(wws.tuesday_working, 
        CASE WHEN COALESCE(ws.working_days, 5) >= 2 THEN true ELSE false END) as tuesday_working,
      COALESCE(wws.wednesday_working, 
        CASE WHEN COALESCE(ws.working_days, 5) >= 3 THEN true ELSE false END) as wednesday_working,
      COALESCE(wws.thursday_working, 
        CASE WHEN COALESCE(ws.working_days, 5) >= 4 THEN true ELSE false END) as thursday_working,
      COALESCE(wws.friday_working, 
        CASE WHEN COALESCE(ws.working_days, 5) >= 5 THEN true ELSE false END) as friday_working,
      COALESCE(wws.saturday_working, false) as saturday_working,
      COALESCE(wws.sunday_working, false) as sunday_working
    FROM profiles p
    LEFT JOIN work_schedules ws ON ws.user_id = p.id
    LEFT JOIN weekly_work_schedules wws ON wws.user_id = p.id AND wws.week_start_date = week_start
    WHERE p.id IS NOT NULL 
      AND p.email IS NOT NULL 
      AND p.is_active = true  -- CRITICAL: Only include active users
  ),
  user_required_days AS (
    SELECT 
      usd.*,
      -- Calculate which specific days are required work days (FIXED: Only count explicitly scheduled days)
      ARRAY_REMOVE(ARRAY[
        CASE WHEN usd.monday_working THEN (week_start + interval '0 days')::date END,
        CASE WHEN usd.tuesday_working THEN (week_start + interval '1 days')::date END,
        CASE WHEN usd.wednesday_working THEN (week_start + interval '2 days')::date END,
        CASE WHEN usd.thursday_working THEN (week_start + interval '3 days')::date END,
        CASE WHEN usd.friday_working THEN (week_start + interval '4 days')::date END,
        CASE WHEN usd.saturday_working THEN (week_start + interval '5 days')::date END,
        CASE WHEN usd.sunday_working THEN (week_start + interval '6 days')::date END
      ], NULL) as required_dates,
      -- Count expected days (working days based on boolean flags)
      (CASE WHEN usd.monday_working THEN 1 ELSE 0 END +
       CASE WHEN usd.tuesday_working THEN 1 ELSE 0 END +
       CASE WHEN usd.wednesday_working THEN 1 ELSE 0 END +
       CASE WHEN usd.thursday_working THEN 1 ELSE 0 END +
       CASE WHEN usd.friday_working THEN 1 ELSE 0 END +
       CASE WHEN usd.saturday_working THEN 1 ELSE 0 END +
       CASE WHEN usd.sunday_working THEN 1 ELSE 0 END) as expected_days_count
    FROM user_schedule_data usd
    WHERE usd.email IS NOT NULL
  ),
  user_logged_days AS (
    SELECT 
      te.user_id,
      COUNT(DISTINCT te.entry_date) as logged_days_count,
      ARRAY_AGG(DISTINCT te.entry_date) as logged_dates
    FROM timesheet_entries te
    WHERE te.entry_date >= week_start 
      AND te.entry_date <= week_end
    GROUP BY te.user_id
  ),
  users_with_missing_days AS (
    SELECT 
      urd.user_id,
      urd.email,
      urd.full_name,
      urd.organization,
      urd.time_zone,
      urd.expected_days_count,
      COALESCE(uld.logged_days_count, 0) as logged_days_count,
      -- Find missing required days by comparing required dates vs logged dates
      ARRAY(
        SELECT rd FROM unnest(urd.required_dates) AS rd
        WHERE rd IS NOT NULL 
        AND rd NOT IN (SELECT COALESCE(ld, '1900-01-01'::date) FROM unnest(COALESCE(uld.logged_dates, ARRAY[]::date[])) AS ld)
      ) as missing_dates,
      urd.required_dates,
      COALESCE(uld.logged_dates, ARRAY[]::date[]) as logged_dates
    FROM user_required_days urd
    LEFT JOIN user_logged_days uld ON urd.user_id = uld.user_id
    WHERE urd.expected_days_count > 0  -- Only users who are expected to work
  )
  SELECT 
    uwmd.user_id,
    uwmd.email,
    uwmd.full_name,
    uwmd.organization,
    uwmd.time_zone,
    uwmd.expected_days_count::integer as expected_days,
    uwmd.logged_days_count as logged_days,
    COALESCE(array_length(uwmd.missing_dates, 1), 0)::integer as missing_days,
    week_start as week_start_date,
    week_end as week_end_date,
    -- Convert missing dates to text array for easier handling
    ARRAY(
      SELECT to_char(md, 'YYYY-MM-DD') 
      FROM unnest(uwmd.missing_dates) AS md
      WHERE md IS NOT NULL
      ORDER BY md
    ) as missing_specific_days
  FROM users_with_missing_days uwmd
  WHERE COALESCE(array_length(uwmd.missing_dates, 1), 0) > 0  -- Only users missing required days
    AND uwmd.email IS NOT NULL  -- Only users with email addresses
  ORDER BY uwmd.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_cron_available()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if cron extension is available and cron schema exists
  RETURN EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pg_cron'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.schemata 
    WHERE schema_name = 'cron'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'cron' 
    AND table_name = 'job'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_date_locked_for_user(p_user_id uuid, entry_date date)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.work_schedules 
    WHERE user_id = p_user_id 
      AND locked_until_date IS NOT NULL 
      AND entry_date <= locked_until_date
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_expense_editable(expense_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  expense_status public.expense_status;
  expense_user_id UUID;
BEGIN
  SELECT status, user_id INTO expense_status, expense_user_id
  FROM public.expenses 
  WHERE id = expense_id;
  
  -- Admins can always edit
  IF get_current_user_role() = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Users can only edit their own expenses that are draft or submitted
  RETURN (
    expense_user_id = auth.uid() AND 
    expense_status IN ('draft', 'submitted')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_public_holiday(entry_date date, target_state text DEFAULT 'VIC'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.public_holidays 
    WHERE date = entry_date 
      AND state = target_state
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_assigned_to_contract(p_user_id uuid, p_contract_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.contract_assignments 
    WHERE user_id = p_user_id AND contract_id = p_contract_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_assigned_to_project(p_user_id uuid, p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.project_assignments 
    WHERE user_id = p_user_id AND project_id = p_project_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_weekend_day(entry_date date)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN EXTRACT(DOW FROM entry_date) IN (0, 6); -- Sunday = 0, Saturday = 6
END;
$function$
;

CREATE OR REPLACE FUNCTION public.lock_leave_dates(p_user_id uuid, p_start_date date, p_end_date date, p_application_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  iter_date DATE;
BEGIN
  iter_date := p_start_date;
  
  WHILE iter_date <= p_end_date LOOP
    -- Skip weekends
    IF EXTRACT(DOW FROM iter_date) NOT IN (0, 6) THEN
      -- Update work_schedules to lock this date for this user
      UPDATE public.work_schedules 
      SET locked_until_date = CASE 
        WHEN locked_until_date IS NULL OR locked_until_date < iter_date 
        THEN iter_date 
        ELSE locked_until_date 
      END,
      lock_reason = CASE 
        WHEN locked_until_date IS NULL OR locked_until_date < iter_date
        THEN 'Leave Application (ID: ' || p_application_id || ')'
        ELSE lock_reason
      END,
      locked_at = now(),
      locked_by = auth.uid()
      WHERE user_id = p_user_id;
    END IF;
    
    iter_date := iter_date + INTERVAL '1 day';
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_assignment_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  entity_name_val text;
  description_val text;
  assigned_user_name text;
  details_val jsonb;
BEGIN
  -- Get user display name using the assigned_by user or current auth user
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = COALESCE(NEW.assigned_by, auth.uid());

  -- Handle different assignment types
  IF TG_TABLE_NAME = 'project_assignments' THEN
    -- Get project name for context
    SELECT p.name INTO entity_name_val FROM projects p WHERE p.id = NEW.project_id;
    SELECT COALESCE(pr.full_name, pr.email, 'Unknown User') INTO assigned_user_name
    FROM profiles pr WHERE pr.id = NEW.user_id;
    
    description_val := 'Assigned ' || assigned_user_name || ' to project: ' || entity_name_val;
    details_val := jsonb_build_object(
      'project_id', NEW.project_id,
      'project_name', entity_name_val,
      'assigned_user_id', NEW.user_id,
      'assigned_user_name', assigned_user_name,
      'assigned_by', NEW.assigned_by
    );
    
  ELSIF TG_TABLE_NAME = 'contract_assignments' THEN
    -- Get contract name for context
    SELECT c.name INTO entity_name_val FROM contracts c WHERE c.id = NEW.contract_id;
    SELECT COALESCE(pr.full_name, pr.email, 'Unknown User') INTO assigned_user_name
    FROM profiles pr WHERE pr.id = NEW.user_id;
    
    description_val := 'Assigned ' || assigned_user_name || ' to contract: ' || entity_name_val;
    details_val := jsonb_build_object(
      'contract_id', NEW.contract_id,
      'contract_name', entity_name_val,
      'assigned_user_id', NEW.user_id,
      'assigned_user_name', assigned_user_name,
      'assigned_by', NEW.assigned_by
    );
    
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    COALESCE(NEW.assigned_by, auth.uid()),
    user_display_name,
    'user_assigned',
    entity_name_val,
    description_val,
    details_val
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_custom_holiday_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  description_val text;
  details_val jsonb;
  action_type text;
  audit_user_id uuid;
BEGIN
  -- Determine action type and audit user
  IF TG_OP = 'INSERT' THEN
    action_type := 'custom_holiday_created';
    audit_user_id := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'custom_holiday_updated';
    audit_user_id := auth.uid();
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'custom_holiday_deleted';
    audit_user_id := auth.uid();
  END IF;

  -- If we don't have a user_id, skip audit logging
  IF audit_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Get audit user display name
  SELECT COALESCE(full_name, email, 'System') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- If we can't find the user name, use a default
  IF user_display_name IS NULL THEN
    user_display_name := 'System User';
  END IF;

  -- Build description and details
  IF TG_OP = 'INSERT' THEN
    description_val := 'Created custom holiday: ' || NEW.name || ' on ' || NEW.date || ' (' || NEW.state || ')';
    details_val := jsonb_build_object(
      'holiday_name', NEW.name,
      'holiday_date', NEW.date,
      'state', NEW.state,
      'year', NEW.year
    );
  ELSIF TG_OP = 'UPDATE' THEN
    description_val := 'Updated custom holiday: ' || NEW.name || ' on ' || NEW.date || ' (' || NEW.state || ')';
    details_val := jsonb_build_object(
      'holiday_name', NEW.name,
      'holiday_date', NEW.date,
      'state', NEW.state,
      'year', NEW.year,
      'old_holiday_name', OLD.name,
      'old_holiday_date', OLD.date,
      'old_state', OLD.state
    );
  ELSIF TG_OP = 'DELETE' THEN
    description_val := 'Deleted custom holiday: ' || OLD.name || ' on ' || OLD.date || ' (' || OLD.state || ')';
    details_val := jsonb_build_object(
      'holiday_name', OLD.name,
      'holiday_date', OLD.date,
      'state', OLD.state,
      'year', OLD.year
    );
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    audit_user_id,
    user_display_name,
    action_type,
    'Custom Holiday',
    description_val,
    details_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_deletion_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  entity_name_val text;
  description_val text;
  details_val jsonb;
  audit_user_id uuid;
BEGIN
  -- Determine the user_id to use for audit log based on table
  IF TG_TABLE_NAME = 'profiles' THEN
    audit_user_id := OLD.id;  -- For profiles, use the profile id
  ELSIF TG_TABLE_NAME = 'timesheet_entries' THEN
    audit_user_id := OLD.user_id;  -- timesheet_entries has user_id
  ELSIF TG_TABLE_NAME = 'project_assignments' THEN
    audit_user_id := COALESCE(OLD.assigned_by, auth.uid());  -- Use assigned_by or current user
  ELSIF TG_TABLE_NAME = 'contract_assignments' THEN
    audit_user_id := COALESCE(OLD.assigned_by, auth.uid());  -- Use assigned_by or current user
  ELSE
    audit_user_id := auth.uid();  -- For other tables, use current auth user
  END IF;

  -- If we still don't have a user_id, skip audit logging to prevent constraint violation
  IF audit_user_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Get user display name using the correct audit_user_id
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- If we can't find the user name, use a default
  IF user_display_name IS NULL THEN
    user_display_name := 'System User';
  END IF;

  -- Handle different table deletions
  IF TG_TABLE_NAME = 'timesheet_entries' THEN
    -- Get project name for context
    SELECT COALESCE(p.name, c.name, 'Unknown Project/Contract') INTO entity_name_val
    FROM projects p 
    FULL OUTER JOIN contracts c ON c.id = OLD.contract_id
    WHERE p.id = OLD.project_id OR c.id = OLD.contract_id;
    
    description_val := 'Deleted timesheet entry for ' || entity_name_val || 
                      ' (' || OLD.hours_logged || ' hours on ' || OLD.entry_date || ')';
    details_val := jsonb_build_object(
      'project_id', OLD.project_id,
      'contract_id', OLD.contract_id,
      'hours_logged', OLD.hours_logged,
      'entry_date', OLD.entry_date,
      'entry_type', OLD.entry_type,
      'notes', OLD.notes
    );
    
  ELSIF TG_TABLE_NAME = 'projects' THEN
    entity_name_val := OLD.name;
    description_val := 'Deleted project: ' || OLD.name;
    details_val := jsonb_build_object(
      'project_name', OLD.name,
      'budget_hours', OLD.budget_hours,
      'customer_id', OLD.customer_id,
      'is_internal', OLD.is_internal
    );
    
  ELSIF TG_TABLE_NAME = 'contracts' THEN
    entity_name_val := OLD.name;
    description_val := 'Deleted contract: ' || OLD.name;
    details_val := jsonb_build_object(
      'contract_name', OLD.name,
      'customer_id', OLD.customer_id,
      'start_date', OLD.start_date,
      'end_date', OLD.end_date,
      'status', OLD.status
    );
    
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    entity_name_val := COALESCE(OLD.full_name, OLD.email, 'Team Member');
    description_val := 'Deleted team member: ' || COALESCE(OLD.full_name, OLD.email, 'Unknown User');
    details_val := jsonb_build_object(
      'user_id', OLD.id,
      'full_name', OLD.full_name,
      'email', OLD.email,
      'role', OLD.role,
      'employment_type', OLD.employment_type,
      'organization', OLD.organization,
      'employee_id', OLD.employee_id,
      'employee_card_id', OLD.employee_card_id
    );
    
  ELSIF TG_TABLE_NAME = 'project_assignments' THEN
    -- Get project and user names for context
    SELECT p.name INTO entity_name_val FROM projects p WHERE p.id = OLD.project_id;
    SELECT COALESCE(pr.full_name, pr.email, 'Unknown User') INTO description_val
    FROM profiles pr WHERE pr.id = OLD.user_id;
    
    description_val := 'Unassigned ' || COALESCE(description_val, 'Unknown User') || ' from project: ' || COALESCE(entity_name_val, 'Unknown Project');
    details_val := jsonb_build_object(
      'project_id', OLD.project_id,
      'project_name', entity_name_val,
      'unassigned_user_id', OLD.user_id
    );
    
  ELSIF TG_TABLE_NAME = 'contract_assignments' THEN
    -- Get contract and user names for context
    SELECT c.name INTO entity_name_val FROM contracts c WHERE c.id = OLD.contract_id;
    SELECT COALESCE(pr.full_name, pr.email, 'Unknown User') INTO description_val
    FROM profiles pr WHERE pr.id = OLD.user_id;
    
    description_val := 'Unassigned ' || COALESCE(description_val, 'Unknown User') || ' from contract: ' || COALESCE(entity_name_val, 'Unknown Contract');
    details_val := jsonb_build_object(
      'contract_id', OLD.contract_id,
      'contract_name', entity_name_val,
      'unassigned_user_id', OLD.user_id
    );
    
  END IF;

  -- Insert audit log only if we have valid data
  IF entity_name_val IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_name,
      action,
      entity_name,
      description,
      details
    ) VALUES (
      audit_user_id,
      user_display_name,
      CASE 
        WHEN TG_TABLE_NAME = 'timesheet_entries' THEN 'entry_deleted'
        WHEN TG_TABLE_NAME = 'projects' THEN 'project_deleted'
        WHEN TG_TABLE_NAME = 'contracts' THEN 'contract_deleted'
        WHEN TG_TABLE_NAME = 'profiles' THEN 'member_deleted'
        WHEN TG_TABLE_NAME = 'project_assignments' THEN 'user_unassigned'
        WHEN TG_TABLE_NAME = 'contract_assignments' THEN 'user_unassigned'
      END,
      entity_name_val,
      description_val,
      details_val
    );
  END IF;

  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_expense_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name TEXT;
  category_name TEXT;
  subcategory_name TEXT;
  description_val TEXT;
  details_val JSONB;
  action_type TEXT;
  audit_user_id UUID;
BEGIN
  -- Determine action type and audit user
  IF TG_OP = 'INSERT' THEN
    action_type := 'expense_created';
    audit_user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for status changes
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'submitted' THEN action_type := 'expense_submitted';
        WHEN 'approved' THEN action_type := 'expense_approved';
        WHEN 'rejected' THEN action_type := 'expense_rejected';
        ELSE action_type := 'expense_updated';
      END CASE;
      audit_user_id := COALESCE(NEW.approved_by, NEW.user_id);
    ELSE
      action_type := 'expense_updated';
      audit_user_id := NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'expense_deleted';
    audit_user_id := OLD.user_id;
  END IF;

  -- Get user display name
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- Get category and subcategory names
  IF TG_OP = 'DELETE' THEN
    SELECT name INTO category_name FROM public.expense_categories WHERE id = OLD.category_id;
    SELECT name INTO subcategory_name FROM public.expense_subcategories WHERE id = OLD.subcategory_id;
  ELSE
    SELECT name INTO category_name FROM public.expense_categories WHERE id = NEW.category_id;
    SELECT name INTO subcategory_name FROM public.expense_subcategories WHERE id = NEW.subcategory_id;
  END IF;

  -- Build description and details
  IF TG_OP = 'INSERT' THEN
    description_val := 'Created expense: ' || COALESCE(category_name, 'Unknown Category') || 
                     CASE WHEN subcategory_name IS NOT NULL THEN ' - ' || subcategory_name ELSE '' END ||
                     ' ($' || NEW.amount || ')';
    details_val := jsonb_build_object(
      'category_name', category_name,
      'subcategory_name', subcategory_name,
      'amount', NEW.amount,
      'expense_date', NEW.expense_date,
      'description', NEW.description,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' THEN
    description_val := CASE action_type
      WHEN 'expense_submitted' THEN 'Submitted expense for approval'
      WHEN 'expense_approved' THEN 'Approved expense'
      WHEN 'expense_rejected' THEN 'Rejected expense'
      ELSE 'Updated expense'
    END || ': ' || COALESCE(category_name, 'Unknown Category') ||
    CASE WHEN subcategory_name IS NOT NULL THEN ' - ' || subcategory_name ELSE '' END ||
    ' ($' || NEW.amount || ')';
    
    details_val := jsonb_build_object(
      'category_name', category_name,
      'subcategory_name', subcategory_name,
      'amount', NEW.amount,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'approved_by', NEW.approved_by,
      'rejection_reason', NEW.rejection_reason
    );
  ELSIF TG_OP = 'DELETE' THEN
    description_val := 'Deleted expense: ' || COALESCE(category_name, 'Unknown Category') ||
                      CASE WHEN subcategory_name IS NOT NULL THEN ' - ' || subcategory_name ELSE '' END ||
                      ' ($' || OLD.amount || ')';
    details_val := jsonb_build_object(
      'category_name', category_name,
      'subcategory_name', subcategory_name,
      'amount', OLD.amount,
      'expense_date', OLD.expense_date,
      'status', OLD.status
    );
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    audit_user_id,
    user_display_name,
    action_type,
    'Expense',
    description_val,
    details_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_holiday_permission_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  target_user_name text;
  holiday_name text;
  description_val text;
  details_val jsonb;
  action_type text;
  audit_user_id uuid;
BEGIN
  -- Determine action type and audit user
  IF TG_OP = 'INSERT' THEN
    action_type := CASE WHEN NEW.is_allowed THEN 'holiday_permission_granted' ELSE 'holiday_permission_revoked' END;
    audit_user_id := COALESCE(NEW.created_by, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_allowed != NEW.is_allowed THEN
      action_type := CASE WHEN NEW.is_allowed THEN 'holiday_permission_granted' ELSE 'holiday_permission_revoked' END;
    ELSE
      action_type := 'holiday_permission_updated';
    END IF;
    audit_user_id := auth.uid();
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'holiday_permission_deleted';
    audit_user_id := auth.uid();
  END IF;

  -- Get audit user display name
  SELECT COALESCE(full_name, email, 'System') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- Get target user name and holiday name
  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(full_name, email, 'Unknown User') INTO target_user_name
    FROM public.profiles WHERE id = OLD.user_id;
    SELECT name INTO holiday_name FROM public.public_holidays WHERE id = OLD.holiday_id;
  ELSE
    SELECT COALESCE(full_name, email, 'Unknown User') INTO target_user_name
    FROM public.profiles WHERE id = NEW.user_id;
    SELECT name INTO holiday_name FROM public.public_holidays WHERE id = NEW.holiday_id;
  END IF;

  -- Build description and details
  IF TG_OP = 'INSERT' THEN
    description_val := CASE WHEN NEW.is_allowed 
                       THEN 'Granted holiday permission for ' || target_user_name || ' on ' || COALESCE(holiday_name, 'Unknown Holiday')
                       ELSE 'Revoked holiday permission for ' || target_user_name || ' on ' || COALESCE(holiday_name, 'Unknown Holiday')
                       END;
    details_val := jsonb_build_object(
      'target_user_id', NEW.user_id,
      'target_user_name', target_user_name,
      'holiday_id', NEW.holiday_id,
      'holiday_name', holiday_name,
      'is_allowed', NEW.is_allowed,
      'notes', NEW.notes,
      'created_by', NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF action_type = 'holiday_permission_granted' THEN
      description_val := 'Granted holiday permission for ' || target_user_name || ' on ' || COALESCE(holiday_name, 'Unknown Holiday');
    ELSIF action_type = 'holiday_permission_revoked' THEN
      description_val := 'Revoked holiday permission for ' || target_user_name || ' on ' || COALESCE(holiday_name, 'Unknown Holiday');
    ELSE
      description_val := 'Updated holiday permission for ' || target_user_name || ' on ' || COALESCE(holiday_name, 'Unknown Holiday');
    END IF;
    
    details_val := jsonb_build_object(
      'target_user_id', NEW.user_id,
      'target_user_name', target_user_name,
      'holiday_id', NEW.holiday_id,
      'holiday_name', holiday_name,
      'old_is_allowed', OLD.is_allowed,
      'new_is_allowed', NEW.is_allowed,
      'old_notes', OLD.notes,
      'new_notes', NEW.notes
    );
  ELSIF TG_OP = 'DELETE' THEN
    description_val := 'Deleted holiday permission for ' || target_user_name || ' on ' || COALESCE(holiday_name, 'Unknown Holiday');
    details_val := jsonb_build_object(
      'target_user_id', OLD.user_id,
      'target_user_name', target_user_name,
      'holiday_id', OLD.holiday_id,
      'holiday_name', holiday_name,
      'was_allowed', OLD.is_allowed,
      'notes', OLD.notes
    );
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    audit_user_id,
    user_display_name,
    action_type,
    'Holiday Permission',
    description_val,
    details_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_insert_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  entity_name_val text;
  description_val text;
  details_val jsonb;
  audit_user_id uuid;
BEGIN
  -- Determine the user_id to use for audit log based on table
  IF TG_TABLE_NAME = 'profiles' THEN
    audit_user_id := NEW.id;  -- For profiles, use the profile id
  ELSIF TG_TABLE_NAME = 'timesheet_entries' THEN
    audit_user_id := NEW.user_id;  -- timesheet_entries has user_id
  ELSE
    audit_user_id := auth.uid();  -- For other tables, use current auth user
  END IF;

  -- Get user display name using the correct audit_user_id
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- Handle different table insertions
  IF TG_TABLE_NAME = 'timesheet_entries' THEN
    -- Get project name for context
    SELECT COALESCE(p.name, c.name, 'Unknown Project/Contract') INTO entity_name_val
    FROM projects p 
    FULL OUTER JOIN contracts c ON c.id = NEW.contract_id
    WHERE p.id = NEW.project_id OR c.id = NEW.contract_id;
    
    description_val := 'Created timesheet entry for ' || entity_name_val || 
                      ' (' || NEW.hours_logged || ' hours on ' || NEW.entry_date || ')';
    details_val := jsonb_build_object(
      'project_id', NEW.project_id,
      'contract_id', NEW.contract_id,
      'hours_logged', NEW.hours_logged,
      'entry_date', NEW.entry_date,
      'entry_type', NEW.entry_type,
      'notes', NEW.notes
    );
    
  ELSIF TG_TABLE_NAME = 'projects' THEN
    entity_name_val := NEW.name;
    description_val := 'Created project: ' || NEW.name;
    details_val := jsonb_build_object(
      'project_name', NEW.name,
      'budget_hours', NEW.budget_hours,
      'customer_id', NEW.customer_id,
      'is_internal', NEW.is_internal
    );
    
  ELSIF TG_TABLE_NAME = 'contracts' THEN
    entity_name_val := NEW.name;
    description_val := 'Created contract: ' || NEW.name;
    details_val := jsonb_build_object(
      'contract_name', NEW.name,
      'customer_id', NEW.customer_id,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status
    );
    
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    entity_name_val := COALESCE(NEW.full_name, NEW.email, 'New Team Member');
    description_val := 'Added team member: ' || COALESCE(NEW.full_name, NEW.email, 'Unknown User');
    details_val := jsonb_build_object(
      'user_id', NEW.id,
      'full_name', NEW.full_name,
      'email', NEW.email,
      'role', NEW.role,
      'employment_type', NEW.employment_type,
      'organization', NEW.organization,
      'employee_id', NEW.employee_id,
      'employee_card_id', NEW.employee_card_id
    );
    
  END IF;

  -- Insert audit log only if we have valid data
  IF entity_name_val IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_name,
      action,
      entity_name,
      description,
      details
    ) VALUES (
      audit_user_id,
      user_display_name,
      CASE 
        WHEN TG_TABLE_NAME = 'timesheet_entries' THEN 'entry_created'
        WHEN TG_TABLE_NAME = 'projects' THEN 'project_created'
        WHEN TG_TABLE_NAME = 'contracts' THEN 'contract_created'
        WHEN TG_TABLE_NAME = 'profiles' THEN 'member_created'
      END,
      entity_name_val,
      description_val,
      details_val
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_leave_application_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  leave_type_name text;
  description_val text;
  details_val jsonb;
  action_type text;
  audit_user_id uuid;
BEGIN
  -- Determine action type and audit user
  IF TG_OP = 'INSERT' THEN
    action_type := 'leave_application_created';
    audit_user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for status changes to determine specific action
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      action_type := 'leave_application_approved';
      audit_user_id := NEW.approved_by;
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      action_type := 'leave_application_rejected';
      audit_user_id := NEW.approved_by;
    ELSIF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
      action_type := 'leave_application_cancelled';
      audit_user_id := NEW.user_id;
    ELSE
      action_type := 'leave_application_updated';
      audit_user_id := NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'leave_application_deleted';
    audit_user_id := OLD.user_id;
  END IF;

  -- Get user display name
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- Get leave type name
  IF TG_OP = 'DELETE' THEN
    SELECT name INTO leave_type_name FROM public.leave_types WHERE id = OLD.leave_type_id;
  ELSE
    SELECT name INTO leave_type_name FROM public.leave_types WHERE id = NEW.leave_type_id;
  END IF;

  -- Build description and details based on operation
  IF TG_OP = 'INSERT' THEN
    description_val := 'Created leave application for ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                     ' from ' || NEW.start_date || ' to ' || NEW.end_date ||
                     ' (' || NEW.business_days_count || ' business days)';
    details_val := jsonb_build_object(
      'leave_type_id', NEW.leave_type_id,
      'leave_type_name', leave_type_name,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'business_days_count', NEW.business_days_count,
      'reason', NEW.reason,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF action_type = 'leave_application_approved' THEN
      -- Get approver name
      SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
      FROM public.profiles WHERE id = NEW.approved_by;
      
      description_val := 'Approved leave application for ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                        ' from ' || NEW.start_date || ' to ' || NEW.end_date;
    ELSIF action_type = 'leave_application_rejected' THEN
      -- Get approver name
      SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
      FROM public.profiles WHERE id = NEW.approved_by;
      
      description_val := 'Rejected leave application for ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                        ' from ' || NEW.start_date || ' to ' || NEW.end_date;
    ELSIF action_type = 'leave_application_cancelled' THEN
      description_val := 'Cancelled leave application for ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                        ' from ' || NEW.start_date || ' to ' || NEW.end_date;
    ELSE
      description_val := 'Updated leave application for ' || COALESCE(leave_type_name, 'Unknown Leave Type');
    END IF;
    
    details_val := jsonb_build_object(
      'leave_type_id', NEW.leave_type_id,
      'leave_type_name', leave_type_name,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'business_days_count', NEW.business_days_count,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'manager_comments', NEW.manager_comments,
      'approved_by', NEW.approved_by,
      'approved_at', NEW.approved_at
    );
  ELSIF TG_OP = 'DELETE' THEN
    description_val := 'Deleted leave application for ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                      ' from ' || OLD.start_date || ' to ' || OLD.end_date;
    details_val := jsonb_build_object(
      'leave_type_id', OLD.leave_type_id,
      'leave_type_name', leave_type_name,
      'start_date', OLD.start_date,
      'end_date', OLD.end_date,
      'business_days_count', OLD.business_days_count,
      'status', OLD.status
    );
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    audit_user_id,
    user_display_name,
    action_type,
    'Leave Application',
    description_val,
    details_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_leave_balance_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  leave_type_name text;
  target_user_name text;
  description_val text;
  details_val jsonb;
  action_type text;
  audit_user_id uuid;
BEGIN
  -- Determine action type and audit user
  IF TG_OP = 'INSERT' THEN
    action_type := 'leave_balance_created';
    audit_user_id := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'leave_balance_updated';
    audit_user_id := auth.uid();
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'leave_balance_deleted';
    audit_user_id := auth.uid();
  END IF;

  -- Get audit user display name
  SELECT COALESCE(full_name, email, 'System') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- Get target user name and leave type
  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(full_name, email, 'Unknown User') INTO target_user_name
    FROM public.profiles WHERE id = OLD.user_id;
    SELECT name INTO leave_type_name FROM public.leave_types WHERE id = OLD.leave_type_id;
  ELSE
    SELECT COALESCE(full_name, email, 'Unknown User') INTO target_user_name
    FROM public.profiles WHERE id = NEW.user_id;
    SELECT name INTO leave_type_name FROM public.leave_types WHERE id = NEW.leave_type_id;
  END IF;

  -- Build description and details
  IF TG_OP = 'INSERT' THEN
    description_val := 'Created leave balance for ' || target_user_name || 
                      ' - ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                      ' (Year ' || NEW.year || ')';
    details_val := jsonb_build_object(
      'target_user_id', NEW.user_id,
      'target_user_name', target_user_name,
      'leave_type_id', NEW.leave_type_id,
      'leave_type_name', leave_type_name,
      'year', NEW.year,
      'total_days', NEW.total_days,
      'used_days', NEW.used_days,
      'remaining_days', NEW.remaining_days
    );
  ELSIF TG_OP = 'UPDATE' THEN
    description_val := 'Updated leave balance for ' || target_user_name || 
                      ' - ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                      ' (Year ' || NEW.year || ')';
    details_val := jsonb_build_object(
      'target_user_id', NEW.user_id,
      'target_user_name', target_user_name,
      'leave_type_id', NEW.leave_type_id,
      'leave_type_name', leave_type_name,
      'year', NEW.year,
      'old_total_days', OLD.total_days,
      'new_total_days', NEW.total_days,
      'old_used_days', OLD.used_days,
      'new_used_days', NEW.used_days,
      'old_remaining_days', OLD.remaining_days,
      'new_remaining_days', NEW.remaining_days
    );
  ELSIF TG_OP = 'DELETE' THEN
    description_val := 'Deleted leave balance for ' || target_user_name || 
                      ' - ' || COALESCE(leave_type_name, 'Unknown Leave Type') ||
                      ' (Year ' || OLD.year || ')';
    details_val := jsonb_build_object(
      'target_user_id', OLD.user_id,
      'target_user_name', target_user_name,
      'leave_type_id', OLD.leave_type_id,
      'leave_type_name', leave_type_name,
      'year', OLD.year,
      'total_days', OLD.total_days,
      'used_days', OLD.used_days,
      'remaining_days', OLD.remaining_days
    );
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    audit_user_id,
    user_display_name,
    action_type,
    'Leave Balance',
    description_val,
    details_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_location_checkin_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name TEXT;
  description_val TEXT;
  details_val JSONB;
  action_type TEXT;
  audit_user_id UUID;
BEGIN
  -- Determine action type and audit user
  IF TG_OP = 'INSERT' THEN
    action_type := 'location_checkin_created';
    audit_user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'location_checkin_updated';
    audit_user_id := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'location_checkin_deleted';
    audit_user_id := OLD.user_id;
  END IF;

  -- Get user display name
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- Build description and details
  IF TG_OP = 'INSERT' THEN
    description_val := 'Checked in at ' || NEW.actual_location || ' for ' || NEW.check_in_date;
    details_val := jsonb_build_object(
      'check_in_date', NEW.check_in_date,
      'planned_location', NEW.planned_location,
      'actual_location', NEW.actual_location,
      'check_in_time', NEW.check_in_time,
      'late_checkin', NEW.late_checkin,
      'location_change_reason', NEW.location_change_reason
    );
  ELSIF TG_OP = 'UPDATE' THEN
    description_val := 'Updated location check-in for ' || NEW.check_in_date;
    details_val := jsonb_build_object(
      'check_in_date', NEW.check_in_date,
      'old_actual_location', OLD.actual_location,
      'new_actual_location', NEW.actual_location,
      'location_change_reason', NEW.location_change_reason
    );
  ELSIF TG_OP = 'DELETE' THEN
    description_val := 'Deleted location check-in for ' || OLD.check_in_date;
    details_val := jsonb_build_object(
      'check_in_date', OLD.check_in_date,
      'actual_location', OLD.actual_location
    );
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    audit_user_id,
    user_display_name,
    action_type,
    'Location Check-in',
    description_val,
    details_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_ohs_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name TEXT;
  description_val TEXT;
  details_val JSONB;
  action_type TEXT;
  entity_name_val TEXT;
BEGIN
  -- Get user display name
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = auth.uid();

  -- Determine action type and entity name
  IF TG_OP = 'INSERT' THEN
    action_type := 'ohs_' || TG_TABLE_NAME || '_created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'ohs_' || TG_TABLE_NAME || '_updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'ohs_' || TG_TABLE_NAME || '_deleted';
  END IF;

  -- Set entity name based on table
  CASE TG_TABLE_NAME
    WHEN 'ohs_hazard_reports' THEN 
      entity_name_val := 'OHS Hazard Report';
      description_val := action_type || ': ' || COALESCE(NEW.title, OLD.title, 'Unknown');
    WHEN 'ohs_workplace_inspections' THEN 
      entity_name_val := 'OHS Workplace Inspection';
      description_val := action_type || ': Inspection on ' || COALESCE(NEW.inspection_date::text, OLD.inspection_date::text);
    WHEN 'ohs_injury_registers' THEN 
      entity_name_val := 'OHS Injury Register';
      description_val := action_type || ': Injury involving ' || COALESCE(NEW.injured_person_name, OLD.injured_person_name);
    WHEN 'ohs_inspection_results' THEN 
      entity_name_val := 'OHS Inspection Result';
      description_val := action_type || ': Inspection result';
    WHEN 'ohs_attachments' THEN 
      entity_name_val := 'OHS Attachment';
      description_val := action_type || ': ' || COALESCE(NEW.file_name, OLD.file_name);
    ELSE
      entity_name_val := 'OHS Record';
      description_val := action_type;
  END CASE;

  -- Build details JSON
  IF TG_OP = 'DELETE' THEN
    details_val := row_to_json(OLD);
  ELSE
    details_val := row_to_json(NEW);
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    auth.uid(),
    user_display_name,
    action_type,
    entity_name_val,
    description_val,
    details_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_report_generation_secure(p_report_type text, p_filters jsonb, p_result_count integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  entity_name_val text;
  description_val text;
BEGIN
  -- Get user display name
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = auth.uid();

  -- Format description based on report type and filters
  IF p_report_type = 'timesheet' THEN
    entity_name_val := 'Timesheet Report';
    description_val := 'Generated timesheet report (' || p_result_count || ' entries)';
  ELSE
    entity_name_val := 'Audit Report';
    description_val := 'Generated audit report (' || p_result_count || ' log entries)';
  END IF;

  -- Insert audit log entry
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    auth.uid(),
    user_display_name,
    CASE WHEN p_report_type = 'timesheet' THEN 'report_generated' ELSE 'audit_report_generated' END,
    entity_name_val,
    description_val,
    jsonb_build_object(
      'report_type', p_report_type,
      'result_count', p_result_count,
      'filters', p_filters
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_update_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name text;
  entity_name_val text;
  description_val text;
  details_val jsonb;
  audit_user_id uuid;
  is_admin_edit boolean := false;
BEGIN
  -- Determine the user_id to use for audit log based on table
  IF TG_TABLE_NAME = 'profiles' THEN
    audit_user_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'timesheet_entries' THEN
    -- Check if this is an admin editing another user's entry
    IF NEW.user_id != auth.uid() THEN
      is_admin_edit := true;
    END IF;
    audit_user_id := NEW.user_id;
  ELSE
    audit_user_id := auth.uid();
  END IF;

  -- Get user display name using the correct audit_user_id (not always auth.uid())
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
  FROM public.profiles WHERE id = audit_user_id;

  -- Handle different table updates
  IF TG_TABLE_NAME = 'timesheet_entries' THEN
    -- Get project or contract name for context
    IF NEW.project_id IS NOT NULL THEN
      SELECT p.name INTO entity_name_val FROM projects p WHERE p.id = NEW.project_id;
    ELSIF NEW.contract_id IS NOT NULL THEN
      SELECT c.name INTO entity_name_val FROM contracts c WHERE c.id = NEW.contract_id;
    ELSE
      entity_name_val := 'Unknown Project/Contract';
    END IF;
    
    -- Add admin prefix to description if admin is editing another user's entry
    description_val := CASE 
      WHEN is_admin_edit THEN '[ADMIN EDIT] Updated timesheet entry for ' 
      ELSE 'Updated timesheet entry for ' 
    END || COALESCE(entity_name_val, 'Unknown Project/Contract') || 
                      ' (' || NEW.hours_logged || ' hours on ' || NEW.entry_date || ')';
    
    details_val := jsonb_build_object(
      'project_id', NEW.project_id,
      'contract_id', NEW.contract_id,
      'hours_logged', NEW.hours_logged,
      'entry_date', NEW.entry_date,
      'entry_type', NEW.entry_type,
      'notes', NEW.notes,
      'old_hours_logged', OLD.hours_logged,
      'old_notes', OLD.notes,
      'is_admin_edit', is_admin_edit,
      'editor_id', auth.uid(),
      'target_user_id', NEW.user_id
    );
    
  ELSIF TG_TABLE_NAME = 'projects' THEN
    entity_name_val := NEW.name;
    description_val := 'Updated project: ' || NEW.name;
    details_val := jsonb_build_object(
      'project_name', NEW.name,
      'budget_hours', NEW.budget_hours,
      'customer_id', NEW.customer_id,
      'is_internal', NEW.is_internal,
      'old_project_name', OLD.name,
      'old_budget_hours', OLD.budget_hours
    );
    
  ELSIF TG_TABLE_NAME = 'contracts' THEN
    entity_name_val := NEW.name;
    description_val := 'Updated contract: ' || NEW.name;
    details_val := jsonb_build_object(
      'contract_name', NEW.name,
      'customer_id', NEW.customer_id,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status,
      'old_contract_name', OLD.name,
      'old_status', OLD.status
    );
    
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    entity_name_val := COALESCE(NEW.full_name, NEW.email, 'Team Member');
    description_val := 'Updated team member: ' || COALESCE(NEW.full_name, NEW.email, 'Unknown User');
    details_val := jsonb_build_object(
      'user_id', NEW.id,
      'full_name', NEW.full_name,
      'email', NEW.email,
      'role', NEW.role,
      'employment_type', NEW.employment_type,
      'organization', NEW.organization,
      'employee_id', NEW.employee_id,
      'employee_card_id', NEW.employee_card_id,
      'old_full_name', OLD.full_name,
      'old_role', OLD.role,
      'old_employment_type', OLD.employment_type,
      'old_organization', OLD.organization
    );
    
  END IF;

  -- Insert audit log only if we have valid data
  IF entity_name_val IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_name,
      action,
      entity_name,
      description,
      details
    ) VALUES (
      audit_user_id,
      user_display_name,
      CASE 
        WHEN TG_TABLE_NAME = 'timesheet_entries' THEN 'entry_updated'
        WHEN TG_TABLE_NAME = 'projects' THEN 'project_updated'
        WHEN TG_TABLE_NAME = 'contracts' THEN 'contract_updated'
        WHEN TG_TABLE_NAME = 'profiles' THEN 'member_updated'
      END,
      entity_name_val,
      description_val,
      details_val
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_work_schedule_location_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_display_name TEXT;
  description_val TEXT;
  details_val JSONB;
  action_type TEXT;
  audit_user_id UUID;
BEGIN
  -- Only log if locations changed
  IF TG_OP = 'UPDATE' AND (
    OLD.monday_location IS DISTINCT FROM NEW.monday_location OR
    OLD.tuesday_location IS DISTINCT FROM NEW.tuesday_location OR
    OLD.wednesday_location IS DISTINCT FROM NEW.wednesday_location OR
    OLD.thursday_location IS DISTINCT FROM NEW.thursday_location OR
    OLD.friday_location IS DISTINCT FROM NEW.friday_location OR
    OLD.saturday_location IS DISTINCT FROM NEW.saturday_location OR
    OLD.sunday_location IS DISTINCT FROM NEW.sunday_location
  ) THEN
    action_type := 'weekly_schedule_location_updated';
    audit_user_id := COALESCE(NEW.created_by, auth.uid());
    
    -- Get user display name
    SELECT COALESCE(full_name, email, 'Unknown User') INTO user_display_name
    FROM public.profiles WHERE id = audit_user_id;
    
    -- Get target user name
    SELECT COALESCE(full_name, email, 'Unknown User') INTO description_val
    FROM public.profiles WHERE id = NEW.user_id;
    
    description_val := 'Updated weekly work location schedule for ' || description_val || ' (week of ' || NEW.week_start_date || ')';
    details_val := jsonb_build_object(
      'target_user_id', NEW.user_id,
      'week_start_date', NEW.week_start_date,
      'old_locations', jsonb_build_object(
        'monday', OLD.monday_location,
        'tuesday', OLD.tuesday_location,
        'wednesday', OLD.wednesday_location,
        'thursday', OLD.thursday_location,
        'friday', OLD.friday_location,
        'saturday', OLD.saturday_location,
        'sunday', OLD.sunday_location
      ),
      'new_locations', jsonb_build_object(
        'monday', NEW.monday_location,
        'tuesday', NEW.tuesday_location,
        'wednesday', NEW.wednesday_location,
        'thursday', NEW.thursday_location,
        'friday', NEW.friday_location,
        'saturday', NEW.saturday_location,
        'sunday', NEW.sunday_location
      )
    );
    
    -- Insert audit log
    INSERT INTO public.audit_logs (
      user_id,
      user_name,
      action,
      entity_name,
      description,
      details
    ) VALUES (
      audit_user_id,
      user_display_name,
      action_type,
      'Weekly Work Schedule',
      description_val,
      details_val
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.maintain_timesheet_user_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When inserting, populate user_full_name from profiles
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO NEW.user_full_name
    FROM public.profiles
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.perform_annual_reset(p_year integer DEFAULT NULL::integer, p_user_id uuid DEFAULT NULL::uuid, p_leave_type_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  reset_year integer;
  balance_record record;
  carry_over_amount numeric;
  new_total_days numeric;
  results jsonb := '[]'::jsonb;
  result_item jsonb;
BEGIN
  -- Default to next year if not specified
  reset_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE) + 1);
  
  -- Loop through balances to reset
  FOR balance_record IN
    SELECT 
      lb.user_id,
      lb.leave_type_id,
      lb.total_days - lb.used_days as remaining_days,
      lt.default_balance_days,
      lt.max_carry_over_days,
      lt.carry_over_expiry_months,
      lt.name as leave_type_name
    FROM leave_balances lb
    JOIN leave_types lt ON lb.leave_type_id = lt.id
    JOIN profiles p ON lb.user_id = p.id
    WHERE lb.year = reset_year - 1
      AND p.employment_type = 'full-time'
      AND (p_user_id IS NULL OR lb.user_id = p_user_id)
      AND (p_leave_type_id IS NULL OR lb.leave_type_id = p_leave_type_id)
  LOOP
    -- Calculate carry over amount
    carry_over_amount := LEAST(
      balance_record.remaining_days,
      balance_record.max_carry_over_days
    );
    
    -- Calculate new total (default + carry over)
    new_total_days := balance_record.default_balance_days + carry_over_amount;
    
    -- Create or update balance for new year
    INSERT INTO leave_balances (user_id, leave_type_id, year, total_days, used_days)
    VALUES (
      balance_record.user_id,
      balance_record.leave_type_id,
      reset_year,
      new_total_days,
      0
    )
    ON CONFLICT (user_id, leave_type_id, year)
    DO UPDATE SET 
      total_days = EXCLUDED.total_days,
      updated_at = now();
    
    -- Log the operation
    INSERT INTO leave_balance_operations (
      operation_type,
      user_id,
      leave_type_id,
      year,
      amount,
      reason,
      created_by,
      details
    ) VALUES (
      'annual_reset',
      balance_record.user_id,
      balance_record.leave_type_id,
      reset_year,
      new_total_days,
      'Annual reset with carry-over',
      auth.uid(),
      jsonb_build_object(
        'old_remaining', balance_record.remaining_days,
        'carry_over', carry_over_amount,
        'new_total', new_total_days,
        'default_days', balance_record.default_balance_days
      )
    );
    
    -- Add result to array
    result_item := jsonb_build_object(
      'user_id', balance_record.user_id,
      'leave_type_id', balance_record.leave_type_id,
      'old_remaining', balance_record.remaining_days,
      'carry_over', carry_over_amount,
      'new_total', new_total_days
    );
    results := results || result_item;
  END LOOP;
  
  RETURN results;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reactivate_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only admins can reactivate users
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can reactivate users';
  END IF;

  -- Update the user profile
  UPDATE public.profiles 
  SET 
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL,
    deactivation_reason = NULL
  WHERE id = p_user_id;

  -- Log the reactivation
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_name,
    description,
    details
  ) VALUES (
    auth.uid(),
    get_user_display_name(auth.uid()),
    'user_reactivated',
    'User Profile',
    'Reactivated user: ' || get_user_display_name(p_user_id),
    jsonb_build_object(
      'reactivated_user_id', p_user_id,
      'reactivated_user_name', get_user_display_name(p_user_id)
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_audit_user_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Automatically populate user_name from profiles table
  NEW.user_name := public.get_user_display_name(NEW.user_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_business_days_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.business_days_count := public.calculate_business_days(NEW.start_date, NEW.end_date);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_timesheet_user_with_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_user_role text;
  current_user_id uuid;
BEGIN
  -- Get current authenticated user ID
  current_user_id := auth.uid();
  
  -- Get current user's role
  SELECT role::text INTO current_user_role
  FROM public.profiles 
  WHERE id = current_user_id;
  
  -- Debug logging
  RAISE LOG 'TRIGGER DEBUG: current_user_id=%, current_user_role=%, NEW.user_id=%', 
    current_user_id, current_user_role, NEW.user_id;
  
  -- If user_id is not provided, always set to current user
  IF NEW.user_id IS NULL THEN
    NEW.user_id := current_user_id;
    RAISE LOG 'TRIGGER DEBUG: Set user_id to current user (NULL case)';
  -- If user_id is provided but different from current user, only allow if admin
  ELSIF NEW.user_id != current_user_id THEN
    -- Only admins can create entries for other users
    IF current_user_role != 'admin' THEN
      -- Non-admin users can only create entries for themselves
      NEW.user_id := current_user_id;
      RAISE LOG 'TRIGGER DEBUG: Non-admin attempted to set different user_id, overriding to current user';
    ELSE
      -- Admin can preserve the provided user_id
      RAISE LOG 'TRIGGER DEBUG: Admin creating entry for user_id=%', NEW.user_id;
    END IF;
  ELSE
    RAISE LOG 'TRIGGER DEBUG: user_id matches current user, no change needed';
  END IF;
  
  -- Set user_full_name from profiles table for the target user
  SELECT full_name INTO NEW.user_full_name
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  RAISE LOG 'TRIGGER DEBUG: Final user_id=%, user_full_name=%', NEW.user_id, NEW.user_full_name;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_timesheet_user_names()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update all timesheet entries for this user when their full_name changes
  UPDATE public.timesheet_entries 
  SET user_full_name = NEW.full_name
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_weekly_schedules_with_profiles(p_week_start_date date DEFAULT NULL::date)
 RETURNS TABLE(user_id uuid, synced_hours jsonb, was_updated boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  target_week_start DATE;
  profile_record RECORD;
  existing_schedule RECORD;
  default_hours JSONB;
  should_update BOOLEAN;
BEGIN
  -- Use current week if no date provided
  IF p_week_start_date IS NULL THEN
    target_week_start := date_trunc('week', CURRENT_DATE);
  ELSE
    target_week_start := p_week_start_date;
  END IF;

  -- Loop through all active profiles with default office day settings
  FOR profile_record IN
    SELECT 
      p.id,
      p.employment_type,
      p.default_monday_office,
      p.default_tuesday_office,
      p.default_wednesday_office,
      p.default_thursday_office,
      p.default_friday_office
    FROM profiles p
    WHERE p.employment_type IS NOT NULL
      AND p.is_active = true  -- CRITICAL: Only process active users
  LOOP
    -- Calculate default hours based on profile
    default_hours := jsonb_build_object(
      'monday_hours', CASE 
        WHEN profile_record.employment_type = 'full-time' THEN 8.0
        WHEN profile_record.employment_type = 'part-time' AND profile_record.default_monday_office THEN 8.0
        ELSE 0.0
      END,
      'tuesday_hours', CASE 
        WHEN profile_record.employment_type = 'full-time' THEN 8.0
        WHEN profile_record.employment_type = 'part-time' AND profile_record.default_tuesday_office THEN 8.0
        ELSE 0.0
      END,
      'wednesday_hours', CASE 
        WHEN profile_record.employment_type = 'full-time' THEN 8.0
        WHEN profile_record.employment_type = 'part-time' AND profile_record.default_wednesday_office THEN 8.0
        ELSE 0.0
      END,
      'thursday_hours', CASE 
        WHEN profile_record.employment_type = 'full-time' THEN 8.0
        WHEN profile_record.employment_type = 'part-time' AND profile_record.default_thursday_office THEN 8.0
        ELSE 0.0
      END,
      'friday_hours', CASE 
        WHEN profile_record.employment_type = 'full-time' THEN 8.0
        WHEN profile_record.employment_type = 'part-time' AND profile_record.default_friday_office THEN 8.0
        ELSE 0.0
      END,
      'saturday_hours', 0.0,
      'sunday_hours', 0.0
    );

    -- Check if existing schedule exists and if it needs updating
    SELECT * INTO existing_schedule
    FROM weekly_work_schedules wws
    WHERE wws.user_id = profile_record.id 
      AND wws.week_start_date = target_week_start;

    should_update := FALSE;

    IF existing_schedule.id IS NOT NULL THEN
      -- Check if existing schedule matches the profile template
      IF existing_schedule.monday_hours != (default_hours->>'monday_hours')::NUMERIC OR
         existing_schedule.tuesday_hours != (default_hours->>'tuesday_hours')::NUMERIC OR
         existing_schedule.wednesday_hours != (default_hours->>'wednesday_hours')::NUMERIC OR
         existing_schedule.thursday_hours != (default_hours->>'thursday_hours')::NUMERIC OR
         existing_schedule.friday_hours != (default_hours->>'friday_hours')::NUMERIC THEN
        should_update := TRUE;
      END IF;
    ELSE
      -- No existing schedule, create one
      should_update := TRUE;
    END IF;

    -- Update or insert the schedule if needed
    IF should_update THEN
      INSERT INTO weekly_work_schedules (
        user_id,
        week_start_date,
        monday_hours,
        tuesday_hours,
        wednesday_hours,
        thursday_hours,
        friday_hours,
        saturday_hours,
        sunday_hours,
        created_by,
        updated_at
      ) VALUES (
        profile_record.id,
        target_week_start,
        (default_hours->>'monday_hours')::NUMERIC,
        (default_hours->>'tuesday_hours')::NUMERIC,
        (default_hours->>'wednesday_hours')::NUMERIC,
        (default_hours->>'thursday_hours')::NUMERIC,
        (default_hours->>'friday_hours')::NUMERIC,
        (default_hours->>'saturday_hours')::NUMERIC,
        (default_hours->>'sunday_hours')::NUMERIC,
        profile_record.id, -- Self-created
        NOW()
      )
      ON CONFLICT (user_id, week_start_date) 
      DO UPDATE SET
        monday_hours = EXCLUDED.monday_hours,
        tuesday_hours = EXCLUDED.tuesday_hours,
        wednesday_hours = EXCLUDED.wednesday_hours,
        thursday_hours = EXCLUDED.thursday_hours,
        friday_hours = EXCLUDED.friday_hours,
        saturday_hours = EXCLUDED.saturday_hours,
        sunday_hours = EXCLUDED.sunday_hours,
        updated_at = NOW();
    END IF;

    -- Return the result
    user_id := profile_record.id;
    synced_hours := default_hours;
    was_updated := should_update;
    RETURN NEXT;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.timesheet_entries_report(p_start_date date, p_end_date date, p_user_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_customer_id uuid DEFAULT NULL::uuid, p_contract_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, user_id uuid, project_id uuid, contract_id uuid, entry_date date, hours_logged numeric, notes text, jira_task_id text, created_at timestamp with time zone, updated_at timestamp with time zone, start_time character varying, end_time character varying, project_name text, project_description text, project_customer_id uuid, user_full_name text, user_email text, user_organization text, user_time_zone text, user_employee_card_id text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select
    te.id,
    te.user_id,
    te.project_id,
    te.contract_id,
    te.entry_date,
    te.hours_logged,
    te.notes,
    te.jira_task_id,
    te.created_at,
    te.updated_at,
    te.start_time,
    te.end_time,
    CASE 
      WHEN te.entry_type = 'project' THEN prj.name
      WHEN te.entry_type = 'contract' THEN c.name
      ELSE 'Unknown'
    END as project_name,
    CASE 
      WHEN te.entry_type = 'project' THEN prj.description
      WHEN te.entry_type = 'contract' THEN c.description
      ELSE NULL
    END as project_description,
    CASE 
      WHEN te.entry_type = 'project' THEN prj.customer_id
      WHEN te.entry_type = 'contract' THEN c.customer_id
      ELSE NULL
    END as project_customer_id,
    prof.full_name    as user_full_name,
    prof.email        as user_email,
    prof.organization as user_organization,
    prof.time_zone    as user_time_zone,
    prof.employee_card_id as user_employee_card_id
  from timesheet_entries te
  left join projects  prj  on prj.id  = te.project_id AND te.entry_type = 'project'
  left join contracts c    on c.id   = te.contract_id AND te.entry_type = 'contract'
  join profiles  prof on prof.id = te.user_id
  where te.entry_date >= p_start_date
    and te.entry_date <= p_end_date
    and (p_user_id      is null or te.user_id      = p_user_id)
    and (p_project_id   is null or (te.project_id   = p_project_id AND te.entry_type = 'project'))
    and (p_contract_id  is null or (te.contract_id  = p_contract_id AND te.entry_type = 'contract'))
    and (p_customer_id  is null or 
         (te.entry_type = 'project' AND prj.customer_id = p_customer_id) OR
         (te.entry_type = 'contract' AND c.customer_id = p_customer_id));
$function$
;

CREATE OR REPLACE FUNCTION public.timesheet_entries_report(p_start_date date, p_end_date date, p_user_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_customer_id uuid DEFAULT NULL::uuid, p_contract_id uuid DEFAULT NULL::uuid, p_include_projects boolean DEFAULT true, p_include_contracts boolean DEFAULT true)
 RETURNS TABLE(id uuid, user_id uuid, project_id uuid, contract_id uuid, entry_date date, hours_logged numeric, notes text, jira_task_id text, created_at timestamp with time zone, updated_at timestamp with time zone, start_time character varying, end_time character varying, project_name text, project_description text, project_customer_id uuid, user_full_name text, user_email text, user_organization text, user_time_zone text, user_employee_card_id text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select
    te.id,
    te.user_id,
    te.project_id,
    te.contract_id,
    te.entry_date,
    te.hours_logged,
    te.notes,
    te.jira_task_id,
    te.created_at,
    te.updated_at,
    te.start_time,
    te.end_time,
    CASE 
      WHEN te.entry_type = 'project' THEN prj.name
      WHEN te.entry_type = 'contract' THEN c.name
      ELSE 'Unknown'
    END as project_name,
    CASE 
      WHEN te.entry_type = 'project' THEN prj.description
      WHEN te.entry_type = 'contract' THEN c.description
      ELSE NULL
    END as project_description,
    CASE 
      WHEN te.entry_type = 'project' THEN prj.customer_id
      WHEN te.entry_type = 'contract' THEN c.customer_id
      ELSE NULL
    END as project_customer_id,
    prof.full_name    as user_full_name,
    prof.email        as user_email,
    prof.organization as user_organization,
    prof.time_zone    as user_time_zone,
    prof.employee_card_id as user_employee_card_id
  from timesheet_entries te
  left join projects  prj  on prj.id  = te.project_id AND te.entry_type = 'project'
  left join contracts c    on c.id   = te.contract_id AND te.entry_type = 'contract'
  join profiles  prof on prof.id = te.user_id
  where te.entry_date >= p_start_date
    and te.entry_date <= p_end_date
    and (p_user_id      is null or te.user_id      = p_user_id)
    and (p_project_id   is null or te.project_id   = p_project_id)
    and (p_contract_id  is null or te.contract_id   = p_contract_id)
    and (p_customer_id  is null or 
         (te.entry_type = 'project' AND prj.customer_id = p_customer_id) OR
         (te.entry_type = 'contract' AND c.customer_id = p_customer_id))
    and (
      (p_include_projects = true AND te.entry_type = 'project') OR
      (p_include_contracts = true AND te.entry_type = 'contract')
    );
$function$
;

create or replace view "public"."timesheet_report_view" as  SELECT te.id,
    te.user_id,
    COALESCE(te.user_full_name, p.full_name, p.email) AS user_name,
    p.organization,
    p.time_zone,
    p.employee_card_id,
    te.entry_date,
    te.hours_logged,
    te.notes,
    te.jira_task_id,
    te.start_time,
    te.end_time,
    te.entry_type,
    te.project_id,
    te.contract_id,
    proj.name AS project_name,
    proj.description AS project_description,
    proj.budget_hours AS project_budget_hours,
    cont.name AS contract_name,
    cont.description AS contract_description,
    cust.name AS customer_name,
    cust.company AS customer_company,
    te.created_at,
    te.updated_at
   FROM ((((timesheet_entries te
     LEFT JOIN profiles p ON ((p.id = te.user_id)))
     LEFT JOIN projects proj ON ((proj.id = te.project_id)))
     LEFT JOIN contracts cont ON ((cont.id = te.contract_id)))
     LEFT JOIN customers cust ON ((cust.id = COALESCE(proj.customer_id, cont.customer_id))));


CREATE OR REPLACE FUNCTION public.unlock_leave_dates(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only unlock dates that were locked by leave applications
  UPDATE public.work_schedules 
  SET locked_until_date = NULL,
      lock_reason = NULL,
      locked_at = NULL,
      locked_by = NULL
  WHERE user_id = p_user_id 
    AND lock_reason LIKE 'Leave Application%'
    AND locked_until_date >= p_start_date 
    AND locked_until_date <= p_end_date;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_expense_categories_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_expense_subcategories_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_expenses_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_internal_projects_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only update if status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update the leave balance
    UPDATE public.leave_balances 
    SET used_days = used_days + NEW.business_days_count,
        updated_at = now()
    WHERE user_id = NEW.user_id 
      AND leave_type_id = NEW.leave_type_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date);
    
    -- If no balance record exists, create one
    IF NOT FOUND THEN
      INSERT INTO public.leave_balances (user_id, leave_type_id, year, total_days, used_days)
      SELECT NEW.user_id, NEW.leave_type_id, EXTRACT(YEAR FROM NEW.start_date), 
             COALESCE(lt.default_balance_days, 0), NEW.business_days_count
      FROM public.leave_types lt WHERE lt.id = NEW.leave_type_id;
    END IF;
    
    -- Lock timesheet entries for approved leave dates
    PERFORM public.lock_leave_dates(NEW.user_id, NEW.start_date, NEW.end_date, NEW.id);
  END IF;
  
  -- If status changed from approved to something else, reverse the balance update
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.leave_balances 
    SET used_days = used_days - NEW.business_days_count,
        updated_at = now()
    WHERE user_id = NEW.user_id 
      AND leave_type_id = NEW.leave_type_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date);
    
    -- Unlock timesheet entries
    PERFORM public.unlock_leave_dates(NEW.user_id, NEW.start_date, NEW.end_date);
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_leave_balance_remaining()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.remaining_days = NEW.total_days - NEW.used_days;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_leave_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_ohs_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_public_holidays_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_full_name_in_timesheet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update cached user_full_name in timesheet_entries when profile full_name changes
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    UPDATE public.timesheet_entries 
    SET user_full_name = NEW.full_name 
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_holiday_permissions_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_weekly_work_schedules_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_work_schedule_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_timesheet_entry_batch(p_entry_data jsonb, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  entry_date DATE;
  project_id UUID;
  contract_id UUID;
  hours_logged NUMERIC;
  entry_type TEXT;
  existing_entry_id UUID;
  
  -- Validation results
  date_valid BOOLEAN := true;
  weekend_valid BOOLEAN := true;
  holiday_valid BOOLEAN := true;
  budget_valid BOOLEAN := true;
  
  -- Messages
  date_message TEXT := NULL;
  weekend_message TEXT := NULL;
  holiday_message TEXT := NULL;
  budget_message TEXT := NULL;
  budget_can_override BOOLEAN := false;
  
  -- Helper variables
  day_of_week INTEGER;
  week_start DATE;
  user_role TEXT;
  working_day BOOLEAN;
  allow_weekends BOOLEAN;
  holiday_permission RECORD;
  budget_check RECORD;
  profile_record RECORD;
  working_days_count INTEGER;
BEGIN
  -- Extract entry data
  entry_date := (p_entry_data->>'entry_date')::DATE;
  project_id := (p_entry_data->>'project_id')::UUID;
  contract_id := (p_entry_data->>'contract_id')::UUID;
  hours_logged := (p_entry_data->>'hours_logged')::NUMERIC;
  entry_type := p_entry_data->>'entry_type';
  existing_entry_id := (p_entry_data->>'existing_entry_id')::UUID;
  
  -- Get user role for potential overrides
  SELECT role::TEXT INTO user_role FROM profiles WHERE id = p_user_id;
  
  -- Admin bypass: admins can bypass work schedule restrictions
  IF user_role = 'admin' THEN
    -- Still validate budget and holidays for admins, but allow any work day
    date_valid := true;
    date_message := 'Admin privilege allows all entries';
  ELSE
    -- Check 1: Validate working day based on schedule
    day_of_week := EXTRACT(DOW FROM entry_date);
    week_start := date_trunc('week', entry_date + interval '1 day') - interval '1 day';
    
    -- Check weekly schedule override first - use correct column names (*_working not *_hours)
    SELECT 
      CASE day_of_week
        WHEN 0 THEN sunday_working
        WHEN 1 THEN monday_working  
        WHEN 2 THEN tuesday_working
        WHEN 3 THEN wednesday_working
        WHEN 4 THEN thursday_working
        WHEN 5 THEN friday_working
        WHEN 6 THEN saturday_working
      END INTO working_day
    FROM weekly_work_schedules
    WHERE user_id = p_user_id AND week_start_date = week_start;
    
    -- Fall back to default work schedule if no weekly override
    IF working_day IS NULL THEN
      -- Get profile office day configuration and working_days
      SELECT 
        p.default_monday_office,
        p.default_tuesday_office, 
        p.default_wednesday_office,
        p.default_thursday_office,
        p.default_friday_office,
        ws.working_days
      INTO profile_record
      FROM profiles p
      LEFT JOIN work_schedules ws ON ws.user_id = p.id
      WHERE p.id = p_user_id;
      
      -- Prioritize profile office day configuration over working_days count
      IF profile_record.default_monday_office IS NOT NULL OR
         profile_record.default_tuesday_office IS NOT NULL OR
         profile_record.default_wednesday_office IS NOT NULL OR
         profile_record.default_thursday_office IS NOT NULL OR
         profile_record.default_friday_office IS NOT NULL THEN
        
        -- Use profile office day template
        SELECT 
          CASE day_of_week
            WHEN 1 THEN COALESCE(profile_record.default_monday_office, false)
            WHEN 2 THEN COALESCE(profile_record.default_tuesday_office, false)
            WHEN 3 THEN COALESCE(profile_record.default_wednesday_office, false)
            WHEN 4 THEN COALESCE(profile_record.default_thursday_office, false)
            WHEN 5 THEN COALESCE(profile_record.default_friday_office, false)
            ELSE false
          END INTO working_day;
      ELSE
        -- Fall back to generic working_days count
        working_days_count := COALESCE(profile_record.working_days, 5);
        SELECT 
          CASE 
            WHEN day_of_week = 1 AND working_days_count >= 1 THEN true
            WHEN day_of_week = 2 AND working_days_count >= 2 THEN true  
            WHEN day_of_week = 3 AND working_days_count >= 3 THEN true
            WHEN day_of_week = 4 AND working_days_count >= 4 THEN true
            WHEN day_of_week = 5 AND working_days_count >= 5 THEN true
            ELSE false
          END INTO working_day;
      END IF;
    END IF;
    
    -- If not a working day, validate date
    IF working_day IS NOT TRUE THEN
      date_valid := false;
      date_message := 'Entry date is not a scheduled working day';
    END IF;
  END IF;
  
  -- Check 2: Weekend validation
  IF day_of_week IN (0, 6) THEN -- Sunday = 0, Saturday = 6
    SELECT allow_weekend_entries INTO allow_weekends
    FROM work_schedules 
    WHERE user_id = p_user_id;
    
    IF NOT COALESCE(allow_weekends, false) AND user_role != 'admin' THEN
      weekend_valid := false;
      weekend_message := 'Weekend entries are not allowed for this user';
    END IF;
  END IF;
  
  -- Check 3: Holiday validation
  IF is_public_holiday(entry_date) THEN
    SELECT * INTO holiday_permission
    FROM check_user_holiday_permission(p_user_id, entry_date);
    
    IF NOT holiday_permission.is_allowed THEN
      holiday_valid := false;
      holiday_message := holiday_permission.message;
    END IF;
  END IF;
  
  -- Check 4: Budget validation (only for project entries)
  IF entry_type = 'project' AND project_id IS NOT NULL AND hours_logged IS NOT NULL THEN
    SELECT * INTO budget_check
    FROM (
      SELECT 
        vr.is_valid,
        vr.message,
        vr.can_override
      FROM (
        SELECT 
          NOT (total_hours + hours_logged > budget_hours) as is_valid,
          CASE 
            WHEN total_hours + hours_logged > budget_hours THEN
              'Adding ' || hours_logged || ' hours would exceed project budget of ' || budget_hours || ' hours (currently used: ' || total_hours || ' hours)'
            ELSE 'Budget OK'
          END as message,
          (user_role = 'admin') as can_override
        FROM (
          SELECT 
            p.budget_hours,
            COALESCE(SUM(te.hours_logged), 0) as total_hours
          FROM projects p
          LEFT JOIN timesheet_entries te ON te.project_id = p.id 
            AND (existing_entry_id IS NULL OR te.id != existing_entry_id)
          WHERE p.id = project_id
          GROUP BY p.budget_hours
        ) budget_calc
      ) vr
    ) validation_result;
    
    IF budget_check.is_valid IS NOT NULL THEN
      budget_valid := budget_check.is_valid;
      budget_message := budget_check.message;
      budget_can_override := budget_check.can_override;
    END IF;
  END IF;
  
  -- Return comprehensive validation result
  RETURN jsonb_build_object(
    'date_valid', date_valid,
    'date_message', date_message,
    'weekend_valid', weekend_valid, 
    'weekend_message', weekend_message,
    'holiday_valid', holiday_valid,
    'holiday_message', holiday_message,
    'budget_valid', budget_valid,
    'budget_message', budget_message,
    'budget_can_override', budget_can_override,
    'overall_valid', (date_valid AND weekend_valid AND holiday_valid AND budget_valid)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_timesheet_entry_constraints()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure either project_id OR contract_id is set, but not both
  IF (NEW.project_id IS NULL AND NEW.contract_id IS NULL) THEN
    RAISE EXCEPTION 'Either project_id or contract_id must be specified';
  END IF;
  
  IF (NEW.project_id IS NOT NULL AND NEW.contract_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot specify both project_id and contract_id';
  END IF;
  
  -- Validate entry_type matches the ID type
  IF NEW.entry_type = 'project' AND NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'entry_type is project but project_id is null';
  END IF;
  
  IF NEW.entry_type = 'contract' AND NEW.contract_id IS NULL THEN
    RAISE EXCEPTION 'entry_type is contract but contract_id is null';
  END IF;
  
  -- Ensure hours_logged is positive
  IF NEW.hours_logged <= 0 THEN
    RAISE EXCEPTION 'hours_logged must be greater than 0';
  END IF;
  
  RETURN NEW;
END;
$function$
;


  create policy "Authenticated users can insert audit logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to public
with check ((auth.uid() IS NOT NULL));



  create policy "Users can view their own audit logs or admins can view all"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Only admins can create contract assignments"
  on "public"."contract_assignments"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Only admins can delete contract assignments"
  on "public"."contract_assignments"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Only admins can update contract assignments"
  on "public"."contract_assignments"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can view contract assignments they are part of"
  on "public"."contract_assignments"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (assigned_by = auth.uid()) OR (get_current_user_role() = 'admin'::text)));



  create policy "Admins can delete contract_services"
  on "public"."contract_services"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can insert contract_services"
  on "public"."contract_services"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update contract_services"
  on "public"."contract_services"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can view all contract_services"
  on "public"."contract_services"
  as permissive
  for select
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can delete contracts"
  on "public"."contracts"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update contracts"
  on "public"."contracts"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Enable delete for admins"
  on "public"."contracts"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Enable insert for authenticated users"
  on "public"."contracts"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Enable read access for authenticated users"
  on "public"."contracts"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable update for authenticated users"
  on "public"."contracts"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users can view assigned contracts"
  on "public"."contracts"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM contract_assignments ca
  WHERE ((ca.contract_id = contracts.id) AND (ca.user_id = auth.uid())))));



  create policy "Admins can delete customers"
  on "public"."customers"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can insert customers"
  on "public"."customers"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can manage customers"
  on "public"."customers"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update customers"
  on "public"."customers"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can view all customers"
  on "public"."customers"
  as permissive
  for select
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can manage all check-ins"
  on "public"."daily_location_checkins"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can create their own check-ins"
  on "public"."daily_location_checkins"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own check-ins"
  on "public"."daily_location_checkins"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Users can view their own check-ins"
  on "public"."daily_location_checkins"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Users can delete attachments from their expenses"
  on "public"."expense_attachments"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM expenses
  WHERE ((expenses.id = expense_attachments.expense_id) AND ((expenses.user_id = auth.uid()) OR (get_current_user_role() = 'admin'::text))))));



  create policy "Users can upload attachments to their expenses"
  on "public"."expense_attachments"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM expenses
  WHERE ((expenses.id = expense_attachments.expense_id) AND (expenses.user_id = auth.uid())))));



  create policy "Users can view attachments for their expenses"
  on "public"."expense_attachments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM expenses
  WHERE ((expenses.id = expense_attachments.expense_id) AND ((expenses.user_id = auth.uid()) OR (get_current_user_role() = 'admin'::text))))));



  create policy "Admins can manage expense categories"
  on "public"."expense_categories"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Anyone can view expense categories"
  on "public"."expense_categories"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "Admins can manage expense subcategories"
  on "public"."expense_subcategories"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Anyone can view expense subcategories"
  on "public"."expense_subcategories"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "Admins can manage all expenses"
  on "public"."expenses"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can create their own expenses"
  on "public"."expenses"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own draft expenses"
  on "public"."expenses"
  as permissive
  for delete
  to public
using ((((auth.uid() = user_id) AND (status = 'draft'::expense_status)) OR (get_current_user_role() = 'admin'::text)));



  create policy "Users can update their own draft/submitted expenses"
  on "public"."expenses"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) AND ((status = ANY (ARRAY['draft'::expense_status, 'submitted'::expense_status])) OR (get_current_user_role() = 'admin'::text))));



  create policy "Users can view their own expenses"
  on "public"."expenses"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Admins can manage all attachments"
  on "public"."leave_application_attachments"
  as permissive
  for all
  to authenticated
using ((get_current_user_role() = 'admin'::text))
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can view all attachments"
  on "public"."leave_application_attachments"
  as permissive
  for select
  to authenticated
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can upload attachments to their applications"
  on "public"."leave_application_attachments"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM leave_applications la
  WHERE ((la.id = leave_application_attachments.application_id) AND (la.user_id = auth.uid())))));



  create policy "Users can view attachments for their applications"
  on "public"."leave_application_attachments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM leave_applications la
  WHERE ((la.id = leave_application_attachments.application_id) AND (la.user_id = auth.uid())))));



  create policy "Admins can manage all leave applications"
  on "public"."leave_applications"
  as permissive
  for all
  to authenticated
using ((get_current_user_role() = 'admin'::text))
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can view all leave applications"
  on "public"."leave_applications"
  as permissive
  for select
  to authenticated
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can create their own leave applications"
  on "public"."leave_applications"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can update their pending leave applications"
  on "public"."leave_applications"
  as permissive
  for update
  to authenticated
using (((auth.uid() = user_id) AND (status = 'pending'::leave_status)))
with check ((auth.uid() = user_id));



  create policy "Users can view their own leave applications"
  on "public"."leave_applications"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Admins can manage leave balance operations"
  on "public"."leave_balance_operations"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text))
with check ((get_current_user_role() = 'admin'::text));



  create policy "Users can view their own operations"
  on "public"."leave_balance_operations"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Admins can manage leave balances"
  on "public"."leave_balances"
  as permissive
  for all
  to authenticated
using ((get_current_user_role() = 'admin'::text))
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can view all leave balances"
  on "public"."leave_balances"
  as permissive
  for select
  to authenticated
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can view their own leave balances"
  on "public"."leave_balances"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Authenticated users can view leave types"
  on "public"."leave_types"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Managers and admins can manage OHS attachments"
  on "public"."ohs_attachments"
  as permissive
  for all
  to public
using ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])))
with check ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])));



  create policy "Managers and admins can manage hazard reports"
  on "public"."ohs_hazard_reports"
  as permissive
  for all
  to public
using ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])))
with check ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])));



  create policy "Managers and admins can manage injury registers"
  on "public"."ohs_injury_registers"
  as permissive
  for all
  to public
using ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])))
with check ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])));



  create policy "Everyone can view inspection items"
  on "public"."ohs_inspection_items"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "Managers and admins can manage inspection items"
  on "public"."ohs_inspection_items"
  as permissive
  for all
  to public
using ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])))
with check ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])));



  create policy "Managers and admins can manage inspection results"
  on "public"."ohs_inspection_results"
  as permissive
  for all
  to public
using ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])))
with check ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])));



  create policy "Managers and admins can manage workplace inspections"
  on "public"."ohs_workplace_inspections"
  as permissive
  for all
  to public
using ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])))
with check ((get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])));



  create policy "Admins can delete profiles"
  on "public"."profiles"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can insert profiles"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update profiles"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can view all profiles including inactive"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can view their own active profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) AND (is_active = true)));



  create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) AND (is_active = true)));



  create policy "Admins can manage project assignments"
  on "public"."project_assignments"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can create project assignments"
  on "public"."project_assignments"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() IS NOT NULL));



  create policy "Users can delete project assignments"
  on "public"."project_assignments"
  as permissive
  for delete
  to authenticated
using ((auth.uid() IS NOT NULL));



  create policy "Users can view project assignments"
  on "public"."project_assignments"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (get_current_user_role() = 'admin'::text)));



  create policy "Users can view their assignments or admins can view all"
  on "public"."project_assignments"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Admins can manage projects"
  on "public"."projects"
  as permissive
  for all
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Managers and admins can insert projects"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'manager'::user_role) OR (profiles.role = 'admin'::user_role))))));



  create policy "Managers and admins can update projects"
  on "public"."projects"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'manager'::user_role) OR (profiles.role = 'admin'::user_role))))));



  create policy "Users can view assigned projects or admins can view all"
  on "public"."projects"
  as permissive
  for select
  to public
using (((get_current_user_role() = 'admin'::text) OR is_user_assigned_to_project(auth.uid(), id)));



  create policy "Users can view assigned projects"
  on "public"."projects"
  as permissive
  for select
  to public
using (((get_current_user_role() = 'admin'::text) OR is_user_assigned_to_project(auth.uid(), id)));



  create policy "Admins can delete public holidays"
  on "public"."public_holidays"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can insert public holidays"
  on "public"."public_holidays"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update public holidays"
  on "public"."public_holidays"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Authenticated users can view public holidays"
  on "public"."public_holidays"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Admins can manage services"
  on "public"."services"
  as permissive
  for all
  to authenticated
using ((get_current_user_role() = 'admin'::text))
with check ((get_current_user_role() = 'admin'::text));



  create policy "Authenticated users can view services"
  on "public"."services"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Admins can manage all timesheet entries"
  on "public"."timesheet_entries"
  as permissive
  for all
  to authenticated
using (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::user_role) OR (user_id = auth.uid())))
with check (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::user_role) OR (user_id = auth.uid())));



  create policy "Admins can view all timesheet entries"
  on "public"."timesheet_entries"
  as permissive
  for select
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can delete their own timesheet entries"
  on "public"."timesheet_entries"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "Users can insert their own timesheet entries"
  on "public"."timesheet_entries"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Users can insert timesheet entries for assigned projects/contra"
  on "public"."timesheet_entries"
  as permissive
  for insert
  to public
with check (((user_id = auth.uid()) AND (((entry_type = 'project'::text) AND (project_id IS NOT NULL) AND is_user_assigned_to_project(auth.uid(), project_id)) OR ((entry_type = 'contract'::text) AND (contract_id IS NOT NULL) AND is_user_assigned_to_contract(auth.uid(), contract_id)) OR (get_current_user_role() = 'admin'::text))));



  create policy "Users can update their own timesheet entries for assigned proje"
  on "public"."timesheet_entries"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) AND (((entry_type = 'project'::text) AND (project_id IS NOT NULL) AND is_user_assigned_to_project(auth.uid(), project_id)) OR ((entry_type = 'contract'::text) AND (contract_id IS NOT NULL) AND is_user_assigned_to_contract(auth.uid(), contract_id)) OR (get_current_user_role() = 'admin'::text))));



  create policy "Users can update their own timesheet entries"
  on "public"."timesheet_entries"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Users can view their own timesheet entries"
  on "public"."timesheet_entries"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "admin_read"
  on "public"."timesheet_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::user_role)))));



  create policy "emp_delete"
  on "public"."timesheet_entries"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "emp_insert"
  on "public"."timesheet_entries"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "emp_select"
  on "public"."timesheet_entries"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "emp_update"
  on "public"."timesheet_entries"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Admins can delete user holiday permissions"
  on "public"."user_holiday_permissions"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can insert user holiday permissions"
  on "public"."user_holiday_permissions"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update user holiday permissions"
  on "public"."user_holiday_permissions"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can view relevant holiday permissions"
  on "public"."user_holiday_permissions"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (get_current_user_role() = 'admin'::text)));



  create policy "Admins can delete weekly work schedules"
  on "public"."weekly_work_schedules"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can insert weekly work schedules"
  on "public"."weekly_work_schedules"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update weekly work schedules"
  on "public"."weekly_work_schedules"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can insert their own weekly work schedules"
  on "public"."weekly_work_schedules"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Users can update their own weekly work schedules"
  on "public"."weekly_work_schedules"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Users can view their own weekly work schedules"
  on "public"."weekly_work_schedules"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Users can view weekly work schedules"
  on "public"."weekly_work_schedules"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));



  create policy "Admins can delete work schedules"
  on "public"."work_schedules"
  as permissive
  for delete
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Admins can insert work schedules"
  on "public"."work_schedules"
  as permissive
  for insert
  to public
with check ((get_current_user_role() = 'admin'::text));



  create policy "Admins can update work schedules"
  on "public"."work_schedules"
  as permissive
  for update
  to public
using ((get_current_user_role() = 'admin'::text));



  create policy "Users can view work schedules"
  on "public"."work_schedules"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)));


CREATE TRIGGER set_audit_user_name_trigger BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION set_audit_user_name();

CREATE TRIGGER contract_assignments_deletion_audit BEFORE DELETE ON public.contract_assignments FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER contract_assignments_insert_audit AFTER INSERT ON public.contract_assignments FOR EACH ROW EXECUTE FUNCTION log_assignment_audit();

CREATE TRIGGER contracts_deletion_audit BEFORE DELETE ON public.contracts FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER contracts_insert_audit AFTER INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION log_insert_audit();

CREATE TRIGGER contracts_update_audit AFTER UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION log_update_audit();

CREATE TRIGGER location_checkin_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.daily_location_checkins FOR EACH ROW EXECUTE FUNCTION log_location_checkin_audit();

CREATE TRIGGER update_daily_location_checkins_timestamp BEFORE UPDATE ON public.daily_location_checkins FOR EACH ROW EXECUTE FUNCTION update_weekly_work_schedules_timestamp();

CREATE TRIGGER expense_attachments_audit_trigger AFTER DELETE ON public.expense_attachments FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION update_expense_categories_timestamp();

CREATE TRIGGER update_expense_subcategories_timestamp_trigger BEFORE UPDATE ON public.expense_subcategories FOR EACH ROW EXECUTE FUNCTION update_expense_subcategories_timestamp();

CREATE TRIGGER update_expense_subcategories_updated_at BEFORE UPDATE ON public.expense_subcategories FOR EACH ROW EXECUTE FUNCTION update_expense_subcategories_timestamp();

CREATE TRIGGER expense_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION log_expense_audit();

CREATE TRIGGER update_expenses_timestamp_trigger BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_expenses_timestamp();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_expenses_timestamp();

CREATE TRIGGER leave_applications_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION log_leave_application_audit();

CREATE TRIGGER set_business_days_count_trigger BEFORE INSERT OR UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION set_business_days_count();

CREATE TRIGGER set_business_days_trigger BEFORE INSERT OR UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION set_business_days_count();

CREATE TRIGGER update_leave_applications_timestamp BEFORE UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION update_leave_timestamps();

CREATE TRIGGER update_leave_balance_trigger AFTER UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION update_leave_balance_on_approval();

CREATE TRIGGER leave_balances_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION log_leave_balance_audit();

CREATE TRIGGER update_leave_balance_remaining_trigger BEFORE INSERT OR UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION update_leave_balance_remaining();

CREATE TRIGGER update_leave_balances_timestamp BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION update_leave_timestamps();

CREATE TRIGGER update_leave_types_timestamp BEFORE UPDATE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION update_leave_timestamps();

CREATE TRIGGER ohs_attachments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.ohs_attachments FOR EACH ROW EXECUTE FUNCTION log_ohs_audit();

CREATE TRIGGER auto_calculate_hazard_risk_rating BEFORE INSERT OR UPDATE ON public.ohs_hazard_reports FOR EACH ROW EXECUTE FUNCTION auto_calculate_risk_rating();

CREATE TRIGGER ohs_hazard_reports_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.ohs_hazard_reports FOR EACH ROW EXECUTE FUNCTION log_ohs_audit();

CREATE TRIGGER update_ohs_hazard_reports_timestamp BEFORE UPDATE ON public.ohs_hazard_reports FOR EACH ROW EXECUTE FUNCTION update_ohs_timestamp();

CREATE TRIGGER ohs_injury_registers_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.ohs_injury_registers FOR EACH ROW EXECUTE FUNCTION log_ohs_audit();

CREATE TRIGGER update_ohs_injury_registers_timestamp BEFORE UPDATE ON public.ohs_injury_registers FOR EACH ROW EXECUTE FUNCTION update_ohs_timestamp();

CREATE TRIGGER ohs_inspection_results_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.ohs_inspection_results FOR EACH ROW EXECUTE FUNCTION log_ohs_audit();

CREATE TRIGGER ohs_workplace_inspections_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.ohs_workplace_inspections FOR EACH ROW EXECUTE FUNCTION log_ohs_audit();

CREATE TRIGGER update_ohs_workplace_inspections_timestamp BEFORE UPDATE ON public.ohs_workplace_inspections FOR EACH ROW EXECUTE FUNCTION update_ohs_timestamp();

CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION create_default_work_schedule();

CREATE TRIGGER profiles_delete_audit AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER profiles_deletion_audit BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER profiles_insert_audit AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_insert_audit();

CREATE TRIGGER profiles_update_audit AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_update_audit();

CREATE TRIGGER sync_user_names_trigger AFTER UPDATE OF full_name ON public.profiles FOR EACH ROW EXECUTE FUNCTION sync_timesheet_user_names();

CREATE TRIGGER update_user_full_name_trigger AFTER UPDATE OF full_name ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_user_full_name_in_timesheet();

CREATE TRIGGER project_assignments_deletion_audit BEFORE DELETE ON public.project_assignments FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER project_assignments_insert_audit AFTER INSERT ON public.project_assignments FOR EACH ROW EXECUTE FUNCTION log_assignment_audit();

CREATE TRIGGER projects_deletion_audit BEFORE DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER projects_insert_audit AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION log_insert_audit();

CREATE TRIGGER projects_update_audit AFTER UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION log_update_audit();

CREATE TRIGGER custom_holidays_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.public_holidays FOR EACH ROW EXECUTE FUNCTION log_custom_holiday_audit();

CREATE TRIGGER update_public_holidays_timestamp BEFORE UPDATE ON public.public_holidays FOR EACH ROW EXECUTE FUNCTION update_public_holidays_timestamp();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER maintain_timesheet_user_cache_trigger BEFORE INSERT ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION maintain_timesheet_user_cache();

CREATE TRIGGER set_timesheet_user_trigger BEFORE INSERT ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION set_timesheet_user_with_name();

CREATE TRIGGER timesheet_entries_deletion_audit BEFORE DELETE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION log_deletion_audit();

CREATE TRIGGER timesheet_entries_insert_audit AFTER INSERT ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION log_insert_audit();

CREATE TRIGGER timesheet_entries_update_audit AFTER UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION log_update_audit();

CREATE TRIGGER validate_timesheet_entry_constraints_trigger BEFORE INSERT OR UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION validate_timesheet_entry_constraints();

CREATE TRIGGER holiday_permissions_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.user_holiday_permissions FOR EACH ROW EXECUTE FUNCTION log_holiday_permission_audit();

CREATE TRIGGER update_user_holiday_permissions_timestamp BEFORE UPDATE ON public.user_holiday_permissions FOR EACH ROW EXECUTE FUNCTION update_user_holiday_permissions_timestamp();

CREATE TRIGGER update_weekly_work_schedules_updated_at BEFORE UPDATE ON public.weekly_work_schedules FOR EACH ROW EXECUTE FUNCTION update_weekly_work_schedules_timestamp();

CREATE TRIGGER weekly_work_schedule_location_audit_trigger AFTER UPDATE ON public.weekly_work_schedules FOR EACH ROW EXECUTE FUNCTION log_work_schedule_location_audit();

CREATE TRIGGER update_work_schedules_updated_at BEFORE UPDATE ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION update_work_schedule_timestamp();

create schema if not exists "reporting";


