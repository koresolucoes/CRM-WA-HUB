

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// --- INSTRUÇÕES PARA DEPLOY NO VERCEL ---
// 1. Vá para o painel do seu projeto no Vercel.
// 2. Vá para "Settings" -> "Environment Variables".
// 3. Adicione as duas variáveis de ambiente a seguir:

//    - Nome da Variável: NEXT_PUBLIC_SUPABASE_URL
//      Valor: A URL do seu projeto Supabase (ex: https://xxxxxxxx.supabase.co)
//      Encontre em: Painel do Supabase > Configurações do Projeto > API > URL

//    - Nome da Variável: NEXT_PUBLIC_SUPABASE_ANON_KEY
//      Valor: A chave anônima (anon public) do seu projeto.
//      Encontre em: Painel do Supabase > Configurações do Projeto > API > Chaves de API do Projeto

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "CONFIGURAÇÃO NECESSÁRIA: A URL ou a chave anônima do Supabase não foi definida nas variáveis de ambiente. Siga as instruções no arquivo 'services/supabaseClient.ts' para configurar seu deploy no Vercel.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Cria e exporta o cliente Supabase.
// A anotação de tipo explícita <Database> é usada para fornecer ao cliente Supabase
// o esquema completo do banco de dados, permitindo a verificação de tipos e o
// autocompletar em todo o aplicativo.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
