
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      automations: {
        Row: {
          id: string
          user_id: string
          name: string
          status: string
          nodes: Json
          edges: Json
          created_at: string
          allow_reactivation: boolean
          block_on_open_chat: boolean
          execution_stats: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status: string
          nodes?: Json
          edges?: Json
          created_at?: string
          allow_reactivation?: boolean
          block_on_open_chat?: boolean
          execution_stats?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          status?: string
          nodes?: Json
          edges?: Json
          created_at?: string
          allow_reactivation?: boolean
          block_on_open_chat?: boolean
          execution_stats?: Json | null
        }
      }
      campaigns: {
        Row: {
          id: number
          user_id: string
          name: string
          status: string
          sent_count: number
          failed_count: number
          total_count: number
          read_rate: number
          sent_date: string
          template_id: string
          target: Json
          logs: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          status: string
          sent_count?: number
          failed_count?: number
          total_count?: number
          read_rate?: number
          sent_date: string
          template_id: string
          target: Json
          logs?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          status?: string
          sent_count?: number
          failed_count?: number
          total_count?: number
          read_rate?: number
          sent_date?: string
          template_id?: string
          target?: Json
          logs?: Json | null
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: number
          user_id: string
          name: string
          phone: string
          tags: string[] | null
          last_interaction: string | null
          is_24h_window_open: boolean
          is_opted_out_of_automations: boolean | null
          funnel_column_id: string | null
          custom_fields: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          phone: string
          tags?: string[] | null
          last_interaction?: string | null
          is_24h_window_open?: boolean
          is_opted_out_of_automations?: boolean | null
          funnel_column_id?: string | null
          custom_fields?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          phone?: string
          tags?: string[] | null
          last_interaction?: string | null
          is_24h_window_open?: boolean
          is_opted_out_of_automations?: boolean | null
          funnel_column_id?: string | null
          custom_fields?: Json | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: number
          user_id: string
          contact_id: number
          messages: Json
          unread_count: number
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          contact_id: number
          messages: Json
          unread_count?: number
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          contact_id?: number
          messages?: Json
          unread_count?: number
          updated_at?: string
          created_at?: string
        }
      }
      funnels: {
        Row: {
          id: string
          user_id: string
          name: string
          columns: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          columns: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          columns?: Json
          created_at?: string
        }
      }
      message_templates: {
        Row: {
          id: string
          user_id: string
          meta_id: string | null
          name: string
          category: string
          language: string
          status: string
          components: Json
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          meta_id?: string | null
          name: string
          category: string
          language: string
          status: string
          components: Json
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          meta_id?: string | null
          name?: string
          category?: string
          language?: string
          status?: string
          components?: Json
          rejection_reason?: string | null
          created_at?: string
        }
      }
      meta_connections: {
        Row: {
          id: string
          user_id: string
          name: string
          waba_id: string
          phone_number_id: string
          api_token: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          waba_id: string
          phone_number_id: string
          api_token: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          waba_id?: string
          phone_number_id?: string
          api_token?: string
          created_at?: string
        }
      }
      scheduled_automation_tasks: {
        Row: {
          id: number
          user_id: string
          contact_id: number
          automation_id: string
          meta_connection_id: string
          resume_from_node_id: string
          execute_at: string
          context: Json | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          contact_id: number
          automation_id: string
          meta_connection_id: string
          resume_from_node_id: string
          execute_at: string
          context?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          contact_id?: number
          automation_id?: string
          meta_connection_id?: string
          resume_from_node_id?: string
          execute_at?: string
          context?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
      }
      whatsapp_flows: {
        Row: {
          id: string
          user_id: string
          meta_flow_id: string | null
          name: string
          endpoint_uri: string | null
          status: string
          origin: string
          version: string
          data_api_version: string
          routing_model: Json
          screens: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          meta_flow_id?: string | null
          name: string
          endpoint_uri?: string | null
          status: string
          origin: string
          version: string
          data_api_version: string
          routing_model?: Json
          screens?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          meta_flow_id?: string | null
          name?: string
          endpoint_uri?: string | null
          status?: string
          origin?: string
          version?: string
          data_api_version?: string
          routing_model?: Json
          screens?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}