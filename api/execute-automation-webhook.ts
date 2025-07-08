// api/execute-automation-webhook.ts
import { runAutomations } from '../services/automationService';
import { supabaseAdmin } from '../services/supabaseAdminClient';
import type { TriggerWebhookData } from '../types';
import type { Database } from '../services/database.types';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const webhookId = req.query.id as string;
    if (!webhookId) {
        return res.status(400).json({ success: false, message: 'Webhook ID is missing in query parameter "id".' });
    }

    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Backend client not configured.' });
    }

    const body = req.body;
    
    try {
        const { data: automations, error: autoError } = await supabaseAdmin
            .from('automations')
            .select('*, user_id')
            .eq('status', 'ACTIVE');
        
        if (autoError) throw autoError;

        let targetAutomation: (typeof automations[0]) | undefined;
        let triggerNodeRef: any = null;

        for (const automation of automations) {
            const triggerNode = (automation.nodes as any[]).find(node => 
                node.type === 'trigger' && 
                node.subType === 'webhook' && 
                node.data?.webhookId === webhookId
            );
            if (triggerNode) {
                targetAutomation = automation;
                triggerNodeRef = triggerNode;
                break;
            }
        }

        if (!targetAutomation || !triggerNodeRef) {
            return res.status(404).json({ success: false, message: 'No active automation found for this webhook ID.' });
        }
        
        const userId = targetAutomation.user_id;

        // --- Handle Listening Mode for Testing ---
        if ((triggerNodeRef.data as TriggerWebhookData).isListening) {
            const nodeIndex = (targetAutomation.nodes as any[]).findIndex(n => n.id === triggerNodeRef.id);
            if (nodeIndex > -1) {
                const updatedNodes = [...(targetAutomation.nodes as any[])];
                const oldData = updatedNodes[nodeIndex].data as TriggerWebhookData;
                updatedNodes[nodeIndex].data = {
                    ...oldData,
                    lastSample: body,
                    isListening: false,
                };
                const { error } = await supabaseAdmin.from('automations').update({ nodes: updatedNodes as any }).eq('id', targetAutomation.id);
                if (error) throw error;
                console.log(`Webhook sample captured for automation: ${targetAutomation.name}`);
                return res.status(200).json({ success: true, message: 'Sample captured successfully.' });
            }
        }
        
        // --- Normal Execution Logic ---
        const phone = body.phone;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Request body must contain a "phone" property for execution.' });
        }
        
        // Find or create the contact using the admin client
        const { data: existingContacts } = await supabaseAdmin.from('contacts').select('*').eq('user_id', userId).eq('phone', phone);
        let contact = existingContacts?.[0];
        let isNewContact = false;
        
        if (!contact) {
            isNewContact = true;
            const newContactData: Database['public']['Tables']['contacts']['Insert'] = {
                user_id: userId,
                phone: phone,
                name: body.name || `Contato Webhook ${phone.slice(-4)}`,
                tags: body.tags || [],
                custom_fields: body,
            };
            const { data: newContact, error: createError } = await supabaseAdmin.from('contacts').insert([newContactData]).select().single();
            if (createError) throw createError;
            contact = newContact;
        }

        if (!contact) {
             return res.status(500).json({ success: false, message: 'Failed to find or create contact.' });
        }

        // --- Execute Automations ---
        const { data: connections } = await supabaseAdmin.from('meta_connections').select('*').eq('user_id', userId);
        const connection = connections?.[0];
        if (!connection) {
            return res.status(404).json({ success: false, message: `No active Meta connection configured for user ${userId}.` });
        }

        const adminContext = {
            userId: userId,
            connection: {
                id: connection.id,
                user_id: connection.user_id,
                name: connection.name,
                wabaId: connection.waba_id,
                phoneNumberId: connection.phone_number_id,
                apiToken: connection.api_token,
            }
        };

        await runAutomations('webhook', { contactId: contact.id, webhook: body }, adminContext);
        
        if (isNewContact) {
            await runAutomations('contact_created', { contactId: contact.id }, adminContext);
            if (contact.tags && contact.tags.length > 0) {
                for (const tag of contact.tags) {
                    await runAutomations('tag_added', { contactId: contact.id, tagName: tag }, adminContext);
                }
            }
        }
        
        return res.status(200).json({ success: true, message: 'Automation triggered successfully.' });

    } catch (error) {
        console.error(`Error processing webhook ${webhookId}:`, error);
        const message = error instanceof Error ? error.message : 'An internal server error occurred.';
        return res.status(500).json({ success: false, message });
    }
}