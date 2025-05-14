import { Router } from 'itty-router';
import { Lead } from './common';

// Define lead with status
interface LeadWithMeta extends Lead {
  next_action_at?: number;
}

// Interface for CSV upload
interface CSVLead {
  urn: string;
  name: string;
}

export interface Env {
  TARGETS: KVNamespace;
}

// Create a new router
const router = Router();

// HTML layout with Tailwind CSS
const layout = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkMe Admin</title>
  <script src="https://unpkg.com/htmx.org@1.9.12"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .htmx-indicator { opacity: 0; transition: opacity 500ms ease-in; }
    .htmx-request .htmx-indicator { opacity: 1; }
    .htmx-request.htmx-indicator { opacity: 1; }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8 text-blue-700">LinkMe Admin</h1>
    ${content}
  </div>
</body>
</html>
`;

// Helper to format date
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Helper for status badge
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

// Main route - display leads
router.get('/', async (request, env: Env) => {
  try {
    // Verify KV binding exists
    if (!env || !env.TARGETS) {
      console.error("Missing TARGETS KV binding");
      return new Response("Error: Missing KV binding", { status: 500 });
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
    
    // Generate table rows
    const leadsTable = leads.length > 0 ? leads.map(lead => `
      <tr id="lead-${lead.urn}" class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">${lead.urn}</td>
        <td class="px-6 py-4">${lead.name}</td>
        <td class="px-6 py-4">${getStatusBadge(lead.status)}</td>
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
    `).join('') : `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
          No leads found. Upload some leads using the form above.
        </td>
      </tr>
    `;
    
    // Generate the upload form
    const uploadForm = `
      <div class="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4">Upload Leads</h2>
        <form hx-post="/upload" hx-encoding="multipart/form-data" hx-swap="afterend">
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
    `;
    
    // Generate the leads table
    const content = `
      ${uploadForm}
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
            ${leadsTable}
          </tbody>
        </table>
      </div>
    `;
    
    return new Response(layout(content), {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error("Error in main route:", error);
    return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
});

// Parse CSV data from file
const parseCSV = async (formData: FormData): Promise<CSVLead[]> => {
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

// Upload CSV route
router.post('/upload', async (request, env: Env) => {
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
      <div class="mt-4 p-4 bg-green-50 text-green-800 rounded-md" hx-swap-oob="true">
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
});

// Pause lead route
router.post('/pause/:urn', async (request, env: Env) => {
  try {
    // Verify KV binding exists
    if (!env || !env.TARGETS) {
      console.error("Missing TARGETS KV binding");
      return new Response("Error: Missing KV binding", { status: 500 });
    }
    
    const { params } = request;
    const urn = params?.urn;
    
    if (!urn) {
      return new Response('URN parameter is required', { status: 400 });
    }
    
    // Get the lead
    const leadString = await env.TARGETS.get(urn);
    if (!leadString) {
      return new Response('Lead not found', { status: 404 });
    }
    
    // Parse and update lead
    let lead;
    try {
      lead = JSON.parse(leadString);
    } catch (parseError) {
      console.error(`Error parsing lead ${urn}:`, parseError);
      return new Response(`Error parsing lead data: ${parseError instanceof Error ? parseError.message : String(parseError)}`, { status: 500 });
    }
    
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
    return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
});

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export the router handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Use the router to handle the request
      const response = await router.handle(request, env);
      return response;
    } catch (error) {
      console.error("Error in adminUI router:", error);
      return new Response(`Error in adminUI: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }
}; 