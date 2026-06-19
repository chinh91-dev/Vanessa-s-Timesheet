export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          abn: string | null
          account_email: string | null
          acn: string | null
          billing_address: string | null
          conversion_date: string | null
          converted_to_customer_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          has_trading_name: boolean | null
          id: string
          industry: string | null
          is_active: boolean
          mobile_phone: string | null
          name: string
          notes: string | null
          owner_id: string | null
          parent_account_id: string | null
          phone: string | null
          postal_different: boolean | null
          postal_postcode: string | null
          postal_state: string | null
          postal_street_address: string | null
          postal_suburb: string | null
          postcode: string | null
          segment: string | null
          shipping_address: string | null
          state_au: string | null
          street_address: string | null
          suburb: string | null
          trading_name: string | null
          updated_at: string
          website: string | null
          work_phone: string | null
        }
        Insert: {
          abn?: string | null
          account_email?: string | null
          acn?: string | null
          billing_address?: string | null
          conversion_date?: string | null
          converted_to_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          has_trading_name?: boolean | null
          id?: string
          industry?: string | null
          is_active?: boolean
          mobile_phone?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          parent_account_id?: string | null
          phone?: string | null
          postal_different?: boolean | null
          postal_postcode?: string | null
          postal_state?: string | null
          postal_street_address?: string | null
          postal_suburb?: string | null
          postcode?: string | null
          segment?: string | null
          shipping_address?: string | null
          state_au?: string | null
          street_address?: string | null
          suburb?: string | null
          trading_name?: string | null
          updated_at?: string
          website?: string | null
          work_phone?: string | null
        }
        Update: {
          abn?: string | null
          account_email?: string | null
          acn?: string | null
          billing_address?: string | null
          conversion_date?: string | null
          converted_to_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          has_trading_name?: boolean | null
          id?: string
          industry?: string | null
          is_active?: boolean
          mobile_phone?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          parent_account_id?: string | null
          phone?: string | null
          postal_different?: boolean | null
          postal_postcode?: string | null
          postal_state?: string | null
          postal_street_address?: string | null
          postal_suburb?: string | null
          postcode?: string | null
          segment?: string | null
          shipping_address?: string | null
          state_au?: string | null
          street_address?: string | null
          suburb?: string | null
          trading_name?: string | null
          updated_at?: string
          website?: string | null
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_converted_to_customer_id_fkey"
            columns: ["converted_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      api_idempotency_keys: {
        Row: {
          created_at: string | null
          idempotency_key: string
          resource: string
          response_body: Json
          response_status: number
        }
        Insert: {
          created_at?: string | null
          idempotency_key: string
          resource: string
          response_body: Json
          response_status: number
        }
        Update: {
          created_at?: string | null
          idempotency_key?: string
          resource?: string
          response_body?: Json
          response_status?: number
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: string[]
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_attribute_defs: {
        Row: {
          created_at: string
          data_type: string
          id: string
          is_required: boolean
          is_unique: boolean
          name: string
          type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_type: string
          id?: string
          is_required?: boolean
          is_unique?: boolean
          name: string
          type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_type?: string
          id?: string
          is_required?: boolean
          is_unique?: boolean
          name?: string
          type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_attribute_defs_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_attribute_values: {
        Row: {
          asset_id: string
          attr_def_id: string
          created_at: string
          id: string
          updated_at: string
          value_bool: boolean | null
          value_date: string | null
          value_number: number | null
          value_text: string | null
          value_url: string | null
        }
        Insert: {
          asset_id: string
          attr_def_id: string
          created_at?: string
          id?: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
          value_url?: string | null
        }
        Update: {
          asset_id?: string
          attr_def_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
          value_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_attribute_values_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_attribute_values_attr_def_id_fkey"
            columns: ["attr_def_id"]
            isOneToOne: false
            referencedRelation: "asset_attribute_defs"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_groups: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_groups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_history: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          asset_id: string
          before_data: Json | null
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          asset_id: string
          before_data?: Json | null
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          asset_id?: string
          before_data?: Json | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_history_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_history_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_refs: {
        Row: {
          created_at: string
          created_by: string | null
          dst_asset_id: string
          id: string
          relation: string
          src_asset_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dst_asset_id: string
          id?: string
          relation: string
          src_asset_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dst_asset_id?: string
          id?: string
          relation?: string
          src_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_refs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_refs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_refs_dst_asset_id_fkey"
            columns: ["dst_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_refs_src_asset_id_fkey"
            columns: ["src_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_statuses: {
        Row: {
          colour: string | null
          created_at: string
          id: string
          is_terminal: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          colour?: string | null
          created_at?: string
          id?: string
          is_terminal?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          colour?: string | null
          created_at?: string
          id?: string
          is_terminal?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_types: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_key: string
          cost: number | null
          created_at: string | null
          created_by: string | null
          device_user_id: string | null
          group_id: string
          id: string
          label: string
          location: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status_id: string
          type_id: string
          updated_at: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_key: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          device_user_id?: string | null
          group_id: string
          id?: string
          label: string
          location?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status_id: string
          type_id: string
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_key?: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          device_user_id?: string | null
          group_id?: string
          id?: string
          label?: string
          location?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status_id?: string
          type_id?: string
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_device_user_id_fkey"
            columns: ["device_user_id"]
            isOneToOne: false
            referencedRelation: "device_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "asset_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "asset_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_notifications: {
        Row: {
          acknowledged_at: string | null
          assigned_by: string | null
          assigned_to: string
          assignment_type: string
          created_at: string
          delivery_status: string | null
          id: string
          incident_id: string
          is_acknowledged: boolean | null
          notification_content: Json | null
          notification_type: string
          sent_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_by?: string | null
          assigned_to: string
          assignment_type: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          incident_id: string
          is_acknowledged?: boolean | null
          notification_content?: Json | null
          notification_type: string
          sent_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          assigned_by?: string | null
          assigned_to?: string
          assignment_type?: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          incident_id?: string
          is_acknowledged?: boolean | null
          notification_content?: Json | null
          notification_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_notifications_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_notifications_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_notifications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_notifications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_queues: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          assignment_strategy: string | null
          created_at: string
          current_attempts: number | null
          excluded_assignees: Json | null
          failure_reason: string | null
          id: string
          incident_id: string
          max_attempts: number | null
          preferred_assignees: Json | null
          priority_weight: number | null
          required_skills: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_strategy?: string | null
          created_at?: string
          current_attempts?: number | null
          excluded_assignees?: Json | null
          failure_reason?: string | null
          id?: string
          incident_id: string
          max_attempts?: number | null
          preferred_assignees?: Json | null
          priority_weight?: number | null
          required_skills?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_strategy?: string | null
          created_at?: string
          current_attempts?: number | null
          excluded_assignees?: Json | null
          failure_reason?: string | null
          id?: string
          incident_id?: string
          max_attempts?: number | null
          preferred_assignees?: Json | null
          priority_weight?: number | null
          required_skills?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_queues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_queues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          details: Json | null
          entity_name: string | null
          id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          details?: Json | null
          entity_name?: string | null
          id?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          details?: Json | null
          entity_name?: string | null
          id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          created_at: string
          friday_end: string | null
          friday_start: string | null
          id: string
          is_default: boolean | null
          monday_end: string | null
          monday_start: string | null
          name: string
          saturday_end: string | null
          saturday_start: string | null
          sunday_end: string | null
          sunday_start: string | null
          thursday_end: string | null
          thursday_start: string | null
          timezone: string
          tuesday_end: string | null
          tuesday_start: string | null
          updated_at: string
          wednesday_end: string | null
          wednesday_start: string | null
        }
        Insert: {
          created_at?: string
          friday_end?: string | null
          friday_start?: string | null
          id?: string
          is_default?: boolean | null
          monday_end?: string | null
          monday_start?: string | null
          name: string
          saturday_end?: string | null
          saturday_start?: string | null
          sunday_end?: string | null
          sunday_start?: string | null
          thursday_end?: string | null
          thursday_start?: string | null
          timezone?: string
          tuesday_end?: string | null
          tuesday_start?: string | null
          updated_at?: string
          wednesday_end?: string | null
          wednesday_start?: string | null
        }
        Update: {
          created_at?: string
          friday_end?: string | null
          friday_start?: string | null
          id?: string
          is_default?: boolean | null
          monday_end?: string | null
          monday_start?: string | null
          name?: string
          saturday_end?: string | null
          saturday_start?: string | null
          sunday_end?: string | null
          sunday_start?: string | null
          thursday_end?: string | null
          thursday_start?: string | null
          timezone?: string
          tuesday_end?: string | null
          tuesday_start?: string | null
          updated_at?: string
          wednesday_end?: string | null
          wednesday_start?: string | null
        }
        Relationships: []
      }
      change_log: {
        Row: {
          changed_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string | null
          table_name: string
          transaction_id: number | null
        }
        Insert: {
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id?: string | null
          table_name: string
          transaction_id?: number | null
        }
        Update: {
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string | null
          table_name?: string
          transaction_id?: number | null
        }
        Relationships: []
      }
      contact_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_category_assignments: {
        Row: {
          category_id: string
          contact_id: string
          created_at: string | null
          created_by: string | null
          id: string
        }
        Insert: {
          category_id: string
          contact_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Update: {
          category_id?: string
          contact_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "contact_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_category_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          id: string
          contact_id: string
          note_content: string
          created_by: string
          created_by_name: string
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          note_content: string
          created_by: string
          created_by_name: string
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          note_content?: string
          created_by?: string
          created_by_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_name: string | null
          contact_name: string
          conversion_date: string | null
          converted_to_account_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          last_contact_type: string | null
          last_contacted: string | null
          lead_score: number | null
          mobile_phone: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          title: string | null
          updated_at: string
          work_phone: string | null
        }
        Insert: {
          company_name?: string | null
          contact_name: string
          conversion_date?: string | null
          converted_to_account_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          last_contact_type?: string | null
          last_contacted?: string | null
          lead_score?: number | null
          mobile_phone?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
          work_phone?: string | null
        }
        Update: {
          company_name?: string | null
          contact_name?: string
          conversion_date?: string | null
          converted_to_account_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          last_contact_type?: string | null
          last_contacted?: string | null
          lead_score?: number | null
          mobile_phone?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_account_id_fkey"
            columns: ["converted_to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          contract_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_services: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          service_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          service_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          billing_cadence: string | null
          contract_type: string | null
          contract_value: number | null
          created_at: string
          customer_id: string | null
          deal_id: string | null
          description: string | null
          end_date: string
          file_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          gst_treatment: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string | null
          project_key: string | null
          signature_status: string | null
          signature_url: string | null
          signed_date: string | null
          start_date: string
          status: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          billing_cadence?: string | null
          contract_type?: string | null
          contract_value?: number | null
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          end_date: string
          file_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          gst_treatment?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id?: string | null
          project_key?: string | null
          signature_status?: string | null
          signature_url?: string | null
          signed_date?: string | null
          start_date: string
          status: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          billing_cadence?: string | null
          contract_type?: string | null
          contract_value?: number | null
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          end_date?: string
          file_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          gst_treatment?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string | null
          project_key?: string | null
          signature_status?: string | null
          signature_url?: string | null
          signed_date?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "fk_contracts_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_calculator_company_sizes: {
        Row: {
          created_at: string | null
          default_users: number
          id: string
          is_active: boolean
          label: string
          sort_order: number
          sub_label: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_users: number
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          sub_label?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_users?: number
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          sub_label?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_calculator_complexity_factors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          multiplier: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cost_calculator_inhouse_config: {
        Row: {
          created_at: string | null
          id: string
          manager_per_users: number
          service_desk_per_users: number
          sys_admin_per_users: number | null
          tier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          manager_per_users?: number
          service_desk_per_users?: number
          sys_admin_per_users?: number | null
          tier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          manager_per_users?: number
          service_desk_per_users?: number
          sys_admin_per_users?: number | null
          tier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_calculator_inhouse_config_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "cost_calculator_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_calculator_salaries: {
        Row: {
          annual_salary: number
          created_at: string | null
          id: string
          role_key: string
          role_name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          annual_salary: number
          created_at?: string | null
          id?: string
          role_key: string
          role_name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          annual_salary?: number
          created_at?: string | null
          id?: string
          role_key?: string
          role_name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_calculator_settings: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      cost_calculator_support_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rate_per_person: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate_per_person: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate_per_person?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cost_calculator_tier_features: {
        Row: {
          created_at: string | null
          feature: string
          id: string
          sort_order: number
          tier_id: string
        }
        Insert: {
          created_at?: string | null
          feature: string
          id?: string
          sort_order?: number
          tier_id: string
        }
        Update: {
          created_at?: string | null
          feature?: string
          id?: string
          sort_order?: number
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_calculator_tier_features_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "cost_calculator_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_calculator_tiers: {
        Row: {
          created_at: string | null
          devices_per_user: number
          id: string
          is_active: boolean
          label: string
          margin: number
          min_monthly: number
          rate_per_user: number
          recommended_min_users: number | null
          security_included: boolean
          sort_order: number
          sub_label: string | null
          tier_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          devices_per_user?: number
          id?: string
          is_active?: boolean
          label: string
          margin?: number
          min_monthly?: number
          rate_per_user: number
          recommended_min_users?: number | null
          security_included?: boolean
          sort_order?: number
          sub_label?: string | null
          tier_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          devices_per_user?: number
          id?: string
          is_active?: boolean
          label?: string
          margin?: number
          min_monthly?: number
          rate_per_user?: number
          recommended_min_users?: number | null
          security_included?: boolean
          sort_order?: number
          sub_label?: string | null
          tier_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_meeting_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          meeting_id: string
          note_date: string | null
          note_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id: string
          note_date?: string | null
          note_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id?: string
          note_date?: string | null
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_meeting_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meeting_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "crm_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_meetings: {
        Row: {
          account_id: string | null
          agenda: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_type: string
          owner_id: string | null
          start_time: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          agenda?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_type: string
          owner_id?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          agenda?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_type?: string
          owner_id?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "crm_meetings_lead_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_liaisons: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_liaisons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_logins: {
        Row: {
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_logins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sla_agreements: {
        Row: {
          created_at: string | null
          customer_id: string
          effective_from: string
          effective_until: string | null
          id: string
          incident_project_id: string | null
          is_active: boolean | null
          monthly_service_fee: number
          priority_id: string | null
          resolution_sla_minutes: number
          response_sla_minutes: number
          service_credit_rate: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          incident_project_id?: string | null
          is_active?: boolean | null
          monthly_service_fee?: number
          priority_id?: string | null
          resolution_sla_minutes?: number
          response_sla_minutes?: number
          service_credit_rate?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          incident_project_id?: string | null
          is_active?: boolean | null
          monthly_service_fee?: number
          priority_id?: string | null
          resolution_sla_minutes?: number
          response_sla_minutes?: number
          service_credit_rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_sla_agreements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sla_agreements_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sla_agreements_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "incident_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          abn: string | null
          account_email: string | null
          acn: string | null
          annual_revenue: number | null
          company: string | null
          created_at: string
          email: string | null
          employee_count: number | null
          has_trading_name: boolean | null
          id: string
          industry: string | null
          is_active: boolean
          liaison_contact_id: string | null
          liaison_title: string | null
          name: string
          notes: string | null
          parent_customer_id: string | null
          phone: string | null
          postal_different: boolean | null
          postal_postcode: string | null
          postal_state: string | null
          postal_street_address: string | null
          postal_suburb: string | null
          postcode: string | null
          segment: string | null
          state_au: string | null
          street_address: string | null
          suburb: string | null
          trading_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          abn?: string | null
          account_email?: string | null
          acn?: string | null
          annual_revenue?: number | null
          company?: string | null
          created_at?: string
          email?: string | null
          employee_count?: number | null
          has_trading_name?: boolean | null
          id?: string
          industry?: string | null
          is_active?: boolean
          liaison_contact_id?: string | null
          liaison_title?: string | null
          name: string
          notes?: string | null
          parent_customer_id?: string | null
          phone?: string | null
          postal_different?: boolean | null
          postal_postcode?: string | null
          postal_state?: string | null
          postal_street_address?: string | null
          postal_suburb?: string | null
          postcode?: string | null
          segment?: string | null
          state_au?: string | null
          street_address?: string | null
          suburb?: string | null
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          abn?: string | null
          account_email?: string | null
          acn?: string | null
          annual_revenue?: number | null
          company?: string | null
          created_at?: string
          email?: string | null
          employee_count?: number | null
          has_trading_name?: boolean | null
          id?: string
          industry?: string | null
          is_active?: boolean
          liaison_contact_id?: string | null
          liaison_title?: string | null
          name?: string
          notes?: string | null
          parent_customer_id?: string | null
          phone?: string | null
          postal_different?: boolean | null
          postal_postcode?: string | null
          postal_state?: string | null
          postal_street_address?: string | null
          postal_suburb?: string | null
          postcode?: string | null
          segment?: string | null
          state_au?: string | null
          street_address?: string | null
          suburb?: string | null
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_liaison_lead_id_fkey"
            columns: ["liaison_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_location_checkins: {
        Row: {
          actual_location: string
          check_in_date: string
          check_in_time: string
          created_at: string
          end_time: string | null
          id: string
          late_checkin: boolean
          location_change_reason: string | null
          notes: string | null
          planned_location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_location: string
          check_in_date: string
          check_in_time?: string
          created_at?: string
          end_time?: string | null
          id?: string
          late_checkin?: boolean
          location_change_reason?: string | null
          notes?: string | null
          planned_location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_location?: string
          check_in_date?: string
          check_in_time?: string
          created_at?: string
          end_time?: string | null
          id?: string
          late_checkin?: boolean
          location_change_reason?: string | null
          notes?: string | null
          planned_location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_location_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_location_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_checkin_actual_location"
            columns: ["actual_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_checkin_planned_location"
            columns: ["planned_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_items: {
        Row: {
          created_at: string
          deal_id: string
          description: string
          discount_percent: number
          final_total: number | null
          id: string
          line_total: number | null
          line_total_with_discount: number | null
          quantity: number
          service_id: string | null
          sort_order: number
          tax_amount: number | null
          tax_percent: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          description: string
          discount_percent?: number
          final_total?: number | null
          id?: string
          line_total?: number | null
          line_total_with_discount?: number | null
          quantity: number
          service_id?: string | null
          sort_order?: number
          tax_amount?: number | null
          tax_percent?: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          description?: string
          discount_percent?: number
          final_total?: number | null
          id?: string
          line_total?: number | null
          line_total_with_discount?: number | null
          quantity?: number
          service_id?: string | null
          sort_order?: number
          tax_amount?: number | null
          tax_percent?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_items_product_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          deal_id: string
          duration_minutes: number | null
          from_stage_id: string | null
          id: string
          to_stage_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          deal_id: string
          duration_minutes?: number | null
          from_stage_id?: string | null
          id?: string
          to_stage_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          deal_id?: string
          duration_minutes?: number | null
          from_stage_id?: string | null
          id?: string
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_notes: {
        Row: {
          created_at: string | null
          created_by: string
          created_by_name: string
          deal_id: string
          id: string
          lost_reason: string | null
          lost_reason_other: string | null
          note_content: string
          stage_id: string
          stage_name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          created_by_name: string
          deal_id: string
          id?: string
          lost_reason?: string | null
          lost_reason_other?: string | null
          note_content: string
          stage_id: string
          stage_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          created_by_name?: string
          deal_id?: string
          id?: string
          lost_reason?: string | null
          lost_reason_other?: string | null
          note_content?: string
          stage_id?: string
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_stage_notes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string | null
          amount: number | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          billing_cadence: string | null
          close_date: string | null
          competitor: string | null
          contract_term_months: number | null
          contract_type: string | null
          contract_value: number | null
          converted_at: string | null
          created_at: string
          created_by: string | null
          deal_number: string | null
          discount_amount: number | null
          gst_treatment: string | null
          handover_notes: string | null
          id: string
          legal_review_completed: boolean | null
          legal_review_completed_at: string | null
          legal_review_completed_by: string | null
          lost_reason: string | null
          lost_reason_other: string | null
          name: string | null
          next_step: string | null
          next_step_due_date: string | null
          notes: string | null
          owner_id: string | null
          pipeline_stage_id: string | null
          primary_contact_id: string | null
          project_id: string | null
          project_key: string | null
          proposal_file_id: string | null
          proposal_file_name: string | null
          proposal_file_size: number | null
          proposal_file_type: string | null
          proposal_file_url: string | null
          proposal_uploaded_at: string | null
          risk_notes: string | null
          signature_status: string
          signature_url: string | null
          signed_date: string | null
          source: string | null
          status: string | null
          term_months: number | null
          updated_at: string
          won_reason: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          billing_cadence?: string | null
          close_date?: string | null
          competitor?: string | null
          contract_term_months?: number | null
          contract_type?: string | null
          contract_value?: number | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_number?: string | null
          discount_amount?: number | null
          gst_treatment?: string | null
          handover_notes?: string | null
          id?: string
          legal_review_completed?: boolean | null
          legal_review_completed_at?: string | null
          legal_review_completed_by?: string | null
          lost_reason?: string | null
          lost_reason_other?: string | null
          name?: string | null
          next_step?: string | null
          next_step_due_date?: string | null
          notes?: string | null
          owner_id?: string | null
          pipeline_stage_id?: string | null
          primary_contact_id?: string | null
          project_id?: string | null
          project_key?: string | null
          proposal_file_id?: string | null
          proposal_file_name?: string | null
          proposal_file_size?: number | null
          proposal_file_type?: string | null
          proposal_file_url?: string | null
          proposal_uploaded_at?: string | null
          risk_notes?: string | null
          signature_status?: string
          signature_url?: string | null
          signed_date?: string | null
          source?: string | null
          status?: string | null
          term_months?: number | null
          updated_at?: string
          won_reason?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          billing_cadence?: string | null
          close_date?: string | null
          competitor?: string | null
          contract_term_months?: number | null
          contract_type?: string | null
          contract_value?: number | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_number?: string | null
          discount_amount?: number | null
          gst_treatment?: string | null
          handover_notes?: string | null
          id?: string
          legal_review_completed?: boolean | null
          legal_review_completed_at?: string | null
          legal_review_completed_by?: string | null
          lost_reason?: string | null
          lost_reason_other?: string | null
          name?: string | null
          next_step?: string | null
          next_step_due_date?: string | null
          notes?: string | null
          owner_id?: string | null
          pipeline_stage_id?: string | null
          primary_contact_id?: string | null
          project_id?: string | null
          project_key?: string | null
          proposal_file_id?: string | null
          proposal_file_name?: string | null
          proposal_file_size?: number | null
          proposal_file_type?: string | null
          proposal_file_url?: string | null
          proposal_uploaded_at?: string | null
          risk_notes?: string | null
          signature_status?: string
          signature_url?: string | null
          signed_date?: string | null
          source?: string | null
          status?: string | null
          term_months?: number | null
          updated_at?: string
          won_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_legal_review_completed_by_fkey"
            columns: ["legal_review_completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_legal_review_completed_by_fkey"
            columns: ["legal_review_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_lead_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deals_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deals_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      escalation_chains: {
        Row: {
          auto_escalate_minutes: number
          category_id: string | null
          chain_levels: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          incident_project_id: string | null
          is_active: boolean
          name: string
          notify_on_escalation: boolean
          priority_id: string | null
          updated_at: string
        }
        Insert: {
          auto_escalate_minutes?: number
          category_id?: string | null
          chain_levels?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_project_id?: string | null
          is_active?: boolean
          name: string
          notify_on_escalation?: boolean
          priority_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_escalate_minutes?: number
          category_id?: string | null
          chain_levels?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_project_id?: string | null
          is_active?: boolean
          name?: string
          notify_on_escalation?: boolean
          priority_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_chains_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_chains_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_history: {
        Row: {
          auto_assigned: boolean
          created_at: string
          escalated_from: string | null
          escalated_to: string | null
          escalation_reason: string | null
          escalation_rule_id: string
          id: string
          incident_id: string
          notification_sent: boolean
          triggered_at: string
        }
        Insert: {
          auto_assigned?: boolean
          created_at?: string
          escalated_from?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          escalation_rule_id: string
          id?: string
          incident_id: string
          notification_sent?: boolean
          triggered_at?: string
        }
        Update: {
          auto_assigned?: boolean
          created_at?: string
          escalated_from?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          escalation_rule_id?: string
          id?: string
          incident_id?: string
          notification_sent?: boolean
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_history_escalated_from_fkey"
            columns: ["escalated_from"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_escalated_from_fkey"
            columns: ["escalated_from"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_escalation_rule_id_fkey"
            columns: ["escalation_rule_id"]
            isOneToOne: false
            referencedRelation: "escalation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          auto_reassign: boolean | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          escalate_to_role: string | null
          escalate_to_user_id: string | null
          escalation_message: string | null
          id: string
          incident_project_id: string | null
          is_active: boolean | null
          name: string
          notify_escalation_target: boolean | null
          notify_original_assignee: boolean | null
          priority_id: string | null
          sort_order: number | null
          trigger_after_minutes: number
          updated_at: string
        }
        Insert: {
          auto_reassign?: boolean | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalate_to_role?: string | null
          escalate_to_user_id?: string | null
          escalation_message?: string | null
          id?: string
          incident_project_id?: string | null
          is_active?: boolean | null
          name: string
          notify_escalation_target?: boolean | null
          notify_original_assignee?: boolean | null
          priority_id?: string | null
          sort_order?: number | null
          trigger_after_minutes: number
          updated_at?: string
        }
        Update: {
          auto_reassign?: boolean | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalate_to_role?: string | null
          escalate_to_user_id?: string | null
          escalation_message?: string | null
          id?: string
          incident_project_id?: string | null
          is_active?: boolean | null
          name?: string
          notify_escalation_target?: boolean | null
          notify_original_assignee?: boolean | null
          priority_id?: string | null
          sort_order?: number | null
          trigger_after_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_escalate_to_user_id_fkey"
            columns: ["escalate_to_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_escalate_to_user_id_fkey"
            columns: ["escalate_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_attachments: {
        Row: {
          expense_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string
        }
        Insert: {
          expense_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          expense_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      expense_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string
          created_at: string
          deal_id: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          merchant_name: string | null
          notes: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["expense_status"]
          subcategory_id: string | null
          submitted_at: string | null
          tax_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          expense_date: string
          expense_type?: string
          id?: string
          merchant_name?: string | null
          notes?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          subcategory_id?: string | null
          submitted_at?: string | null
          tax_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          merchant_name?: string | null
          notes?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          subcategory_id?: string | null
          submitted_at?: string | null
          tax_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "expenses_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "expense_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_analytics: {
        Row: {
          avg_resolution_time_minutes: number | null
          avg_response_time_minutes: number | null
          category_id: string | null
          created_at: string
          date: string
          escalations: number | null
          id: string
          incident_project_id: string | null
          priority_id: string | null
          resolved_incidents: number | null
          sla_breaches: number | null
          total_incidents: number | null
          updated_at: string
        }
        Insert: {
          avg_resolution_time_minutes?: number | null
          avg_response_time_minutes?: number | null
          category_id?: string | null
          created_at?: string
          date: string
          escalations?: number | null
          id?: string
          incident_project_id?: string | null
          priority_id?: string | null
          resolved_incidents?: number | null
          sla_breaches?: number | null
          total_incidents?: number | null
          updated_at?: string
        }
        Update: {
          avg_resolution_time_minutes?: number | null
          avg_response_time_minutes?: number | null
          category_id?: string | null
          created_at?: string
          date?: string
          escalations?: number | null
          id?: string
          incident_project_id?: string | null
          priority_id?: string | null
          resolved_incidents?: number | null
          sla_breaches?: number | null
          total_incidents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_analytics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_analytics_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_assets: {
        Row: {
          asset_id: string
          incident_id: string
          linked_at: string | null
          linked_by: string | null
        }
        Insert: {
          asset_id: string
          incident_id: string
          linked_at?: string | null
          linked_by?: string | null
        }
        Update: {
          asset_id?: string
          incident_id?: string
          linked_at?: string | null
          linked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assets_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assets_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assigned_from: string | null
          assigned_to: string | null
          assignment_reason: string | null
          created_at: string
          id: string
          incident_id: string
          is_current: boolean | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          assignment_reason?: string | null
          created_at?: string
          id?: string
          incident_id: string
          is_current?: boolean | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          assignment_reason?: string | null
          created_at?: string
          id?: string
          incident_id?: string
          is_current?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assignments_assigned_from_fkey"
            columns: ["assigned_from"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assignments_assigned_from_fkey"
            columns: ["assigned_from"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_auto_assignment_rules: {
        Row: {
          assign_to_team: string | null
          assign_to_user_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          priority_id: string | null
          project_id: string | null
          rule_order: number | null
          updated_at: string
        }
        Insert: {
          assign_to_team?: string | null
          assign_to_user_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority_id?: string | null
          project_id?: string | null
          rule_order?: number | null
          updated_at?: string
        }
        Update: {
          assign_to_team?: string | null
          assign_to_user_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority_id?: string | null
          project_id?: string | null
          rule_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_auto_assignment_rules_assign_to_user_id_fkey"
            columns: ["assign_to_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_auto_assignment_rules_assign_to_user_id_fkey"
            columns: ["assign_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_auto_assignment_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_auto_assignment_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_auto_assignment_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_auto_assignment_rules_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "incident_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_auto_assignment_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_categories: {
        Row: {
          category: string | null
          category_level: number | null
          created_at: string
          description: string | null
          form_schema: Json | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_level?: number | null
          created_at?: string
          description?: string | null
          form_schema?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_level?: number | null
          created_at?: string
          description?: string | null
          form_schema?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_comments: {
        Row: {
          attachments: Json | null
          comment: string
          create_by: string
          created_at: string
          id: string
          incident_id: string
          is_internal: boolean | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          comment: string
          create_by: string
          created_at?: string
          id?: string
          incident_id: string
          is_internal?: boolean | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          comment?: string
          create_by?: string
          created_at?: string
          id?: string
          incident_id?: string
          is_internal?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      incident_history: {
        Row: {
          created_at: string | null
          field_name: string
          id: string
          incident_id: string
          new_display_value: string | null
          new_value: string | null
          old_display_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: string
          incident_id: string
          new_display_value?: string | null
          new_value?: string | null
          old_display_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: string
          incident_id?: string
          new_display_value?: string | null
          new_value?: string | null
          old_display_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_history_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_keywords: {
        Row: {
          category_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          is_active: boolean | null
          keyword: string
          priority_id: string | null
          updated_at: string
          usage_count: number | null
          weight: number | null
        }
        Insert: {
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          keyword: string
          priority_id?: string | null
          updated_at?: string
          usage_count?: number | null
          weight?: number | null
        }
        Update: {
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          keyword?: string
          priority_id?: string | null
          updated_at?: string
          usage_count?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_keywords_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string
          description: string | null
          detected_at: string
          id: string
          incident_project_id: string | null
          is_active: boolean
          pattern_data: Json
          pattern_name: string
          pattern_type: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          incident_project_id?: string | null
          is_active?: boolean
          pattern_data?: Json
          pattern_name: string
          pattern_type: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          incident_project_id?: string | null
          is_active?: boolean
          pattern_data?: Json
          pattern_name?: string
          pattern_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_patterns_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_predictions: {
        Row: {
          actual_value: number | null
          confidence_level: number | null
          created_at: string
          id: string
          incident_project_id: string | null
          model_version: string | null
          predicted_value: number
          prediction_accuracy: number | null
          prediction_type: string
          target_date: string
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          incident_project_id?: string | null
          model_version?: string | null
          predicted_value: number
          prediction_accuracy?: number | null
          prediction_type: string
          target_date: string
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          incident_project_id?: string | null
          model_version?: string | null
          predicted_value?: number
          prediction_accuracy?: number | null
          prediction_type?: string
          target_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_predictions_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_priorities: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          resolution_sla_minutes: number
          response_sla_minutes: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          resolution_sla_minutes?: number
          response_sla_minutes?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          resolution_sla_minutes?: number
          response_sla_minutes?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      incident_project_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          incident_project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          incident_project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          incident_project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_project_assignments_assigned_by_profiles_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_project_assignments_assigned_by_profiles_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_project_assignments_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_project_assignments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_project_assignments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_projects: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          icon_color: string | null
          id: string
          is_active: boolean
          lead_id: string | null
          name: string
          project_key: string
          support_email_prefix: string | null
          timesheet_project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          icon_color?: string | null
          id?: string
          is_active?: boolean
          lead_id?: string | null
          name: string
          project_key: string
          support_email_prefix?: string | null
          timesheet_project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          icon_color?: string | null
          id?: string
          is_active?: boolean
          lead_id?: string | null
          name?: string
          project_key?: string
          support_email_prefix?: string | null
          timesheet_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_projects_timesheet_project_id_fkey"
            columns: ["timesheet_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_relationships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          incident_id: string
          notes: string | null
          related_incident_id: string
          relationship_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id: string
          notes?: string | null
          related_incident_id: string
          relationship_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string
          notes?: string | null
          related_incident_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_templates: {
        Row: {
          auto_assign_to: string | null
          created_at: string
          created_by: string | null
          default_category_id: string | null
          default_priority_id: string | null
          description: string | null
          description_template: string | null
          id: string
          is_active: boolean | null
          name: string
          title_template: string
          updated_at: string
        }
        Insert: {
          auto_assign_to?: string | null
          created_at?: string
          created_by?: string | null
          default_category_id?: string | null
          default_priority_id?: string | null
          description?: string | null
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          title_template: string
          updated_at?: string
        }
        Update: {
          auto_assign_to?: string | null
          created_at?: string
          created_by?: string | null
          default_category_id?: string | null
          default_priority_id?: string | null
          description?: string | null
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          title_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_templates_auto_assign_to_fkey"
            columns: ["auto_assign_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_templates_auto_assign_to_fkey"
            columns: ["auto_assign_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_templates_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_templates_default_priority_id_fkey"
            columns: ["default_priority_id"]
            isOneToOne: false
            referencedRelation: "incident_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          auto_assigned: boolean | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          escalated_at: string | null
          escalation_reason: string | null
          first_response_at: string | null
          id: string
          impact_description: string | null
          incident_number: string
          incident_project_id: string
          priority_id: string | null
          resolution_time_minutes: number | null
          resolved_at: string | null
          resolved_by: string | null
          response_time_minutes: number | null
          sla_due_date: string | null
          source: string | null
          status: Database["public"]["Enums"]["incident_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          auto_assigned?: boolean | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          first_response_at?: string | null
          id?: string
          impact_description?: string | null
          incident_number: string
          incident_project_id: string
          priority_id?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_minutes?: number | null
          sla_due_date?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          auto_assigned?: boolean | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          first_response_at?: string | null
          id?: string
          impact_description?: string | null
          incident_number?: string
          incident_project_id?: string
          priority_id?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_minutes?: number | null
          sla_due_date?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_incidents_template_id"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "incident_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "incident_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          external_id: string | null
          id: string
          job_type: string
          max_retries: number
          payload: Json | null
          retry_count: number
          scheduled_at: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          job_type: string
          max_retries?: number
          payload?: Json | null
          retry_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          job_type?: string
          max_retries?: number
          payload?: Json | null
          retry_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          role: string
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          role?: string
          token: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          role?: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_application_attachments: {
        Row: {
          application_id: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          uploaded_at: string
        }
        Insert: {
          application_id: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_application_attachments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "leave_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_days_count: number
          created_at: string
          end_date: string
          id: string
          leave_type_id: string
          manager_comments: string | null
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_days_count: number
          created_at?: string
          end_date: string
          id?: string
          leave_type_id: string
          manager_comments?: string | null
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_days_count?: number
          created_at?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          manager_comments?: string | null
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balance_operations: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
          leave_type_id: string | null
          operation_type: string
          reason: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          leave_type_id?: string | null
          operation_type: string
          reason?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          leave_type_id?: string | null
          operation_type?: string
          reason?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balance_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_operations_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          id: string
          leave_type_id: string
          remaining_days: number | null
          total_days: number
          updated_at: string
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          leave_type_id: string
          remaining_days?: number | null
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          leave_type_id?: string
          remaining_days?: number | null
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          carry_over_expiry_months: number | null
          created_at: string
          default_balance_days: number
          description: string | null
          id: string
          is_active: boolean
          max_carry_over_days: number | null
          name: string
          requires_attachment: boolean
          updated_at: string
        }
        Insert: {
          carry_over_expiry_months?: number | null
          created_at?: string
          default_balance_days?: number
          description?: string | null
          id?: string
          is_active?: boolean
          max_carry_over_days?: number | null
          name: string
          requires_attachment?: boolean
          updated_at?: string
        }
        Update: {
          carry_over_expiry_months?: number | null
          created_at?: string
          default_balance_days?: number
          description?: string | null
          id?: string
          is_active?: boolean
          max_carry_over_days?: number | null
          name?: string
          requires_attachment?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      location_types: {
        Row: {
          color_class: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          color_class: string
          created_at?: string | null
          id: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          color_class?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ohs_attachments: {
        Row: {
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ohs_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ohs_hazard_reports: {
        Row: {
          action_owner: string | null
          category: Database["public"]["Enums"]["hazard_category"]
          consequence: Database["public"]["Enums"]["consequence_level"]
          consultation_notes: string | null
          control_justification: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          employee_reporter_contact: string | null
          employee_reporter_name: string
          exact_location: string
          exposure: string | null
          hierarchy_of_control: Database["public"]["Enums"]["control_hierarchy"]
          id: string
          initial_risk_rating: number
          intake_source: string
          likelihood: Database["public"]["Enums"]["likelihood_level"]
          manager_taking_report: string
          residual_consequence:
            | Database["public"]["Enums"]["consequence_level"]
            | null
          residual_likelihood:
            | Database["public"]["Enums"]["likelihood_level"]
            | null
          residual_risk_rating: number | null
          review_date: string | null
          rp_available_methods: string | null
          rp_cost_factor: string | null
          rp_degree_of_harm: string | null
          rp_knowledge_factor: string | null
          rp_likelihood_factor: string | null
          signed_off_at: string | null
          signed_off_by: string | null
          site_area: string
          status: Database["public"]["Enums"]["ohs_status"]
          title: string
          updated_at: string
        }
        Insert: {
          action_owner?: string | null
          category: Database["public"]["Enums"]["hazard_category"]
          consequence: Database["public"]["Enums"]["consequence_level"]
          consultation_notes?: string | null
          control_justification: string
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          employee_reporter_contact?: string | null
          employee_reporter_name: string
          exact_location: string
          exposure?: string | null
          hierarchy_of_control: Database["public"]["Enums"]["control_hierarchy"]
          id?: string
          initial_risk_rating: number
          intake_source: string
          likelihood: Database["public"]["Enums"]["likelihood_level"]
          manager_taking_report: string
          residual_consequence?:
            | Database["public"]["Enums"]["consequence_level"]
            | null
          residual_likelihood?:
            | Database["public"]["Enums"]["likelihood_level"]
            | null
          residual_risk_rating?: number | null
          review_date?: string | null
          rp_available_methods?: string | null
          rp_cost_factor?: string | null
          rp_degree_of_harm?: string | null
          rp_knowledge_factor?: string | null
          rp_likelihood_factor?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          site_area: string
          status?: Database["public"]["Enums"]["ohs_status"]
          title: string
          updated_at?: string
        }
        Update: {
          action_owner?: string | null
          category?: Database["public"]["Enums"]["hazard_category"]
          consequence?: Database["public"]["Enums"]["consequence_level"]
          consultation_notes?: string | null
          control_justification?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          employee_reporter_contact?: string | null
          employee_reporter_name?: string
          exact_location?: string
          exposure?: string | null
          hierarchy_of_control?: Database["public"]["Enums"]["control_hierarchy"]
          id?: string
          initial_risk_rating?: number
          intake_source?: string
          likelihood?: Database["public"]["Enums"]["likelihood_level"]
          manager_taking_report?: string
          residual_consequence?:
            | Database["public"]["Enums"]["consequence_level"]
            | null
          residual_likelihood?:
            | Database["public"]["Enums"]["likelihood_level"]
            | null
          residual_risk_rating?: number | null
          review_date?: string | null
          rp_available_methods?: string | null
          rp_cost_factor?: string | null
          rp_degree_of_harm?: string | null
          rp_knowledge_factor?: string | null
          rp_likelihood_factor?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          site_area?: string
          status?: Database["public"]["Enums"]["ohs_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ohs_hazard_reports_action_owner_fkey"
            columns: ["action_owner"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hazard_reports_action_owner_fkey"
            columns: ["action_owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hazard_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hazard_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hazard_reports_manager_taking_report_fkey"
            columns: ["manager_taking_report"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hazard_reports_manager_taking_report_fkey"
            columns: ["manager_taking_report"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hazard_reports_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hazard_reports_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ohs_hr_incidents: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_reported: string
          description: string
          follow_up_actions: string | null
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_time: string | null
          individuals_involved: Json | null
          location: string
          nature_harassment_discrimination: boolean | null
          nature_other: boolean | null
          nature_other_details: string | null
          nature_policy_violation: boolean | null
          nature_workplace_injury: boolean | null
          prepared_by: string
          prepared_by_signature: string | null
          report_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_reported?: string
          description: string
          follow_up_actions?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_time?: string | null
          individuals_involved?: Json | null
          location: string
          nature_harassment_discrimination?: boolean | null
          nature_other?: boolean | null
          nature_other_details?: string | null
          nature_policy_violation?: boolean | null
          nature_workplace_injury?: boolean | null
          prepared_by: string
          prepared_by_signature?: string | null
          report_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_reported?: string
          description?: string
          follow_up_actions?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_time?: string | null
          individuals_involved?: Json | null
          location?: string
          nature_harassment_discrimination?: boolean | null
          nature_other?: boolean | null
          nature_other_details?: string | null
          nature_policy_violation?: boolean | null
          nature_workplace_injury?: boolean | null
          prepared_by?: string
          prepared_by_signature?: string | null
          report_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ohs_hr_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_hr_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ohs_injury_registers: {
        Row: {
          body_parts_affected: string
          contributing_factors: string | null
          controls_implemented: string | null
          created_at: string
          created_by: string
          emergency_services_called: boolean
          employer_confirmation: string | null
          employer_date: string | null
          employer_signature: string | null
          entry_maker_date: string
          entry_maker_name: string
          entry_maker_position: string
          entry_maker_signature: string | null
          equipment_details: string | null
          equipment_involved: boolean
          first_aid_provided: boolean
          first_aid_provider: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_required: boolean
          id: string
          immediate_action_taken: string | null
          incident_date: string
          incident_time: string
          injured_person_contact: string | null
          injured_person_name: string
          injury_description: string
          injury_severity: Database["public"]["Enums"]["injury_severity"]
          is_am_pm: string
          location: string
          manager_date: string | null
          manager_investigation: string | null
          manager_name: string | null
          manager_signature: string | null
          medical_provider: string | null
          medical_treatment_required: boolean
          status: Database["public"]["Enums"]["ohs_status"]
          updated_at: string
          witness_contacts: string | null
          witness_names: string | null
          witnesses_present: boolean
        }
        Insert: {
          body_parts_affected: string
          contributing_factors?: string | null
          controls_implemented?: string | null
          created_at?: string
          created_by: string
          emergency_services_called?: boolean
          employer_confirmation?: string | null
          employer_date?: string | null
          employer_signature?: string | null
          entry_maker_date: string
          entry_maker_name: string
          entry_maker_position: string
          entry_maker_signature?: string | null
          equipment_details?: string | null
          equipment_involved?: boolean
          first_aid_provided?: boolean
          first_aid_provider?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          immediate_action_taken?: string | null
          incident_date: string
          incident_time: string
          injured_person_contact?: string | null
          injured_person_name: string
          injury_description: string
          injury_severity: Database["public"]["Enums"]["injury_severity"]
          is_am_pm: string
          location: string
          manager_date?: string | null
          manager_investigation?: string | null
          manager_name?: string | null
          manager_signature?: string | null
          medical_provider?: string | null
          medical_treatment_required?: boolean
          status?: Database["public"]["Enums"]["ohs_status"]
          updated_at?: string
          witness_contacts?: string | null
          witness_names?: string | null
          witnesses_present?: boolean
        }
        Update: {
          body_parts_affected?: string
          contributing_factors?: string | null
          controls_implemented?: string | null
          created_at?: string
          created_by?: string
          emergency_services_called?: boolean
          employer_confirmation?: string | null
          employer_date?: string | null
          employer_signature?: string | null
          entry_maker_date?: string
          entry_maker_name?: string
          entry_maker_position?: string
          entry_maker_signature?: string | null
          equipment_details?: string | null
          equipment_involved?: boolean
          first_aid_provided?: boolean
          first_aid_provider?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          immediate_action_taken?: string | null
          incident_date?: string
          incident_time?: string
          injured_person_contact?: string | null
          injured_person_name?: string
          injury_description?: string
          injury_severity?: Database["public"]["Enums"]["injury_severity"]
          is_am_pm?: string
          location?: string
          manager_date?: string | null
          manager_investigation?: string | null
          manager_name?: string | null
          manager_signature?: string | null
          medical_provider?: string | null
          medical_treatment_required?: boolean
          status?: Database["public"]["Enums"]["ohs_status"]
          updated_at?: string
          witness_contacts?: string | null
          witness_names?: string | null
          witnesses_present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ohs_injury_registers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_injury_registers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ohs_inspection_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          item_name: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          item_name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          item_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      ohs_inspection_results: {
        Row: {
          created_at: string
          hazard_raised: boolean
          hazard_report_id: string | null
          id: string
          inspection_id: string
          inspection_item_id: string
          notes: string | null
          photo_urls: string[] | null
          status: Database["public"]["Enums"]["inspection_status"]
        }
        Insert: {
          created_at?: string
          hazard_raised?: boolean
          hazard_report_id?: string | null
          id?: string
          inspection_id: string
          inspection_item_id: string
          notes?: string | null
          photo_urls?: string[] | null
          status: Database["public"]["Enums"]["inspection_status"]
        }
        Update: {
          created_at?: string
          hazard_raised?: boolean
          hazard_report_id?: string | null
          id?: string
          inspection_id?: string
          inspection_item_id?: string
          notes?: string | null
          photo_urls?: string[] | null
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ohs_inspection_results_hazard_report_id_fkey"
            columns: ["hazard_report_id"]
            isOneToOne: false
            referencedRelation: "ohs_hazard_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_inspection_results_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "ohs_workplace_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_inspection_results_inspection_item_id_fkey"
            columns: ["inspection_item_id"]
            isOneToOne: false
            referencedRelation: "ohs_inspection_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ohs_workplace_inspections: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          inspection_date: string
          inspector_id: string
          notes: string | null
          overall_status: Database["public"]["Enums"]["inspection_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          site_area: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          inspection_date: string
          inspector_id: string
          notes?: string | null
          overall_status?: Database["public"]["Enums"]["inspection_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_area: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          inspection_date?: string
          inspector_id?: string
          notes?: string | null
          overall_status?: Database["public"]["Enums"]["inspection_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_area?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ohs_workplace_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_workplace_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_workplace_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_workplace_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_workplace_inspections_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ohs_workplace_inspections_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          default_probability: number
          entry_criteria: string | null
          exit_criteria: string | null
          id: string
          is_active: boolean
          is_closed_lost: boolean
          is_closed_won: boolean
          name: string
          required_fields: Json | null
          stage_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_probability: number
          entry_criteria?: string | null
          exit_criteria?: string | null
          id?: string
          is_active?: boolean
          is_closed_lost?: boolean
          is_closed_won?: boolean
          name: string
          required_fields?: Json | null
          stage_order: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_probability?: number
          entry_criteria?: string | null
          exit_criteria?: string | null
          id?: string
          is_active?: boolean
          is_closed_lost?: boolean
          is_closed_won?: boolean
          name?: string
          required_fields?: Json | null
          stage_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      portal_group_request_types: {
        Row: {
          created_at: string | null
          id: string
          portal_group_id: string
          request_type_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          portal_group_id: string
          request_type_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          portal_group_id?: string
          request_type_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_group_request_types_portal_group_id_fkey"
            columns: ["portal_group_id"]
            isOneToOne: false
            referencedRelation: "portal_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_group_request_types_request_type_id_fkey"
            columns: ["request_type_id"]
            isOneToOne: false
            referencedRelation: "portal_request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_groups: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_groups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_request_types: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          form_schema: Json | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          form_schema?: Json | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          form_schema?: Json | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          default_friday_office: boolean | null
          default_monday_office: boolean | null
          default_thursday_office: boolean | null
          default_tuesday_office: boolean | null
          default_wednesday_office: boolean | null
          email: string | null
          employee_card_id: string | null
          employee_id: string | null
          employment_type:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          notify_by_email: boolean
          organization: string | null
          time_zone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          default_friday_office?: boolean | null
          default_monday_office?: boolean | null
          default_thursday_office?: boolean | null
          default_tuesday_office?: boolean | null
          default_wednesday_office?: boolean | null
          email?: string | null
          employee_card_id?: string | null
          employee_id?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          notify_by_email?: boolean
          organization?: string | null
          time_zone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          default_friday_office?: boolean | null
          default_monday_office?: boolean | null
          default_thursday_office?: boolean | null
          default_tuesday_office?: boolean | null
          default_wednesday_office?: boolean | null
          email?: string | null
          employee_card_id?: string | null
          employee_id?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          notify_by_email?: boolean
          organization?: string | null
          time_zone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_deactivated_by"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_deactivated_by"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sla_configs: {
        Row: {
          business_hours_only: boolean | null
          created_at: string | null
          created_by: string | null
          escalation_hours: number | null
          id: string
          priority_id: string | null
          project_id: string
          resolution_sla_hours: number
          response_sla_hours: number
          updated_at: string | null
        }
        Insert: {
          business_hours_only?: boolean | null
          created_at?: string | null
          created_by?: string | null
          escalation_hours?: number | null
          id?: string
          priority_id?: string | null
          project_id: string
          resolution_sla_hours?: number
          response_sla_hours?: number
          updated_at?: string | null
        }
        Update: {
          business_hours_only?: boolean | null
          created_at?: string | null
          created_by?: string | null
          escalation_hours?: number | null
          id?: string
          priority_id?: string | null
          project_id?: string
          resolution_sla_hours?: number
          response_sla_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sla_configs_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "incident_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sla_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sla_overrides: {
        Row: {
          business_hours_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          escalation_minutes: number | null
          id: string
          incident_project_id: string
          is_active: boolean
          priority_id: string
          resolution_sla_minutes: number
          response_sla_minutes: number
          updated_at: string
        }
        Insert: {
          business_hours_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          escalation_minutes?: number | null
          id?: string
          incident_project_id: string
          is_active?: boolean
          priority_id: string
          resolution_sla_minutes: number
          response_sla_minutes: number
          updated_at?: string
        }
        Update: {
          business_hours_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          escalation_minutes?: number | null
          id?: string
          incident_project_id?: string
          is_active?: boolean
          priority_id?: string
          resolution_sla_minutes?: number
          response_sla_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sla_overrides_business_hours_id_fkey"
            columns: ["business_hours_id"]
            isOneToOne: false
            referencedRelation: "business_hours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sla_overrides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sla_overrides_incident_project_id_fkey"
            columns: ["incident_project_id"]
            isOneToOne: false
            referencedRelation: "incident_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sla_overrides_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "incident_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_hours: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          end_date: string | null
          has_budget_limit: boolean
          id: string
          is_active: boolean | null
          is_internal: boolean | null
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          budget_hours: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          has_budget_limit?: boolean
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          budget_hours?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          has_budget_limit?: boolean
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_activities: {
        Row: {
          activity_at: string
          activity_summary: string
          activity_type: Database["public"]["Enums"]["prospect_activity_type"]
          created_at: string
          created_by: string
          id: string
          owner_id: string
          prospect_id: string
        }
        Insert: {
          activity_at?: string
          activity_summary: string
          activity_type: Database["public"]["Enums"]["prospect_activity_type"]
          created_at?: string
          created_by: string
          id?: string
          owner_id: string
          prospect_id: string
        }
        Update: {
          activity_at?: string
          activity_summary?: string
          activity_type?: Database["public"]["Enums"]["prospect_activity_type"]
          created_at?: string
          created_by?: string
          id?: string
          owner_id?: string
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          prospect_id: string
          role_label: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          prospect_id: string
          role_label?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          prospect_id?: string
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          account_id: string
          converted_at: string | null
          converted_to_deal_id: string | null
          created_at: string
          created_by: string
          disqualified_reason: string | null
          id: string
          last_activity_at: string | null
          name: string
          next_action: string | null
          next_action_due_date: string | null
          nurture_reason: string | null
          owner_id: string
          priority: Database["public"]["Enums"]["prospect_priority"]
          qualification_notes: string | null
          segment: string | null
          source: string | null
          stage: Database["public"]["Enums"]["prospect_stage"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          converted_at?: string | null
          converted_to_deal_id?: string | null
          created_at?: string
          created_by: string
          disqualified_reason?: string | null
          id?: string
          last_activity_at?: string | null
          name: string
          next_action?: string | null
          next_action_due_date?: string | null
          nurture_reason?: string | null
          owner_id: string
          priority?: Database["public"]["Enums"]["prospect_priority"]
          qualification_notes?: string | null
          segment?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["prospect_stage"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          converted_at?: string | null
          converted_to_deal_id?: string | null
          created_at?: string
          created_by?: string
          disqualified_reason?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string
          next_action?: string | null
          next_action_due_date?: string | null
          nurture_reason?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["prospect_priority"]
          qualification_notes?: string | null
          segment?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["prospect_stage"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_converted_to_deal_id_fkey"
            columns: ["converted_to_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_converted_to_deal_id_fkey"
            columns: ["converted_to_deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          state: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          state?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          state?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sales_kpi_targets: {
        Row: {
          created_at: string | null
          financial_year: string
          id: string
          month: number
          target_meetings: number | null
          target_new_contacts: number | null
          target_proposals: number | null
          target_revenue: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          financial_year: string
          id?: string
          month: number
          target_meetings?: number | null
          target_new_contacts?: number | null
          target_proposals?: number | null
          target_revenue?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          financial_year?: string
          id?: string
          month?: number
          target_meetings?: number | null
          target_new_contacts?: number | null
          target_proposals?: number | null
          target_revenue?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_credits: {
        Row: {
          applied_to_invoice_id: string | null
          breach_type: string | null
          created_at: string | null
          credit_amount: number
          credit_type: string
          customer_id: string
          description: string | null
          id: string
          incident_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          applied_to_invoice_id?: string | null
          breach_type?: string | null
          created_at?: string | null
          credit_amount?: number
          credit_type?: string
          customer_id: string
          description?: string | null
          id?: string
          incident_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          applied_to_invoice_id?: string | null
          breach_type?: string | null
          created_at?: string | null
          credit_amount?: number
          credit_type?: string
          customer_id?: string
          description?: string | null
          id?: string
          incident_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_credits_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          billing_types: string[] | null
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sku: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          billing_types?: string[] | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sku?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          billing_types?: string[] | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sku?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      skill_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sla_notifications: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          notification_content: Json | null
          notification_sent: boolean
          notification_type: string
          recipients: string[] | null
          sent_at: string | null
          sla_type: string
          triggered_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          notification_content?: Json | null
          notification_sent?: boolean
          notification_type: string
          recipients?: string[] | null
          sent_at?: string | null
          sla_type: string
          triggered_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          notification_content?: Json | null
          notification_sent?: boolean
          notification_type?: string
          recipients?: string[] | null
          sent_at?: string | null
          sla_type?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_overrides: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          incident_id: string
          original_value: number | null
          override_reason: string | null
          override_type: string
          override_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          incident_id: string
          original_value?: number | null
          override_reason?: string | null
          override_type: string
          override_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          incident_id?: string
          original_value?: number | null
          override_reason?: string | null
          override_type?: string
          override_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          task_id: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          task_id: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          task_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          account_id: string | null
          assigned_to: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          due_date_extended_at: string | null
          due_date_extended_by: string | null
          id: string
          is_auto_generated: boolean | null
          is_recurring: boolean
          meeting_id: string | null
          original_due_date: string | null
          priority: string
          recurrence_pattern: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          due_date_extended_at?: string | null
          due_date_extended_by?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_recurring?: boolean
          meeting_id?: string | null
          original_due_date?: string | null
          priority?: string
          recurrence_pattern?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          due_date_extended_at?: string | null
          due_date_extended_by?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_recurring?: boolean
          meeting_id?: string | null
          original_due_date?: string | null
          priority?: string
          recurrence_pattern?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_weighted_pipeline_forecast"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "crm_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_email_log: {
        Row: {
          body_preview: string | null
          created_at: string | null
          email_message_id: string | null
          from_email: string
          from_name: string | null
          id: string
          incident_id: string | null
          subject: string | null
        }
        Insert: {
          body_preview?: string | null
          created_at?: string | null
          email_message_id?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          incident_id?: string | null
          subject?: string | null
        }
        Update: {
          body_preview?: string | null
          created_at?: string | null
          email_message_id?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          incident_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_email_log_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          contract_id: string | null
          created_at: string
          end_time: string | null
          entry_date: string
          entry_type: string | null
          hours_logged: number
          id: string
          incident_id: string | null
          jira_task_id: string | null
          notes: string | null
          project_id: string | null
          start_time: string | null
          updated_at: string
          user_full_name: string | null
          user_id: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          end_time?: string | null
          entry_date: string
          entry_type?: string | null
          hours_logged: number
          id?: string
          incident_id?: string | null
          jira_task_id?: string | null
          notes?: string | null
          project_id?: string | null
          start_time?: string | null
          updated_at?: string
          user_full_name?: string | null
          user_id: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          end_time?: string | null
          entry_date?: string
          entry_type?: string | null
          hours_logged?: number
          id?: string
          incident_id?: string | null
          jira_task_id?: string | null
          notes?: string | null
          project_id?: string | null
          start_time?: string | null
          updated_at?: string
          user_full_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_timesheet_entries_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_holiday_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          holiday_id: string
          id: string
          is_allowed: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          holiday_id: string
          id?: string
          is_allowed?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          holiday_id?: string
          id?: string
          is_allowed?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_holiday_permissions_holiday_id_fkey"
            columns: ["holiday_id"]
            isOneToOne: false
            referencedRelation: "public_holidays"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          proficiency_level: number
          skill_category_id: string
          skill_name: string
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          proficiency_level?: number
          skill_category_id: string
          skill_name: string
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          proficiency_level?: number
          skill_category_id?: string
          skill_name?: string
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_category_id_fkey"
            columns: ["skill_category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_work_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          friday_location: string | null
          friday_working: boolean | null
          holiday_work_approved: boolean | null
          holiday_work_approved_at: string | null
          holiday_work_approved_by: string | null
          holiday_work_reason: string | null
          id: string
          monday_location: string | null
          monday_working: boolean | null
          notes: string | null
          saturday_location: string | null
          saturday_working: boolean | null
          sunday_location: string | null
          sunday_working: boolean | null
          thursday_location: string | null
          thursday_working: boolean | null
          tuesday_location: string | null
          tuesday_working: boolean | null
          updated_at: string
          user_id: string
          wednesday_location: string | null
          wednesday_working: boolean | null
          week_start_date: string
          weekend_work_approved: boolean | null
          weekend_work_approved_at: string | null
          weekend_work_approved_by: string | null
          weekend_work_reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          friday_location?: string | null
          friday_working?: boolean | null
          holiday_work_approved?: boolean | null
          holiday_work_approved_at?: string | null
          holiday_work_approved_by?: string | null
          holiday_work_reason?: string | null
          id?: string
          monday_location?: string | null
          monday_working?: boolean | null
          notes?: string | null
          saturday_location?: string | null
          saturday_working?: boolean | null
          sunday_location?: string | null
          sunday_working?: boolean | null
          thursday_location?: string | null
          thursday_working?: boolean | null
          tuesday_location?: string | null
          tuesday_working?: boolean | null
          updated_at?: string
          user_id: string
          wednesday_location?: string | null
          wednesday_working?: boolean | null
          week_start_date: string
          weekend_work_approved?: boolean | null
          weekend_work_approved_at?: string | null
          weekend_work_approved_by?: string | null
          weekend_work_reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          friday_location?: string | null
          friday_working?: boolean | null
          holiday_work_approved?: boolean | null
          holiday_work_approved_at?: string | null
          holiday_work_approved_by?: string | null
          holiday_work_reason?: string | null
          id?: string
          monday_location?: string | null
          monday_working?: boolean | null
          notes?: string | null
          saturday_location?: string | null
          saturday_working?: boolean | null
          sunday_location?: string | null
          sunday_working?: boolean | null
          thursday_location?: string | null
          thursday_working?: boolean | null
          tuesday_location?: string | null
          tuesday_working?: boolean | null
          updated_at?: string
          user_id?: string
          wednesday_location?: string | null
          wednesday_working?: boolean | null
          week_start_date?: string
          weekend_work_approved?: boolean | null
          weekend_work_approved_at?: string | null
          weekend_work_approved_by?: string | null
          weekend_work_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_weekly_friday"
            columns: ["friday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_monday"
            columns: ["monday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_saturday"
            columns: ["saturday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_sunday"
            columns: ["sunday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_thursday"
            columns: ["thursday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_tuesday"
            columns: ["tuesday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weekly_wednesday"
            columns: ["wednesday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_holiday_work_approved_by_fkey"
            columns: ["holiday_work_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_holiday_work_approved_by_fkey"
            columns: ["holiday_work_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_weekend_work_approved_by_fkey"
            columns: ["weekend_work_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_work_schedules_weekend_work_approved_by_fkey"
            columns: ["weekend_work_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          allow_holiday_entries: boolean
          allow_weekend_entries: boolean
          created_at: string
          created_by: string | null
          default_friday_location: string | null
          default_monday_location: string | null
          default_saturday_location: string | null
          default_sunday_location: string | null
          default_thursday_location: string | null
          default_tuesday_location: string | null
          default_wednesday_location: string | null
          id: string
          lock_reason: string | null
          locked_at: string | null
          locked_by: string | null
          locked_until_date: string | null
          updated_at: string
          user_id: string
          working_days: number
        }
        Insert: {
          allow_holiday_entries?: boolean
          allow_weekend_entries?: boolean
          created_at?: string
          created_by?: string | null
          default_friday_location?: string | null
          default_monday_location?: string | null
          default_saturday_location?: string | null
          default_sunday_location?: string | null
          default_thursday_location?: string | null
          default_tuesday_location?: string | null
          default_wednesday_location?: string | null
          id?: string
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_until_date?: string | null
          updated_at?: string
          user_id: string
          working_days?: number
        }
        Update: {
          allow_holiday_entries?: boolean
          allow_weekend_entries?: boolean
          created_at?: string
          created_by?: string | null
          default_friday_location?: string | null
          default_monday_location?: string | null
          default_saturday_location?: string | null
          default_sunday_location?: string | null
          default_thursday_location?: string | null
          default_tuesday_location?: string | null
          default_wednesday_location?: string | null
          id?: string
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_until_date?: string | null
          updated_at?: string
          user_id?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_default_friday"
            columns: ["default_friday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_default_monday"
            columns: ["default_monday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_default_saturday"
            columns: ["default_saturday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_default_sunday"
            columns: ["default_sunday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_default_thursday"
            columns: ["default_thursday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_default_tuesday"
            columns: ["default_tuesday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_default_wednesday"
            columns: ["default_wednesday_location"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workload_metrics: {
        Row: {
          avg_resolution_hours: number | null
          calculated_at: string
          capacity_percentage: number
          current_incident_count: number
          high_priority_count: number
          id: string
          is_available: boolean
          last_assignment_at: string | null
          overdue_count: number
          user_id: string
        }
        Insert: {
          avg_resolution_hours?: number | null
          calculated_at?: string
          capacity_percentage?: number
          current_incident_count?: number
          high_priority_count?: number
          id?: string
          is_available?: boolean
          last_assignment_at?: string | null
          overdue_count?: number
          user_id: string
        }
        Update: {
          avg_resolution_hours?: number | null
          calculated_at?: string
          capacity_percentage?: number
          current_incident_count?: number
          high_priority_count?: number
          id?: string
          is_available?: boolean
          last_assignment_at?: string | null
          overdue_count?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      all_users: {
        Row: {
          email: string | null
          full_name: string | null
          user_id: string | null
          user_type: string | null
        }
        Relationships: []
      }
      employee_directory: {
        Row: {
          full_name: string | null
          id: string | null
          is_active: boolean | null
          organization: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          organization?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          organization?: string | null
        }
        Relationships: []
      }
      timesheet_report_view: {
        Row: {
          contract_description: string | null
          contract_id: string | null
          contract_name: string | null
          created_at: string | null
          customer_company: string | null
          customer_name: string | null
          employee_card_id: string | null
          end_time: string | null
          entry_date: string | null
          entry_type: string | null
          hours_logged: number | null
          id: string | null
          jira_task_id: string | null
          notes: string | null
          organization: string | null
          project_budget_hours: number | null
          project_description: string | null
          project_id: string | null
          project_name: string | null
          start_time: string | null
          time_zone: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_timesheet_entries_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_weighted_pipeline_forecast: {
        Row: {
          account_name: string | null
          close_date: string | null
          created_at: string | null
          deal_amount: number | null
          deal_id: string | null
          deal_name: string | null
          owner_id: string | null
          owner_name: string | null
          probability: number | null
          source: string | null
          stage_name: string | null
          weighted_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_close_past_meeting_tasks: { Args: never; Returns: undefined }
      calculate_business_days: {
        Args: { end_date: string; start_date: string; target_state?: string }
        Returns: number
      }
      calculate_incident_sla_metrics:
        | {
            Args: { p_incident_id: string }
            Returns: {
              business_hours_id: string
              resolution_sla_breached: boolean
              resolution_sla_minutes: number
              resolution_time_remaining: number
              response_sla_breached: boolean
              response_sla_minutes: number
              response_time_remaining: number
            }[]
          }
        | {
            Args: {
              p_end_date?: string
              p_project_id?: string
              p_start_date?: string
            }
            Returns: {
              avg_resolution_hours: number
              breached_count: number
              resolved_within_sla: number
              sla_compliance_rate: number
              total_incidents: number
            }[]
          }
      calculate_incident_trends: {
        Args: {
          p_end_date?: string
          p_project_id?: string
          p_start_date?: string
        }
        Returns: {
          avg_resolution_time: number
          date: string
          new_incidents: number
          resolved_incidents: number
          sla_breaches: number
          trend_direction: string
        }[]
      }
      calculate_risk_rating:
        | {
            Args: { p_consequence: number; p_likelihood: number }
            Returns: string
          }
        | {
            Args: {
              p_consequence: Database["public"]["Enums"]["consequence_level"]
              p_likelihood: Database["public"]["Enums"]["likelihood_level"]
            }
            Returns: number
          }
      can_view_crm_meeting: { Args: { _owner_id: string }; Returns: boolean }
      check_date_lock_status: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          can_override: boolean
          is_locked: boolean
          lock_reason: string
          locked_until: string
        }[]
      }
      check_timesheet_lock_status: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          can_override: boolean
          is_locked: boolean
          lock_reason: string
          locked_until: string
        }[]
      }
      check_user_holiday_permission:
        | {
            Args: { p_date: string; p_user_id: string }
            Returns: {
              is_allowed: boolean
              message: string
            }[]
          }
        | {
            Args: {
              p_holiday_date: string
              p_target_state?: string
              p_user_id: string
            }
            Returns: {
              holiday_name: string
              is_allowed: boolean
              message: string
              permission_source: string
            }[]
          }
      classify_incident_ai: {
        Args: { p_description: string; p_title: string }
        Returns: Json
      }
      customer_can_access_portal_group: {
        Args: { p_portal_group_id: string }
        Returns: boolean
      }
      deactivate_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      generate_asset_key: { Args: { p_group_id: string }; Returns: string }
      generate_incident_number: {
        Args: { project_id: string }
        Returns: string
      }
      generate_invitation_token: { Args: never; Returns: string }
      generate_project_key: { Args: { project_name: string }; Returns: string }
      get_audit_action_types: { Args: never; Returns: string[] }
      get_audit_logs_direct: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string }
        Returns: {
          action: string
          created_at: string
          description: string
          details: Json
          entity_name: string
          id: string
          user_id: string
          user_name: string
        }[]
      }
      get_current_customer_company_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_customer_company_id: { Args: { p_user_id: string }; Returns: string }
      get_daily_location_status: {
        Args: { p_date?: string; p_user_id: string }
        Returns: {
          actual_location: string
          check_in_time: string
          has_checked_in: boolean
          is_late_checkin: boolean
          location_changed: boolean
          planned_location: string
        }[]
      }
      get_deals_for_pipeline: {
        Args: never
        Returns: {
          account_id: string
          account_name: string
          amount: number
          billing_cadence: string
          close_date: string
          competitor: string
          contact_notes: string
          contract_type: string
          contract_value: number
          created_at: string
          deal_id: string
          deal_name: string
          deal_notes: string
          next_step: string
          next_step_due_date: string
          owner_id: string
          owner_name: string
          primary_contact_id: string
          primary_contact_name: string
          proposal_file_id: string
          proposal_file_name: string
          proposal_file_size: number
          proposal_file_type: string
          proposal_file_url: string
          proposal_uploaded_at: string
          risk_notes: string
          source: string
          stage_id: string
          stage_name: string
          stage_order: number
          stage_probability: number
          updated_at: string
        }[]
      }
      get_global_lock_status: {
        Args: never
        Returns: {
          earliest_lock_date: string
          latest_lock_date: string
          most_common_reason: string
          total_users_locked: number
        }[]
      }
      get_holiday_permission_matrix: {
        Args: { p_year?: number }
        Returns: {
          effective_permission: boolean
          general_permission: boolean
          holiday_date: string
          holiday_id: string
          holiday_name: string
          permission_source: string
          specific_permission: boolean
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_incident_trends: {
        Args: {
          p_end_date?: string
          p_project_id?: string
          p_start_date?: string
        }
        Returns: {
          avg_resolution_time: number
          date: string
          new_incidents: number
          resolved_incidents: number
          sla_breaches: number
        }[]
      }
      get_public_holiday_name: {
        Args: { entry_date: string; target_state?: string }
        Returns: string
      }
      get_timesheet_summary: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string }
        Returns: {
          avg_hours_per_entry: number
          total_entries: number
          total_hours: number
          unique_contracts: number
          unique_projects: number
          unique_users: number
        }[]
      }
      get_user_activities: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string }
        Returns: {
          action: string
          created_at: string
          description: string
          details: Json
          entity_name: string
          id: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_assignments: {
        Args: { p_user_id: string }
        Returns: {
          contract_id: string
          contract_name: string
          customer_name: string
          project_id: string
          project_name: string
        }[]
      }
      get_user_display_name: {
        Args: { p_user_id: string }
        Returns: {
          email: string
          full_name: string
          user_type: string
        }[]
      }
      get_user_leave_entitlement: {
        Args: { p_leave_type_id: string; p_user_id: string; p_year: number }
        Returns: number
      }
      get_user_primary_role: { Args: { _user_id: string }; Returns: string }
      get_users_missing_timesheet_entries: {
        Args: { p_week_start_date?: string }
        Returns: {
          email: string
          expected_days: number
          full_name: string
          logged_days: number
          missing_days: number
          missing_specific_days: string[]
          organization: string
          time_zone: string
          user_id: string
          week_end_date: string
          week_start_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cron_available: { Args: never; Returns: boolean }
      is_date_locked_for_user: {
        Args: { entry_date: string; p_user_id: string }
        Returns: boolean
      }
      is_expense_editable: { Args: { expense_id: string }; Returns: boolean }
      is_member_of_incident_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_public_holiday: {
        Args: { entry_date: string; target_state?: string }
        Returns: boolean
      }
      is_user_assigned_to_contract: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_assigned_to_project: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_weekend_day: { Args: { entry_date: string }; Returns: boolean }
      link_asset_to_incident: {
        Args: { p_asset_id: string; p_incident_id: string }
        Returns: undefined
      }
      lock_leave_dates: {
        Args: {
          p_application_id: string
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_report_generation_secure: {
        Args: { p_filters: Json; p_report_type: string; p_result_count: number }
        Returns: undefined
      }
      perform_annual_reset: {
        Args: { p_leave_type_id?: string; p_user_id?: string; p_year?: number }
        Returns: Json
      }
      reactivate_user: { Args: { p_user_id: string }; Returns: undefined }
      record_asset_history: {
        Args: {
          p_action: string
          p_actor_id: string
          p_after_data?: Json
          p_asset_id: string
          p_before_data?: Json
        }
        Returns: undefined
      }
      sync_weekly_schedules_with_profiles: {
        Args: { p_week_start_date?: string }
        Returns: {
          synced_hours: Json
          user_id: string
          was_updated: boolean
        }[]
      }
      timesheet_entries_report:
        | {
            Args: {
              p_contract_id?: string
              p_customer_id?: string
              p_end_date: string
              p_project_id?: string
              p_start_date: string
              p_user_id?: string
            }
            Returns: {
              contract_id: string
              created_at: string
              end_time: string
              entry_date: string
              hours_logged: number
              id: string
              jira_task_id: string
              notes: string
              project_customer_id: string
              project_description: string
              project_id: string
              project_name: string
              start_time: string
              updated_at: string
              user_email: string
              user_employee_card_id: string
              user_full_name: string
              user_id: string
              user_organization: string
              user_time_zone: string
            }[]
          }
        | {
            Args: {
              p_contract_id?: string
              p_customer_id?: string
              p_end_date: string
              p_include_contracts?: boolean
              p_include_projects?: boolean
              p_project_id?: string
              p_start_date: string
              p_user_id?: string
            }
            Returns: {
              contract_id: string
              created_at: string
              end_time: string
              entry_date: string
              hours_logged: number
              id: string
              jira_task_id: string
              notes: string
              project_customer_id: string
              project_description: string
              project_id: string
              project_name: string
              start_time: string
              updated_at: string
              user_email: string
              user_employee_card_id: string
              user_full_name: string
              user_id: string
              user_organization: string
              user_time_zone: string
            }[]
          }
      unlock_leave_dates: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: undefined
      }
      update_expired_contracts: { Args: never; Returns: undefined }
      update_expired_projects: { Args: never; Returns: undefined }
      update_workload_metrics: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      validate_timesheet_entry_batch: {
        Args: { p_entry_data: Json; p_user_id: string }
        Returns: Json
      }
      validate_timesheet_entry_comprehensive: {
        Args: { p_entry_data: Json; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      account_segment:
        | "enterprise"
        | "mid_market"
        | "small_business"
        | "startup"
      activity_outcome:
        | "successful"
        | "no_answer"
        | "left_message"
        | "follow_up_required"
        | "not_interested"
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "teams"
        | "in_person"
        | "linkedin"
        | "note"
      approval_status: "draft" | "approved" | "archived"
      asset_type:
        | "presentation"
        | "price_list"
        | "template"
        | "case_study"
        | "graphic"
        | "video"
      billing_cadence: "monthly" | "quarterly" | "annually" | "one_time"
      consequence_level:
        | "Insignificant"
        | "Minor"
        | "Moderate"
        | "Major"
        | "Catastrophic"
      control_hierarchy:
        | "Eliminate"
        | "Substitute"
        | "Isolate"
        | "Engineer"
        | "Administration"
        | "PPE"
      deal_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "active"
        | "completed"
        | "cancelled"
      employment_status: "full-time" | "part-time" | "temporary" | "casual"
      expense_status: "draft" | "submitted" | "approved" | "rejected"
      hazard_category:
        | "Physical"
        | "Chemical"
        | "Biological"
        | "Mechanical-Electrical"
        | "Psychological"
        | "Slip-Trip-Fall"
        | "Ergonomic"
        | "Environmental"
        | "Fire"
        | "Other"
      hierarchy_of_control:
        | "Elimination"
        | "Substitution"
        | "Engineering Controls"
        | "Administrative Controls"
        | "PPE"
      incident_status: "New" | "Triaged" | "In Progress" | "Resolved" | "Closed"
      injury_severity:
        | "First Aid"
        | "Medical Treatment"
        | "Lost Time"
        | "Permanent Disability"
        | "Fatality"
      inspection_status:
        | "Compliant"
        | "Non-Compliant"
        | "Not Applicable"
        | "Requires Action"
      integration_job_status: "pending" | "running" | "completed" | "failed"
      integration_job_type:
        | "jira_sync"
        | "outlook_sync"
        | "esignature_sync"
        | "webhook"
      lead_source:
        | "website"
        | "referral"
        | "linkedin"
        | "email_campaign"
        | "event"
        | "cold_outreach"
        | "partner"
        | "existing client"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "disqualified"
        | "converted"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      likelihood_level:
        | "Very Unlikely"
        | "Unlikely"
        | "Possible"
        | "Likely"
        | "Very Likely"
      message_direction: "inbound" | "outbound"
      message_type: "email" | "linkedin" | "sms"
      ohs_status:
        | "Open"
        | "In Progress"
        | "Under Review"
        | "Closed"
        | "Cancelled"
      opportunity_status: "open" | "won" | "lost" | "abandoned"
      prospect_activity_type:
        | "email"
        | "call"
        | "linkedin"
        | "meeting_request"
        | "note"
        | "stage_change"
        | "follow_up_task"
      prospect_priority: "low" | "medium" | "high"
      prospect_stage:
        | "new"
        | "researched"
        | "outreach_started"
        | "engaged"
        | "qualified"
        | "nurture"
        | "disqualified"
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
      signature_status: "not_sent" | "sent" | "signed" | "declined"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      user_role:
        | "employee"
        | "manager"
        | "admin"
        | "sale_user"
        | "sale_manager"
        | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_segment: [
        "enterprise",
        "mid_market",
        "small_business",
        "startup",
      ],
      activity_outcome: [
        "successful",
        "no_answer",
        "left_message",
        "follow_up_required",
        "not_interested",
      ],
      activity_type: [
        "call",
        "email",
        "meeting",
        "teams",
        "in_person",
        "linkedin",
        "note",
      ],
      approval_status: ["draft", "approved", "archived"],
      asset_type: [
        "presentation",
        "price_list",
        "template",
        "case_study",
        "graphic",
        "video",
      ],
      billing_cadence: ["monthly", "quarterly", "annually", "one_time"],
      consequence_level: [
        "Insignificant",
        "Minor",
        "Moderate",
        "Major",
        "Catastrophic",
      ],
      control_hierarchy: [
        "Eliminate",
        "Substitute",
        "Isolate",
        "Engineer",
        "Administration",
        "PPE",
      ],
      deal_status: [
        "draft",
        "pending_approval",
        "approved",
        "active",
        "completed",
        "cancelled",
      ],
      employment_status: ["full-time", "part-time", "temporary", "casual"],
      expense_status: ["draft", "submitted", "approved", "rejected"],
      hazard_category: [
        "Physical",
        "Chemical",
        "Biological",
        "Mechanical-Electrical",
        "Psychological",
        "Slip-Trip-Fall",
        "Ergonomic",
        "Environmental",
        "Fire",
        "Other",
      ],
      hierarchy_of_control: [
        "Elimination",
        "Substitution",
        "Engineering Controls",
        "Administrative Controls",
        "PPE",
      ],
      incident_status: ["New", "Triaged", "In Progress", "Resolved", "Closed"],
      injury_severity: [
        "First Aid",
        "Medical Treatment",
        "Lost Time",
        "Permanent Disability",
        "Fatality",
      ],
      inspection_status: [
        "Compliant",
        "Non-Compliant",
        "Not Applicable",
        "Requires Action",
      ],
      integration_job_status: ["pending", "running", "completed", "failed"],
      integration_job_type: [
        "jira_sync",
        "outlook_sync",
        "esignature_sync",
        "webhook",
      ],
      lead_source: [
        "website",
        "referral",
        "linkedin",
        "email_campaign",
        "event",
        "cold_outreach",
        "partner",
        "existing client",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "disqualified",
        "converted",
      ],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      likelihood_level: [
        "Very Unlikely",
        "Unlikely",
        "Possible",
        "Likely",
        "Very Likely",
      ],
      message_direction: ["inbound", "outbound"],
      message_type: ["email", "linkedin", "sms"],
      ohs_status: [
        "Open",
        "In Progress",
        "Under Review",
        "Closed",
        "Cancelled",
      ],
      opportunity_status: ["open", "won", "lost", "abandoned"],
      prospect_activity_type: [
        "email",
        "call",
        "linkedin",
        "meeting_request",
        "note",
        "stage_change",
        "follow_up_task",
      ],
      prospect_priority: ["low", "medium", "high"],
      prospect_stage: [
        "new",
        "researched",
        "outreach_started",
        "engaged",
        "qualified",
        "nurture",
        "disqualified",
      ],
      quote_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
      ],
      signature_status: ["not_sent", "sent", "signed", "declined"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: [
        "employee",
        "manager",
        "admin",
        "sale_user",
        "sale_manager",
        "customer",
      ],
    },
  },
} as const
