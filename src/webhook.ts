/**
 * webhook.ts - Handles webhook requests from browser extension
 * 
 * This endpoint accepts POST requests with connection acceptances
 * from a browser extension and pushes them to the linkedin-dms queue.
 */

// The secret header name and value for verifying webhook requests
const WEBHOOK_SECRET_HEADER = 'X-Linkme-Secret';

// Define the expected webhook request body shape
interface WebhookRequest {
  urn: string;
}

export interface Env {
  // Environment variables
  WEBHOOK_SECRET: string;
  
  // Queue for LinkedIn DMs
  LINKEDIN_DMS_QUEUE: Queue;
  
  // KV for storing target profiles
  TARGETS: KVNamespace;
}

export default {
  /**
   * Handle incoming webhook requests
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only allow POST requests to /accepted
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/accepted') {
      return new Response('Not found', { status: 404 });
    }

    // Verify the secret header
    const secretHeader = request.headers.get(WEBHOOK_SECRET_HEADER);
    if (!secretHeader || secretHeader !== env.WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      // Parse the request body
      const bodyData = await request.json();
      
      // Type guard to validate the request body
      const isValidBody = (data: unknown): data is WebhookRequest => {
        return typeof data === 'object' && data !== null && 'urn' in data && typeof (data as any).urn === 'string';
      };
      
      // Validate the request body
      if (!isValidBody(bodyData)) {
        return new Response('Missing or invalid required field: urn', { status: 400 });
      }

      const { urn } = bodyData;
      
      // Check if the lead exists in KV
      const leadString = await env.TARGETS.get(urn);
      if (!leadString) {
        console.error(`Lead not found for URN: ${urn}`);
        return new Response(`Lead not found for URN: ${urn}`, { status: 404 });
      }
      
      // Parse the lead data
      const lead = JSON.parse(leadString);
      
      // Update the lead status to "accepted"
      lead.status = "accepted";
      
      // Update the lead in KV
      await env.TARGETS.put(urn, JSON.stringify(lead));
      
      // Enqueue the lead for DM processing
      await env.LINKEDIN_DMS_QUEUE.send({
        urn: lead.urn,
        name: lead.name
      });
      
      console.log(`Enqueued accepted connection for DM: ${lead.name} (${lead.urn})`);
      
      // Return success response
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
}; 