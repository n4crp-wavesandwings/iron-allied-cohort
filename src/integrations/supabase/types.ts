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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contact_district_coverage: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          district_id: string
          id: string
          org_id: string
          scope: Database["public"]["Enums"]["coverage_scope"]
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          district_id: string
          id?: string
          org_id?: string
          scope?: Database["public"]["Enums"]["coverage_scope"]
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          district_id?: string
          id?: string
          org_id?: string
          scope?: Database["public"]["Enums"]["coverage_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_district_coverage_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_district_coverage_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_district_coverage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_emails: {
        Row: {
          contact_id: string
          created_at: string
          email: string
          id: string
          is_primary: boolean
          label: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_organizations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          organization_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_organizations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_phones: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_phones_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_roles: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_roles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_store_coverage: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          store_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          store_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_store_coverage_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_store_coverage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_store_coverage_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          active: boolean
          best_time_to_contact: string | null
          birthday: string | null
          contact_info: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          department: string | null
          email: string | null
          entity_id: string | null
          first_name: string | null
          id: string
          is_merchant: boolean
          job_title: string | null
          last_name: string | null
          linkedin: string | null
          microsoft_teams: string | null
          mobile_phone: string | null
          name: string | null
          note: string | null
          office_phone: string | null
          org_id: string
          preferred_communication_method_v2:
            | Database["public"]["Enums"]["contact_comm_method"]
            | null
          preferred_contact_method: string | null
          preferred_name: string | null
          relationship_strength:
            | Database["public"]["Enums"]["contact_relationship_strength"]
            | null
          role: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          best_time_to_contact?: string | null
          birthday?: string | null
          contact_info?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          entity_id?: string | null
          first_name?: string | null
          id?: string
          is_merchant?: boolean
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          microsoft_teams?: string | null
          mobile_phone?: string | null
          name?: string | null
          note?: string | null
          office_phone?: string | null
          org_id?: string
          preferred_communication_method_v2?:
            | Database["public"]["Enums"]["contact_comm_method"]
            | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          relationship_strength?:
            | Database["public"]["Enums"]["contact_relationship_strength"]
            | null
          role?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          best_time_to_contact?: string | null
          birthday?: string | null
          contact_info?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          entity_id?: string | null
          first_name?: string | null
          id?: string
          is_merchant?: boolean
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          microsoft_teams?: string | null
          mobile_phone?: string | null
          name?: string | null
          note?: string | null
          office_phone?: string | null
          org_id?: string
          preferred_communication_method_v2?:
            | Database["public"]["Enums"]["contact_comm_method"]
            | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          relationship_strength?:
            | Database["public"]["Enums"]["contact_relationship_strength"]
            | null
          role?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_resolution_followups: {
        Row: {
          created_at: string
          follow_up_id: string
          id: string
          org_id: string
          resolution_id: string
        }
        Insert: {
          created_at?: string
          follow_up_id: string
          id?: string
          org_id?: string
          resolution_id: string
        }
        Update: {
          created_at?: string
          follow_up_id?: string
          id?: string
          org_id?: string
          resolution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolution_followups_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_followups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_followups_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_resolution_history: {
        Row: {
          created_at: string
          created_by: string | null
          event_description: string
          event_type: Database["public"]["Enums"]["cr_event_type"]
          id: string
          new_value: string | null
          org_id: string
          previous_value: string | null
          resolution_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_description: string
          event_type: Database["public"]["Enums"]["cr_event_type"]
          id?: string
          new_value?: string | null
          org_id?: string
          previous_value?: string | null
          resolution_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_description?: string
          event_type?: Database["public"]["Enums"]["cr_event_type"]
          id?: string
          new_value?: string | null
          org_id?: string
          previous_value?: string | null
          resolution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolution_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_history_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_resolution_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_id: string
          org_id: string
          resolution_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_id: string
          org_id?: string
          resolution_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_id?: string
          org_id?: string
          resolution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolution_interactions_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_interactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_interactions_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_resolution_people: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          manual_entry: boolean
          org_id: string
          person_name: string
          person_role: string
          resolution_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          manual_entry?: boolean
          org_id?: string
          person_name: string
          person_role: string
          resolution_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          manual_entry?: boolean
          org_id?: string
          person_name?: string
          person_role?: string
          resolution_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolution_people_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_people_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_people_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_resolution_relationships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          relationship_id: string
          resolution_id: string
          role: Database["public"]["Enums"]["cr_relationship_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string
          relationship_id: string
          resolution_id: string
          role: Database["public"]["Enums"]["cr_relationship_role"]
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          relationship_id?: string
          resolution_id?: string
          role?: Database["public"]["Enums"]["cr_relationship_role"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolution_relationships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_relationships_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_relationships_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_resolution_tasks: {
        Row: {
          actual_completion_date: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string | null
          estimated_completion_date: string | null
          id: string
          notes: string | null
          org_id: string
          owner_name: string
          owner_type: Database["public"]["Enums"]["cr_task_owner_type"]
          resolution_id: string
          status: Database["public"]["Enums"]["cr_task_status"]
          task: string
          updated_at: string
          updated_by: string | null
          waiting_on: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          estimated_completion_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          owner_name: string
          owner_type: Database["public"]["Enums"]["cr_task_owner_type"]
          resolution_id: string
          status?: Database["public"]["Enums"]["cr_task_status"]
          task: string
          updated_at?: string
          updated_by?: string | null
          waiting_on?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          estimated_completion_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          owner_name?: string
          owner_type?: Database["public"]["Enums"]["cr_task_owner_type"]
          resolution_id?: string
          status?: Database["public"]["Enums"]["cr_task_status"]
          task?: string
          updated_at?: string
          updated_by?: string | null
          waiting_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolution_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolution_tasks_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_resolutions: {
        Row: {
          category_id: string | null
          closed_at: string | null
          commitments: string | null
          completed_date: string | null
          created_at: string
          created_by: string
          customer_first_initial: string | null
          customer_last_name: string | null
          deleted_at: string | null
          desired_resolution: string | null
          escalation_level:
            | Database["public"]["Enums"]["cr_escalation_level"]
            | null
          general_issue: string | null
          id: string
          opened_at: string
          opened_date: string
          order_number: string | null
          org_id: string
          owner: string | null
          po_number: string | null
          priority: Database["public"]["Enums"]["cr_priority"] | null
          priority_id: string | null
          program_id: string | null
          reference_number: string | null
          resolution_type:
            | Database["public"]["Enums"]["cr_resolution_type"]
            | null
          service_provider_id: string | null
          severity: Database["public"]["Enums"]["cr_severity"] | null
          status: Database["public"]["Enums"]["cr_status"] | null
          status_id: string | null
          store_id: string | null
          summary: string | null
          target_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id?: string | null
          closed_at?: string | null
          commitments?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          customer_first_initial?: string | null
          customer_last_name?: string | null
          deleted_at?: string | null
          desired_resolution?: string | null
          escalation_level?:
            | Database["public"]["Enums"]["cr_escalation_level"]
            | null
          general_issue?: string | null
          id?: string
          opened_at?: string
          opened_date?: string
          order_number?: string | null
          org_id?: string
          owner?: string | null
          po_number?: string | null
          priority?: Database["public"]["Enums"]["cr_priority"] | null
          priority_id?: string | null
          program_id?: string | null
          reference_number?: string | null
          resolution_type?:
            | Database["public"]["Enums"]["cr_resolution_type"]
            | null
          service_provider_id?: string | null
          severity?: Database["public"]["Enums"]["cr_severity"] | null
          status?: Database["public"]["Enums"]["cr_status"] | null
          status_id?: string | null
          store_id?: string | null
          summary?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string | null
          closed_at?: string | null
          commitments?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          customer_first_initial?: string | null
          customer_last_name?: string | null
          deleted_at?: string | null
          desired_resolution?: string | null
          escalation_level?:
            | Database["public"]["Enums"]["cr_escalation_level"]
            | null
          general_issue?: string | null
          id?: string
          opened_at?: string
          opened_date?: string
          order_number?: string | null
          org_id?: string
          owner?: string | null
          po_number?: string | null
          priority?: Database["public"]["Enums"]["cr_priority"] | null
          priority_id?: string | null
          program_id?: string | null
          reference_number?: string | null
          resolution_type?:
            | Database["public"]["Enums"]["cr_resolution_type"]
            | null
          service_provider_id?: string | null
          severity?: Database["public"]["Enums"]["cr_severity"] | null
          status?: Database["public"]["Enums"]["cr_status"] | null
          status_id?: string | null
          store_id?: string | null
          summary?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolutions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resolution_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolutions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolutions_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "resolution_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolutions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolutions_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolutions_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "resolution_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_resolutions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          leader_contact_id: string | null
          market_id: string
          name: string
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["location_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          leader_contact_id?: string | null
          market_id: string
          name: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          leader_contact_id?: string | null
          market_id?: string
          name?: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "districts_leader_contact_id_fkey"
            columns: ["leader_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "districts_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "districts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_organizations: {
        Row: {
          created_at: string
          engagement_id: string
          entity_id: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          entity_id: string
          id?: string
          org_id?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          entity_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_organizations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_organizations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_outcomes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      engagement_people: {
        Row: {
          contact_id: string
          created_at: string
          engagement_id: string
          id: string
          org_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          engagement_id: string
          id?: string
          org_id?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_people_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_people_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_programs: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          org_id: string
          program_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          org_id?: string
          program_id: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_programs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_stores: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          org_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          org_id?: string
          store_id: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_stores_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_tag_links: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          org_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          org_id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_tag_links_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "engagement_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_tags: {
        Row: {
          active: boolean
          created_at: string
          group: string | null
          id: string
          is_custom: boolean
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group?: string | null
          id?: string
          is_custom?: boolean
          name: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      engagement_type_links: {
        Row: {
          created_at: string
          engagement_id: string
          engagement_type_id: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          engagement_type_id: string
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          engagement_type_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_type_links_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_type_links_engagement_type_id_fkey"
            columns: ["engagement_type_id"]
            isOneToOne: false
            referencedRelation: "engagement_types"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_types: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      engagements: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          engagement_type_id: string | null
          id: string
          note: string | null
          occurred_at: string
          org_id: string
          outcome_id: string | null
          store_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          engagement_type_id?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          org_id?: string
          outcome_id?: string | null
          store_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          engagement_type_id?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          org_id?: string
          outcome_id?: string | null
          store_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagements_engagement_type_id_fkey"
            columns: ["engagement_type_id"]
            isOneToOne: false
            referencedRelation: "engagement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "engagement_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          dba_name: string | null
          deleted_at: string | null
          district: string | null
          id: string
          internal_reference_number: string | null
          legal_name: string | null
          name: string
          notes: string | null
          org_id: string
          organization_type: string | null
          preferred_communication_method:
            | Database["public"]["Enums"]["entity_comm_method"]
            | null
          primary_location: string | null
          status: string | null
          territory: string | null
          type: Database["public"]["Enums"]["entity_type"]
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string
          dba_name?: string | null
          deleted_at?: string | null
          district?: string | null
          id?: string
          internal_reference_number?: string | null
          legal_name?: string | null
          name: string
          notes?: string | null
          org_id?: string
          organization_type?: string | null
          preferred_communication_method?:
            | Database["public"]["Enums"]["entity_comm_method"]
            | null
          primary_location?: string | null
          status?: string | null
          territory?: string | null
          type: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          dba_name?: string | null
          deleted_at?: string | null
          district?: string | null
          id?: string
          internal_reference_number?: string | null
          legal_name?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          organization_type?: string | null
          preferred_communication_method?:
            | Database["public"]["Enums"]["entity_comm_method"]
            | null
          primary_location?: string | null
          status?: string | null
          territory?: string | null
          type?: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["follow_up_category"] | null
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          due_date: string
          engagement_id: string | null
          entity_id: string | null
          id: string
          interaction_id: string | null
          org_id: string
          reminder_date: string | null
          status: Database["public"]["Enums"]["follow_up_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["follow_up_category"] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          due_date: string
          engagement_id?: string | null
          entity_id?: string | null
          id?: string
          interaction_id?: string | null
          org_id?: string
          reminder_date?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["follow_up_category"] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          due_date?: string
          engagement_id?: string | null
          entity_id?: string | null
          id?: string
          interaction_id?: string | null
          org_id?: string
          reminder_date?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          entity_id: string
          id: string
          occurred_at: string
          org_id: string
          source: string
          type: Database["public"]["Enums"]["interaction_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          entity_id: string
          id?: string
          occurred_at?: string
          org_id?: string
          source?: string
          type: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          occurred_at?: string
          org_id?: string
          source?: string
          type?: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_site_checklist_items: {
        Row: {
          active: boolean
          created_at: string
          group: string
          id: string
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group: string
          id?: string
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group?: string
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_site_checklist_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_site_opportunity_items: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_site_opportunity_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_site_visit_checks: {
        Row: {
          checked: boolean
          checklist_item_id: string
          created_at: string
          id: string
          job_site_visit_id: string
          org_id: string
        }
        Insert: {
          checked?: boolean
          checklist_item_id: string
          created_at?: string
          id?: string
          job_site_visit_id: string
          org_id: string
        }
        Update: {
          checked?: boolean
          checklist_item_id?: string
          created_at?: string
          id?: string
          job_site_visit_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_site_visit_checks_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "job_site_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visit_checks_job_site_visit_id_fkey"
            columns: ["job_site_visit_id"]
            isOneToOne: false
            referencedRelation: "job_site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visit_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_site_visit_opportunities: {
        Row: {
          created_at: string
          id: string
          job_site_visit_id: string
          note: string | null
          opportunity_item_id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_site_visit_id: string
          note?: string | null
          opportunity_item_id: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_site_visit_id?: string
          note?: string | null
          opportunity_item_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_site_visit_opportunities_job_site_visit_id_fkey"
            columns: ["job_site_visit_id"]
            isOneToOne: false
            referencedRelation: "job_site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visit_opportunities_opportunity_item_id_fkey"
            columns: ["opportunity_item_id"]
            isOneToOne: false
            referencedRelation: "job_site_opportunity_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visit_opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_site_visit_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_site_visit_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_site_visits: {
        Row: {
          created_at: string
          created_by: string | null
          customer_first_initial: string | null
          customer_last_name: string | null
          deleted_at: string | null
          engagement_id: string
          id: string
          order_number: string | null
          org_id: string
          po_number: string | null
          program_id: string | null
          service_provider_id: string | null
          updated_at: string
          visit_notes: string | null
          visit_type_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_first_initial?: string | null
          customer_last_name?: string | null
          deleted_at?: string | null
          engagement_id: string
          id?: string
          order_number?: string | null
          org_id: string
          po_number?: string | null
          program_id?: string | null
          service_provider_id?: string | null
          updated_at?: string
          visit_notes?: string | null
          visit_type_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_first_initial?: string | null
          customer_last_name?: string | null
          deleted_at?: string | null
          engagement_id?: string
          id?: string
          order_number?: string | null
          org_id?: string
          po_number?: string | null
          program_id?: string | null
          service_provider_id?: string | null
          updated_at?: string
          visit_notes?: string | null
          visit_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_site_visits_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visits_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visits_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_site_visits_visit_type_id_fkey"
            columns: ["visit_type_id"]
            isOneToOne: false
            referencedRelation: "job_site_visit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          region_id: string
          status: Database["public"]["Enums"]["location_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string
          region_id: string
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          region_id?: string
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "markets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markets_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      org_district_coverage: {
        Row: {
          created_at: string
          created_by: string | null
          district_id: string
          entity_id: string
          id: string
          org_id: string
          scope: Database["public"]["Enums"]["coverage_scope"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          district_id: string
          entity_id: string
          id?: string
          org_id?: string
          scope?: Database["public"]["Enums"]["coverage_scope"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          district_id?: string
          entity_id?: string
          id?: string
          org_id?: string
          scope?: Database["public"]["Enums"]["coverage_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_district_coverage_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_district_coverage_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_district_coverage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_store_coverage: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          id: string
          org_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          id?: string
          org_id?: string
          store_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          id?: string
          org_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_store_coverage_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_store_coverage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_store_coverage_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_types: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          org_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      program_merchants: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_date: string | null
          id: string
          is_current: boolean
          notes: string | null
          org_id: string
          program_id: string
          role: string
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          org_id?: string
          program_id: string
          role: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          org_id?: string
          program_id?: string
          role?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_merchants_contact_fk"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_merchants_merchant_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_merchants_program_fk"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_merchants_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          parent_program_id: string | null
          sort_order: number
          status: string
          sub_category: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string
          parent_program_id?: string | null
          sort_order?: number
          status?: string
          sub_category?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          parent_program_id?: string | null
          sort_order?: number
          status?: string
          sub_category?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_parent_program_id_fkey"
            columns: ["parent_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["location_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["location_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_engagements: {
        Row: {
          created_at: string
          created_by: string | null
          customer_resolution_id: string
          engagement_id: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_resolution_id: string
          engagement_id: string
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_resolution_id?: string
          engagement_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_engagements_customer_resolution_id_fkey"
            columns: ["customer_resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_engagements_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_engagements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_priorities: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          severity_color: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id: string
          severity_color?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          severity_color?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_priorities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          customer_resolution_id: string
          from_status_id: string | null
          id: string
          org_id: string
          to_status_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          customer_resolution_id: string
          from_status_id?: string | null
          id?: string
          org_id: string
          to_status_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          customer_resolution_id?: string
          from_status_id?: string | null
          id?: string
          org_id?: string
          to_status_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_status_history_customer_resolution_id_fkey"
            columns: ["customer_resolution_id"]
            isOneToOne: false
            referencedRelation: "customer_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_status_history_from_status_id_fkey"
            columns: ["from_status_id"]
            isOneToOne: false
            referencedRelation: "resolution_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_status_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_status_history_to_status_id_fkey"
            columns: ["to_status_id"]
            isOneToOne: false
            referencedRelation: "resolution_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_statuses: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_closed: boolean
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_closed?: boolean
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_closed?: boolean
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_statuses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          district_id: string
          id: string
          main_phone: string | null
          name: string | null
          notes: string | null
          org_id: string
          state: string | null
          status: Database["public"]["Enums"]["location_status"]
          store_number: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district_id: string
          id?: string
          main_phone?: string | null
          name?: string | null
          notes?: string | null
          org_id?: string
          state?: string | null
          status?: Database["public"]["Enums"]["location_status"]
          store_number: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district_id?: string
          id?: string
          main_phone?: string | null
          name?: string | null
          notes?: string | null
          org_id?: string
          state?: string | null
          status?: Database["public"]["Enums"]["location_status"]
          store_number?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      contact_comm_method:
        | "Email"
        | "Office Phone"
        | "Mobile Phone"
        | "Teams"
        | "LinkedIn"
        | "In Person"
        | "Other"
      contact_relationship_strength: "Weak" | "Moderate" | "Strong" | "Critical"
      coverage_scope: "whole" | "selected"
      cr_escalation_level: "Store" | "District" | "Regional" | "Corporate"
      cr_event_type:
        | "resolution_updated"
        | "task_created"
        | "task_completed"
        | "status_changed"
        | "note_added"
        | "interaction_linked"
        | "followup_linked"
      cr_priority: "Low" | "Normal" | "High" | "Urgent"
      cr_relationship_role: "Service Provider" | "Store" | "Other"
      cr_resolution_type:
        | "Installation"
        | "Delivery"
        | "Product"
        | "Billing"
        | "Service"
        | "Other"
      cr_severity:
        | "Customer Experience"
        | "Safety"
        | "Financial"
        | "Installation"
        | "Product"
        | "Communication"
        | "Other"
      cr_status: "New" | "In Progress" | "Waiting" | "Resolved" | "Closed"
      cr_task_owner_type:
        | "Me"
        | "Service Provider"
        | "Store"
        | "Associate"
        | "Leader"
        | "Other"
      cr_task_status: "Open" | "Waiting" | "Complete"
      entity_comm_method: "Email" | "Phone" | "Text" | "In Person" | "Other"
      entity_type: "store" | "provider" | "merchant" | "program" | "internal"
      follow_up_category:
        | "Relationship"
        | "Issue Resolution"
        | "Customer Request"
        | "Feedback"
        | "Other"
      follow_up_status: "open" | "done"
      interaction_type: "meeting" | "call" | "visit" | "note"
      location_status: "Active" | "Inactive"
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
      app_role: ["admin", "moderator", "user"],
      contact_comm_method: [
        "Email",
        "Office Phone",
        "Mobile Phone",
        "Teams",
        "LinkedIn",
        "In Person",
        "Other",
      ],
      contact_relationship_strength: ["Weak", "Moderate", "Strong", "Critical"],
      coverage_scope: ["whole", "selected"],
      cr_escalation_level: ["Store", "District", "Regional", "Corporate"],
      cr_event_type: [
        "resolution_updated",
        "task_created",
        "task_completed",
        "status_changed",
        "note_added",
        "interaction_linked",
        "followup_linked",
      ],
      cr_priority: ["Low", "Normal", "High", "Urgent"],
      cr_relationship_role: ["Service Provider", "Store", "Other"],
      cr_resolution_type: [
        "Installation",
        "Delivery",
        "Product",
        "Billing",
        "Service",
        "Other",
      ],
      cr_severity: [
        "Customer Experience",
        "Safety",
        "Financial",
        "Installation",
        "Product",
        "Communication",
        "Other",
      ],
      cr_status: ["New", "In Progress", "Waiting", "Resolved", "Closed"],
      cr_task_owner_type: [
        "Me",
        "Service Provider",
        "Store",
        "Associate",
        "Leader",
        "Other",
      ],
      cr_task_status: ["Open", "Waiting", "Complete"],
      entity_comm_method: ["Email", "Phone", "Text", "In Person", "Other"],
      entity_type: ["store", "provider", "merchant", "program", "internal"],
      follow_up_category: [
        "Relationship",
        "Issue Resolution",
        "Customer Request",
        "Feedback",
        "Other",
      ],
      follow_up_status: ["open", "done"],
      interaction_type: ["meeting", "call", "visit", "note"],
      location_status: ["Active", "Inactive"],
    },
  },
} as const
