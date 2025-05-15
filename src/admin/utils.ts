import { AdminEnv, LeadWithMeta } from './types';

/**
 * Helper to format date
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

/**
 * Helper for status badge HTML
 */
export const getStatusBadge = (status: string): string => {
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

/**
 * Helper to generate dashboard stats
 */
export const generateDashboardStats = (leads: LeadWithMeta[]): string => {
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
          <div class="p-3 rounded-full bg-blue-50 flex items-center justify-center" style="width: 3rem; height: 3rem;">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div class="p-3 rounded-full bg-green-50 flex items-center justify-center" style="width: 3rem; height: 3rem;">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div class="p-3 rounded-full bg-purple-50 flex items-center justify-center" style="width: 3rem; height: 3rem;">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div class="p-3 rounded-full bg-red-50 flex items-center justify-center" style="width: 3rem; height: 3rem;">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

/**
 * Parse CSV data from file
 */
export const parseCSV = async (formData: FormData): Promise<{urn: string, name: string}[]> => {
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

/**
 * Get all leads from KV storage
 */
export async function getLeadsFromKV(env: AdminEnv): Promise<LeadWithMeta[]> {
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
} 