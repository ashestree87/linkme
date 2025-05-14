import { withBrowser, randomHumanDelay } from './common';

interface DMMessage {
  urn: string;
  name: string;
}

interface LeadWithRetry {
  urn: string;
  name: string;
  status: string;
  next_action_at: number;
  retry_count?: number;
}

export interface Env {
  DB: D1Database;
  TARGETS: KVNamespace;
  CRAWLER_BROWSER: any; // Browser binding
}

export default {
  async queue(batch: MessageBatch<DMMessage>, env: Env): Promise<void> {
    // Ensure the events table exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS events (
        urn TEXT,
        event_type TEXT,
        timestamp INTEGER,
        PRIMARY KEY (urn, event_type, timestamp)
      )
    `).run();

    // Process each message in the batch
    for (const message of batch.messages) {
      const { urn, name } = message.body;
      
      try {
        // Step 1: Use withBrowser to send direct message
        await withBrowser(async (page) => {
          // Navigate to the LinkedIn messaging thread
          await page.goto(`https://www.linkedin.com/messaging/thread/${urn}`, { 
            waitUntil: 'networkidle0' 
          });
          
          // Wait for the message input field to appear
          const messageField = await page.waitForSelector('div[role="textbox"]');
          
          // Type the message
          await messageField?.type(`Hey ${name}, thanks for connecting – how are things going?`);
          
          // Look for the send button and click it
          const sendButton = await page.waitForSelector('button[type="submit"]');
          await sendButton?.click();
          
          // Wait for a random human-like delay
          await randomHumanDelay();
          
          // Verify the message was sent (look for the message in the thread)
          await page.waitForSelector(`text/Hey ${name}, thanks for connecting – how are things going?`);
        });
        
        // Step A: Record successful event in DB
        const timestamp = Date.now();
        await env.DB.prepare(`
          INSERT INTO events (urn, event_type, timestamp)
          VALUES (?, ?, ?)
        `)
        .bind(urn, 'dm_sent', timestamp)
        .run();
        
        // Step B: Update lead status to "done" in KV
        const leadString = await env.TARGETS.get(urn);
        if (leadString) {
          const lead = JSON.parse(leadString);
          lead.status = "done";
          lead.next_action_at = timestamp + (30 * 24 * 60 * 60 * 1000); // 30 days in future (inactive)
          
          await env.TARGETS.put(urn, JSON.stringify(lead));
        }
        
        // Acknowledge the message as successfully processed
        message.ack();
        console.log(`Successfully sent DM to ${name} (${urn})`);
        
      } catch (error) {
        console.error(`Failed to send DM to ${name} (${urn}):`, error);
        
        try {
          // Record the failure in the database
          await env.DB.prepare(`
            INSERT INTO events (urn, event_type, timestamp)
            VALUES (?, ?, ?)
          `)
          .bind(urn, 'dm_failed', Date.now())
          .run();
          
          // Update the lead with retry information
          const leadString = await env.TARGETS.get(urn);
          if (leadString) {
            const lead = JSON.parse(leadString) as LeadWithRetry;
            
            // Initialize retry count if it doesn't exist
            if (!lead.retry_count) {
              lead.retry_count = 0;
            }
            
            // Increment retry count
            lead.retry_count++;
            
            // If retry count <= 2, schedule for retry in 3 days
            // Otherwise, mark as failed and move on
            if (lead.retry_count <= 2) {
              const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
              lead.next_action_at = Date.now() + threeDaysInMs;
              console.log(`Scheduling retry #${lead.retry_count} for ${name} (${urn}) in 3 days`);
            } else {
              lead.status = "failed";
              console.log(`Maximum retries reached for ${name} (${urn}), marking as failed`);
            }
            
            await env.TARGETS.put(urn, JSON.stringify(lead));
          }
          
          // Always acknowledge the message to prevent endless retries
          message.ack();
        } catch (dbError) {
          console.error(`Failed to record error in database:`, dbError);
          message.ack(); // Still acknowledge to avoid endless retries
        }
      }
    }
  }
}; 