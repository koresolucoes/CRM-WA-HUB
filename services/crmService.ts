


import { v4 as uuidv4 } from 'uuid';
import type { CrmBoard, CrmStage } from '../types';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

const DEFAULT_STAGES = [
    { title: 'Novo Lead' },
    { title: 'Contato Inicial' },
    { title: 'Proposta Enviada' },
    { title: 'Negociação' },
    { title: 'Vendido' },
];

export async function getBoards(): Promise<CrmBoard[]> {
    // RLS filters by user_id
    const { data, error } = await supabase.from('funnels').select('*').order('created_at', { ascending: true });
    if (error) {
        console.error("Error fetching funnels (as boards):", error);
        throw new Error(`Falha ao buscar boards (funnels): ${error.message}`);
    }
    return (data || []).map(f => ({
        id: f.id,
        name: f.name,
        columns: f.columns as any || []
    }));
}

export async function getBoardById(id: string): Promise<CrmBoard | null> {
    // RLS filters by user_id
    const { data, error } = await supabase.from('funnels').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Row not found
        console.error("Error fetching funnel by ID:", error);
        throw new Error(`Falha ao buscar board (funnel) por ID ${id}: ${error.message}`);
    }
    return data ? { id: data.id, name: data.name, columns: data.columns as any || [] } : null;
}

export async function createBoard(name: string): Promise<CrmBoard> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const newBoardData: Database['public']['Tables']['funnels']['Insert'] = {
        user_id: user.id,
        name: name || 'Novo Funil',
        columns: DEFAULT_STAGES.map(col => ({
            id: uuidv4(),
            title: col.title,
            tagsToApply: [],
        })) as any,
    };
    const { data, error } = await supabase.from('funnels').insert([newBoardData]).select().single();
    if (error) {
        console.error("Error creating funnel (as board):", error);
        throw new Error(`Falha ao criar board (funnel): ${error.message}`);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    return data as CrmBoard;
}

export async function createRawBoard(board: Omit<CrmBoard, 'id'> & { id?: string }): Promise<CrmBoard> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const boardWithUser: Database['public']['Tables']['funnels']['Insert'] = { ...board, user_id: user.id, columns: board.columns as any };
    const { data, error } = await supabase.from('funnels').insert([boardWithUser]).select().single();
    if (error) {
        console.error("Error creating raw funnel (as board):", error);
        throw new Error(`Falha ao criar board (funnel): ${error.message}`);
    }
    return data as CrmBoard;
}

export async function updateBoard(board: CrmBoard): Promise<void> {
    const { id, ...updateData } = board;
    // RLS protects this update
    const { error } = await supabase.from('funnels').update({ ...updateData, columns: updateData.columns as any }).eq('id', id);
    if (error) {
        console.error("Error updating funnel (as board):", error);
        throw new Error(`Falha ao atualizar board (funnel) ${id}: ${error.message}`);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function deleteBoard(boardId: string): Promise<void> {
    // RLS protects this deletion
    const { error } = await supabase.from('funnels').delete().eq('id', boardId);
    if (error) {
        console.error("Error deleting funnel (as board):", error);
        throw new Error(`Falha ao apagar board (funnel) ${boardId}: ${error.message}`);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function getAllStages(): Promise<Omit<CrmStage, 'cards'>[]> {
    const boards = await getBoards();
    return boards.flatMap(board => board.columns);
}
