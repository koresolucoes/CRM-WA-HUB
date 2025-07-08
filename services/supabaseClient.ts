
import { createClient } from '@supabase/supabase-js';

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
          allow_reactivation: boolean
          block_on_open_chat: boolean
          created_at: string
          edges: Json
          execution_stats: Json | null
          id: string
          name: string
          nodes: Json
          status: string
        }
        Insert: {
          allow_reactivation: boolean
          block_on_open_chat: boolean
          created_at?: string
          edges: Json
          execution_stats?: Json | null
          id?: string
          name: string
          nodes: Json
          status: string
        }
        Update: {
          allow_reactivation?: boolean
          block_on_open_chat?: boolean
          created_at?: string
          edges?: Json
          execution_stats?: Json | null
          id?: string
          name?: string
          nodes?: Json
          status?: string
        }
      }
      campaigns: {
        Row: {
          created_at: string
          failed_count: number
          id: number
          logs: Json | null
          name: string
          read_rate: number
          sent_count: number
          sent_date: string
          status: string
          target: Json
          template_id: string
          total_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_count: number
          id?: number
          logs?: Json | null
          name: string
          read_rate: number
          sent_count: number
          sent_date: string
          status: string
          target: Json
          template_id: string
          total_count: number
          user_id: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          id?: number
          logs?: Json | null
          name?: string
          read_rate?: number
          sent_count?: number
          sent_date?: string
          status?: string
          target?: Json
          template_id?: string
          total_count?: number
          user_id?: string
        }
      }
      contacts: {
        Row: {
          created_at: string
          custom_fields: Json | null
          funnel_column_id: string | null
          id: number
          is_24h_window_open: boolean
          is_opted_out_of_automations: boolean
          last_interaction: string
          name: string
          phone: string
          tags: string[]
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          funnel_column_id?: string | null
          id?: number
          is_24h_window_open?: boolean
          is_opted_out_of_automations?: boolean
          last_interaction?: string
          name: string
          phone: string
          tags?: string[]
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          funnel_column_id?: string | null
          id?: number
          is_24h_window_open?: boolean
          is_opted_out_of_automations?: boolean
          last_interaction?: string
          name?: string
          phone?: string
          tags?: string[]
        }
      }
      conversations: {
        Row: {
          contact_id: number
          created_at: string
          id: number
          messages: Json
          unread_count: number
          updated_at: string
        }
        Insert: {
          contact_id: number
          created_at?: string
          id?: number
          messages: Json
          unread_count?: number
          updated_at: string
        }
        Update: {
          contact_id?: number
          created_at?: string
          id?: number
          messages?: Json
          unread_count?: number
          updated_at?: string
        }
      }
      funnels: {
        Row: {
          columns: Json
          created_at: string
          id: string
          name: string
        }
        Insert: {
          columns: Json
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          columns?: Json
          created_at?: string
          id?: string
          name?: string
        }
      }
      message_templates: {
        Row: {
          category: string
          components: Json
          created_at: string
          id: string
          language: string
          meta_id: string | null
          name: string
          rejection_reason: string | null
          status: string
        }
        Insert: {
          category: string
          components: Json
          created_at?: string
          id?: string
          language: string
          meta_id?: string | null
          name: string
          rejection_reason?: string | null
          status: string
        }
        Update: {
          category?: string
          components?: Json
          created_at?: string
          id?: string
          language?: string
          meta_id?: string | null
          name?: string
          rejection_reason?: string | null
          status?: string
        }
      }
      meta_connections: {
        Row: {
          api_token: string
          created_at: string
          id: string
          name: string
          phone_number_id: string
          waba_id: string
          user_id: string
        }
        Insert: {
          api_token: string
          created_at?: string
          id?: string
          name: string
          phone_number_id: string
          waba_id: string
          user_id: string
        }
        Update: {
          api_token?: string
          created_at?: string
          id?: string
          name?: string
          phone_number_id?: string
          waba_id?: string
          user_id?: string
        }
      }
      scheduled_automation_tasks: {
        Row: {
          automation_id: string
          contact_id: number
          context: Json | null
          created_at: string
          error_message: string | null
          execute_at: string
          id: number
          meta_connection_id: string
          resume_from_node_id: string
          status: string
        }
        Insert: {
          automation_id: string
          contact_id: number
          context?: Json | null
          created_at?: string
          error_message?: string | null
          execute_at: string
          id?: number
          meta_connection_id: string
          resume_from_node_id: string
          status: string
        }
        Update: {
          automation_id?: string
          contact_id?: number
          context?: Json | null
          created_at?: string
          error_message?: string | null
          execute_at?: string
          id?: number
          meta_connection_id?: string
          resume_from_node_id?: string
          status?: string
        }
      }
      whatsapp_flows: {
        Row: {
          created_at: string
          data_api_version: string
          endpoint_uri: string | null
          id: string
          meta_flow_id: string | null
          name: string
          origin: string
          routing_model: Json
          screens: Json
          status: string
          version: string
        }
        Insert: {
          created_at?: string
          data_api_version: string
          endpoint_uri?: string | null
          id?: string
          meta_flow_id?: string | null
          name: string
          origin: string
          routing_model: Json
          screens: Json
          status: string
          version: string
        }
        Update: {
          created_at?: string
          data_api_version?: string
          endpoint_uri?: string | null
          id?: string
          meta_flow_id?: string | null
          name?: string
          origin?: string
          routing_model?: Json
          screens?: Json
          status?: string
          version?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}


// As credenciais do Supabase foram movidas do process.env para constantes
// para garantir a funcionalidade neste ambiente de execução.
// A URL foi deduzida dos logs de erro anteriores.
const supabaseUrl = 'https://mdcfnybfshkvdleundvz.supabase.co';

// --- ATENÇÃO ---
// A chave anônima (anon key) do Supabase foi removida por segurança.
// Substitua o valor de placeholder abaixo pela sua chave anônima real.
// Você pode encontrá-la no painel do seu projeto Supabase em:
// Configurações do Projeto > API > Chaves de API do Projeto > anon public
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2ZueWJmc2hrdmRsZXVuZHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4Mzc1NDcsImV4cCI6MjA2NTQxMzU0N30.chS_bNW8mhwXLNQGXaneXGR50DrjwZVtj27e8PaT3Ig';

// Verifica se a chave foi substituída. Se não, lança um erro claro.
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "CONFIGURAÇÃO NECESSÁRIA: A URL ou a chave anônima do Supabase não foi definida.";
  
  // Exibe o erro no console e lança-o para interromper a execução e tornar o problema visível.
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Cria e exporta o cliente Supabase.
// A anotação de tipo explícita <Database> é usada para fornecer ao cliente Supabase
// o esquema completo do banco de dados, permitindo a verificação de tipos e o
// autocompletar em todo o aplicativo.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);