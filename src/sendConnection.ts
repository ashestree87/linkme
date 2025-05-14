import { withBrowser, randomHumanDelay } from './common';

interface ConnectionMessage {
  urn: string;
  name: string;
}

export interface Env {
  DB: D1Database;
  TARGETS: KVNamespace;
  CRAWLER_BROWSER: any; // Browser binding
}

export default {
  async queue(batch: MessageBatch<ConnectionMessage>, env: Env): Promise<void> {
    // Create the events table if it doesn't exist
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
        // Step 1: Use withBrowser to send connection request
        await withBrowser(async (page) => {
          // Navigate to the LinkedIn profile
          await page.goto(`https://www.linkedin.com/in/${urn}`, { 
            waitUntil: 'networkidle0' 
          });
          
          // Look for the Connect button and click it
          const connectButton = await page.waitForSelector('button:has-text("Connect")');
          await connectButton?.click();
          
          // Wait for the "Add a note" option and click it
          const addNoteButton = await page.waitForSelector('button:has-text("Add a note")');
          await addNoteButton?.click();
          
          // Wait for the note textarea to appear
          const noteTextarea = await page.waitForSelector('textarea[name="message"]');
          
          // Type the connection message
          await noteTextarea?.type(`Hi ${name}, great to connect!`);
          
          // Click the Send button
          const sendButton = await page.waitForSelector('button:has-text("Send")');
          await sendButton?.click();
          
          // Wait for a random human-like delay
          await randomHumanDelay();
          
          // Verify the invitation was sent by looking for a success element
          await page.waitForSelector('.artdeco-toast-item__message:has-text("Invitation sent")');
        });
        
        // Step 2: Record the event in the database
        const timestamp = Date.now();
        await env.DB.prepare(`
          INSERT INTO events (urn, event_type, timestamp)
          VALUES (?, ?, ?)
        `)
        .bind(urn, 'invite_sent', timestamp)
        .run();
        
        // Step 3: Update the lead status and next action time in KV
        const leadString = await env.TARGETS.get(urn);
        if (leadString) {
          const lead = JSON.parse(leadString);
          lead.status = "invited";
          
          // Set next action time to 1 day from now
          const oneDayInMs = 24 * 60 * 60 * 1000;
          lead.next_action_at = timestamp + oneDayInMs;
          
          await env.TARGETS.put(urn, JSON.stringify(lead));
        }
        
        // Acknowledge the message as successfully processed
        message.ack();
        console.log(`Successfully sent connection request to ${name} (${urn})`);
        
      } catch (error) {
        console.error(`Failed to send connection request to ${name} (${urn}):`, error);
        
        try {
          // Record the failure in the database
          await env.DB.prepare(`
            INSERT INTO events (urn, event_type, timestamp)
            VALUES (?, ?, ?)
          `)
          .bind(urn, 'invite_failed', Date.now())
          .run();
          
          // Still acknowledge the message to prevent endless retries
          message.ack();
        } catch (dbError) {
          console.error(`Failed to record error in database:`, dbError);
          message.ack(); // Still acknowledge to avoid endless retries
        }
      }
    }
  }
}; 