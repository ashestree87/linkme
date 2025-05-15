import adminHandlers from './admin/index';
import { AdminEnv } from './admin/types';
import sendConnection from './sendConnection';
import sendDM from './sendDM';
import * as debugViewer from './debug';
import { DebugSession } from './debug';

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
      
      // Real-time screenshot viewer endpoint
      if (pathParts[0] === 'debug' && pathParts[1] === 'viewer') {
        const sessionId = pathParts[2];
        
        if (!sessionId) {
          // List all active sessions
          const sessions = Array.from(debugViewer.getActiveSessions().values()).map(session => ({
            id: session.id,
            startTime: session.startTime,
            status: session.status,
            screenshotCount: session.screenshots.length,
            logCount: session.logs.length
          }));
          
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>LinkedIn Debug Sessions</title>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-100 p-8">
              <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
                <h1 class="text-xl font-bold mb-4">LinkedIn Debug Sessions</h1>
                
                ${sessions.length > 0 ? `
                  <div class="overflow-x-auto">
                    <table class="min-w-full border">
                      <thead>
                        <tr class="bg-gray-50">
                          <th class="border px-4 py-2">Session ID</th>
                          <th class="border px-4 py-2">Start Time</th>
                          <th class="border px-4 py-2">Status</th>
                          <th class="border px-4 py-2">Screenshots</th>
                          <th class="border px-4 py-2">Logs</th>
                          <th class="border px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${sessions.map(session => `
                          <tr>
                            <td class="border px-4 py-2 font-mono text-sm">${session.id}</td>
                            <td class="border px-4 py-2">${session.startTime.toISOString()}</td>
                            <td class="border px-4 py-2">
                              <span class="${
                                session.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              } px-2 py-1 rounded text-xs font-semibold">${session.status}</span>
                            </td>
                            <td class="border px-4 py-2 text-center">${session.screenshotCount}</td>
                            <td class="border px-4 py-2 text-center">${session.logCount}</td>
                            <td class="border px-4 py-2">
                              <a href="/debug/viewer/${session.id}" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">View</a>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : `
                  <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p class="text-yellow-800">No active debug sessions found.</p>
                  </div>
                `}
                
                <div class="mt-6">
                  <h2 class="text-lg font-semibold mb-2">Start a Debug Session</h2>
                  <p class="text-gray-600 mb-4">To start a new debug session, use the LinkedIn actions with the debug parameter enabled.</p>
                  
                  <div class="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 class="font-medium mb-2">Example API call:</h3>
                    <pre class="bg-gray-800 text-white p-3 rounded overflow-x-auto"><code>POST /sendConnection
{
  "profileUrl": "https://www.linkedin.com/in/example",
  "debug": true
}</code></pre>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' },
          });
        }
        
        // Check if we're looking for the latest screenshot only
        if (pathParts[3] === 'latest-screenshot') {
          const html = debugViewer.generateLatestScreenshotHtml(sessionId);
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
          });
        }
        
        // Show specific session
        const html = debugViewer.generateDebugViewerHtml(sessionId);
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
      
      // Admin UI routes - also handle API-like admin paths
      if (
        pathParts.length === 0 || 
        (pathParts.length === 1 && pathParts[0] === 'admin') ||
        (pathParts.length === 1 && ['search-linkedin', 'search-connections', 'import-connection'].includes(pathParts[0]))
      ) {
        return await adminHandlers.fetch(request, env);
      }
      
      // Health check endpoint
      if (pathParts.length === 1 && pathParts[0] === 'health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // LinkedIn authentication test endpoint
      if (pathParts.length === 1 && pathParts[0] === 'linkedin-test') {
        const { verifyLinkedInAuth } = await import('./common');
        const authStatus = await verifyLinkedInAuth();
        
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LinkedIn Auth Test</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-gray-100 p-8">
            <div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
              <h1 class="text-xl font-bold mb-4">LinkedIn Authentication Test</h1>
              
              <div class="mb-4 p-4 rounded-md ${authStatus.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
                <p class="font-medium ${authStatus.isValid ? 'text-green-700' : 'text-red-700'}">${authStatus.isValid ? '✅ Authentication Working' : '❌ Authentication Failed'}</p>
                <p class="text-sm mt-1 ${authStatus.isValid ? 'text-green-600' : 'text-red-600'}">${authStatus.message}</p>
              </div>
              
              <div class="mt-6">
                <h2 class="text-lg font-semibold mb-2">LinkedIn Credentials</h2>
                <div class="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p><strong>LI_AT Cookie:</strong> ${env.LI_AT ? '***' + env.LI_AT.substr(-5) : 'Not set'}</p>
                  <p><strong>CSRF Token:</strong> ${env.CSRF ? '***' + env.CSRF.substr(-5) : 'Not set'}</p>
                  <p><strong>User Agent:</strong> ${env.USERAGENT ? 'Set' : 'Not set'}</p>
                </div>
                
                <div class="mt-4 text-sm text-gray-600">
                  <p class="mb-2"><strong>How to update LinkedIn credentials:</strong></p>
                  <ol class="list-decimal pl-5 space-y-1">
                    <li>Log in to LinkedIn in your browser</li>
                    <li>Open Developer Tools (F12 or Right-click > Inspect)</li>
                    <li>Go to the Application tab > Cookies > linkedin.com</li>
                    <li>Find the 'li_at' cookie and copy its value to your environment variable</li>
                    <li>Find the 'JSESSIONID' cookie (with quotes) and copy its value to your CSRF variable</li>
                    <li>Update your wrangler.toml or environment settings with these values</li>
                    <li>Redeploy your worker</li>
                  </ol>
                </div>
                
                <div class="mt-4">
                  <a href="/linkedin-debug" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block">View Debug Information</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
      
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error(`Error processing request: ${error}`);
      return new Response(`Error: ${error}`, { status: 500 });
    }
  },

  /**
   * Handle scheduled tasks
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
