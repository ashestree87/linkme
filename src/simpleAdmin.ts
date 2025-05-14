import { Lead } from './common';

interface LeadWithMeta extends Lead {
  next_action_at?: number;
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

// Simple admin UI that doesn't use a router
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Return a simple HTML page
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkMe Admin - Simple Version</title>
        <link href="https://cdn.tailwindcss.com" rel="stylesheet">
      </head>
      <body class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
          <h1 class="text-3xl font-bold mb-8 text-blue-700">LinkMe Admin</h1>
          
          <!-- Status Card -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">System Status</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-green-50 p-4 rounded border border-green-200">
                <p class="font-medium text-green-800">✅ System Online</p>
                <p class="text-sm text-green-700 mt-1">All components are operational</p>
              </div>
              <div class="bg-blue-50 p-4 rounded border border-blue-200">
                <p class="font-medium text-blue-800">📊 Resources</p>
                <p class="text-sm text-blue-700 mt-1">Database and KV storage connected</p>
              </div>
            </div>
          </div>
          
          <!-- Upload Form -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">Upload LinkedIn Profiles</h2>
            <p class="mb-4 text-gray-600">Upload a CSV file with LinkedIn profile URNs and names.</p>
            <div class="p-4 border border-blue-200 rounded bg-blue-50 mb-4">
              <p class="text-sm text-blue-800"><strong>Format:</strong> urn,name</p>
              <p class="text-sm text-blue-800"><strong>Example:</strong> john-doe-123456,John Doe</p>
            </div>
            <form action="/upload-csv" method="post" enctype="multipart/form-data">
              <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <label class="block flex-grow">
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
                  class="py-2 px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
          
          <!-- System Info -->
          <div class="bg-white rounded-lg shadow-md p-6">
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
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">Webhook Secret</td>
                    <td class="px-4 py-3 text-sm text-gray-700">
                      ${env.WEBHOOK_SECRET ? "Configured" : "Missing"}
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
      console.error("Error in simple admin:", error);
      return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }
}; 