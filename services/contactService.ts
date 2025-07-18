


import { supabase } from './supabaseClient';
import type { Contact, SheetContact, CrmStage } from '../types';
import type { Database } from './database.types';

function mapContactFromDb(dbContact: any): Contact {
  const contact: Contact = {
    id: dbContact.id,
    user_id: dbContact.user_id,
    name: dbContact.name,
    phone: dbContact.phone,
    tags: dbContact.tags || [],
    lastInteraction: dbContact.last_interaction,
    is24hWindowOpen: dbContact.is_24h_window_open,
    isOptedOutOfAutomations: dbContact.is_opted_out_of_automations,
    crmStageId: dbContact.funnel_column_id,
  };

  if (dbContact.custom_fields && typeof dbContact.custom_fields === 'object') {
    Object.assign(contact, dbContact.custom_fields);
  }
  
  return contact;
}

function mapContactToDb(appContact: Partial<Contact & { user_id?: string }>): Database['public']['Tables']['contacts']['Update'] {
    const dbData: { [key: string]: any } = {};
    const customFields: { [key: string]: any } = {};

    const standardFields = new Set([
        'id', 'name', 'phone', 'tags', 
        'lastInteraction', 'is24hWindowOpen', 'isOptedOutOfAutomations', 'crmStageId', 'user_id'
    ]);

    for (const key in appContact) {
        if (key === 'id') continue;

        const value = (appContact as any)[key];

        if (standardFields.has(key)) {
            switch (key) {
                case 'crmStageId':
                    dbData.funnel_column_id = value;
                    break;
                case 'isOptedOutOfAutomations':
                    dbData.is_opted_out_of_automations = value;
                    break;
                case 'lastInteraction':
                    dbData.last_interaction = value;
                    break;
                case 'is24hWindowOpen':
                    dbData.is_24h_window_open = value;
                    break;
                default:
                    dbData[key] = value;
                    break;
            }
        } else {
            customFields[key] = value;
        }
    }

    if (Object.keys(customFields).length > 0) {
        dbData.custom_fields = customFields as any;
    }

    return dbData;
}

export function parseCsv(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        return [];
    }
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const headers = lines[0]
        .split(splitRegex)
        .map(h => h.trim().replace(/^"|"$/g, '').trim().toLowerCase())
        .filter(h => h);

    if (headers.length === 0) {
        return [];
    }
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(splitRegex).map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.every(v => v === '')) {
            continue;
        }
        const entry: Record<string, string> = {};
        headers.forEach((header, index) => {
            entry[header] = values[index] || '';
        });
        data.push(entry);
    }
    return data;
}

export async function getContacts(): Promise<Contact[]> {
  // RLS handles filtering by user_id
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching contacts:', error);
    throw new Error(error.message);
  }
  return (data || []).map(mapContactFromDb);
}

export async function getContactById(contactId: number): Promise<Contact | undefined> {
  // RLS handles filtering by user_id
  const { data, error } = await supabase.from('contacts').select('*').eq('id', contactId).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined;
    console.error(`Error fetching contact ${contactId}:`, error);
    throw new Error(error.message);
  }
  return data ? mapContactFromDb(data) : undefined;
}

export async function addContact(contact: Partial<Omit<Contact, 'id'>>): Promise<Contact> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    // RLS on funnels will ensure we get the user's own boards
    const { data: allBoards, error: boardError } = await supabase.from('funnels').select('id, columns').order('created_at', { ascending: true });
    if (boardError) console.error("Could not fetch boards for default stage");

    const firstBoard = allBoards?.[0];
    const columnsAsArray = firstBoard?.columns as unknown as ({ id: string }[] | undefined);
    const firstStageId = columnsAsArray?.[0]?.id;
    
    const standardKeys = new Set(['id', 'user_id', 'name', 'phone', 'tags', 'lastInteraction', 'is24hWindowOpen', 'isOptedOutOfAutomations', 'crmStageId']);
    const customFields: { [key: string]: any } = {};
    for(const key in contact) {
        if(!standardKeys.has(key)) {
            customFields[key] = (contact as any)[key];
        }
    }

    const dbObject: Database['public']['Tables']['contacts']['Insert'] = {
        user_id: user.id,
        name: contact.name!,
        phone: contact.phone!,
        tags: contact.tags || [],
        funnel_column_id: contact.crmStageId || firstStageId,
        custom_fields: Object.keys(customFields).length > 0 ? customFields as any : null,
    };

    const { data: newContactData, error } = await supabase.from('contacts').insert([dbObject]).select().single();

    if (error) {
        console.error('Error adding contact:', error);
        throw new Error(error.message);
    }
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    
    return mapContactFromDb(newContactData);
}

export async function updateContact(updatedContact: Partial<Contact> & { id: number }): Promise<void> {
    const { id, ...contactData } = updatedContact;
    const dbUpdateData = mapContactToDb(contactData);
    
    // RLS ensures user can only update their own contacts
    const { error } = await supabase.from('contacts').update(dbUpdateData).eq('id', id);
    if (error) {
        console.error('Error updating contact:', error);
        throw new Error(error.message);
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function deleteContact(contactId: number): Promise<void> {
    // RLS ensures user can only delete their own contacts
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) {
        console.error('Error deleting contact:', error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function addMultipleContacts(newContacts: SheetContact[], tagsToApply: string[] = []): Promise<Contact[]> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    // RLS filters this query automatically
    const { data: existingContactsData, error: fetchError } = await supabase.from('contacts').select('phone');
    if (fetchError) {
        console.error('Erro ao buscar contatos existentes:', fetchError);
        throw new Error(fetchError.message);
    }

    const existingPhones = new Set((existingContactsData || []).map(c => c.phone?.replace(/\D/g, '')));
    const phonesInThisBatch = new Set<string>();

    const contactsToCreate = newContacts.filter(c => {
        const normalizedPhone = c.phone?.replace(/\D/g, '');
        if (!normalizedPhone || existingPhones.has(normalizedPhone) || phonesInThisBatch.has(normalizedPhone)) {
            return false;
        }
        phonesInThisBatch.add(normalizedPhone);
        return true;
    });

    if (contactsToCreate.length === 0) {
        console.log("Nenhum contato novo e único para adicionar.");
        return [];
    }
    
    const { data: allBoards, error: boardError } = await supabase.from('funnels').select('id, columns').order('created_at', { ascending: true });
    if (boardError) console.error("Could not fetch boards for default stage");
    
    const firstBoard = allBoards?.[0];
    const columnsAsArray = firstBoard?.columns as unknown as ({ id: string }[] | undefined);
    const firstStageId = columnsAsArray?.[0]?.id;

    const formattedContacts: Database['public']['Tables']['contacts']['Insert'][] = contactsToCreate.map(c => {
        const custom_fields = Object.fromEntries(Object.entries(c).filter(([key]) => !['name', 'phone', 'tags'].includes(key)));
        const fileTags = (typeof c.tags === 'string' && c.tags) ? c.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        return {
            user_id: user.id,
            name: c.name,
            phone: c.phone,
            tags: [...new Set([...fileTags, ...tagsToApply])],
            funnel_column_id: firstStageId,
            custom_fields: Object.keys(custom_fields).length > 0 ? (custom_fields as any) : undefined,
        };
    });

    const { data: insertedData, error: insertError } = await supabase.from('contacts').insert(formattedContacts).select();
    if (insertError) {
        console.error('Erro ao inserir múltiplos contatos:', insertError);
        throw new Error(insertError.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    
    return (insertedData || []).map(mapContactFromDb);
}

export async function moveContactToCrmStage(contactId: number, destinationStage: Pick<CrmStage, 'id' | 'tagsToApply'>): Promise<void> {
    const contact = await getContactById(contactId);
    if (!contact) {
        console.error(`Contact ${contactId} not found for CRM move.`);
        return;
    }

    const updatePayload: Partial<Contact> = { crmStageId: destinationStage.id };
    const newTags = new Set(contact.tags || []);
    let tagsChanged = false;

    if (destinationStage.tagsToApply?.length) {
        destinationStage.tagsToApply.forEach(tag => {
            if (!newTags.has(tag)) {
                newTags.add(tag);
                tagsChanged = true;
            }
        });
    }

    if (tagsChanged) {
        updatePayload.tags = Array.from(newTags);
    }

    await updateContact({ id: contactId, ...updatePayload });
}

export async function getAllTags(): Promise<string[]> {
    const contacts = await getContacts();
    const allTags = new Set<string>();
    contacts.forEach(c => {
        (c.tags || []).forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
}

export async function setContactOptOutStatus(contactId: number, isOptedOut: boolean): Promise<void> {
    await updateContact({ id: contactId, isOptedOutOfAutomations: isOptedOut });
}
