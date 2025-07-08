

import { v4 as uuidv4 } from 'uuid';
import type {
    Automation, AutomationNode, TriggerCrmStageChangedData, TriggerTagAddedData, AutomationTriggerType,
    Contact, ActionSendMessageData, ActionWaitData, ActionAddTagData, ActionRemoveTagData,
    ActionMoveCrmStageData, ActionConditionalData, ActionHttpRequestData, ActionForwardAutomationData, TriggerContextMessageData,
    AutomationActionData,
    MetaConnection
} from '../types';
import { AutomationStatus } from '../types';
import { supabase } from './supabaseClient';
import type { Json, Database } from './database.types';
import { getContactById, updateContact, setContactOptOutStatus, moveContactToCrmStage } from './contactService';
import { sendAutomatedMessage, sendFlowMessage } from './chatService';
import { sendMessage as sendTemplateMessage, getMessageTemplates, getActiveConnection } from './metaService';
import { getAllStages } from './crmService';

export async function getAutomations(): Promise<Automation[]> {
    // RLS handles filtering by user_id
    const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching automations:", error);
        throw new Error(error.message);
    }
    return (data || []).map(a => ({
        id: a.id,
        user_id: a.user_id,
        name: a.name,
        status: a.status as AutomationStatus,
        nodes: a.nodes as unknown as AutomationNode[],
        edges: a.edges as any,
        createdAt: a.created_at,
        allowReactivation: a.allow_reactivation,
        blockOnOpenChat: a.block_on_open_chat,
        executionStats: a.execution_stats as any,
    }));
}

export async function getAutomationById(id: string): Promise<Automation | undefined> {
    // RLS handles filtering by user_id
    const { data, error } = await supabase.from('automations').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return undefined;
        console.error("Error fetching automation:", error);
        throw new Error(error.message);
    }
    return data ? {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        status: data.status as AutomationStatus,
        nodes: data.nodes as unknown as AutomationNode[],
        edges: data.edges as any,
        createdAt: data.created_at,
        allowReactivation: data.allow_reactivation,
        blockOnOpenChat: data.block_on_open_chat,
        executionStats: data.execution_stats as any,
    } : undefined;
}

export async function addAutomation(details: {
    name: string;
    status: AutomationStatus;
    allowReactivation: boolean;
    blockOnOpenChat: boolean;
}): Promise<Automation> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const newAutomationData: Database['public']['Tables']['automations']['Insert'] = {
        id: uuidv4(),
        user_id: user.id,
        name: details.name,
        status: details.status,
        nodes: [],
        edges: [],
        created_at: new Date().toISOString(),
        allow_reactivation: details.allowReactivation,
        block_on_open_chat: details.blockOnOpenChat,
        execution_stats: {},
    };
    
    const { data, error } = await supabase.from('automations').insert([newAutomationData]).select().single();
    
    if (error) {
        console.error("Error adding automation:", error);
        throw new Error(error.message);
    }
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }

    return {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        status: data.status as AutomationStatus,
        nodes: data.nodes as unknown as AutomationNode[],
        edges: data.edges as any,
        createdAt: data.created_at,
        allowReactivation: data.allow_reactivation,
        blockOnOpenChat: data.block_on_open_chat,
        executionStats: data.execution_stats as any,
    };
}

export async function updateAutomation(updatedAutomation: Automation): Promise<void> {
    const { id, name, status, nodes, edges, allowReactivation, blockOnOpenChat, executionStats } = updatedAutomation;
    const updateData: Database['public']['Tables']['automations']['Update'] = {
        name,
        status,
        nodes: nodes as any,
        edges: edges as any,
        allow_reactivation: allowReactivation,
        block_on_open_chat: blockOnOpenChat,
        execution_stats: executionStats as any,
    };
    // RLS protects this update
    const { error } = await supabase
        .from('automations')
        .update(updateData)
        .eq('id', id);
    if (error) {
        console.error("Error updating automation:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function deleteAutomation(automationId: string): Promise<void> {
    // RLS protects this deletion
    const { error } = await supabase.from('automations').delete().eq('id', automationId);
    if (error) {
        console.error("Error deleting automation:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}


// --- Automation Engine ---

function interpolateString(template: string, context: any): string {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const keys = path.trim().split('.');
        let value = context;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return match; 
            }
        }
        return value !== undefined && value !== null ? String(value) : match;
    });
}


export async function executeAutomation(
    automation: Automation,
    contact: Contact,
    initialContext: any,
    connection: MetaConnection,
    resumeFromNodeId?: string
) {
    console.log(`Executing automation "${automation.name}" for contact ${contact.name}...`);
    
    const automationToExecute = JSON.parse(JSON.stringify(automation)) as Automation;
    if (!automationToExecute.executionStats) {
        automationToExecute.executionStats = {};
    }
    const stats = automationToExecute.executionStats;

    const triggerNode = automationToExecute.nodes.find(n => n.type === 'trigger');
    if (!triggerNode && !resumeFromNodeId) {
        console.error(`Automation "${automationToExecute.name}" has no trigger node.`);
        return;
    }
    
    const executionContext = {
        contact,
        ...initialContext
    };

    const nodeMap = new Map(automationToExecute.nodes.map(n => [n.id, n]));
    const edgeMap = new Map<string, string[]>();
    const conditionalEdgeMap = new Map<string, { true?: string; false?: string }>();
    const randomizerEdgeMap = new Map<string, string[]>();

    for (const edge of automationToExecute.edges) {
        if (edge.sourceHandle === 'true' || edge.sourceHandle === 'false') {
            const entry = conditionalEdgeMap.get(edge.source) || {};
            entry[edge.sourceHandle] = edge.target;
            conditionalEdgeMap.set(edge.source, entry);
        } else if (edge.sourceHandle?.startsWith('branch-')) {
            const entry = randomizerEdgeMap.get(edge.source) || [];
            entry.push(edge.target);
            randomizerEdgeMap.set(edge.source, entry);
        } else {
            if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
            edgeMap.get(edge.source)!.push(edge.target);
        }
    }

    let currentNode = resumeFromNodeId ? nodeMap.get(resumeFromNodeId) : triggerNode;

    if (!currentNode) {
        console.error(`Automation "${automationToExecute.name}" has no starting node.`);
        return;
    }

    while (currentNode) {
        const nodeId = currentNode.id;
        stats[nodeId] = stats[nodeId] || { total: 0, success: 0, error: 0 };
        stats[nodeId].total++;
        
        let nextNodeId: string | undefined;

        try {
            const actionData = currentNode.data as AutomationActionData;
            console.log(`Processing node: ${currentNode.subType} for contact ${contact.id}`);

            switch (actionData.type) {
                case 'send_message': {
                    const smData = actionData as ActionSendMessageData;
                    if (smData.subType === 'text' && smData.text) {
                        const interpolatedText = interpolateString(smData.text, executionContext);
                        await sendAutomatedMessage(contact.id, interpolatedText, contact, connection);
                    } else if (connection && smData.subType === 'template' && smData.templateId) {
                         const templates = await getMessageTemplates(connection);
                         const template = templates.find(t => t.id === smData.templateId);
                         if (template) {
                             await sendTemplateMessage(connection, {
                                recipient: contact.phone,
                                templateName: template.name,
                                languageCode: template.language,
                                components: [] 
                             });
                         } else {
                             console.error(`Template with ID ${smData.templateId} not found or not approved.`);
                         }
                    } else if (smData.subType === 'flow' && smData.flowId) {
                        await sendFlowMessage(connection, contact.phone, smData);
                    }
                    break;
                }
                case 'wait': {
                    const wData = actionData as ActionWaitData;
                    const delay = wData.delay || 0;
                    const unit = wData.unit || 'minutes';
                    let delayMs = 0;
                    if (unit === 'minutes') delayMs = delay * 60 * 1000;
                    else if (unit === 'hours') delayMs = delay * 60 * 60 * 1000;
                    else if (unit === 'days') delayMs = delay * 24 * 60 * 60 * 1000;
                    
                    const execute_at = new Date(Date.now() + delayMs);
                    
                    const nextNodes = edgeMap.get(currentNode.id);
                    const resume_from_node_id = nextNodes?.[0];
                    
                    if (resume_from_node_id) {
                        const task: Database['public']['Tables']['scheduled_automation_tasks']['Insert'] = {
                            user_id: contact.user_id,
                            contact_id: contact.id,
                            automation_id: automationToExecute.id,
                            resume_from_node_id,
                            execute_at: execute_at.toISOString(),
                            meta_connection_id: connection.id,
                            context: initialContext as any,
                            status: 'pending'
                        };
                        await supabase.from('scheduled_automation_tasks').insert([task]);
                        stats[nodeId].success++;
                        await updateAutomation(automationToExecute);
                        return;
                    }
                    break;
                }
                case 'add_tag':
                case 'remove_tag': {
                    const tagData = actionData as ActionAddTagData | ActionRemoveTagData;
                    if (tagData.tagName) {
                        const interpolatedTagName = interpolateString(tagData.tagName, executionContext);
                        const currentContact = await getContactById(contact.id);
                        if (currentContact) {
                            const existingTags = new Set(currentContact.tags || []);
                            if (actionData.type === 'add_tag') existingTags.add(interpolatedTagName);
                            else existingTags.delete(interpolatedTagName);
                            await updateContact({ id: contact.id, tags: Array.from(existingTags) });
                        }
                    }
                    break;
                }
                case 'move_crm_stage': {
                    const moveData = actionData as ActionMoveCrmStageData;
                    if (moveData.crmStageId) {
                        const allStages = await getAllStages();
                        const destinationStage = allStages.find(c => c.id === moveData.crmStageId);
                        if (destinationStage) {
                             await moveContactToCrmStage(contact.id, destinationStage);
                        } else {
                            console.error(`Could not find CRM stage with ID ${moveData.crmStageId} for move action.`);
                        }
                    }
                    break;
                }
                case 'opt_out':
                    await setContactOptOutStatus(contact.id, true);
                    break;
                    
                case 'forward_automation': {
                    const forwardData = actionData as ActionForwardAutomationData;
                    if (forwardData.automationId) {
                        const nextAutomation = await getAutomationById(forwardData.automationId);
                        if (nextAutomation) {
                            executeAutomation(nextAutomation, contact, initialContext, connection);
                        }
                    }
                    break;
                }
                case 'http_request': {
                    const httpData = actionData as ActionHttpRequestData;
                    if(httpData.url) {
                        const interpolatedUrl = interpolateString(httpData.url, executionContext);
                        const interpolatedBody = httpData.body ? interpolateString(httpData.body, executionContext) : undefined;
                        const interpolatedHeaders = httpData.headers?.reduce((acc, h) => {
                            if (h.key && h.value) {
                                acc[h.key] = interpolateString(h.value, executionContext);
                            }
                            return acc;
                        }, {} as Record<string, string>);

                       const response = await fetch(interpolatedUrl, {
                          method: httpData.method || 'GET',
                          headers: { 'Content-Type': 'application/json', ...interpolatedHeaders },
                          body: interpolatedBody
                       });
                       if (response.ok && httpData.responseMapping?.length) {
                          const responseJson = await response.json();
                          const updatePayload: {[key: string]: any} = {};
                          for (const mapping of httpData.responseMapping) {
                               const value = mapping.jsonPath.split('.').reduce((o, i) => o?.[i], responseJson);
                               if (value !== undefined) {
                                   updatePayload[mapping.contactField] = value;
                               }
                          }
                          if(Object.keys(updatePayload).length > 0) {
                              await updateContact({id: contact.id, ...updatePayload});
                          }
                       }
                    }
                    break;
                }
            }

            if (currentNode.subType === 'conditional') {
                const condData = currentNode.data as ActionConditionalData;
                let result = condData.logic === 'and'; 
                for (const condition of condData.conditions) {
                    const currentContact = await getContactById(contact.id);
                    if (!currentContact) break;
                    let currentResult = false;
                    switch(condition.source) {
                        case 'contact_tag': {
                            const tags = new Set(currentContact.tags || []);
                            if (condition.operator === 'contains') currentResult = tags.has(condition.value);
                            else if (condition.operator === 'not_contains') currentResult = !tags.has(condition.value);
                            break;
                        }
                        case 'conversation_window':
                            currentResult = condition.operator === 'is_open' ? currentContact.is24hWindowOpen : !currentContact.is24hWindowOpen;
                            break;
                        case 'contact_field': {
                            const contactValue = (currentContact as any)[condition.field]?.toLowerCase();
                            const conditionValue = condition.value.toLowerCase();
                            if (condition.operator === 'is') currentResult = contactValue === conditionValue;
                            if (condition.operator === 'is_not') currentResult = contactValue !== conditionValue;
                            if (condition.operator === 'contains') currentResult = contactValue?.includes(conditionValue);
                            break;
                        }
                        case 'business_hours': {
                            const now = new Date();
                            const day = now.toLocaleString('en-US', { weekday: 'short' }).toLowerCase() as any;
                            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                            const isDayMatch = condition.days.includes(day);
                            if (isDayMatch && currentTime >= condition.startTime && currentTime <= condition.endTime) {
                               currentResult = condition.operator === 'is_within';
                            } else {
                               currentResult = condition.operator === 'is_outside';
                            }
                            break;
                        }
                    }
                    if (condData.logic === 'and' && !currentResult) { result = false; break; }
                    if (condData.logic === 'or' && currentResult) { result = true; break; }
                }
                const path = result ? 'true' : 'false';
                nextNodeId = conditionalEdgeMap.get(currentNode.id)?.[path];
            } else if (currentNode.subType === 'randomizer') {
                const branches = randomizerEdgeMap.get(currentNode.id);
                if(branches && branches.length > 0){
                    nextNodeId = branches[Math.floor(Math.random() * branches.length)];
                }
            } else {
                const nextNodes = edgeMap.get(currentNode.id);
                nextNodeId = nextNodes?.[0];
            }
            
            stats[nodeId].success++;
        } catch (e) {
            console.error(`Error executing node ${nodeId} in automation ${automationToExecute.id}:`, e);
            stats[nodeId].error++;
        }
        
        currentNode = nextNodeId ? nodeMap.get(nextNodeId) : undefined;
    }
    
    await updateAutomation(automationToExecute);
}


export async function runAutomations(triggerType: AutomationTriggerType, context: any, adminContext?: { userId: string, connection: MetaConnection }) {
    const { contactId } = context;
    const contact = await getContactById(contactId);
    if (!contact || contact.isOptedOutOfAutomations) return;

    // Se o adminContext for fornecido, use-o. Caso contrário, obtenha a conexão do usuário logado.
    const connection = adminContext?.connection || await getActiveConnection();
    if (!connection) {
        console.warn(`Cannot run automations for user ${adminContext?.userId || 'logged-in user'}: No active Meta connection.`);
        return;
    }
    
    // Use o cliente relevante para buscar as automações.
    const automationsClient = adminContext ? supabase.from('automations').select('*').eq('user_id', adminContext.userId) : supabase.from('automations').select('*');
    const { data: allAutomationsData, error } = await automationsClient;

    if (error) {
        console.error("Error fetching automations:", error);
        return;
    }

    const allAutomations: Automation[] = (allAutomationsData || []).map(a => ({
        id: a.id,
        user_id: a.user_id,
        name: a.name,
        status: a.status as AutomationStatus,
        nodes: a.nodes as unknown as AutomationNode[],
        edges: a.edges as any,
        createdAt: a.created_at,
        allowReactivation: a.allow_reactivation,
        blockOnOpenChat: a.block_on_open_chat,
        executionStats: a.execution_stats as any,
    }));
    
    const automationsToRun = allAutomations.filter(automation => {
        if (automation.status !== AutomationStatus.ACTIVE) return false;

        if (automation.blockOnOpenChat && contact.is24hWindowOpen) {
            console.log(`Automation "${automation.name}" blocked because chat window is open.`);
            return false;
        }

        return automation.nodes.some(node => {
            if (node.type !== 'trigger' || node.subType !== triggerType) return false;
            
            switch (triggerType) {
                case 'contact_created': return true;
                case 'webhook': return true;
                case 'tag_added':
                    const tagTrigger = node.data as TriggerTagAddedData;
                    return !tagTrigger.value || tagTrigger.value === context.tagName;
                case 'crm_stage_changed': {
                    const crmTrigger = node.data as TriggerCrmStageChangedData;
                    const boardIdMatch = !crmTrigger.crmBoardId || crmTrigger.crmBoardId === context.board?.id;
                    const stageIdMatch = !crmTrigger.crmStageId || crmTrigger.crmStageId === context.stage?.id;
                    return boardIdMatch && stageIdMatch;
                }
                case 'context_message':
                    const msgTrigger = node.data as TriggerContextMessageData;
                    if (!msgTrigger.value || msgTrigger.match === 'any') return true; 
                    const text = context.messageText.toLowerCase();
                    const value = msgTrigger.value.toLowerCase();
                    if (msgTrigger.match === 'contains') return text.includes(value);
                    if (msgTrigger.match === 'exact') return text === value;
                    return false;
                default:
                    return false;
            }
        });
    });

    for (const automation of automationsToRun) {
        await executeAutomation(automation, contact, context, connection);
    }
}
