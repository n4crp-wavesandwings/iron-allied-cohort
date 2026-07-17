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
          entity_id: string
          first_name: string | null
          id: string
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
          entity_id: string
          first_name?: string | null
          id?: string
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
          entity_id?: string
          first_name?: string | null
          id?: string
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
          completed_date: string | null
          created_at: string
          created_by: string
          customer_first_initial: string
          customer_last_name: string
          deleted_at: string | null
          desired_resolution: string | null
          escalation_level:
            | Database["public"]["Enums"]["cr_escalation_level"]
            | null
          id: string
          opened_date: string
          org_id: string
          priority: Database["public"]["Enums"]["cr_priority"]
          reference_number: string | null
          resolution_type:
            | Database["public"]["Enums"]["cr_resolution_type"]
            | null
          severity: Database["public"]["Enums"]["cr_severity"] | null
          status: Database["public"]["Enums"]["cr_status"]
          summary: string | null
          target_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          created_by?: string
          customer_first_initial: string
          customer_last_name: string
          deleted_at?: string | null
          desired_resolution?: string | null
          escalation_level?:
            | Database["public"]["Enums"]["cr_escalation_level"]
            | null
          id?: string
          opened_date?: string
          org_id?: string
          priority?: Database["public"]["Enums"]["cr_priority"]
          reference_number?: string | null
          resolution_type?:
            | Database["public"]["Enums"]["cr_resolution_type"]
            | null
          severity?: Database["public"]["Enums"]["cr_severity"] | null
          status?: Database["public"]["Enums"]["cr_status"]
          summary?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          created_by?: string
          customer_first_initial?: string
          customer_last_name?: string
          deleted_at?: string | null
          desired_resolution?: string | null
          escalation_level?:
            | Database["public"]["Enums"]["cr_escalation_level"]
            | null
          id?: string
          opened_date?: string
          org_id?: string
          priority?: Database["public"]["Enums"]["cr_priority"]
          reference_number?: string | null
          resolution_type?:
            | Database["public"]["Enums"]["cr_resolution_type"]
            | null
          severity?: Database["public"]["Enums"]["cr_severity"] | null
          status?: Database["public"]["Enums"]["cr_status"]
          summary?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_resolutions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          category: Database["public"]["Enums"]["follow_up_category"] | null
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          due_date: string
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
          category?: Database["public"]["Enums"]["follow_up_category"] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          due_date: string
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
          category?: Database["public"]["Enums"]["follow_up_category"] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          due_date?: string
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
    },
  },
} as const
