

import { v4 as uuidv4 } from 'uuid';
import { FlowStatus } from '../types';
import type { MessageTemplate, AnalyticsDataPoint, WhatsAppFlow, Button, ActionSendMessageData, MetaConnection } from '../types';
import { generateFlowJsonForApi } from './flowSerializer';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';


const ACTIVE_META_CONNECTION_ID_KEY_PREFIX = 'activeMetaConnectionId_';
const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * A robust fetch wrapper that includes a timeout.
 * @param resource The URL to fetch.
 * @param options The fetch options.
 * @param timeout The timeout in milliseconds.
 * @returns A promise that resolves to the fetch Response.
 */
async function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit = {}, timeout = 20000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });

    clearTimeout(id);
    return response;
}

/**
 * A centralized error handler for Meta API responses. It is more robust and
 * attempts to parse various error structures returned by the API.
 * @param errorData The 'error' object from the API response.
 * @param defaultMessage A fallback message.
 * @returns A user-friendly Error object.
 */
function handleMetaApiError(errorData: any, defaultMessage: string): Error {
  console.error('Raw Meta API Error:', JSON.stringify(errorData, null, 2));

  const error = errorData?.error || errorData;

  if (typeof error !== 'object' || error === null) {
      const message = typeof error === 'string' && error ? error : defaultMessage;
      return new Error(message);
  }

  const errorMessage = typeof error.message === 'string' ? error.message : defaultMessage;
  const code = String(error.code || '');
  
  // Specific error code/message mapping for user-friendly feedback
  if (code === '100' && error.error_subcode === 33) {
       return new Error('Requisição inválida: O corpo da mensagem não pode estar vazio se não houver botões.');
  }
  if (code === '100' && error.error_subcode === 2494008) {
        return new Error('Falha na criação: Um modelo com este nome e idioma já existe.');
  }
  if (errorMessage.includes('Invalid parameter')) {
     return new Error(`Parâmetro inválido na requisição: ${errorMessage}`);
  }
  if (code === '190' || errorMessage.includes('token')) {
    return new Error('Token de acesso inválido ou expirado. Por favor, gere um novo token na plataforma da Meta.');
  }
  if (code === '10' || code === '200' || errorMessage.includes('permission')) {
    return new Error('Permissão negada. Verifique se o seu token tem as permissões necessárias (ex: whatsapp_business_management).');
  }
  if (errorMessage.includes('Tried accessing nonexisting field (analytics)')) {
    return new Error('As métricas do dashboard não estão disponíveis para esta conta. Isso pode ser devido ao tipo de conta ou permissões.');
  }
  if (errorMessage.includes('An unknown error has occurred')) {
    return new Error('Ocorreu um erro desconhecido na Meta. Verifique se seu Token, WABA ID e permissões estão corretos.');
  }
  if (errorMessage.includes('Endpoint Not Available') || errorMessage.includes('health check before publishing')) {
    return new Error('Falha na verificação do endpoint pela Meta. Garanta que sua URL está pública, responde a requisições POST com status 200 OK e inclui o cabeçalho "X-Hub-Signature-256".');
  }
  if (error.error_subcode === 2383013) {
    return new Error(`O nome do Flow "${error.error_user_title}" já existe na sua conta Meta. Por favor, renomeie o flow antes de publicá-lo.`);
  }

  if (error.error_user_title && error.error_user_msg) {
    return new Error(`${error.error_user_title}: ${error.error_user_msg}`);
  }

  return new Error(errorMessage);
}


export async function getConnections(): Promise<MetaConnection[]> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return [];

  const { data, error } = await supabase.from('meta_connections').select('*').eq('user_id', user.id);
  
  if (error) {
    console.error("Error fetching connections from Supabase:", error);
    throw new Error(error.message);
  }
  return (data || []).map(c => ({
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    wabaId: c.waba_id,
    phoneNumberId: c.phone_number_id,
    apiToken: c.api_token,
  }));
}

export async function getConnectionById(id: string): Promise<MetaConnection | null> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return null;

    const { data, error } = await supabase.from('meta_connections').select('*').eq('id', id).eq('user_id', user.id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found is not an error here
        console.error(`Error fetching connection by ID ${id}:`, error);
        throw error;
    }
    return data ? {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        wabaId: data.waba_id,
        phoneNumberId: data.phone_number_id,
        apiToken: data.api_token
    } : null;
}

export async function saveConnection(connection: Omit<MetaConnection, 'id' | 'user_id'> | MetaConnection): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const connectionData: Database['public']['Tables']['meta_connections']['Insert'] = {
        user_id: user.id,
        name: connection.name,
        waba_id: connection.wabaId,
        phone_number_id: connection.phoneNumberId,
        api_token: connection.apiToken
    };
    
    if ('id' in connection && connection.id) {
        const { error } = await supabase.from('meta_connections').update(connectionData).eq('id', connection.id).eq('user_id', user.id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('meta_connections').insert([connectionData]);
        if (error) throw new Error(error.message);
    }
}

export async function deleteConnection(id: string): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    // The RLS policy will ensure a user can only delete their own connections.
    const { error } = await supabase.from('meta_connections').delete().eq('id', id);
    if (error) {
        console.error("Error deleting connection:", error);
        throw new Error(`Não foi possível apagar a conexão: ${error.message}`);
    }

    const activeId = await getActiveConnectionId();
    if (activeId === id) {
        await disconnectActiveConnection();
    }
}

export async function getActiveConnection(): Promise<MetaConnection | null> {
  const activeId = await getActiveConnectionId();
  if (!activeId) return null;
  // This will only fetch connections for the logged-in user due to RLS.
  const connections = await getConnections();
  return connections.find(c => c.id === activeId) || null;
}

export async function getActiveConnectionId(): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (user) {
          return localStorage.getItem(`${ACTIVE_META_CONNECTION_ID_KEY_PREFIX}${user.id}`);
        }
    }
    return null;
}

export async function setActiveConnectionId(id: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (user) {
          localStorage.setItem(`${ACTIVE_META_CONNECTION_ID_KEY_PREFIX}${user.id}`, id);
        }
    }
}

export async function disconnectActiveConnection(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (user) {
          localStorage.removeItem(`${ACTIVE_META_CONNECTION_ID_KEY_PREFIX}${user.id}`);
        }
    }
}

export async function testConnection(connection: MetaConnection): Promise<{ success: boolean; message: string }> {
    try {
        await getMessageTemplates(connection);
        return { success: true, message: `Conexão bem-sucedida para "${connection.name}"!` };
    } catch (error) {
        console.error("Erro ao testar conexão:", error);
        const errorMessage = error instanceof Error ? error.message : 'Falha na conexão. Verifique as credenciais e permissões.';
        return { success: false, message: errorMessage };
    }
}

// ... the rest of the file remains largely the same, as it depends on a `connection` object being passed in.
// No other function in this file needs direct knowledge of the user_id, as the higher-level logic will
// provide the correct connection object which was already filtered by user.

export async function getMessageTemplates(connection: MetaConnection): Promise<MessageTemplate[]> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");
    
    try {
        const url = `${BASE_URL}/${connection.wabaId}/message_templates?fields=name,status,category,language,components,id,rejected_reason&limit=100`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Authorization': `Bearer ${connection.apiToken}` }
        });
        const data = await response.json();

        if (!response.ok) {
            throw handleMetaApiError(data, 'Falha ao buscar modelos.');
        }

        if (!data.data) return [];

        return data.data.map((template: any): MessageTemplate => ({
            id: template.id,
            metaId: template.id,
            name: template.name,
            status: template.status,
            category: template.category,
            language: template.language,
            components: template.components || [],
            rejectionReason: template.rejected_reason
        })).filter((t: MessageTemplate) => t.status !== 'DELETED');
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error("A requisição para buscar modelos expirou (timeout).");
            }
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao buscar modelos.');
    }
}

function transformTemplateForApi(template: MessageTemplate): any {
    const apiComponents = template.components.map(component => {
        const apiComponent = JSON.parse(JSON.stringify(component));
        if (apiComponent.buttons) {
            apiComponent.buttons = apiComponent.buttons.map((button: Button & { id?: string }) => {
                delete button.id;
                return button;
            });
        }
        if (apiComponent.example && Object.keys(apiComponent.example).length === 0) {
            delete apiComponent.example;
        }
        return apiComponent;
    }).filter(c => {
        if (c.type === 'BUTTONS' && (!c.buttons || c.buttons.length === 0)) {
            return false;
        }
        return true;
    });

    return {
        name: template.name.toLowerCase().replace(/\s+/g, '_'),
        language: template.language,
        category: template.category,
        components: apiComponents,
    };
}

export async function createMessageTemplate(connection: MetaConnection, template: MessageTemplate): Promise<{ id: string }> {
  if (!connection) throw new Error("Nenhuma conexão ativa.");

  const apiPayload = transformTemplateForApi(template);

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/${connection.wabaId}/message_templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw handleMetaApiError(responseData, 'Falha ao criar o modelo de mensagem.');
    }
    
    if (!responseData.id) {
        throw new Error("API não retornou um ID para o modelo criado.");
    }

    return { id: responseData.id };
  } catch (error) {
    if (error instanceof Error) {
        if (error.name === 'AbortError') throw new Error("A requisição para criar o modelo expirou (timeout).");
        throw error;
    }
    throw new Error('Ocorreu um erro de rede ao criar o modelo.');
  }
}

interface SendMessagePayload {
    recipient: string;
    templateName: string;
    languageCode: string;
    components: any[];
}

export async function sendMessage(connection: MetaConnection, payload: SendMessagePayload): Promise<any> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");

    const body = {
        messaging_product: 'whatsapp',
        to: payload.recipient,
        type: 'template',
        template: {
            name: payload.templateName,
            language: {
                code: payload.languageCode
            },
            components: payload.components
        }
    };

    try {
        const response = await fetchWithTimeout(`${BASE_URL}/${connection.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const responseData = await response.json();

        if (!response.ok) {
            throw handleMetaApiError(responseData, 'Falha ao enviar mensagem.');
        }
        return responseData;

    } catch (error) {
        if (error instanceof Error) {
             if (error.name === 'AbortError') throw new Error("A requisição para enviar mensagem expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao enviar mensagem.');
    }
}

export async function sendTextMessage(connection: MetaConnection, recipient: string, text: string): Promise<any> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");

    const body = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: {
            preview_url: true, 
            body: text
        }
    };

    try {
        const response = await fetchWithTimeout(`${BASE_URL}/${connection.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const responseData = await response.json();

        if (!response.ok) {
            throw handleMetaApiError(responseData, 'Falha ao enviar mensagem de texto.');
        }
        return responseData;

    } catch (error) {
        if (error instanceof Error) {
             if (error.name === 'AbortError') throw new Error("A requisição para enviar mensagem de texto expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao enviar mensagem de texto.');
    }
}

export async function sendFlowMessage(connection: MetaConnection, recipient: string, flowData: ActionSendMessageData) {
    if (!connection) throw new Error("Nenhuma conexão ativa.");
    if (flowData.subType !== 'flow' || !flowData.flowId) throw new Error("Dados inválidos para envio de Flow.");

    const flowPayload = {
      name: "flow",
      parameters: {
        flow_message_version: "3",
        flow_token: uuidv4(),
        flow_id: flowData.flowId,
        flow_cta: "Abrir Flow",
        flow_action: "navigate",
      }
    };

    const body = {
        messaging_product: "whatsapp",
        to: recipient,
        type: "interactive",
        interactive: {
            type: "flow",
            header: {
                type: "text",
                text: "Título do Flow"
            },
            body: {
                text: "Clique para iniciar a experiência interativa."
            },
            footer: {
                text: "Desenvolvido por nossa plataforma"
            },
            action: flowPayload
        }
    };
    
    try {
        const response = await fetchWithTimeout(`${BASE_URL}/${connection.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const responseData = await response.json();
        if (!response.ok) {
            throw handleMetaApiError(responseData, 'Falha ao enviar mensagem de Flow.');
        }
        return responseData;

    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') throw new Error("A requisição para enviar mensagem de Flow expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao enviar mensagem de Flow.');
    }
}

export async function getAnalyticsData(connection: MetaConnection, startDate: Date, endDate: Date): Promise<AnalyticsDataPoint[]> {
  if (!connection) throw new Error("Nenhuma conexão ativa.");

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  const phoneNumbersParam = encodeURIComponent(JSON.stringify([connection.phoneNumberId]));
  const metricTypesParam = encodeURIComponent(JSON.stringify(['CONVERSATION']));
  
  const url = `${BASE_URL}/${connection.wabaId}/conversation_analytics?start=${startTimestamp}&end=${endTimestamp}&granularity=DAILY&phone_numbers=${phoneNumbersParam}&metric_types=${metricTypesParam}`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: { 'Authorization': `Bearer ${connection.apiToken}` }
    });
    const data = await response.json();

    if (!response.ok) {
      throw handleMetaApiError(data, 'Falha ao buscar dados de análise.');
    }
    
    const analyticsData = data.conversation_analytics?.data?.[0];

    if (analyticsData?.data_points) {
      return analyticsData.data_points.map((dp: any) => ({
        sent_count: dp.sent ?? 0,
        delivered_count: dp.delivered ?? 0,
        read_count: dp.read ?? 0,
        start: dp.start,
      }));
    }
    
    return [];
  } catch (error) {
    if (error instanceof Error) {
        if (error.name === 'AbortError') throw new Error("A requisição para buscar dados de análise expirou (timeout).");
        throw error;
    }
    throw new Error('Ocorreu um erro de rede ao buscar dados de análise.');
  }
}

export async function getFlowPreviewUrl(connection: MetaConnection, flowId: string): Promise<string> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");
    
    const url = `${BASE_URL}/${flowId}?fields=preview`;
    try {
        const response = await fetchWithTimeout(url, {
            headers: { 'Authorization': `Bearer ${connection.apiToken}` }
        });
        const data = await response.json();

        if (!response.ok) {
            throw handleMetaApiError(data, 'Falha ao buscar a URL de pré-visualização do Flow.');
        }

        const previewUrl = data?.preview?.preview_url;
        if (!previewUrl) {
            throw new Error('A resposta da API não continha uma URL de pré-visualização. Verifique se o flow foi salvo corretamente na Meta.');
        }
        
        return previewUrl;
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') throw new Error("A requisição para buscar a URL de pré-visualização expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao buscar a URL de pré-visualização.');
    }
}

export async function createFlowOnMeta(
    connection: MetaConnection, 
    flow: WhatsAppFlow,
    publish: boolean
): Promise<{ id: string, validation_errors?: any[] }> {
    const url = `${BASE_URL}/${connection.wabaId}/flows`;
    const body = {
        name: flow.name,
        categories: ['LEAD_GENERATION'], 
        flow_json: generateFlowJsonForApi(flow),
        publish,
        ...(flow.endpointUri && { endpoint_uri: flow.endpointUri }),
    };

    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();

        if (!response.ok) {
            if (data?.error?.error_data?.validation_errors) {
                return { id: '', validation_errors: data.error.error_data.validation_errors };
            }
            throw handleMetaApiError(data, 'Falha ao criar o Flow na Meta.');
        }
        if (!data.id) throw new Error("A API da Meta não retornou um ID para o Flow criado.");
        return data;
    } catch(error) {
        console.error("Erro ao criar Flow na Meta:", error);
        if (error instanceof Error) throw error;
        throw new Error("Um erro inesperado ocorreu ao criar o Flow na Meta.");
    }
}

export async function updateFlowAsset(connection: MetaConnection, flow: WhatsAppFlow): Promise<void> {
    if (!flow.metaFlowId) throw new Error("Cannot update asset for a flow without a metaFlowId.");

    const url = `${BASE_URL}/${flow.metaFlowId}/assets`;
    const flowJsonString = generateFlowJsonForApi(flow);
    const formData = new FormData();
    formData.append('name', 'flow.json');
    formData.append('asset_type', 'FLOW_JSON');
    const jsonBlob = new Blob([flowJsonString], { type: 'application/json' });
    formData.append('file', jsonBlob, 'flow.json');

    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${connection.apiToken}` },
            body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
            if (data?.error?.error_data?.validation_errors) {
                const errorMessages = data.error.error_data.validation_errors.map((err: any) => err.message).join('; ');
                throw new Error(`Erros de validação ao atualizar o Flow: ${errorMessages}`);
            }
            throw handleMetaApiError(data, 'Falha ao atualizar o conteúdo do Flow na Meta.');
        }
    } catch(error) {
        console.error("Erro ao atualizar o ativo do Flow:", error);
        if (error instanceof Error) throw error;
        throw new Error("Um erro inesperado ocorreu ao atualizar o ativo do Flow.");
    }
}

export async function publishExistingFlow(connection: MetaConnection, flowId: string): Promise<void> {
    const url = `${BASE_URL}/${flowId}/publish`;
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${connection.apiToken}` },
        });
        const data = await response.json();
        if (!response.ok) {
            throw handleMetaApiError(data, 'Falha ao publicar as alterações do Flow.');
        }
    } catch(error) {
        console.error(`Erro ao publicar o Flow ${flowId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error("Um erro inesperado ocorreu ao publicar o Flow.");
    }
}

function mapApiStatusToFlowStatus(apiStatus: string): FlowStatus {
    const statusMap: { [key: string]: FlowStatus } = {
        'PUBLISHED': FlowStatus.PUBLISHED,
        'DRAFT': FlowStatus.DRAFT,
        'DEPRECATED': FlowStatus.DEPRECATED,
        'BLOCKED': FlowStatus.BLOCKED,
        'THROTTLED': FlowStatus.THROTTLED,
    };
    return statusMap[apiStatus] || FlowStatus.DRAFT;
}

export async function getWhatsAppFlows(connection: MetaConnection): Promise<Partial<WhatsAppFlow>[]> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");
    
    const url = `${BASE_URL}/${connection.wabaId}/flows?fields=id,name,status,json_version,data_api_version,endpoint_uri&limit=100`;
    try {
        const response = await fetchWithTimeout(url, {
            headers: { 'Authorization': `Bearer ${connection.apiToken}` }
        });
        const data = await response.json();

        if (!response.ok) {
            throw handleMetaApiError(data, 'Falha ao buscar a lista de Flows da Meta.');
        }

        if (!data.data) return [];
        
        return data.data.map((flow: any) => ({
            metaFlowId: flow.id,
            name: flow.name,
            status: mapApiStatusToFlowStatus(flow.status),
            version: flow.json_version,
            endpointUri: flow.endpoint_uri,
            data_api_version: flow.data_api_version,
        }));
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') throw new Error("A requisição para buscar a lista de Flows expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao buscar flows.');
    }
}

export async function getFlowJsonContent(connection: MetaConnection, flowId: string): Promise<any> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");

    const assetsUrl = `${BASE_URL}/${flowId}/assets`;
    const assetsResponse = await fetchWithTimeout(assetsUrl, {
        headers: { 'Authorization': `Bearer ${connection.apiToken}` }
    });
    const assetsData = await assetsResponse.json();

    if (!assetsResponse.ok) {
        throw handleMetaApiError(assetsData, `Falha ao buscar os assets do Flow ${flowId}.`);
    }

    const flowJsonAsset = assetsData.data?.find((asset: any) => asset.asset_type === 'FLOW_JSON');

    if (!flowJsonAsset || !flowJsonAsset.download_url) {
        const defaultApiScreen = {
            id: 'WELCOME_SCREEN',
            layout: { type: 'SingleColumnLayout', children: [] }
        };
        return { 
            version: "7.1", 
            data_api_version: "3.0",
            routing_model: {},
            screens: [defaultApiScreen] 
        };
    }

    const downloadUrl = flowJsonAsset.download_url;
    
    const downloadProxyUrl = '/api/download-asset';
    
    try {
        const contentResponse = await fetchWithTimeout(downloadProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ downloadUrl }),
        });
        
        if (!contentResponse.ok) {
            const errorData = await contentResponse.json().catch(() => null);
            const errorMessage = errorData?.message || `Servidor proxy retornou um erro (status: ${contentResponse.status}) ao baixar o conteúdo do Flow.`;
            throw new Error(errorMessage);
        }
        
        const flowJson = await contentResponse.json();
        return flowJson;
    } catch (error) {
        console.error(`Falha na requisição para baixar conteúdo do Flow de ${downloadUrl}:`, error);
        if (error instanceof Error) {
            if (error.name === 'AbortError') throw new Error(`A requisição para baixar o conteúdo do Flow expirou (timeout).`);
            throw error;
        }
        throw new Error(`Falha ao buscar conteúdo do Flow. Verifique a conexão com o servidor ou as permissões.`);
    }
}

export async function deleteFlowFromMeta(connection: MetaConnection, flowId: string): Promise<void> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");
    
    const url = `${BASE_URL}/${flowId}`;
    try {
        const response = await fetchWithTimeout(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${connection.apiToken}` }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw handleMetaApiError(data, `Falha ao excluir o flow ${flowId} da Meta.`);
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') throw new Error("A requisição para excluir o Flow expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao excluir o flow.');
    }
}

export async function deprecateFlowFromMeta(connection: MetaConnection, flowId: string): Promise<void> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");
    const url = `${BASE_URL}/${flowId}/deprecate`;
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${connection.apiToken}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw handleMetaApiError(data, `Falha ao depreciar o flow ${flowId} na Meta.`);
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') throw new Error("A requisição para depreciar o Flow expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao depreciar o flow.');
    }
}

export async function updateFlowMetadataOnMeta(
    connection: MetaConnection,
    flowId: string,
    metadata: { name?: string; endpoint_uri?: string; }
): Promise<void> {
    if (!connection) throw new Error("Nenhuma conexão ativa.");
    const url = `${BASE_URL}/${flowId}`;
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(metadata),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw handleMetaApiError(data, `Falha ao atualizar metadados do flow ${flowId}.`);
        }
    } catch (error) {
        if (error instanceof Error) {
             if (error.name === 'AbortError') throw new Error("A requisição para atualizar metadados do Flow expirou (timeout).");
            throw error;
        }
        throw new Error('Ocorreu um erro de rede ao atualizar metadados do flow.');
    }
}