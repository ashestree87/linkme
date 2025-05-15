/**
 * Debug helper to determine what's working in the Worker
 */

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    try {
      // Basic HTML template
      const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkMe Diagnostics</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
          <h1 class="text-2xl font-bold text-blue-600 mb-6">LinkMe Diagnostics</h1>
          
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Request Information</h2>
            <div class="bg-gray-50 p-4 rounded">
              <p><strong>URL:</strong> ${request.url}</p>
              <p><strong>Method:</strong> ${request.method}</p>
              <p><strong>Headers:</strong> ${(() => {
                const headersObj: Record<string, string> = {};
                request.headers.forEach((value, key) => {
                  headersObj[key] = value;
                });
                return JSON.stringify(headersObj);
              })()}</p>
            </div>
          </div>

          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Environment Bindings</h2>
            <div class="bg-gray-50 p-4 rounded">
              <p><strong>KV Namespace (TARGETS):</strong> ${env.TARGETS ? "✅ Available" : "❌ Missing"}</p>
              <p><strong>D1 Database (DB):</strong> ${env.DB ? "✅ Available" : "❌ Missing"}</p>
              <p><strong>Browser (CRAWLER_BROWSER):</strong> ${env.CRAWLER_BROWSER ? "✅ Available" : "❌ Missing"}</p>
              <p><strong>LI_AT Secret:</strong> ${env.LI_AT ? "✅ Set" : "❌ Not Set"}</p>
              <p><strong>CSRF Secret:</strong> ${env.CSRF ? "✅ Set" : "❌ Not Set"}</p>
              <p><strong>USERAGENT Secret:</strong> ${env.USERAGENT ? "✅ Set" : "❌ Not Set"}</p>
              <p><strong>WEBHOOK_SECRET:</strong> ${env.WEBHOOK_SECRET ? "✅ Set" : "❌ Not Set"}</p>
            </div>
          </div>

          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">KV Test</h2>
            <div class="bg-gray-50 p-4 rounded">
              <p id="kv-result">Testing KV access...</p>
            </div>
          </div>
          
          <div>
            <h2 class="text-xl font-semibold mb-2">D1 Test</h2>
            <div class="bg-gray-50 p-4 rounded">
              <p id="d1-result">Testing D1 access...</p>
            </div>
          </div>
        </div>
      </body>
      </html>`;

      // Check KV Store
      let kvResult = "KV Not Available";
      if (env.TARGETS) {
        try {
          const listResult = await env.TARGETS.list();
          kvResult = `KV Success: Found ${listResult.keys.length} keys`;
        } catch (error: any) {
          kvResult = `KV Error: ${error.message}`;
        }
      }

      // Check D1 Database
      let d1Result = "D1 Not Available";
      if (env.DB) {
        try {
          // Try to access the events table
          const result = await env.DB.prepare("SELECT COUNT(*) as count FROM events").first();
          d1Result = `D1 Success: Found ${result.count} events`;
        } catch (error: any) {
          // If the first query fails, check if the table exists
          try {
            const tableCheck = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").first();
            if (tableCheck && tableCheck.name) {
              d1Result = "D1 Success: events table exists but is empty";
            } else {
              d1Result = "D1 Connected but events table not found";
            }
          } catch (tableError: any) {
            d1Result = `D1 Error: ${error.message}`;
          }
        }
      }

      // Replace placeholders with actual results
      const finalHtml = html
        .replace('Testing KV access...', kvResult)
        .replace('Testing D1 access...', d1Result);

      return new Response(finalHtml, {
        headers: { "Content-Type": "text/html" }
      });
    } catch (error: any) {
      return new Response(`Error in diagnostic page: ${error.message}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }
}; 