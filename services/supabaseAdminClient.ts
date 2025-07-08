import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// --- INSTRUÇÕES PARA DEPLOY NO VERCEL ---
// Este cliente é para uso EXCLUSIVO NO BACKEND (API routes, cron jobs).
// Ele utiliza a chave de 'service_role' para contornar as políticas de RLS.
// NUNCA exponha a chave de 'service_role' no frontend.

// 1. Vá para o painel do seu projeto no Vercel.
// 2. Vá para "Settings" -> "Environment Variables".
// 3. Adicione as duas variáveis de ambiente a seguir (se ainda não existirem):

//    - Nome da Variável: SUPABASE_URL
//      Valor: A URL do seu projeto Supabase (ex: https://xxxxxxxx.supabase.co)

//    - Nome da Variável: SUPABASE_SERVICE_ROLE_KEY
//      Valor: A chave de serviço (service_role) do seu projeto.
//      Encontre em: Painel do Supabase > Configurações do Projeto > API > Chaves de API do Projeto (role: service_role)
//      AVISO: Mantenha esta chave em segredo.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  const errorMessage = "CONFIGURAÇÃO DE BACKEND NECESSÁRIA: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não foi definida nas variáveis de ambiente. Siga as instruções em 'services/supabaseAdminClient.ts'.";
  
  console.error(errorMessage);
  
  // Em um ambiente de produção, é crucial que isso falhe para evitar comportamento inesperado.
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error(errorMessage);
  }
}

// Cria e exporta o cliente admin do Supabase.
// A verificação `!supabaseServiceRoleKey` garante que, se a chave não estiver presente,
// o cliente não será inicializado incorretamente, falhando de forma segura.
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl!, supabaseServiceRoleKey)
  : null;

if (!supabaseAdmin) {
    console.warn("Atenção: O cliente admin do Supabase não foi inicializado. Funções de backend (webhooks, crons) não funcionarão sem as variáveis de ambiente corretas.");
}
