
import type { AutomationData, AutomationTriggerType, AutomationActionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Static Data & Configuration ---
export const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string; icon: string; description: string; }[] = [
    { value: 'contact_created', label: 'Contato Criado', icon: 'ContactsIcon', description: "Inicia quando um novo contato é adicionado." },
    { value: 'tag_added', label: 'Tag Adicionada', icon: 'TagIcon', description: "Inicia quando uma tag específica é adicionada a um contato." },
    { value: 'crm_stage_changed', label: 'Etapa do CRM Alterada', icon: 'TableCellsIcon', description: "Inicia quando um contato é movido para uma etapa do CRM." },
    { value: 'context_message', label: 'Mensagem de Contato', icon: 'ChatBubbleOvalLeftEllipsisIcon', description: "Inicia quando uma mensagem específica é recebida." },
    { value: 'webhook', label: 'Webhook Recebido', icon: 'HttpRequestIcon', description: "Inicia a partir de uma chamada HTTP externa." },
];

export const ACTION_OPTIONS: { value: AutomationActionType; label: string; icon: string; description: string }[] = [
    { value: 'send_message', label: 'Enviar Mensagem', icon: 'PaperAirplaneIcon', description: "Envia uma mensagem de texto, template ou flow." },
    { value: 'wait', label: 'Atraso Inteligente', icon: 'ClockIcon', description: "Pausa a automação por um período definido." },
    { value: 'add_tag', label: 'Adicionar Tag', icon: 'TagIcon', description: "Adiciona uma ou mais tags ao contato." },
    { value: 'remove_tag', label: 'Remover Tag', icon: 'TagIcon', description: "Remove uma ou mais tags do contato." },
    { value: 'move_crm_stage', label: 'Mover no CRM', icon: 'ArrowTrendingUpIcon', description: "Move o contato para outra etapa do CRM." },
    { value: 'conditional', label: 'Condicional', icon: 'ConditionalIcon', description: "Divide o fluxo com base em condições (Sim/Não)." },
    { value: 'http_request', label: 'Requisição HTTP', icon: 'HttpRequestIcon', description: "Envia dados para um serviço externo." },
    { value: 'opt_out', label: 'Opt-Out', icon: 'XCircleIcon', description: "Marca o contato para não receber mais automações." },
    { value: 'randomizer', label: 'Randomizador', icon: 'RandomizerIcon', description: "Divide o fluxo aleatoriamente em vários caminhos." },
    { value: 'forward_automation', label: 'Encaminhar Automação', icon: 'ForwardIcon', description: "Envia o contato para outra automação." },
];

export const NODE_ICONS = Object.fromEntries(
    [...TRIGGER_OPTIONS, ...ACTION_OPTIONS].map(opt => [opt.value, opt.icon])
) as Record<AutomationTriggerType | AutomationActionType, string>;

export const getDefaultNodeData = (subType: AutomationTriggerType | AutomationActionType): AutomationData => {
    switch (subType) {
        // Triggers
        case 'contact_created': return { type: 'contact_created' };
        case 'tag_added': return { type: 'tag_added', value: '' };
        case 'crm_stage_changed': return { type: 'crm_stage_changed', crmBoardId: '', crmStageId: '' };
        case 'context_message': return { type: 'context_message', match: 'any', value: '' };
        case 'webhook': return { type: 'webhook', webhookId: uuidv4(), isListening: false, lastSample: null };
        // Actions
        case 'send_message': return { type: 'send_message', subType: 'text', text: 'Olá {{contact.name}}!' };
        case 'wait': return { type: 'wait', delay: 5, unit: 'minutes' };
        case 'add_tag': return { type: 'add_tag', tagName: '' };
        case 'remove_tag': return { type: 'remove_tag', tagName: '' };
        case 'move_crm_stage': return { type: 'move_crm_stage', crmBoardId: '', crmStageId: '' };
        case 'conditional': return { type: 'conditional', logic: 'and', conditions: [] };
        case 'http_request': return { type: 'http_request', url: '', method: 'GET', headers: [], body: '', responseMapping: [] };
        case 'opt_out': return { type: 'opt_out' };
        case 'randomizer': return { type: 'randomizer', branches: 2 };
        case 'forward_automation': return { type: 'forward_automation', automationId: '' };
    }
    // This part should be unreachable if the subType is always valid.
    // Throwing an error for runtime safety in case of an invalid subType.
    throw new Error(`Invalid automation node subType: ${subType}`);
};