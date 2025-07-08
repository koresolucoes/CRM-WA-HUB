

import type { Campaign, CampaignLog, CampaignStatus, CampaignTarget } from '../types';
import { supabase } from './supabaseClient';
import type { Json, Database } from './database.types';

function mapCampaignToDb(campaign: Partial<Campaign & { user_id?: string }>): Database['public']['Tables']['campaigns']['Update'] {
    return {
        user_id: campaign.user_id,
        name: campaign.name,
        status: campaign.status,
        sent_count: campaign.sentCount,
        failed_count: campaign.failedCount,
        total_count: campaign.totalCount,
        read_rate: campaign.readRate,
        sent_date: campaign.sentDate,
        template_id: campaign.templateId,
        target: campaign.target as unknown as Json,
        logs: campaign.logs as unknown as Json,
    };
}

function mapCampaignFromDb(dbCampaign: Database['public']['Tables']['campaigns']['Row']): Campaign {
    return {
        id: dbCampaign.id,
        user_id: dbCampaign.user_id,
        name: dbCampaign.name,
        status: dbCampaign.status as CampaignStatus,
        sentCount: dbCampaign.sent_count,
        failedCount: dbCampaign.failed_count,
        totalCount: dbCampaign.total_count,
        readRate: dbCampaign.read_rate,
        sentDate: dbCampaign.sent_date,
        templateId: dbCampaign.template_id,
        target: dbCampaign.target as CampaignTarget,
        logs: (dbCampaign.logs as any as CampaignLog[] | null) || [],
    };
}


export async function getCampaigns(): Promise<Campaign[]> {
    // RLS will automatically filter by user_id
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching campaigns:", error);
        throw new Error(error.message);
    }
    return (data || []).map(mapCampaignFromDb);
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
    // RLS will automatically filter by user_id
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      console.error(`Error fetching campaign ${id}:`, error);
      throw new Error(error.message);
    }
    return data ? mapCampaignFromDb(data) : undefined;
}

export async function addCampaign(campaign: Omit<Campaign, 'id' | 'user_id'>): Promise<Campaign> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const dbObject: Database['public']['Tables']['campaigns']['Insert'] = {
        user_id: user.id,
        name: campaign.name,
        status: campaign.status,
        sent_date: campaign.sentDate,
        template_id: campaign.templateId,
        target: campaign.target as Json,
        sent_count: campaign.sentCount,
        failed_count: campaign.failedCount,
        total_count: campaign.totalCount,
        read_rate: campaign.readRate,
        logs: campaign.logs as Json,
    };

    const { data, error } = await supabase.from('campaigns').insert([dbObject]).select().single();
    if (error) {
        console.error("Error adding campaign:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    return mapCampaignFromDb(data);
}

export async function updateCampaign(updatedCampaign: Campaign): Promise<void> {
    const { id, ...campaignData } = updatedCampaign;
    // RLS will ensure user can only update their own campaigns.
    const { error } = await supabase.from('campaigns').update(mapCampaignToDb(campaignData)).eq('id', id);
    if (error) {
        console.error("Error updating campaign:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function deleteCampaign(campaignId: number): Promise<void> {
    // RLS will ensure user can only delete their own campaigns.
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
    if (error) {
        console.error("Error deleting campaign:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function addCampaignLog(campaignId: number, log: Omit<CampaignLog, 'timestamp'>): Promise<void> {
    const campaign = await getCampaignById(campaignId);
    if (campaign) {
        const newLog: CampaignLog = {
            timestamp: new Date().toISOString(),
            ...log
        };
        const updatedLogs = [newLog, ...(campaign.logs || [])];
        
        // RLS protects this update.
        const { error } = await supabase
            .from('campaigns')
            .update({ logs: updatedLogs as unknown as Json })
            .eq('id', campaignId);

        if (error) {
            console.error("Error adding campaign log:", error);
            throw new Error(error.message);
        }
    }
}