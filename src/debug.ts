/**
 * Debug helper to determine what's working in the Worker
 */

import { Page } from '@cloudflare/puppeteer';
import { takeScreenshot } from './utils';

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

/**
 * Screenshot capture configuration
 */
export interface ScreenshotConfig {
  enabled: boolean;
  frequency: 'low' | 'medium' | 'high' | 'manual';
  saveLocally: boolean;
  maxScreenshots?: number;
}

/**
 * Default configuration for screenshot capture
 */
const DEFAULT_SCREENSHOT_CONFIG: ScreenshotConfig = {
  enabled: false,
  frequency: 'medium',
  saveLocally: true,
  maxScreenshots: 20,
};

/**
 * Debug session information including screenshots
 */
export interface DebugSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'error';
  logs: string[];
  screenshots: Array<{ 
    timestamp: Date; 
    name: string; 
    data: string;
  }>;
  error?: string;
}

// Store active debug sessions
const activeSessions: Map<string, DebugSession> = new Map();

/**
 * Get all active debug sessions
 * @returns Map of session ID to session
 */
export function getActiveSessions(): Map<string, DebugSession> {
  return activeSessions;
}

/**
 * Create a new debug session
 * @returns Session ID
 */
export function createDebugSession(): string {
  const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  const session: DebugSession = {
    id: sessionId,
    startTime: new Date(),
    status: 'running',
    logs: [],
    screenshots: [],
  };
  
  activeSessions.set(sessionId, session);
  
  // After 2 hours, clean up old sessions automatically
  setTimeout(() => {
    if (activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId);
      if (session && session.status === 'running') {
        session.status = 'completed';
        session.endTime = new Date();
      }
    }
  }, 2 * 60 * 60 * 1000);
  
  return sessionId;
}

/**
 * Add a log entry to a debug session
 * @param sessionId Debug session ID
 * @param message Log message
 */
export function addDebugLog(sessionId: string, message: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.logs.push(`[${new Date().toISOString()}] ${message}`);
  }
}

/**
 * Add a screenshot to a debug session
 * @param sessionId Debug session ID
 * @param name Screenshot name
 * @param data Screenshot data (base64)
 */
export function addDebugScreenshot(sessionId: string, name: string, data: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    // Add the screenshot to the session
    session.screenshots.push({
      timestamp: new Date(),
      name,
      data
    });
    
    // If we have a max screenshots limit, remove the oldest ones
    if (session.screenshots.length > (DEFAULT_SCREENSHOT_CONFIG.maxScreenshots || 20)) {
      session.screenshots.shift(); // Remove the oldest screenshot
    }
  }
}

/**
 * Get debug session information
 * @param sessionId Debug session ID
 * @returns Debug session or null if not found
 */
export function getDebugSession(sessionId: string): DebugSession | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Complete a debug session
 * @param sessionId Debug session ID
 * @param error Optional error message
 */
export function completeDebugSession(sessionId: string, error?: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.status = error ? 'error' : 'completed';
    session.endTime = new Date();
    if (error) {
      session.error = error;
    }
  }
}

/**
 * Generate HTML for the debug viewer
 * @param sessionId Debug session ID
 * @returns HTML content
 */
export function generateDebugViewerHtml(sessionId: string): string {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkedIn Debug Viewer</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
          <h1 class="text-xl font-bold mb-4">LinkedIn Debug Viewer</h1>
          <div class="bg-red-50 border-l-4 border-red-400 p-4">
            <p class="text-red-800">Session not found. Please create a debug session first.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  // Generate HTML for logs
  const logsHtml = session.logs.map((log) => 
    `<div class="py-1 border-b border-gray-100 text-sm font-mono">${log}</div>`
  ).join('');
  
  // Generate HTML for screenshots
  const screenshotsHtml = session.screenshots.map((screenshot) => `
    <div class="mb-6 border border-gray-200 rounded-lg overflow-hidden">
      <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 class="font-medium text-gray-700">${screenshot.name}</h3>
        <p class="text-xs text-gray-500">${screenshot.timestamp.toISOString()}</p>
      </div>
      <div class="p-4">
        <img src="data:image/png;base64,${screenshot.data}" alt="${screenshot.name}" class="w-full border border-gray-300 rounded">
      </div>
    </div>
  `).join('');
  
  // Generate status badge
  let statusBadge = '';
  if (session.status === 'running') {
    statusBadge = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">Running</span>';
  } else if (session.status === 'completed') {
    statusBadge = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">Completed</span>';
  } else {
    statusBadge = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Error</span>';
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LinkedIn Debug Viewer - ${session.id}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        // Auto-refresh the page every 5 seconds if the session is running
        const isRunning = "${session.status}" === "running";
        if (isRunning) {
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      </script>
    </head>
    <body class="bg-gray-100 p-4">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold">LinkedIn Debug Viewer</h1>
          ${statusBadge}
        </div>
        
        <div class="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Session Information</h2>
            <button onclick="window.location.reload()" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Refresh
            </button>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p class="text-gray-600 text-sm mb-1">Session ID</p>
              <p class="font-mono text-sm">${session.id}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">Status</p>
              <p>${statusBadge}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">Start Time</p>
              <p class="text-sm">${session.startTime.toISOString()}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">Duration</p>
              <p class="text-sm">${
                session.endTime 
                  ? `${Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)} seconds` 
                  : `${Math.round((new Date().getTime() - session.startTime.getTime()) / 1000)} seconds (running)`
              }</p>
            </div>
          </div>
          
          ${session.error ? `
            <div class="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
              <p class="text-red-800">${session.error}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Screenshots Section -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden p-6">
            <h2 class="text-xl font-semibold mb-4">Screenshots (${session.screenshots.length})</h2>
            <div class="overflow-y-auto max-h-[70vh]">
              ${screenshotsHtml || '<p class="text-gray-500">No screenshots available yet.</p>'}
            </div>
          </div>
          
          <!-- Logs Section -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden p-6">
            <h2 class="text-xl font-semibold mb-4">Logs (${session.logs.length})</h2>
            <div class="overflow-y-auto max-h-[70vh]">
              ${logsHtml || '<p class="text-gray-500">No logs available yet.</p>'}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Debug-enabled wrapper for browser page
 * Automatically captures screenshots based on configuration
 * @param page Puppeteer page
 * @param sessionId Debug session ID
 * @param config Screenshot configuration
 * @returns Wrapped page object
 */
export function createDebugEnabledPage(
  page: Page, 
  sessionId: string,
  config: Partial<ScreenshotConfig> = {}
): Page {
  // Merge config with defaults
  const fullConfig: ScreenshotConfig = {
    ...DEFAULT_SCREENSHOT_CONFIG,
    ...config
  };
  
  if (!fullConfig.enabled) {
    return page; // Return original page if debugging is not enabled
  }
  
  // Setup screenshot interval based on frequency
  let interval: NodeJS.Timeout | null = null;
  
  if (fullConfig.frequency !== 'manual') {
    const intervalTime = 
      fullConfig.frequency === 'high' ? 2000 : 
      fullConfig.frequency === 'medium' ? 5000 : 10000;
    
    interval = setInterval(async () => {
      try {
        const data = await takeScreenshot(page, 'auto_capture', false);
        addDebugScreenshot(sessionId, 'Auto Capture', data);
      } catch (e) {
        // Silently fail - don't interrupt the automation for screenshot errors
        addDebugLog(sessionId, `Screenshot error: ${e}`);
      }
    }, intervalTime);
  }
  
  // Create a wrapper that intercepts navigation and takes screenshots
  const originalGoto = page.goto.bind(page);
  page.goto = async (url: string, options?: any) => {
    addDebugLog(sessionId, `Navigating to: ${url}`);
    
    // Take screenshot before navigation
    try {
      const beforeData = await takeScreenshot(page, 'before_navigation', false);
      addDebugScreenshot(sessionId, `Before Navigation to ${new URL(url).hostname}`, beforeData);
    } catch (e) {
      // Silently ignore - page might not be ready yet
    }
    
    // Perform the navigation
    const response = await originalGoto(url, options);
    
    // Wait a bit for page to render
    await new Promise(r => setTimeout(r, 500));
    
    // Take screenshot after navigation
    try {
      const afterData = await takeScreenshot(page, 'after_navigation', false);
      addDebugScreenshot(sessionId, `After Navigation to ${new URL(url).hostname}`, afterData);
    } catch (e) {
      addDebugLog(sessionId, `Error capturing post-navigation screenshot: ${e}`);
    }
    
    return response;
  };
  
  // Cleanup when browser closes
  const cleanup = () => {
    if (interval) {
      clearInterval(interval);
    }
    completeDebugSession(sessionId);
  };
  
  // Add event listener to clean up when browser closes
  page.browser().on('disconnected', cleanup);
  
  return page;
}

/**
 * Capture a debug screenshot manually
 * @param page Puppeteer page
 * @param sessionId Debug session ID
 * @param name Screenshot name
 */
export async function captureDebugScreenshot(page: Page, sessionId: string, name: string): Promise<void> {
  try {
    const data = await takeScreenshot(page, name, false);
    addDebugScreenshot(sessionId, name, data);
    addDebugLog(sessionId, `Captured screenshot: ${name}`);
  } catch (e) {
    addDebugLog(sessionId, `Error capturing screenshot ${name}: ${e}`);
  }
}

/**
 * Generate HTML for the latest screenshot from a debug session
 * @param sessionId Debug session ID
 * @returns HTML content with just the latest screenshot
 */
export function generateLatestScreenshotHtml(sessionId: string): string {
  const session = activeSessions.get(sessionId);
  
  if (!session || session.screenshots.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Latest Screenshot</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-4">
        <div class="flex items-center justify-center h-full">
          <div class="text-center p-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p class="mt-2">No screenshots available</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  // Get the latest screenshot
  const latestScreenshot = session.screenshots[session.screenshots.length - 1];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Latest Screenshot - ${latestScreenshot.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        // Auto-refresh the image every 5 seconds if the session is running
        const isRunning = "${session.status}" === "running";
        if (isRunning) {
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      </script>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; }
        .screenshot-container { height: 100%; display: flex; align-items: center; justify-content: center; }
        .screenshot-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
      </style>
    </head>
    <body>
      <div class="screenshot-container">
        <img src="data:image/png;base64,${latestScreenshot.data}" alt="${latestScreenshot.name}" />
      </div>
    </body>
    </html>
  `;
} 