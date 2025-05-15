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

// Helper to generate dashboard stats
const generateDashboardStats = (leads: LeadWithMeta[]): string => {
  // Count leads by status
  const counts: Record<string, number> = {
    new: 0,
    invited: 0,
    accepted: 0,
    done: 0,
    paused: 0,
    failed: 0,
    total: leads.length
  };
  
  // Populate counts
  leads.forEach(lead => {
    if (lead.status && counts[lead.status] !== undefined) {
      counts[lead.status]++;
    }
  });
  
  // Calculate conversion rate
  const conversionRate = counts.total > 0 
    ? Math.round((counts.accepted / counts.total) * 100) 
    : 0;
  
  // Generate stat cards HTML
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Total Leads -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-500">Total Leads</h3>
            <p class="text-3xl font-bold text-gray-800">${counts.total}</p>
          </div>
          <div class="p-3 rounded-full bg-blue-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
        <div class="mt-2 flex space-x-2">
          <span class="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">${counts.new} new</span>
          <span class="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">${counts.invited} invited</span>
        </div>
      </div>
      
      <!-- Conversion Rate -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-500">Conversion Rate</h3>
            <p class="text-3xl font-bold text-gray-800">${conversionRate}%</p>
          </div>
          <div class="p-3 rounded-full bg-green-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div class="mt-2 flex space-x-2">
          <span class="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded-full">${counts.accepted} accepted</span>
        </div>
      </div>
      
      <!-- Completed -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-500">Completed</h3>
            <p class="text-3xl font-bold text-gray-800">${counts.done}</p>
          </div>
          <div class="p-3 rounded-full bg-purple-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      <!-- Issues -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-500">Issues</h3>
            <p class="text-3xl font-bold text-gray-800">${counts.failed + counts.paused}</p>
          </div>
          <div class="p-3 rounded-full bg-red-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="mt-2 flex space-x-2">
          <span class="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded-full">${counts.paused} paused</span>
          <span class="text-xs font-medium px-2 py-1 bg-red-100 text-red-800 rounded-full">${counts.failed} failed</span>
        </div>
      </div>
    </div>
  `;
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
      
      // Get filter parameter from query string
      const filterStatus = url.searchParams.get('status') || 'all';
      
      // Handle POST requests
      if (request.method === 'POST') {
        // Handle CSV upload
        if (path === '/upload-csv') {
          return await this.handleCsvUpload(request, env);
        }
        
        // Handle manual lead add
        if (path === '/add-lead') {
          return await this.handleAddLead(request, env);
        }
        
        // Handle lead pausing
        if (path.startsWith('/pause/')) {
          const urn = path.substring('/pause/'.length);
          return await this.handlePauseRequest(urn, env);
        }
        
        // Handle lead resuming
        if (path.startsWith('/resume/')) {
          const urn = path.substring('/resume/'.length);
          return await this.handleResumeRequest(urn, env);
        }
        
        // Handle filtered leads table
        if (path === '/filter-leads') {
          return await this.handleFilterLeads(request, env);
        }
        
        // Handle 404 for other POST routes
        return new Response('Not Found', { status: 404 });
      }
      
      // Handle GET requests for lead details
      if (path.startsWith('/lead-details/')) {
        const urn = path.substring('/lead-details/'.length);
        return await this.handleLeadDetails(urn, env);
      }
      
      // GET request - show admin UI
      // Get all leads from KV
      const leads = await this.getLeadsFromKV(env);
      
      // Filter leads if a status filter is applied
      const filteredLeads = filterStatus === 'all' 
        ? leads 
        : leads.filter(lead => lead.status === filterStatus);
      
      // Generate dashboard stats (based on all leads)
      const dashboardStatsHtml = generateDashboardStats(leads);
      
      // Generate leads table HTML (based on filtered leads)
      const leadsTableHtml = await this.generateLeadsTable(filteredLeads);
      
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
          
          <!-- Dashboard Stats -->
          ${dashboardStatsHtml}
          
          <!-- Upload Forms -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <!-- CSV Upload Form -->
            <div class="p-6 bg-white rounded-lg shadow-md">
              <h2 class="text-xl font-semibold mb-4">Upload Leads CSV</h2>
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
                <p class="mt-2 text-xs text-gray-500">Upload a CSV with two columns: URN,Name</p>
              </form>
            </div>
            
            <!-- Manual Add Form -->
            <div class="p-6 bg-white rounded-lg shadow-md">
              <h2 class="text-xl font-semibold mb-4">Add Single Lead</h2>
              <form hx-post="/add-lead" hx-swap="afterend">
                <div class="grid grid-cols-1 gap-4">
                  <div>
                    <label for="urn" class="block text-sm font-medium text-gray-700">LinkedIn URN</label>
                    <input type="text" id="urn" name="urn" required
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. ACoAACVs_lIBUKC..."
                    />
                  </div>
                  <div>
                    <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" id="name" name="name" required
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <button type="submit"
                      class="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add Lead
                      <span class="htmx-indicator ml-2">
                        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          <!-- Main content area -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Leads Table (takes 2/3 of space on large screens) -->
            <div class="lg:col-span-2">
              <!-- Filter Controls -->
              <div class="flex justify-between items-center mb-4">
                <div class="text-sm font-medium text-gray-700">
                  <span>Viewing: </span>
                  <span class="font-semibold text-blue-600">${filteredLeads.length}</span>
                  <span> of </span>
                  <span class="font-semibold text-blue-600">${leads.length}</span>
                  <span> leads</span>
                </div>
                
                <div class="flex items-center space-x-2">
                  <label for="status-filter" class="text-sm font-medium text-gray-700">Filter by status:</label>
                  <select id="status-filter" 
                    class="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    hx-get="/"
                    hx-trigger="change"
                    hx-target="body"
                    hx-swap="outerHTML"
                    name="status"
                  >
                    <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All Statuses</option>
                    <option value="new" ${filterStatus === 'new' ? 'selected' : ''}>New</option>
                    <option value="invited" ${filterStatus === 'invited' ? 'selected' : ''}>Invited</option>
                    <option value="accepted" ${filterStatus === 'accepted' ? 'selected' : ''}>Accepted</option>
                    <option value="done" ${filterStatus === 'done' ? 'selected' : ''}>Done</option>
                    <option value="paused" ${filterStatus === 'paused' ? 'selected' : ''}>Paused</option>
                    <option value="failed" ${filterStatus === 'failed' ? 'selected' : ''}>Failed</option>
                  </select>
                </div>
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
                  <tbody class="bg-white divide-y divide-gray-200" id="leads-table-body">
                    ${leadsTableHtml}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Lead Detail Panel (takes 1/3 of space on large screens) -->
            <div class="lg:col-span-1">
              <div id="lead-detail-container" class="sticky top-4">
                <!-- Lead details will be loaded here -->
                <div class="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Select a lead to view details</p>
                </div>
              </div>
            </div>
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
  
  // Handle resume request
  async handleResumeRequest(urn: string, env: Env): Promise<Response> {
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
      
      // Only resume if status is paused
      if (lead.status !== 'paused') {
        return new Response(`Cannot resume lead with status: ${lead.status}`, { status: 400 });
      }
      
      // Update to 'new' status and set next action to now
      lead.status = 'new';
      lead.next_action_at = Date.now();
      
      // Save updated lead
      await env.TARGETS.put(urn, JSON.stringify(lead));
      
      // Return updated row for HTMX to replace
      return new Response(`
        <tr id="lead-${lead.urn}" class="hover:bg-gray-50 bg-green-50">
          <td class="px-6 py-4 whitespace-nowrap">${lead.urn}</td>
          <td class="px-6 py-4">${lead.name}</td>
          <td class="px-6 py-4">${getStatusBadge('new')}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            ${lead.next_action_at ? formatDate(lead.next_action_at) : 'N/A'}
          </td>
          <td class="px-6 py-4 text-right">
            <button 
              class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              hx-post="/pause/${lead.urn}"
              hx-target="#lead-${lead.urn}"
              hx-swap="outerHTML"
            >
              Pause
            </button>
          </td>
        </tr>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (error) {
      console.error("Error in resume route:", error);
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
        <td class="px-6 py-4 whitespace-nowrap cursor-pointer"
            hx-get="/lead-details/${lead.urn}"
            hx-target="#lead-detail-container"
            hx-trigger="click"
            hx-swap="innerHTML"
        >${lead.urn}</td>
        <td class="px-6 py-4 cursor-pointer"
            hx-get="/lead-details/${lead.urn}"
            hx-target="#lead-detail-container"
            hx-trigger="click"
            hx-swap="innerHTML"
        >${lead.name}</td>
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
              hx-confirm="Are you sure you want to pause processing for ${lead.name}?"
            >
              Pause
            </button>
          ` : `
            <button 
              class="px-3 py-1 bg-blue-200 text-blue-700 rounded hover:bg-blue-300"
              hx-post="/resume/${lead.urn}"
              hx-target="#lead-${lead.urn}"
              hx-swap="outerHTML"
              hx-confirm="Are you sure you want to resume processing for ${lead.name}?"
            >
              Resume
            </button>
          `}
        </td>
      </tr>
    `).join('');
  },
  
  // Handle manual lead add
  async handleAddLead(request: Request, env: Env): Promise<Response> {
    try {
      // Get form data
      const formData = await request.formData();
      const urn = formData.get('urn') as string;
      const name = formData.get('name') as string;
      
      // Validate inputs
      if (!urn || !name) {
        return new Response(`
          <div class="mt-4 p-4 bg-red-50 text-red-800 rounded-md">
            Error: URN and Name are required.
          </div>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // Store the lead with status="new"
      const timestamp = Date.now();
      const leadWithStatus = {
        urn,
        name,
        status: 'new',
        next_action_at: timestamp
      };
      
      await env.TARGETS.put(urn, JSON.stringify(leadWithStatus));
      
      return new Response(`
        <div class="mt-4 p-4 bg-green-50 text-green-800 rounded-md">
          Successfully added lead: ${name}.
          <a href="/" class="underline">Refresh</a> to see the changes.
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (error) {
      console.error("Add lead error:", error);
      return new Response(`
        <div class="mt-4 p-4 bg-red-50 text-red-800 rounded-md">
          Error: ${error instanceof Error ? error.message : String(error)}
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  },
  
  // Handle filter leads request
  async handleFilterLeads(request: Request, env: Env): Promise<Response> {
    try {
      // Get form data
      const formData = await request.formData();
      const status = formData.get('status') as string;
      
      // Get all leads
      const leads = await this.getLeadsFromKV(env);
      
      // Filter leads if a status is selected
      const filteredLeads = status === 'all' 
        ? leads 
        : leads.filter(lead => lead.status === status);
      
      // Generate table HTML
      const leadsTableHtml = await this.generateLeadsTable(filteredLeads);
      
      // Return just the table body for HTMX to replace
      return new Response(leadsTableHtml, {
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (error) {
      console.error("Filter error:", error);
      return new Response(`
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-red-500">
            Error filtering leads: ${error instanceof Error ? error.message : String(error)}
          </td>
        </tr>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  },
  
  // Handle lead details request
  async handleLeadDetails(urn: string, env: Env): Promise<Response> {
    try {
      if (!urn) {
        return new Response('URN parameter is required', { status: 400 });
      }
      
      // Get the lead
      const leadString = await env.TARGETS.get(urn);
      if (!leadString) {
        return new Response('Lead not found', { status: 404 });
      }
      
      // Parse the lead data
      const lead = JSON.parse(leadString) as LeadWithMeta;
      
      // Generate the detail HTML
      const detailHtml = `
        <div class="p-6 bg-white rounded-lg shadow-md">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold mb-4">Lead Details</h2>
            <button 
              class="text-gray-400 hover:text-gray-600"
              hx-get="#"
              hx-trigger="click"
              hx-target="#lead-detail-container"
              hx-swap="innerHTML"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="mb-4">
            <span class="inline-block mb-2">${getStatusBadge(lead.status)}</span>
            <h3 class="text-lg font-bold">${lead.name}</h3>
            <p class="text-gray-600 text-sm">URN: ${lead.urn}</p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 class="text-sm font-medium text-gray-500">Next Action</h4>
              <p class="font-medium">${lead.next_action_at ? formatDate(lead.next_action_at) : 'N/A'}</p>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-500">Retry Count</h4>
              <p class="font-medium">${lead.retry_count || 0}</p>
            </div>
          </div>
          
          <div class="flex space-x-2 mt-6">
            ${lead.status !== 'paused' ? `
              <button 
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                hx-post="/pause/${lead.urn}"
                hx-confirm="Are you sure you want to pause processing for ${lead.name}?"
                hx-target="#lead-${lead.urn}"
                hx-swap="outerHTML"
                hx-on="htmx:afterOnLoad: document.getElementById('lead-detail-container').innerHTML = ''"
              >
                Pause Lead
              </button>
            ` : `
              <button 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                hx-post="/resume/${lead.urn}"
                hx-confirm="Are you sure you want to resume processing for ${lead.name}?"
                hx-target="#lead-${lead.urn}"
                hx-swap="outerHTML"
                hx-on="htmx:afterOnLoad: document.getElementById('lead-detail-container').innerHTML = ''"
              >
                Resume Lead
              </button>
            `}
            
            <a href="https://www.linkedin.com/sales/lead/${lead.urn}" target="_blank" rel="noopener noreferrer"
               class="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
              View on LinkedIn
            </a>
          </div>
          
          <div class="mt-6 pt-4 border-t border-gray-200">
            <h4 class="text-sm font-medium text-gray-500 mb-2">Debug Information</h4>
            <pre class="bg-gray-50 p-2 rounded text-xs overflow-x-auto">${JSON.stringify(lead, null, 2)}</pre>
          </div>
        </div>
      `;
      
      return new Response(detailHtml, {
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (error) {
      console.error("Error in lead details:", error);
      return new Response(`
        <div class="p-6 bg-white rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4 text-red-600">Error Loading Lead Details</h2>
          <p>${error instanceof Error ? error.message : String(error)}</p>
          <button 
            class="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            hx-get="#"
            hx-trigger="click"
            hx-target="#lead-detail-container"
            hx-swap="innerHTML"
          >
            Close
          </button>
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }
}; 