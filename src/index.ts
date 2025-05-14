import adminUI from './adminUI';
import sendConnection from './sendConnection';
import sendDM from './sendDM';
import scheduler from './scheduler';
import webhook from './webhook';
import debug from './debug';

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
    // Store environment in global context for access in other modules
    (globalThis as any).ENVIRONMENT = env;
    
    const url = new URL(request.url);
    
    // Route /accepted to webhook handler
    if (url.pathname === '/accepted') {
      return webhook.fetch(request, env);
    }
    
    // Route /debug to diagnostic page
    if (url.pathname === '/debug') {
      return debug.fetch(request, env);
    }
    
    // All other routes go to the admin UI
    try {
      return await adminUI.fetch(request, env);
    } catch (error) {
      console.error("Error in adminUI:", error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  },
  
  /**
   * Handle scheduled events (cron triggers) - delegate to scheduler
   */
  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Store environment in global context for access in other modules
    (globalThis as any).ENVIRONMENT = env;
    
    return scheduler.scheduled(event, env, ctx);
  },
  
  /**
   * Queue handlers for processing LinkedIn connections and DMs
   */
  queue: {
    // Handle connection requests 
    'linkedin-connections': async (batch: MessageBatch<any>, env: Env): Promise<void> => {
      // Store environment in global context for access in other modules
      (globalThis as any).ENVIRONMENT = env;
      
      return sendConnection.queue(batch, env);
    },
    
    // Handle DM sending
    'linkedin-dms': async (batch: MessageBatch<any>, env: Env): Promise<void> => {
      // Store environment in global context for access in other modules
      (globalThis as any).ENVIRONMENT = env;
      
      return sendDM.queue(batch, env);
    }
  }
}; 