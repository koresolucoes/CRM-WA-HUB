// O webhook não precisa mais do Pusher, mas agora interage diretamente com o banco de dados.
// Ele irá lidar com as mensagens recebidas, encontrar o contato correspondente, adicionar a mensagem à conversa,
// e acionar quaisquer automações relevantes.

import { supabaseAdmin } from '../services/supabaseAdminClient';
import { addMessage } from '../services/chatService';
import { runAutomations } from '../services/automationService';
import { MetaConnection } from '../types';

// --- Environment Variables ---
const { META_VERIFY_TOKEN } = process.env;

if (!META_VERIFY_TOKEN) {
    console.error("META_VERIFY_TOKEN is not set in environment variables.");
}

export default async function handler(req: any, res: any) {
  // --- 1. Handle Meta's Webhook Verification (GET request) ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.error('Webhook verification failed.');
      return res.status(403).send('Forbidden');
    }
  }

  // --- 2. Handle Incoming Messages (POST request) ---
  if (req.method === 'POST') {
    const body = req.body;

    // Check if it's a valid WhatsApp message update
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            
            for (const message of change.value.messages) {
              // We only care about incoming text messages for now.
              if (message.type === 'text') {
                const contactPhone = message.from;
                const text = message.text.body;

                try {
                  if (!supabaseAdmin) {
                    throw new Error('Supabase admin client not initialized. Check server environment variables.');
                  }
                  // Use admin client to bypass RLS and search all contacts
                  const { data: contacts, error: contactError } = await supabaseAdmin
                    .from('contacts')
                    .select('*, user_id')
                    .eq('phone', contactPhone);
                  
                  if (contactError) throw contactError;

                  let contact = contacts?.[0];
                  let userId;

                  if (contact) {
                    userId = contact.user_id;
                  } else {
                    // This case is complex: which user does the new contact belong to?
                    // Without more context (e.g., a lookup by phone number ID), we can't reliably assign a user.
                    // For now, we'll log this and skip. In a real multi-tenant app, this would need a clear strategy.
                    console.warn(`Received message from unknown number ${contactPhone} not associated with any user. Skipping.`);
                    continue; 
                  }
                  
                  // Now contact and userId are guaranteed to exist
                  await addMessage(contact.id, {
                      text,
                      sender: 'contact',
                      status: 'delivered',
                  }, userId);

                  // Fetch the user's active connection to pass to the automation service
                  const { data: connections } = await supabaseAdmin.from('meta_connections').select('*').eq('user_id', userId);
                  
                  // A simple strategy: use the first connection found for this user.
                  const connectionData = connections?.[0];
                  const activeConnection: MetaConnection | null = connectionData ? {
                      id: connectionData.id,
                      user_id: connectionData.user_id,
                      name: connectionData.name,
                      wabaId: connectionData.waba_id,
                      phoneNumberId: connectionData.phone_number_id,
                      apiToken: connectionData.api_token,
                  } : null;

                  if (activeConnection) {
                     await runAutomations('context_message', { contactId: contact.id, messageText: text }, { userId, connection: activeConnection });
                  } else {
                      console.warn(`No active connection found for user ${userId}. Cannot run automations.`);
                  }

                  console.log(`Successfully processed message from ${contactPhone} for user ${userId}`);

                } catch (error) {
                   console.error(`Failed to process incoming message from ${contactPhone}:`, error);
                   // Still return 200 to Meta, as we've received it. The issue is internal processing.
                }
              }
            }
          }
        }
      }
    }
    // Acknowledge receipt to Meta immediately
    return res.status(200).send('OK');
  }

  // --- 3. Handle other HTTP methods ---
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}