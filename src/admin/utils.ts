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
export function getStatusBadge(status: string, hasDebugSession: boolean = false): string {
  let bgColor, textColor, label;
  
  switch (status) {
    case 'new':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      label = 'New';
      break;
    case 'invited':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      label = 'Invited';
      break;
    case 'accepted':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      label = 'Accepted';
      break;
    case 'messaged':
      bgColor = 'bg-indigo-100';
      textColor = 'text-indigo-800';
      label = 'Messaged';
      break;
    case 'done':
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      label = 'Done';
      break;
    case 'paused':
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-800';
      label = 'Paused';
      break;
    case 'failed':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      label = 'Failed';
      break;
    default:
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      label = status;
  }
  
  // Add debug icon if debug session is available
  const debugIcon = hasDebugSession ? 
    `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>` : '';
  
  return `<span class="${bgColor} ${textColor} px-2 py-1 rounded text-xs font-medium flex items-center">${label}${debugIcon}</span>`;
}

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