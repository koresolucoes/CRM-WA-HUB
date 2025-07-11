


import { v4 as uuidv4 } from 'uuid';
import type { MessageTemplate, TemplateComponent } from '../types';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

export async function getTemplates(): Promise<MessageTemplate[]> {
  // RLS will handle filtering by user_id
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('status', 'DRAFT');

  if (error) {
    console.error("Error fetching template drafts:", error);
    throw error;
  }
  return (data || []).map(t => ({
      ...t,
      components: t.components as any,
      metaId: t.meta_id,
      rejectionReason: t.rejection_reason
  }));
}

export async function getTemplateById(id: string): Promise<MessageTemplate | undefined> {
    // RLS will handle filtering by user_id
    const { data, error } = await supabase.from('message_templates').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        console.error("Error fetching template by ID:", error);
        throw error;
    }
    return data ? {
      ...data,
      components: data.components as any,
      metaId: data.meta_id,
      rejectionReason: data.rejection_reason,
    } : undefined;
}

export async function addTemplate(): Promise<MessageTemplate> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const newTemplateDataForDb: Database['public']['Tables']['message_templates']['Insert'] = {
    user_id: user.id,
    name: 'novo_modelo_sem_titulo',
    category: 'MARKETING',
    language: 'pt_BR',
    status: 'DRAFT',
    components: [
        { type: 'BODY', text: 'Corpo da sua mensagem aqui. Use {{1}} para variáveis.' }
    ] as any,
  };

  const { data, error } = await supabase.from('message_templates').insert([newTemplateDataForDb]).select().single();

  if (error) {
    console.error("Error adding template draft:", error);
    throw error;
  }
  
  window.dispatchEvent(new CustomEvent('localDataChanged'));
  return {
    ...(data as any),
    metaId: data.meta_id,
    rejectionReason: data.rejection_reason,
  };
}

export async function updateTemplate(updatedTemplate: MessageTemplate): Promise<void> {
  const { id, metaId, rejectionReason, ...updateData } = updatedTemplate;
  // RLS will protect this update
  const dbUpdateData: Database['public']['Tables']['message_templates']['Update'] = {
      ...updateData,
      meta_id: metaId,
      rejection_reason: rejectionReason,
      components: updatedTemplate.components as any,
  };

  const { error } = await supabase
    .from('message_templates')
    .update(dbUpdateData)
    .eq('id', id);
  
  if (error) {
    console.error("Error updating template draft:", error);
    throw error;
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  // RLS will protect this deletion
  const { error } = await supabase.from('message_templates').delete().eq('id', id);
  if (error) {
    console.error("Error deleting template draft:", error);
    throw error;
  }
  window.dispatchEvent(new CustomEvent('localDataChanged'));
}
