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
      
      // LinkedIn debug information endpoint
      if (pathParts.length === 1 && pathParts[0] === 'linkedin-debug') {
        const { verifyLinkedInAuth } = await import('./common');
        const authStatus = await verifyLinkedInAuth();
        
        // If debugInfo is not available, show a message
        if (!authStatus.debugInfo) {
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>LinkedIn Debug Info</title>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-100 p-8">
              <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
                <h1 class="text-xl font-bold mb-4">LinkedIn Debug Information</h1>
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p class="text-yellow-800">No debug information available. Please run the LinkedIn test again.</p>
                </div>
                <div class="mt-4">
                  <a href="/linkedin-test" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block">Back to Test</a>
                </div>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' },
          });
        }
        
        // Generate HTML for timeline entries
        const timelineHtml = authStatus.debugInfo.timeline.map((entry: string) => 
          `<li class="py-1 border-b border-gray-100">${entry}</li>`
        ).join('');
        
        // Generate HTML for screenshots
        const screenshotsHtml = authStatus.debugInfo.screenshots.map((screenshot: any) => `
          <div class="mb-6 border border-gray-200 rounded-lg overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 class="font-medium text-gray-700">${screenshot.stage}</h3>
            </div>
            <div class="p-4">
              <img src="data:image/jpeg;base64,${screenshot.data}" alt="${screenshot.stage}" class="w-full border border-gray-300 rounded">
            </div>
          </div>
        `).join('');
        
        // Generate HTML for login check results
        let loginCheckHtml = '<p>No login check data available</p>';
        if (authStatus.debugInfo.loginCheck) {
          const loginCheck = authStatus.debugInfo.loginCheck;
          
          // Generate HTML for selectors
          let selectorRows = '';
          for (const [selector, found] of Object.entries(loginCheck.selectors)) {
            selectorRows += `
              <tr>
                <td class="border px-4 py-2 font-mono text-sm">${selector}</td>
                <td class="border px-4 py-2 text-center">${found ? '✅' : '❌'}</td>
              </tr>
            `;
          }
          
          loginCheckHtml = `
            <div class="mb-4">
              <h3 class="font-medium text-gray-700 mb-2">Page Title</h3>
              <p class="bg-gray-50 p-2 rounded border border-gray-200">${loginCheck.pageTitle || 'No title'}</p>
            </div>
            
            <div class="mb-4">
              <h3 class="font-medium text-gray-700 mb-2">Page Content Preview</h3>
              <p class="bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">${loginCheck.bodyText || 'No content'}</p>
            </div>
            
            <div>
              <h3 class="font-medium text-gray-700 mb-2">Login Selectors</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full bg-white border">
                  <thead>
                    <tr>
                      <th class="border px-4 py-2 bg-gray-50">Selector</th>
                      <th class="border px-4 py-2 bg-gray-50">Found</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${selectorRows}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LinkedIn Debug Info</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-gray-100 p-8">
            <div class="max-w-4xl mx-auto">
              <div class="flex gap-4 mb-6">
                <a href="/linkedin-test" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block">Back to Test</a>
                <h1 class="text-2xl font-bold">LinkedIn Debug Information</h1>
              </div>
              
              <div class="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
                <h2 class="text-xl font-semibold mb-4">Authentication Status</h2>
                <div class="mb-4 p-4 rounded-md ${authStatus.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
                  <p class="font-medium ${authStatus.isValid ? 'text-green-700' : 'text-red-700'}">${authStatus.isValid ? '✅ Authentication Working' : '❌ Authentication Failed'}</p>
                  <p class="text-sm mt-1 ${authStatus.isValid ? 'text-green-600' : 'text-red-600'}">${authStatus.message}</p>
                </div>
              </div>
              
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Timeline Section -->
                <div class="bg-white rounded-xl shadow-md overflow-hidden p-6">
                  <h2 class="text-xl font-semibold mb-4">Timeline</h2>
                  <ul class="divide-y divide-gray-100">
                    ${timelineHtml || '<li class="py-1">No timeline data available</li>'}
                  </ul>
                </div>
                
                <!-- Login Check Section -->
                <div class="bg-white rounded-xl shadow-md overflow-hidden p-6">
                  <h2 class="text-xl font-semibold mb-4">Login Check Results</h2>
                  ${loginCheckHtml}
                </div>
              </div>
              
              <!-- Screenshots Section -->
              <div class="mt-6 bg-white rounded-xl shadow-md overflow-hidden p-6">
                <h2 class="text-xl font-semibold mb-4">Screenshots</h2>
                ${screenshotsHtml || '<p>No screenshots available</p>'}
              </div>
            </div>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
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