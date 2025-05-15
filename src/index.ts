import adminHandlers from './admin/index';
import { AdminEnv } from './admin/types';
import sendConnection from './sendConnection';
import sendDM from './sendDM';

/**
 * Main entry point for the LinkMe application.
 * This file combines all the different features into a single worker.
 */

export interface Env extends AdminEnv {
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
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Store environment in global context for helpers to use
      (globalThis as any).ENVIRONMENT = env;
      
      // Admin UI routes
      if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'admin')) {
        return await adminHandlers.fetch(request, env);
      }
      
      // Health check endpoint
      if (pathParts.length === 1 && pathParts[0] === 'health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // API and other endpoints
      // TODO: Implement other endpoints here
      
      // Default 404 response
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('Application error:', error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
  
  /**
   * Handle scheduled events (cron triggers)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Log scheduled event
    console.log(`Scheduled event triggered at ${event.scheduledTime}`);
    
    // Process leads for automated actions
    // TODO: Implement scheduled processing
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