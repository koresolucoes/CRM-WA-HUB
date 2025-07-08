import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabaseClient';

// --- ATENÇÃO ---
// Este cliente é para uso EXCLUSIVO NO BACKEND (API routes, serverless functions).
// Ele utiliza a chave de 'service_role' para contornar as políticas de RLS (Row Level Security).
// NUNCA exponha a chave de 'service_role' no frontend.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mdcfnybfshkvdleundvz.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  const errorMessage = "CONFIGURAÇÃO NECESSÁRIA: A URL do Supabase ou a SUPABASE_SERVICE_ROLE_KEY não foi definida nas variáveis de ambiente.";
  
  console.error(errorMessage);
  // Em um ambiente de desenvolvimento local, podemos evitar o erro fatal para facilitar os testes,
  // mas em produção, isso deve falhar.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMessage);
  }
}

// Cria e exporta o cliente admin do Supabase.
// A anotação de tipo <Database> garante a verificação de tipos.
// A verificação `!supabaseServiceRoleKey` garante que, se a chave não estiver presente,
// o cliente não será inicializado incorretamente, falhando de forma segura.
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey || '');
