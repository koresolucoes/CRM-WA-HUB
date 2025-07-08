// This serverless function is intended to be run on a schedule (e.g., every minute via Vercel Cron Jobs).
// It queries for pending automation tasks and executes them.
// To secure this endpoint, set a CRON_SECRET environment variable in your Vercel project.

import { supabaseAdmin } from '../../services/supabaseAdminClient';
import { executeAutomation } from '../../services/automationService';
import type { Automation, Contact, MetaConnection } from '../../types';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    // Simple bearer token authentication
    const AUTH_TOKEN = process.env.CRON_SECRET;
    const { authorization } = req.headers;

    if (!AUTH_TOKEN || authorization !== `Bearer ${AUTH_TOKEN}`) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const now = new Date().toISOString();
        const { data: tasks, error: fetchError } = await supabaseAdmin
            .from('scheduled_automation_tasks')
            .select('*')
            .eq('status', 'pending')
            .lte('execute_at', now);

        if (fetchError) {
            console.error("Cron job failed to fetch tasks:", fetchError);
            throw fetchError;
        }
        
        if (!tasks || tasks.length === 0) {
            return res.status(200).json({ success: true, message: "No pending tasks to process." });
        }

        let processed = 0;
        let failed = 0;

        for (const task of tasks) {
            try {
                // Mark task as 'processing' to prevent duplicate runs
                await supabaseAdmin.from('scheduled_automation_tasks').update({ status: 'processing' }).eq('id', task.id);
                
                // Fetch all data using the admin client
                const [automationRes, contactRes, connectionRes] = await Promise.all([
                    supabaseAdmin.from('automations').select('*').eq('id', task.automation_id).single(),
                    supabaseAdmin.from('contacts').select('*').eq('id', task.contact_id).single(),
                    supabaseAdmin.from('meta_connections').select('*').eq('id', task.meta_connection_id).single()
                ]);

                if (automationRes.error) throw new Error(`Failed to fetch automation ${task.automation_id}: ${automationRes.error.message}`);
                if (contactRes.error) throw new Error(`Failed to fetch contact ${task.contact_id}: ${contactRes.error.message}`);
                if (connectionRes.error) throw new Error(`Failed to fetch connection ${task.meta_connection_id}: ${connectionRes.error.message}`);
                
                const automation = automationRes.data as unknown as Automation;
                const contact = contactRes.data as unknown as Contact;
                const connectionData = connectionRes.data;
                const connection: MetaConnection = {
                    id: connectionData.id,
                    user_id: connectionData.user_id,
                    name: connectionData.name,
                    wabaId: connectionData.waba_id,
                    phoneNumberId: connectionData.phone_number_id,
                    apiToken: connectionData.api_token,
                };

                if (automation && contact && connection) {
                    await executeAutomation(
                        automation,
                        contact,
                        task.context,
                        connection,
                        task.resume_from_node_id
                    );
                    // Mark as processed upon successful completion
                    await supabaseAdmin.from('scheduled_automation_tasks').update({ status: 'processed' }).eq('id', task.id);
                    processed++;
                } else {
                    throw new Error(`Could not find required data for task ${task.id}. Automation: ${!!automation}, Contact: ${!!contact}, Connection: ${!!connection}`);
                }
            } catch (taskError) {
                console.error(`Error processing task ${task.id}:`, taskError);
                await supabaseAdmin.from('scheduled_automation_tasks').update({ status: 'failed', error_message: (taskError as Error).message }).eq('id', task.id);
                failed++;
            }
        }
        
        console.log(`Cron job finished. Processed: ${processed}, Failed: ${failed}.`);
        return res.status(200).json({ success: true, message: `Processed ${processed} tasks, ${failed} failed.` });

    } catch (error) {
        console.error("Cron job failed unexpectedly:", error);
        return res.status(500).json({ success: false, message: 'Cron job execution failed.' });
    }
}
