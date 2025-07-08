import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// --- INSTRUÇÕES PARA DEPLOY NO VERCEL ---
// 1. Vá para o painel do seu projeto no Vercel.
// 2. Vá para "Settings" -> "Environment Variables".
// 3. Adicione as duas variáveis de ambiente a seguir.
//    IMPORTANTE: Estas variáveis DEVEM estar disponíveis durante o processo de build do Vercel
//    para que possam ser incluídas no código do frontend.

//    - Nome da Variável: SUPABASE_URL
//      Valor: A URL do seu projeto Supabase (ex: https://seuid.supabase.co)
//      Encontre em: Painel do Supabase > Configurações do Projeto > API > URL

//    - Nome da Variável: SUPABASE_ANON_KEY
//      Valor: A chave anônima (anon public) do seu projeto.
//      Encontre em: Painel do Supabase > Configurações do Projeto > API > Chaves de API do Projeto

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Esta verificação acontece durante o build do Vercel. Se você vir este erro no seu deploy,
// significa que as variáveis acima não foram configuradas corretamente no painel do Vercel.
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "CONFIGURAÇÃO NECESSÁRIA: A URL (SUPABASE_URL) ou a chave anônima (SUPABASE_ANON_KEY) do Supabase não foi definida nas variáveis de ambiente. Siga as instruções neste arquivo para configurar seu deploy no Vercel.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Cria e exporta o cliente Supabase.
// A anotação de tipo explícita <Database> é usada para fornecer ao cliente Supabase
// o esquema completo do banco de dados, permitindo a verificação de tipos e o
// autocompletar em todo o aplicativo.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
