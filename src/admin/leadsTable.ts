import { LeadWithMeta } from './types';
import { formatDate, getStatusBadge } from './utils';

/**
 * Generate the leads table HTML
 */
export function generateLeadsTable(leads: LeadWithMeta[]): string {
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
      <td class="px-6 py-4">${getStatusBadge(lead.status, !!lead.debug_session_id)}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        ${lead.next_action_at ? formatDate(lead.next_action_at) : 'N/A'}
      </td>
      <td class="px-6 py-4 text-right">
        ${lead.status !== 'paused' ? `
          <button 
            class="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1 inline-flex text-xs font-medium"
            hx-post="/pause/${lead.urn}"
            hx-target="#lead-${lead.urn}"
            hx-swap="outerHTML"
            hx-confirm="Are you sure you want to pause processing for ${lead.name}?"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pause
          </button>
        ` : `
          <button 
            class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 inline-flex text-xs font-medium"
            hx-post="/resume/${lead.urn}"
            hx-target="#lead-${lead.urn}"
            hx-swap="outerHTML"
            hx-confirm="Are you sure you want to resume processing for ${lead.name}?"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Resume
          </button>
        `}
        ${lead.debug_session_id ? `
          <a href="/debug/viewer/${lead.debug_session_id}" target="_blank" class="ml-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 inline-flex items-center gap-1 text-xs font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Screenshots
          </a>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

/**
 * Generate the lead details HTML panel
 */
export function generateLeadDetails(lead: LeadWithMeta): string {
  return `
    <div class="p-6 bg-white rounded-lg shadow-md">
      <div class="flex justify-between items-start">
        <h2 class="text-xl font-semibold mb-4">Lead Details</h2>
        <button 
          class="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
          hx-get="#"
          hx-trigger="click"
          hx-target="#lead-detail-container"
          hx-swap="innerHTML"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="mb-4">
        <span class="inline-block mb-2">${getStatusBadge(lead.status, !!lead.debug_session_id)}</span>
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
      
      <div class="flex flex-wrap gap-2 mt-6">
        ${lead.status !== 'paused' ? `
          <button 
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
            hx-post="/pause/${lead.urn}"
            hx-confirm="Are you sure you want to pause processing for ${lead.name}?"
            hx-target="#lead-${lead.urn}"
            hx-swap="outerHTML"
            hx-on="htmx:afterOnLoad: document.getElementById('lead-detail-container').innerHTML = ''"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pause Lead
          </button>
        ` : `
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
            hx-post="/resume/${lead.urn}"
            hx-confirm="Are you sure you want to resume processing for ${lead.name}?"
            hx-target="#lead-${lead.urn}"
            hx-swap="outerHTML"
            hx-on="htmx:afterOnLoad: document.getElementById('lead-detail-container').innerHTML = ''"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Resume Lead
          </button>
        `}
        
        <a href="https://www.linkedin.com/sales/lead/${lead.urn}" target="_blank" rel="noopener noreferrer"
           class="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on LinkedIn
        </a>
        
        ${lead.debug_session_id ? `
          <a href="/debug/viewer/${lead.debug_session_id}" target="_blank" rel="noopener noreferrer"
             class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View Screenshots
          </a>
        ` : ''}
      </div>
      
      ${lead.debug_session_id ? `
        <div class="mt-6 pt-4 border-t border-gray-200">
          <h4 class="text-sm font-medium text-gray-500 mb-2">
            Screenshots
            <span class="text-xs text-gray-400">(Latest only, <a href="/debug/viewer/${lead.debug_session_id}" target="_blank" class="text-indigo-500 hover:underline">view all</a>)</span>
          </h4>
          <div class="bg-gray-50 rounded-md overflow-hidden border border-gray-200">
            <iframe src="/debug/viewer/${lead.debug_session_id}/latest-screenshot" class="w-full h-64 border-0"></iframe>
          </div>
        </div>
      ` : ''}
      
      <div class="mt-6 pt-4 border-t border-gray-200">
        <h4 class="text-sm font-medium text-gray-500 mb-2">Debug Information</h4>
        <pre class="bg-gray-50 p-2 rounded text-xs overflow-x-auto">${JSON.stringify(lead, null, 2)}</pre>
      </div>
    </div>
  `;
}

/**
 * Generate error response for lead details
 */
export function generateLeadDetailsError(error: Error | string): string {
  return `
    <div class="p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-xl font-semibold mb-4 text-red-600">Error Loading Lead Details</h2>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <button 
        class="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
        hx-get="#"
        hx-trigger="click"
        hx-target="#lead-detail-container"
        hx-swap="innerHTML"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Close
      </button>
    </div>
  `;
} 