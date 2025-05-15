import { AdminEnv, LeadWithMeta, LinkedInProfile } from './types';
import { getLeadsFromKV, parseCSV } from './utils';
import { generateLeadsTable, generateLeadDetails, generateLeadDetailsError } from './leadsTable';
import { generateConnectionsView, handleLinkedInSearch, handleImportConnection, handleSearchConnections } from './linkedInSearch';

/**
 * Main admin handler
 */
export default {
  async fetch(request: Request, env: AdminEnv): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Get view parameter from query string
      const view = url.searchParams.get('view') || 'leads';
      
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

        // Handle LinkedIn search
        if (path === '/search-linkedin') {
          return await handleLinkedInSearch(request, env);
        }
        
        // Handle connections search
        if (path === '/search-connections') {
          return await handleSearchConnections(request, env);
        }
        
        // Handle import connection
        if (path === '/import-connection') {
          return await handleImportConnection(request, env);
        }

        // Return 404 for other POST paths
        return new Response('Not found', { status: 404 });
      }
      
      // Handle GET requests
      if (request.method === 'GET') {
        // Root path - show admin UI
        if (path === '/' || path === '') {
          if (view === 'connections') {
            return await this.showConnectionsView(request, env);
          }
          return await this.showLeadsView(request, env, filterStatus);
        }
        
        // Get lead details
        if (path.startsWith('/lead-details/')) {
          const urn = path.substring('/lead-details/'.length);
          return await this.handleLeadDetails(urn, env);
        }
        
        // Filter leads
        if (path === '/filter-leads') {
          return await this.handleFilterLeads(request, env);
        }
        
        // Return 404 for other paths
        return new Response('Not found', { status: 404 });
      }
      
      // Return 405 for other methods
      return new Response('Method not allowed', { status: 405 });
    } catch (error) {
      console.error('Admin error:', error);
      return new Response(`Admin Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  /**
   * Show the leads view page
   */
  async showLeadsView(request: Request, env: AdminEnv, filterStatus: string): Promise<Response> {
    // Get all leads
    const allLeads = await getLeadsFromKV(env);
    
    // Get view from the URL
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'leads';
    
    // Filter leads by status if needed
    const leads = filterStatus === 'all' 
      ? allLeads 
      : allLeads.filter(lead => lead.status === filterStatus);
    
    // Generate stats and leads table
    const stats = generateDashboardStats(allLeads);
    const leadsTable = generateLeadsTable(leads);
    
    // Render HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkMe - Admin</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/htmx.org@1.9.2"></script>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <div class="container mx-auto px-4 py-8">
          <header class="mb-8">
            <div class="flex items-center justify-between">
              <h1 class="text-2xl font-bold text-gray-800">LinkMe Admin</h1>
              <div class="flex space-x-4">
                <a href="?view=leads" class="${view === 'leads' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}">Leads</a>
                <a href="?view=connections" class="${view === 'connections' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}">Connections</a>
              </div>
            </div>
          </header>
          
          <div class="mb-8 bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <h2 class="text-xl font-semibold mb-4">Upload Leads</h2>
            
            <form hx-post="/upload-csv" hx-encoding="multipart/form-data" hx-swap="outerHTML" class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">CSV File (format: urn,name)</label>
                <input type="file" name="csv" accept=".csv" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div class="flex items-end">
                <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Leads
                </button>
              </div>
            </form>
            
            <div class="mt-4 border-t pt-4 border-gray-200">
              <form hx-post="/add-lead" hx-swap="outerHTML" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">URN</label>
                  <input type="text" name="urn" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div class="flex items-end">
                  <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <!-- Dashboard Stats -->
          ${stats}
          
          <!-- Leads Table Section -->
          <div class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
            <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-800">Leads</h2>
              <div class="flex space-x-2">
                <a href="?view=leads&status=all" class="${filterStatus === 'all' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-gray-100 text-gray-700'} rounded text-sm">All</a>
                <a href="?view=leads&status=new" class="${filterStatus === 'new' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-gray-100 text-gray-700'} rounded text-sm">New</a>
                <a href="?view=leads&status=invited" class="${filterStatus === 'invited' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-gray-100 text-gray-700'} rounded text-sm">Invited</a>
                <a href="?view=leads&status=accepted" class="${filterStatus === 'accepted' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-gray-100 text-gray-700'} rounded text-sm">Accepted</a>
                <a href="?view=leads&status=done" class="${filterStatus === 'done' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-gray-100 text-gray-700'} rounded text-sm">Done</a>
                <a href="?view=leads&status=paused" class="${filterStatus === 'paused' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-gray-100 text-gray-700'} rounded text-sm">Paused</a>
                <a href="?view=leads&status=failed" class="${filterStatus === 'failed' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-gray-100 text-gray-700'} rounded text-sm">Failed</a>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URN</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Action</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="leads-table">
                  ${leadsTable}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Lead Details Panel -->
          <div id="lead-detail-container" class="mt-4"></div>
        </div>
      </body>
      </html>
    `;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  },

  /**
   * Show the connections view page
   */
  async showConnectionsView(request: Request, env: AdminEnv): Promise<Response> {
    // Get view from the URL
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'connections';
    
    const html = generateConnectionsView();
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  },

  /**
   * Handle the CSV upload form submission
   */
  async handleCsvUpload(request: Request, env: AdminEnv): Promise<Response> {
    try {
      // Parse form data
      const formData = await request.formData();
      
      // Use parseCSV helper to get leads from CSV
      const leads = await parseCSV(formData);
      
      // Store leads in KV
      let successCount = 0;
      let errorCount = 0;
      
      for (const lead of leads) {
        try {
          const leadData = {
            ...lead,
            status: 'new' as const,
            next_action_at: Date.now(),
          };
          
          // Store lead in KV storage
          await env.TARGETS.put(lead.urn, JSON.stringify(leadData));
          successCount++;
        } catch (error) {
          console.error(`Error adding lead ${lead.urn}:`, error);
          errorCount++;
        }
      }
      
      // Return success message
      return new Response(`
        <form hx-post="/upload-csv" hx-encoding="multipart/form-data" hx-swap="outerHTML" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">CSV File (format: urn,name)</label>
            <input type="file" name="csv" accept=".csv" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <p class="mt-2 text-sm text-green-600">Successfully added ${successCount} leads${errorCount > 0 ? ` (${errorCount} errors)` : ''}.</p>
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Leads
            </button>
          </div>
        </form>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      return new Response(`
        <form hx-post="/upload-csv" hx-encoding="multipart/form-data" hx-swap="outerHTML" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">CSV File (format: urn,name)</label>
            <input type="file" name="csv" accept=".csv" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <p class="mt-2 text-sm text-red-600">Error: ${error instanceof Error ? error.message : String(error)}</p>
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Leads
            </button>
          </div>
        </form>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  },

  /**
   * Handle lead pause request
   */
  async handlePauseRequest(urn: string, env: AdminEnv): Promise<Response> {
    try {
      // Get lead from KV
      const leadString = await env.TARGETS.get(urn);
      if (!leadString) {
        throw new Error(`Lead ${urn} not found`);
      }
      
      // Parse lead data
      const lead = JSON.parse(leadString) as LeadWithMeta;
      
      // Update status to paused
      lead.status = 'paused';
      
      // Store updated lead
      await env.TARGETS.put(urn, JSON.stringify(lead));
      
      // Generate updated table row HTML
      const rows = generateLeadsTable([lead]);
      
      return new Response(rows, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (error) {
      console.error('Pause error:', error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },

  /**
   * Handle lead resume request
   */
  async handleResumeRequest(urn: string, env: AdminEnv): Promise<Response> {
    try {
      // Get lead from KV
      const leadString = await env.TARGETS.get(urn);
      if (!leadString) {
        throw new Error(`Lead ${urn} not found`);
      }
      
      // Parse lead data
      const lead = JSON.parse(leadString) as LeadWithMeta;
      
      // Update status to new
      lead.status = 'new';
      lead.next_action_at = Date.now();
      
      // Store updated lead
      await env.TARGETS.put(urn, JSON.stringify(lead));
      
      // Generate updated table row HTML
      const rows = generateLeadsTable([lead]);
      
      return new Response(rows, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (error) {
      console.error('Resume error:', error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },

  /**
   * Handle adding a single lead
   */
  async handleAddLead(request: Request, env: AdminEnv): Promise<Response> {
    try {
      // Parse form data
      const formData = await request.formData();
      const urn = formData.get('urn') as string;
      const name = formData.get('name') as string;
      
      if (!urn || !name) {
        throw new Error('URN and Name are required');
      }
      
      // Create lead object
      const lead = {
        urn,
        name,
        status: 'new' as const,
        next_action_at: Date.now(),
      };
      
      // Store lead in KV
      await env.TARGETS.put(urn, JSON.stringify(lead));
      
      // Return success message
      return new Response(`
        <form hx-post="/add-lead" hx-swap="outerHTML" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URN</label>
            <input type="text" name="urn" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <p class="mt-2 text-sm text-green-600">Successfully added lead: ${name}.</p>
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Lead
            </button>
          </div>
        </form>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (error) {
      console.error('Add lead error:', error);
      return new Response(`
        <form hx-post="/add-lead" hx-swap="outerHTML" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URN</label>
            <input type="text" name="urn" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <p class="mt-2 text-sm text-red-600">Error: ${error instanceof Error ? error.message : String(error)}</p>
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Lead
            </button>
          </div>
        </form>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  },

  /**
   * Handle lead filtering
   */
  async handleFilterLeads(request: Request, env: AdminEnv): Promise<Response> {
    try {
      const url = new URL(request.url);
      const filterStatus = url.searchParams.get('status') || 'all';
      
      // Get all leads
      const allLeads = await getLeadsFromKV(env);
      
      // Filter leads by status if needed
      const leads = filterStatus === 'all' 
        ? allLeads 
        : allLeads.filter(lead => lead.status === filterStatus);
      
      // Generate table HTML
      const tableHtml = generateLeadsTable(leads);
      
      return new Response(tableHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (error) {
      console.error('Filter leads error:', error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },

  /**
   * Handle lead details request
   */
  async handleLeadDetails(urn: string, env: AdminEnv): Promise<Response> {
    try {
      // Get lead from KV
      const leadString = await env.TARGETS.get(urn);
      if (!leadString) {
        throw new Error(`Lead ${urn} not found`);
      }
      
      // Parse lead data
      const lead = JSON.parse(leadString) as LeadWithMeta;
      
      // Generate details HTML
      const detailsHtml = generateLeadDetails(lead);
      
      return new Response(detailsHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (error) {
      console.error('Lead details error:', error);
      return new Response(
        generateLeadDetailsError(error instanceof Error ? error : String(error)),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  },
};

/**
 * Generate dashboard stats
 */
export function generateDashboardStats(allLeads: LeadWithMeta[]): string {
  // Count leads by status
  const countByStatus: Record<string, number> = {
    new: 0,
    invited: 0,
    accepted: 0,
    done: 0,
    paused: 0,
    failed: 0
  };
  
  allLeads.forEach(lead => {
    const status = lead.status || 'new';
    countByStatus[status] = (countByStatus[status] || 0) + 1;
  });
  
  // Generate stats HTML
  const stats = `
    <div class="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <div class="bg-white shadow-md rounded-lg p-4 border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Total Leads</h3>
        <p class="mt-1 text-2xl font-semibold">${allLeads.length}</p>
      </div>
      <div class="bg-white shadow-md rounded-lg p-4 border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">New</h3>
        <p class="mt-1 text-2xl font-semibold text-blue-600">${countByStatus.new || 0}</p>
      </div>
      <div class="bg-white shadow-md rounded-lg p-4 border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Invited</h3>
        <p class="mt-1 text-2xl font-semibold text-yellow-600">${countByStatus.invited || 0}</p>
      </div>
      <div class="bg-white shadow-md rounded-lg p-4 border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Accepted</h3>
        <p class="mt-1 text-2xl font-semibold text-green-600">${countByStatus.accepted || 0}</p>
      </div>
      <div class="bg-white shadow-md rounded-lg p-4 border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Done</h3>
        <p class="mt-1 text-2xl font-semibold text-purple-600">${countByStatus.done || 0}</p>
      </div>
      <div class="bg-white shadow-md rounded-lg p-4 border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Failed/Paused</h3>
        <p class="mt-1 text-2xl font-semibold text-red-600">${(countByStatus.failed || 0) + (countByStatus.paused || 0)}</p>
      </div>
    </div>
  `;

  // Add feature highlight about screenshots
  const infoPanel = `
    <div class="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <div class="flex items-start">
        <div class="flex-shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-indigo-800">Real-time Screenshot Feedback</h3>
          <div class="mt-1 text-sm text-indigo-700">
            <p>All LinkedIn interactions now include screenshot captures so you can see exactly what's happening. Look for the <span class="inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Screenshots</span> button next to leads to view their automation progress.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return stats + infoPanel;
} 