import { Lead } from './common';

interface LeadWithMeta extends Lead {
  next_action_at?: number;
  retry_count?: number;
}

export interface Env {
  // KV Namespaces
  TARGETS: KVNamespace;
  
  // D1 Database
  DB: D1Database;
  
  // Browser binding for Puppeteer
  CRAWLER_BROWSER: any;
  
  // Environment variables
  WEBHOOK_SECRET: string;
  LI_AT: string;
  CSRF: string;
  USERAGENT: string;
}

// Helper to format date
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Helper for status badge HTML
const getStatusBadge = (status: string): string => {
  const colors: Record<string, string> = {
    'new': 'bg-blue-100 text-blue-800',
    'invited': 'bg-yellow-100 text-yellow-800',
    'accepted': 'bg-green-100 text-green-800',
    'done': 'bg-purple-100 text-purple-800',
    'paused': 'bg-gray-100 text-gray-800',
    'failed': 'bg-red-100 text-red-800'
  };
  
  const color = colors[status] || 'bg-gray-100 text-gray-800';
  return `<span class="px-2 py-1 rounded-full text-xs font-semibold ${color}">${status}</span>`;
};

// Parse CSV data from file
const parseCSV = async (formData: FormData): Promise<{urn: string, name: string}[]> => {
  const file = formData.get('csv') as File;
  if (!file) {
    throw new Error('No CSV file uploaded');
  }
  
  const text = await file.text();
  const lines = text.split('\n');
  
  return lines
    .filter(line => line.trim() !== '')
    .map(line => {
      const [urn, name] = line.split(',').map(item => item.trim());
      if (!urn || !name) {
        throw new Error(`Invalid CSV format at line: ${line}`);
      }
      return { urn, name };
    });
};

// Simple admin UI with all features
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Handle POST requests
      if (request.method === 'POST') {
        // Handle CSV upload
        if (path === '/upload-csv') {
          return await this.handleCsvUpload(request, env);
        }
        
        // Handle lead pausing
        if (path.startsWith('/pause/')) {
          const urn = path.substring('/pause/'.length);
          return await this.handlePauseRequest(urn, env);
        }
        
        // Handle 404 for other POST routes
        return new Response('Not Found', { status: 404 });
      }
      
      // GET request - show admin UI
      // Get all leads from KV
      const leads = await this.getLeadsFromKV(env);
      
      // Generate leads table HTML
      const leadsTableHtml = await this.generateLeadsTable(leads);
      
      // Return the complete HTML page
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkMe Admin</title>
        <script src="https://unpkg.com/htmx.org@1.9.12"></script>
        <link href="https://cdn.tailwindcss.com" rel="stylesheet">
        <style>
          .htmx-indicator { opacity: 0; transition: opacity 500ms ease-in; }
          .htmx-request .htmx-indicator { opacity: 1; }
          .htmx-request.htmx-indicator { opacity: 1; }
        </style>
      </head>
      <body class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
          <h1 class="text-3xl font-bold mb-8 text-blue-700">LinkMe Admin</h1>
          
          <!-- Upload Form -->
          <div class="mb-8 p-6 bg-white rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">Upload Leads</h2>
            <form hx-post="/upload-csv" hx-encoding="multipart/form-data" hx-swap="afterend">
              <div class="flex items-center space-x-4">
                <label class="block">
                  <span class="sr-only">Choose CSV file</span>
                  <input type="file" name="csv" 
                    class="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </label>
                <button type="submit"
                  class="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload
                  <span class="htmx-indicator ml-2">
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                </button>
              </div>
            </form>
          </div>
          
          <!-- Leads Table -->
          <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URN</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Action</th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${leadsTableHtml}
              </tbody>
            </table>
          </div>
          
          <!-- System Info -->
          <div class="mt-8 p-6 bg-white rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">System Information</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <tbody class="divide-y divide-gray-200">
                  <tr>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">KV Namespace</td>
                    <td class="px-4 py-3 text-sm text-gray-700">
                      ${env.TARGETS ? "Connected" : "Not Available"}
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">Database</td>
                    <td class="px-4 py-3 text-sm text-gray-700">
                      ${env.DB ? "Connected" : "Not Available"}
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">Browser</td>
                    <td class="px-4 py-3 text-sm text-gray-700">
                      ${env.CRAWLER_BROWSER ? "Available" : "Not Available"}
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">LinkedIn Auth</td>
                    <td class="px-4 py-3 text-sm text-gray-700">
                      ${env.LI_AT && env.CSRF ? "Configured" : "Missing"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="mt-6">
              <p class="text-gray-600 text-sm">
                For detailed diagnostics, visit the <a href="/debug" class="text-blue-600 underline">debug page</a>.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html" }
      });
    } catch (error) {
      console.error("Error in admin UI:", error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  },
  
  // Handle CSV upload
  async handleCsvUpload(request: Request, env: Env): Promise<Response> {
    try {
      // Check if request has the formData method
      if (typeof request.formData !== 'function') {
        return new Response(`Error: Request missing formData method`, {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // Get the form data
      let formData;
      try {
        formData = await request.formData();
      } catch (formError) {
        console.error("FormData error:", formError);
        return new Response(`
          <div class="mt-4 p-4 bg-red-50 text-red-800 rounded-md">
            Error processing form data: ${formError instanceof Error ? formError.message : String(formError)}
          </div>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // Parse CSV
      const leads = await parseCSV(formData);
      
      // Store leads to KV with status="new"
      const timestamp = Date.now();
      for (const lead of leads) {
        const leadWithStatus = {
          ...lead,
          status: 'new',
          next_action_at: timestamp
        };
        
        await env.TARGETS.put(lead.urn, JSON.stringify(leadWithStatus));
      }
      
      return new Response(`
        <div class="mt-4 p-4 bg-green-50 text-green-800 rounded-md">
          Successfully uploaded ${leads.length} leads.
          <a href="/" class="underline">Refresh</a> to see the changes.
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (error) {
      console.error("Upload error:", error);
      return new Response(`
        <div class="mt-4 p-4 bg-red-50 text-red-800 rounded-md">
          Error: ${error instanceof Error ? error.message : String(error)}
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  },
  
  // Handle pause request
  async handlePauseRequest(urn: string, env: Env): Promise<Response> {
    try {
      if (!urn) {
        return new Response('URN parameter is required', { status: 400 });
      }
      
      // Get the lead
      const leadString = await env.TARGETS.get(urn);
      if (!leadString) {
        return new Response('Lead not found', { status: 404 });
      }
      
      // Parse and update lead
      const lead = JSON.parse(leadString);
      lead.status = 'paused';
      
      // Save updated lead
      await env.TARGETS.put(urn, JSON.stringify(lead));
      
      // Return updated row for HTMX to replace
      return new Response(`
        <tr id="lead-${lead.urn}" class="hover:bg-gray-50 bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">${lead.urn}</td>
          <td class="px-6 py-4">${lead.name}</td>
          <td class="px-6 py-4">${getStatusBadge('paused')}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            ${lead.next_action_at ? formatDate(lead.next_action_at) : 'N/A'}
          </td>
          <td class="px-6 py-4 text-right">
            <span class="px-3 py-1 text-gray-400">Paused</span>
          </td>
        </tr>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (error) {
      console.error("Error in pause route:", error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  },
  
  // Get all leads from KV
  async getLeadsFromKV(env: Env): Promise<LeadWithMeta[]> {
    try {
      // Verify KV binding exists
      if (!env || !env.TARGETS) {
        console.error("Missing TARGETS KV binding");
        return [];
      }
      
      // List all leads from KV
      const { keys } = await env.TARGETS.list();
      
      // Get all leads data
      const leads: LeadWithMeta[] = [];
      for (const key of keys) {
        const leadString = await env.TARGETS.get(key.name);
        if (leadString) {
          try {
            const lead = JSON.parse(leadString) as LeadWithMeta;
            leads.push(lead);
          } catch (parseError) {
            console.error(`Error parsing lead ${key.name}:`, parseError);
            // Continue with other leads
          }
        }
      }
      
      // Sort leads by status
      leads.sort((a, b) => {
        if (a.status === b.status) {
          return (a.next_action_at || 0) - (b.next_action_at || 0);
        }
        
        const statusOrder = ['new', 'invited', 'accepted', 'done', 'paused', 'failed'];
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      });
      
      return leads;
    } catch (error) {
      console.error("Error getting leads:", error);
      return [];
    }
  },
  
  // Generate leads table HTML
  async generateLeadsTable(leads: LeadWithMeta[]): Promise<string> {
    if (leads.length === 0) {
      return `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-gray-500">
            No leads found. Upload some leads using the form above.
          </td>
        </tr>
      `;
    }
    
    // Generate table rows
    return leads.map(lead => `
      <tr id="lead-${lead.urn}" class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">${lead.urn}</td>
        <td class="px-6 py-4">${lead.name}</td>
        <td class="px-6 py-4">${getStatusBadge(lead.status)}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${lead.next_action_at ? formatDate(lead.next_action_at) : 'N/A'}
        </td>
        <td class="px-6 py-4 text-right">
          ${lead.status !== 'paused' ? `
            <button 
              class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              hx-post="/pause/${lead.urn}"
              hx-target="#lead-${lead.urn}"
              hx-swap="outerHTML"
            >
              Pause
            </button>
          ` : `
            <span class="px-3 py-1 text-gray-400">Paused</span>
          `}
        </td>
      </tr>
    `).join('');
  }
}; 