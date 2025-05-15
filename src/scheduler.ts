import { Lead } from './common';
// Remove the incorrect import and define the types directly
// import type { ScheduledHandler, ScheduledEvent, ExecutionContext } from '@cloudflare/workers-types';

// Define the necessary types locally
interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface LeadWithTimestamp extends Lead {
  next_action_at: number;
}

export interface Env {
  TARGETS: KVNamespace;
  LINKEDIN_CONNECTIONS_QUEUE: Queue;
  LINKEDIN_DMS_QUEUE: Queue;
}

interface SchedulerHandler {
  scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void>;
}

const handler: SchedulerHandler = {
  async scheduled(event, env, ctx) {
    // Get all keys from the TARGETS KV namespace
    const { keys } = await env.TARGETS.list();
    
    // Current timestamp
    const now = Date.now();
    
    // Process each key
    for (const key of keys) {
      try {
        // Get the lead data
        const leadString = await env.TARGETS.get(key.name);
        if (!leadString) continue;
        
        const lead = JSON.parse(leadString) as LeadWithTimestamp;
        
        // Check if it's time to process this lead
        if (!lead.next_action_at || lead.next_action_at <= now) {
          // Process based on status
          if (lead.status === "new") {
            // Enqueue to linkedin-connections queue
            await env.LINKEDIN_CONNECTIONS_QUEUE.send({
              urn: lead.urn,
              name: lead.name
            });
            console.log(`Enqueued new connection request for ${lead.name} (${lead.urn})`);
          } else if (lead.status === "accepted") {
            // Enqueue to linkedin-dms queue
            await env.LINKEDIN_DMS_QUEUE.send({
              urn: lead.urn,
              name: lead.name
            });
            console.log(`Enqueued DM for ${lead.name} (${lead.urn})`);
          }
          
          // Generate a jittered next action time (25-35 minutes from now)
          const jitterMinutes = Math.floor(Math.random() * 10) + 25; // 25-35 minutes
          const nextActionAt = now + (jitterMinutes * 60 * 1000);
          
          // Update the lead with the new next_action_at time
          lead.next_action_at = nextActionAt;
          
          // Save the updated lead back to KV
          await env.TARGETS.put(key.name, JSON.stringify(lead));
          console.log(`Updated next_action_at for ${lead.name} to ${new Date(nextActionAt).toISOString()}`);
        }
      } catch (error) {
        console.error(`Error processing lead with key ${key.name}:`, error);
      }
    }
  }
};

export default handler; 