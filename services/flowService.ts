
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import type { WhatsAppFlow, FlowScreen, FlowComponent } from '../types';
import { FlowStatus } from '../types';
import { 
    getActiveConnection,
    getWhatsAppFlows as getFlowsFromMeta, 
    getFlowJsonContent,
    createFlowOnMeta,
    updateFlowAsset,
    publishExistingFlow,
    deleteFlowFromMeta,
    deprecateFlowFromMeta,
    updateFlowMetadataOnMeta,
    getFlowPreviewUrl
} from './metaService';

const mapFlowFromDb = (dbFlow: any): WhatsAppFlow => ({
    id: dbFlow.id,
    metaFlowId: dbFlow.meta_flow_id,
    name: dbFlow.name,
    endpointUri: dbFlow.endpoint_uri,
    status: dbFlow.status,
    origin: dbFlow.origin,
    version: dbFlow.version,
    data_api_version: dbFlow.data_api_version,
    routing_model: dbFlow.routing_model || {},
    screens: dbFlow.screens || [],
});

const mapFlowToDb = (appFlow: Partial<WhatsAppFlow & { user_id?: string }>) => ({
    user_id: appFlow.user_id,
    meta_flow_id: appFlow.metaFlowId,
    name: appFlow.name,
    endpoint_uri: appFlow.endpointUri,
    status: appFlow.status,
    origin: appFlow.origin,
    version: appFlow.version,
    data_api_version: appFlow.data_api_version,
    routing_model: appFlow.routing_model || {},
    screens: appFlow.screens || [],
});

export async function getFlows(): Promise<WhatsAppFlow[]> {
    // RLS filters by user_id
    const { data, error } = await supabase.from('whatsapp_flows').select('*').order('name');
    if (error) {
        console.error("Error fetching flows:", error);
        throw error;
    }
    return data.map(mapFlowFromDb);
}

export async function getFlowById(id: string): Promise<WhatsAppFlow | null> {
    // RLS filters by user_id
    const { data, error } = await supabase.from('whatsapp_flows').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return mapFlowFromDb(data);
}

export async function addFlow(): Promise<WhatsAppFlow> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const newScreen: FlowScreen = {
        id: uuidv4(),
        screen_id: 'SCHEDULE_TEST_DRIVE',
        title: 'Agendar Test-Drive',
        layout: {
            type: 'SingleColumnLayout',
            children: [
                { id: uuidv4(), type: 'TextHeading', text: 'Agende seu Test-Drive Exclusivo 🚗', name: 'headline_test_drive' },
                { id: uuidv4(), type: 'TextBody', text: 'Experimente a emoção de dirigir nosso novo modelo. Selecione uma data e horário convenientes para você.', name: 'body_text_intro' },
                { id: uuidv4(), type: 'TextInput', label: 'Nome Completo', name: 'customer_full_name', required: true },
                { id: uuidv4(), type: 'TextInput', label: 'Email para Contato', 'input-type': 'email', name: 'customer_email', required: true },
                { id: uuidv4(), type: 'DatePicker', label: 'Data Preferida para o Test-Drive', name: 'preferred_date', required: true },
                { id: uuidv4(), type: 'Footer', label: 'Confirmar Agendamento', 'on-click-action': { type: 'Complete' }, name: 'submit_schedule_button' }
            ]
        }
    };

    const newFlow: Omit<WhatsAppFlow, 'id'> & { user_id: string } = {
        user_id: user.id,
        name: 'Agendamento de Test-Drive',
        status: FlowStatus.DRAFT,
        origin: 'local',
        version: "7.1",
        data_api_version: "3.0",
        routing_model: {},
        screens: [newScreen],
    };

    const { data, error } = await supabase.from('whatsapp_flows').insert([mapFlowToDb(newFlow)]).select().single();
    if (error) throw error;
    
    window.dispatchEvent(new CustomEvent('localDataChanged'));
    return mapFlowFromDb(data);
}

export async function updateFlow(flow: WhatsAppFlow): Promise<WhatsAppFlow> {
    const { id, ...updateData } = flow;
    // RLS protects this update
    const { data, error } = await supabase
        .from('whatsapp_flows')
        .update(mapFlowToDb(updateData))
        .eq('id', id)
        .select()
        .single();
        
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('localDataChanged'));
    return mapFlowFromDb(data);
}

export async function deleteFlow(id: string): Promise<void> {
    const flowToDelete = await getFlowById(id);
    if (!flowToDelete) return;

    if (flowToDelete.metaFlowId && flowToDelete.status === FlowStatus.DRAFT) {
        const connection = await getActiveConnection();
        if (connection) {
            await deleteFlowFromMeta(connection, flowToDelete.metaFlowId).catch(err => {
                console.warn(`Could not delete flow from Meta (ID: ${flowToDelete.metaFlowId}), but deleting locally. Error:`, err.message);
            });
        }
    }
    // RLS protects this deletion
    const { error } = await supabase.from('whatsapp_flows').delete().eq('id', id);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('localDataChanged'));
}

export async function syncFlowsWithMeta(): Promise<void> {
    const connection = await getActiveConnection();
    if (!connection) {
        console.warn("Sync skipped: No active Meta connection.");
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [metaFlows, localFlows] = await Promise.all([
        getFlowsFromMeta(connection),
        getFlows()
    ]);
    
    const upsertPromises = metaFlows.map(metaFlow => {
        const existingLocal = localFlows.find(lf => lf.metaFlowId === metaFlow.metaFlowId);
        
        if (existingLocal) {
            const updateData = {
                name: metaFlow.name,
                status: metaFlow.status,
                version: metaFlow.version || existingLocal.version,
                data_api_version: metaFlow.data_api_version || existingLocal.data_api_version,
                endpoint_uri: metaFlow.endpointUri,
                origin: 'meta',
            };
            return supabase.from('whatsapp_flows').update(updateData).eq('id', existingLocal.id);
        } else {
            const newFlowData = {
                user_id: user.id,
                meta_flow_id: metaFlow.metaFlowId,
                name: metaFlow.name,
                status: metaFlow.status,
                version: metaFlow.version || "7.1",
                data_api_version: metaFlow.data_api_version || "3.0",
                endpoint_uri: metaFlow.endpointUri,
                origin: 'meta',
                routing_model: {},
                screens: [],
            };
            return supabase.from('whatsapp_flows').insert([newFlowData]);
        }
    });

    const results = await Promise.allSettled(upsertPromises);
    results.forEach(result => {
        if(result.status === 'rejected') {
            console.error("Failed to upsert a flow during sync:", result.reason);
        }
    });
}

export async function fetchAndStoreFlowContent(id: string): Promise<WhatsAppFlow> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow || !flow.metaFlowId) throw new Error("Conexão ou flow inválido para buscar conteúdo.");

    const jsonContent = await getFlowJsonContent(connection, flow.metaFlowId);
    
    const localScreens: FlowScreen[] = (jsonContent.screens || []).map((apiScreen: any) => {
        const layoutChildren: FlowComponent[] = (apiScreen.layout?.children || []).map((apiComp: any) => ({
            ...apiComp,
            id: uuidv4()
        }));

        return {
            id: uuidv4(),
            screen_id: apiScreen.id,
            title: apiScreen.id,
            terminal: apiScreen.terminal,
            success: apiScreen.success,
            refresh_on_back: apiScreen.refresh_on_back,
            data: apiScreen.data,
            sensitive: apiScreen.sensitive,
            layout: {
                type: 'SingleColumnLayout',
                children: layoutChildren
            }
        };
    });
    
    flow.screens = localScreens;
    flow.routing_model = jsonContent.routing_model || {};
    flow.version = jsonContent.version || flow.version;
    flow.data_api_version = jsonContent.data_api_version || flow.data_api_version;

    return updateFlow(flow);
}

export async function publishFlow(id: string): Promise<{success: boolean, errors?: any[]}> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Conexão ou flow inválido para publicação.");

    let finalFlow = flow;

    if (flow.metaFlowId) {
        await updateFlowAsset(connection, flow);
        await publishExistingFlow(connection, flow.metaFlowId);
        finalFlow.status = FlowStatus.PUBLISHED;
    } else {
        const result = await createFlowOnMeta(connection, flow, true);
        if (result.validation_errors) {
            return { success: false, errors: result.validation_errors };
        }
        finalFlow.metaFlowId = result.id;
        finalFlow.status = FlowStatus.PUBLISHED;
        finalFlow.origin = 'meta';
    }
    
    await updateFlow(finalFlow);
    return { success: true };
}

export async function saveDraftFlow(id: string): Promise<{success: boolean, errors?: any[]}> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Conexão ou flow inválido para salvar o rascunho.");

    let finalFlow = flow;

    if (flow.metaFlowId) {
        await updateFlowAsset(connection, flow);
        finalFlow.status = FlowStatus.DRAFT;
    } else {
        const result = await createFlowOnMeta(connection, flow, false);
        if (result.validation_errors) {
            return { success: false, errors: result.validation_errors };
        }
        finalFlow.metaFlowId = result.id;
        finalFlow.status = FlowStatus.DRAFT;
        finalFlow.origin = 'meta';
    }
    
    await updateFlow(finalFlow);
    return { success: true };
}


export async function generateFlowPreview(id: string): Promise<string> {
    const connection = await getActiveConnection();
    let flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Conexão ou flow inválido para gerar a pré-visualização.");

    if (!flow.metaFlowId) {
        const result = await createFlowOnMeta(connection, flow, false);
        flow.metaFlowId = result.id;
        flow.status = FlowStatus.DRAFT;
        flow.origin = 'meta';
        flow = await updateFlow(flow);
    } else {
        await updateFlowAsset(connection, flow);
    }
    
    const previewUrl = await getFlowPreviewUrl(connection, flow.metaFlowId);
    return previewUrl;
}

export async function deprecateFlow(id: string): Promise<void> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow || !flow.metaFlowId) throw new Error("Flow inválido ou não sincronizado para ser depreciado.");
    
    await deprecateFlowFromMeta(connection, flow.metaFlowId);
    flow.status = FlowStatus.DEPRECATED;
    await updateFlow(flow);
}

export async function updateFlowMetadata(id: string, metadata: { name?: string; endpoint_uri?: string; }): Promise<void> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Flow ou conexão inválidos.");

    Object.assign(flow, metadata);
    const updatedFlow = await updateFlow(flow);

    if (updatedFlow.metaFlowId) {
        await updateFlowMetadataOnMeta(connection, updatedFlow.metaFlowId, metadata);
    }
}
