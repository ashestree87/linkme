import { withBrowser, randomHumanDelay } from './common';
import * as debugViewer from './debug';
import { createDebugEnabledPage, captureDebugScreenshot } from './debug';
import { ScreenshotConfig } from './debug';

interface ConnectionMessage {
  urn: string;
  name: string;
  debug?: boolean;
  customMessage?: string;
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
        debug_session_id TEXT,
        PRIMARY KEY (urn, event_type, timestamp)
      )
    `).run();

    // Process each message in the batch
    for (const message of batch.messages) {
      const { urn, name, debug = false, customMessage } = message.body;
      
      // Always create a debug session for visual feedback, regardless of the debug flag
      // This ensures users always get screenshot feedback
      const debugSessionId = debugViewer.createDebugSession();
      debugViewer.addDebugLog(debugSessionId, `Starting connection request to ${name} (${urn})`);
      
      try {
        // Step 1: Use withBrowser to send connection request
        await withBrowser(async (page) => {
          // Configure screenshot settings
          const config: ScreenshotConfig = {
            enabled: true,
            frequency: debug ? 'medium' : 'low', // Less frequent screenshots if not in full debug mode
            saveLocally: false,
            maxScreenshots: debug ? 30 : 10 // Keep fewer screenshots if not in full debug mode
          };
          
          // Wrap page with debug capabilities
          page = createDebugEnabledPage(page, debugSessionId, config);
          debugViewer.addDebugLog(debugSessionId, debug ? "Full debug mode enabled" : "Standard screenshot mode enabled");
          
          // Navigate to the LinkedIn profile
          debugViewer.addDebugLog(debugSessionId, `Navigating to profile: ${urn}`);
          await page.goto(`https://www.linkedin.com/in/${urn}`, { 
            waitUntil: 'networkidle0' 
          });
          
          await captureDebugScreenshot(page, debugSessionId, "Profile Page");
          debugViewer.addDebugLog(debugSessionId, "Looking for Connect button");
          
          // Look for the Connect button and click it
          const connectButton = await page.waitForSelector('button:has-text("Connect")');
          await connectButton?.click();
          
          await captureDebugScreenshot(page, debugSessionId, "Connect Dialog");
          debugViewer.addDebugLog(debugSessionId, "Looking for Add Note option");
          
          // Wait for the "Add a note" option and click it
          const addNoteButton = await page.waitForSelector('button:has-text("Add a note")');
          await addNoteButton?.click();
          
          await captureDebugScreenshot(page, debugSessionId, "Add Note Dialog");
          debugViewer.addDebugLog(debugSessionId, "Preparing message");
          
          // Wait for the note textarea to appear
          const noteTextarea = await page.waitForSelector('textarea[name="message"]');
          
          // Determine the message to send
          const messageText = customMessage || `Hi ${name}, great to connect!`;
          
          // Type the connection message
          await noteTextarea?.type(messageText);
          
          await captureDebugScreenshot(page, debugSessionId, "Message Typed");
          debugViewer.addDebugLog(debugSessionId, "Sending connection request");
          
          // Click the Send button
          const sendButton = await page.waitForSelector('button:has-text("Send")');
          await sendButton?.click();
          
          // Wait for a random human-like delay
          await randomHumanDelay();
          
          debugViewer.addDebugLog(debugSessionId, "Verifying invitation was sent");
          
          // Verify the invitation was sent by looking for a success element
          await page.waitForSelector('.artdeco-toast-item__message:has-text("Invitation sent")');
          
          await captureDebugScreenshot(page, debugSessionId, "Invitation Sent Confirmation");
          debugViewer.addDebugLog(debugSessionId, "Connection request sent successfully!");
        });
        
        // Step 2: Record the event in the database
        const timestamp = Date.now();
        await env.DB.prepare(`
          INSERT INTO events (urn, event_type, timestamp, debug_session_id)
          VALUES (?, ?, ?, ?)
        `)
        .bind(urn, 'invite_sent', timestamp, debugSessionId)
        .run();
        
        // Step 3: Update the lead status and next action time in KV
        const leadString = await env.TARGETS.get(urn);
        if (leadString) {
          const lead = JSON.parse(leadString);
          lead.status = "invited";
          
          // Always store the debug session ID
          lead.debug_session_id = debugSessionId;
          
          // Set next action time to 1 day from now
          const oneDayInMs = 24 * 60 * 60 * 1000;
          lead.next_action_at = timestamp + oneDayInMs;
          
          await env.TARGETS.put(urn, JSON.stringify(lead));
        }
        
        // Acknowledge the message as successfully processed
        message.ack();
        console.log(`Successfully sent connection request to ${name} (${urn})`);
        
        debugViewer.addDebugLog(debugSessionId, "Process completed successfully");
        debugViewer.completeDebugSession(debugSessionId);
        
      } catch (error) {
        console.error(`Failed to send connection request to ${name} (${urn}):`, error);
        
        debugViewer.addDebugLog(debugSessionId, `Error: ${error}`);
        debugViewer.completeDebugSession(debugSessionId, `${error}`);
        
        try {
          // Record the failure in the database
          await env.DB.prepare(`
            INSERT INTO events (urn, event_type, timestamp, debug_session_id)
            VALUES (?, ?, ?, ?)
          `)
          .bind(urn, 'invite_failed', Date.now(), debugSessionId)
          .run();
          
          // Update the lead status to indicate failure, but keep the debug session ID
          const leadString = await env.TARGETS.get(urn);
          if (leadString) {
            const lead = JSON.parse(leadString);
            lead.status = "failed";
            lead.debug_session_id = debugSessionId;
            lead.error = `${error}`;
            await env.TARGETS.put(urn, JSON.stringify(lead));
          }
          
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