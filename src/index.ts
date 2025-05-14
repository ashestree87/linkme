import adminUI from './adminUI';
import sendConnection from './sendConnection';
import sendDM from './sendDM';
import scheduler from './scheduler';
import webhook from './webhook';

/**
 * Main entry point for the LinkMe application.
 * This file combines all the different features into a single worker.
 */

export interface Env {
  // KV Namespaces
  TARGETS: KVNamespace;
  
  // D1 Database
  DB: D1Database;
  
  // Queue bindings
  LINKEDIN_CONNECTIONS_QUEUE: Queue;
  LINKEDIN_DMS_QUEUE: Queue;
  
  // Browser binding for Puppeteer
  CRAWLER_BROWSER: any;
  
  // Environment variables
  WEBHOOK_SECRET: string;
  LI_AT: string;
  CSRF: string;
  USERAGENT: string;
}

export default {
  /**
   * Handle HTTP requests - delegate to adminUI by default,
   * but route /accepted to the webhook handler
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Route /accepted to webhook handler
    if (url.pathname === '/accepted') {
      return webhook.fetch(request, env);
    }
    
    // All other routes go to the admin UI
    return adminUI.fetch(request, env);
  },
  
  /**
   * Handle scheduled events (cron triggers) - delegate to scheduler
   */
  scheduled: scheduler.scheduled,
  
  /**
   * Queue handlers for processing LinkedIn connections and DMs
   */
  queue: {
    // Handle connection requests 
    'linkedin-connections': async (batch: MessageBatch<any>, env: Env): Promise<void> => {
      return sendConnection.queue(batch, env);
    },
    
    // Handle DM sending
    'linkedin-dms': async (batch: MessageBatch<any>, env: Env): Promise<void> => {
      return sendDM.queue(batch, env);
    }
  }
}; 