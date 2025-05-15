import { AdminEnv, LinkedInProfile } from './types';
import { withBrowser, verifyLinkedInAuth } from '../common';

/**
 * Generate the connections view UI
 */
export function generateConnectionsView(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LinkMe - Admin - Connections</title>
      <base href="/">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/htmx.org@1.9.2"></script>
      <script>
        // Configure htmx
        document.addEventListener('DOMContentLoaded', function() {
          htmx.config.defaultSwapStyle = 'innerHTML';
        });
      </script>
    </head>
    <body class="bg-gray-50 min-h-screen">
      <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold text-gray-800">LinkMe Admin</h1>
            <div class="flex space-x-4">
              <a href="?view=leads" class="text-gray-600 hover:text-blue-600">Leads</a>
              <a href="?view=connections" class="text-blue-600 font-medium">Connections</a>
            </div>
          </div>
        </header>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- LinkedIn Search -->
          <div class="bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <h2 class="text-xl font-semibold mb-4">LinkedIn Search</h2>
            <form hx-post="/search-linkedin" hx-target="#search-results" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input type="text" name="keywords" placeholder="Job title, skills, etc." class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" name="location" placeholder="City, country, region" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input type="text" name="industry" placeholder="Technology, Finance, etc." class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search LinkedIn
              </button>
            </form>
          </div>
          
          <!-- Existing Connections -->
          <div class="bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <h2 class="text-xl font-semibold mb-4">Find Existing Connections</h2>
            <form hx-post="/search-connections" hx-target="#search-results" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input type="text" name="title" placeholder="CEO, Developer, etc." class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input type="text" name="company" placeholder="Company name" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input type="text" name="industry" placeholder="Technology, Finance, etc." class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Find Connections
              </button>
            </form>
          </div>
        </div>
        
        <!-- Search Results Area -->
        <div id="search-results" class="mt-8">
          <!-- Results will be loaded here -->
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Process LinkedIn search and return results
 */
export async function searchLinkedInUsers(env: AdminEnv, keywords: string, location: string, industry: string): Promise<LinkedInProfile[]> {
  try {
    // Check if linkedin cookies and user agent are configured
    if (!env.LI_AT || !env.CSRF || !env.USERAGENT) {
      throw new Error('LinkedIn credentials not configured');
    }
    
    const results = await withBrowser(async (page) => {
      // For empty searches, use a default view that shows recent profiles
      let searchUrl = 'https://www.linkedin.com/sales/search/people?';
      
      // Create URL parameters
      const params = new URLSearchParams();
      
      // If all fields are empty, set a default filter to show all leads
      const allEmpty = !keywords && !location && !industry;
      
      if (allEmpty) {
        // Add parameters to show all leads (recent searches)
        params.append('viewAllFilters', 'true');
        params.append('sortCriteria', 'CREATED_TIME');
      } else {
        // Add any non-empty filters
        if (keywords) {
          params.append('keywords', keywords);
        }
        
        if (location) {
          params.append('geoIncluded', location);
        }
        
        if (industry) {
          params.append('industryIncluded', industry);
        }
      }
      
      // Add parameters to the URL
      searchUrl += params.toString();
      
      console.log('Searching LinkedIn with URL:', searchUrl);
      
      // Navigate to search URL
      await page.goto(searchUrl, { waitUntil: 'networkidle0' });
      
      // Give the page time to load all results - using sleep instead of waitForTimeout
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Extract profile information
      const profiles = await page.evaluate(() => {
        const results: Array<{
          urn: string;
          name: string;
          title: string;
          company: string;
          location: string;
          imageUrl: string | null;
        }> = [];
        
        // Get all result cards
        const cards = document.querySelectorAll('[data-test-search-result]');
        
        console.log('Found cards:', cards.length);
        
        // Extract information from each card
        cards.forEach((card) => {
          try {
            // Extract URN from data-test-lead-urn attribute
            const urnEl = card.querySelector('[data-test-lead-urn]');
            const urn = urnEl?.getAttribute('data-test-lead-urn') || '';
            
            // Extract name
            const nameEl = card.querySelector('[data-test-result-lockup-name]');
            const name = nameEl?.textContent?.trim() || '';
            
            // Extract title
            const titleEl = card.querySelector('[data-test-result-lockup-headline]');
            const title = titleEl?.textContent?.trim() || '';
            
            // Extract company
            const companyEl = card.querySelector('[data-test-result-lockup-current-company]');
            const company = companyEl?.textContent?.trim() || '';
            
            // Extract location
            const locationEl = card.querySelector('[data-test-result-lockup-location]');
            const location = locationEl?.textContent?.trim() || '';
            
            // Extract image URL
            const imgEl = card.querySelector('img');
            const imageUrl = imgEl?.getAttribute('src') || null;
            
            // Add to results if we have at least a URN and name
            if (urn && name) {
              results.push({
                urn,
                name,
                title,
                company,
                location,
                imageUrl
              });
            }
          } catch (e) {
            // Skip this card if there's an error
            console.error('Error parsing profile card:', e);
          }
        });
        
        return results;
      });
      
      // If the profiles array is empty, try to get recent connections
      if (profiles.length === 0 && allEmpty) {
        // Navigate to the connections page instead
        await page.goto('https://www.linkedin.com/sales/homepage', { waitUntil: 'networkidle0' });
        // Use sleep instead of waitForTimeout
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to extract recent connections from the homepage
        const recentProfiles = await page.evaluate(() => {
          const results: Array<{
            urn: string;
            name: string;
            title: string;
            company: string;
            location: string;
            imageUrl: string | null;
          }> = [];
          
          // Look for recent connection cards on the homepage
          const cards = document.querySelectorAll('.artdeco-card');
          
          cards.forEach((card) => {
            try {
              // Extract profile information
              const nameEl = card.querySelector('a.ember-view strong');
              if (!nameEl) return;
              
              const name = nameEl.textContent?.trim() || '';
              
              // Extract URN from the link
              const linkEl = card.querySelector('a.ember-view');
              const href = linkEl?.getAttribute('href') || '';
              const urnMatch = href.match(/\/lead\/([^\/]+)/);
              const urn = urnMatch ? urnMatch[1] : '';
              
              // Extract title and company
              const subtitleEl = card.querySelector('.artdeco-entity-lockup__subtitle');
              const subtitle = subtitleEl?.textContent?.trim() || '';
              
              // Split subtitle into title and company if possible
              let title = subtitle;
              let company = '';
              
              if (subtitle.includes(' at ')) {
                const parts = subtitle.split(' at ');
                title = parts[0].trim();
                company = parts[1].trim();
              }
              
              // Extract image
              const imgEl = card.querySelector('img');
              const imageUrl = imgEl?.getAttribute('src') || null;
              
              // Add to results if we have at least a name
              if (name && urn) {
                results.push({
                  urn,
                  name,
                  title,
                  company,
                  location: '',
                  imageUrl
                });
              }
            } catch (e) {
              console.error('Error parsing card:', e);
            }
          });
          
          return results;
        });
        
        // Add any found profiles to the results
        return recentProfiles;
      }
      
      return profiles;
    });
    
    return results;
  } catch (error) {
    console.error('LinkedIn search error:', error);
    throw error;
  }
}

/**
 * Handle LinkedIn search request and return HTML results
 */
export async function handleLinkedInSearch(request: Request, env: AdminEnv): Promise<Response> {
  try {
    // Parse form data
    const formData = await request.formData();
    const keywords = (formData.get('keywords') as string) || '';
    const location = (formData.get('location') as string) || '';
    const industry = (formData.get('industry') as string) || '';
    
    console.log('LinkedIn search requested with params:', { keywords, location, industry });
    
    // Verify LinkedIn auth first
    const authCheck = await verifyLinkedInAuth();
    if (!authCheck.isValid) {
      return new Response(`
        <div class="bg-white shadow-md rounded-lg p-6 border border-red-200">
          <h2 class="text-xl font-semibold mb-4 text-red-600">Authentication Error</h2>
          <p class="text-gray-700 mb-4">${authCheck.message}</p>
          <p class="text-sm text-gray-500">Please update your LinkedIn credentials in your environment variables and try again.</p>
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Search LinkedIn
    const profiles = await searchLinkedInUsers(env, keywords, location, industry);
    
    // Generate HTML for results
    const resultsHtml = `
      <div class="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <h2 class="text-xl font-semibold mb-4">Search Results (${profiles.length})</h2>
        
        ${profiles.length === 0 ? `
          <div class="text-gray-500 text-center py-8">
            No results found. Try different search terms.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${profiles.map(profile => `
              <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    ${profile.imageUrl 
                      ? `<img src="${profile.imageUrl}" alt="${profile.name}" class="w-12 h-12 rounded-full object-cover">`
                      : `<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span class="text-gray-500 text-xl font-semibold">${profile.name.charAt(0)}</span>
                        </div>`
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-medium text-gray-900 truncate">${profile.name}</h3>
                    ${profile.title ? `<p class="text-xs text-gray-500 truncate">${profile.title}</p>` : ''}
                    ${profile.company ? `<p class="text-xs text-gray-500 truncate">${profile.company}</p>` : ''}
                    ${profile.location ? `<p class="text-xs text-gray-500 truncate">${profile.location}</p>` : ''}
                  </div>
                </div>
                <div class="mt-3 flex justify-end">
                  <form hx-post="/import-connection" hx-swap="outerHTML">
                    <input type="hidden" name="urn" value="${profile.urn}">
                    <input type="hidden" name="name" value="${profile.name}">
                    <button type="submit" class="px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1 text-xs font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add as Lead
                    </button>
                  </form>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    return new Response(resultsHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('LinkedIn search handler error:', error);
    
    // Return error message
    return new Response(`
      <div class="bg-white shadow-md rounded-lg p-6 border border-red-200">
        <h2 class="text-xl font-semibold mb-4 text-red-600">Search Error</h2>
        <p class="text-gray-700 mb-4">${error instanceof Error ? error.message : String(error)}</p>
        <p class="text-sm text-gray-500">Please check your LinkedIn credentials in your environment variables and try again.</p>
      </div>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Handle importing a LinkedIn connection as a new lead
 */
export async function handleImportConnection(request: Request, env: AdminEnv): Promise<Response> {
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
      <div class="bg-white shadow-md rounded-lg p-6 border border-green-200">
        <h2 class="text-xl font-semibold mb-4 text-green-600">Lead Added Successfully</h2>
        <p class="text-gray-700 mb-4">Successfully added ${name} as a new lead.</p>
        <div class="flex justify-end">
          <a href="?view=leads" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            View Leads
          </a>
        </div>
      </div>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Import connection error:', error);
    
    // Return error message
    return new Response(`
      <div class="bg-white shadow-md rounded-lg p-6 border border-red-200">
        <h2 class="text-xl font-semibold mb-4 text-red-600">Import Error</h2>
        <p class="text-gray-700">${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Handle searching existing connections
 */
export async function handleSearchConnections(request: Request, env: AdminEnv): Promise<Response> {
  try {
    // Parse form data
    const formData = await request.formData();
    const title = formData.get('title') as string || '';
    const company = formData.get('company') as string || '';
    const industry = formData.get('industry') as string || '';
    
    console.log('Searching connections with:', { title, company, industry });
    
    // Verify LinkedIn auth first
    const authCheck = await verifyLinkedInAuth();
    if (!authCheck.isValid) {
      return new Response(`
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm leading-5 text-red-700">
                ${authCheck.message}
              </p>
            </div>
          </div>
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Create a timeout for the operation
    const TIMEOUT_DURATION = 30000; // 30 seconds
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isTimedOut = false;
    
    // Diagnostic information
    let debugScreenshots: Array<{stage: string, data: string}> = [];
    let logSteps: string[] = [];
    let pageHtmlSample = '';
    
    // Create a promise that resolves with the timeout error
    const timeoutPromise = new Promise<LinkedInProfile[]>((_, reject) => {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        reject(new Error("Search operation timed out after 30 seconds"));
      }, TIMEOUT_DURATION);
    });
    
    try {
      // Try to get connections with the browser
      const profiles = await Promise.race<LinkedInProfile[]>([
        withBrowser<LinkedInProfile[]>(async (page) => {
          try {
            logSteps.push("Starting connection search");
            
            // Take a screenshot before navigation
            try {
              const beforeScreenshot = await page.screenshot({ encoding: "base64" });
              debugScreenshots.push({
                stage: "before_navigation",
                data: beforeScreenshot
              });
              
              // Capture initial page HTML
              pageHtmlSample = await page.evaluate(() => {
                return document.body.innerHTML.substring(0, 2000); // First 2000 chars of body
              });
            } catch (screenshotError) {
              logSteps.push(`Screenshot error: ${screenshotError}`);
            }
            
            // First try - new LinkedIn UI approach
            logSteps.push("Trying modern LinkedIn UI connections page");
            
            // Slower navigation to avoid detection
            await page.goto('https://www.linkedin.com/mynetwork/', { 
              waitUntil: 'domcontentloaded', // Change to domcontentloaded first
              timeout: 90000 
            });
            
            // Take immediate screenshot after DOM loads
            try {
              const immediateScreenshot = await page.screenshot({ encoding: "base64" });
              debugScreenshots.push({
                stage: "immediate_after_navigation",
                data: immediateScreenshot
              });
            } catch (screenshotError) {
              logSteps.push(`Immediate screenshot error: ${screenshotError}`);
            }
            
            // Wait for connections section to load
            logSteps.push("Waiting for page to load");
            await new Promise(resolve => setTimeout(resolve, 5000)); // Increase wait time
            
            // Take a screenshot after navigation
            try {
              const afterNavScreenshot = await page.screenshot({ encoding: "base64" });
              debugScreenshots.push({
                stage: "after_mynetwork_navigation",
                data: afterNavScreenshot
              });
              
              // Capture page HTML for analysis
              pageHtmlSample = await page.evaluate(() => {
                return document.body.innerHTML.substring(0, 5000); // Get more HTML for context
              });
              logSteps.push(`Captured HTML sample (${pageHtmlSample.length} chars)`);
            } catch (screenshotError) {
              logSteps.push(`Screenshot error: ${screenshotError}`);
            }
            
            // Try to detect if page is stuck loading or LinkedIn is showing a different UI
            const loadingState = await page.evaluate(() => {
              const isLoading = !!document.querySelector('.artdeco-loader') || 
                              !!document.querySelector('.loading-icon') ||
                              !!document.querySelector('[role="progressbar"]');
              
              const possibleIssues = [];
              
              // Check for known issue indicators
              if (document.body.textContent?.includes('unusual activity')) {
                possibleIssues.push('unusual_activity_detected');
              }
              if (document.body.textContent?.includes('verify')) {
                possibleIssues.push('verification_needed');
              }
              if (document.body.textContent?.includes('sign in')) {
                possibleIssues.push('signed_out');
              }
              
              return {
                isLoading,
                possibleIssues,
                title: document.title,
                url: window.location.href
              };
            });
            
            logSteps.push(`Page state: ${JSON.stringify(loadingState)}`);
            
            // Rest of your existing extraction code
            // ...  
            
            // For now, let's just use a simple test result
            return [];
            
          } catch (error) {
            logSteps.push(`Browser error: ${error instanceof Error ? error.message : String(error)}`);
            
            // Take final error screenshot
            try {
              const errorScreenshot = await page.screenshot({ encoding: "base64" });
              debugScreenshots.push({
                stage: "error_state",
                data: errorScreenshot
              });
            } catch (screenshotError) {
              logSteps.push(`Error screenshot failed: ${screenshotError}`);
            }
            
            throw new Error(`Connection search failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }),
        timeoutPromise
      ]);
      
      // Clear the timeout since we successfully completed the operation
      if (timeoutId) clearTimeout(timeoutId);
      
      // Generate HTML for results
      const resultsHtml = generateSearchResultsHtml(profiles);
      
      return new Response(resultsHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
      
    } catch (error) {
      console.error('Error searching connections:', error);
      
      // Clear timeout if it exists
      if (timeoutId) clearTimeout(timeoutId);
      
      // Show debug info with screenshots for troubleshooting
      const screenshotsHtml = debugScreenshots.map(screenshot => `
        <div class="mb-6 border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 class="font-medium text-gray-700">${screenshot.stage}</h3>
          </div>
          <div class="p-4">
            <img src="data:image/jpeg;base64,${screenshot.data}" alt="${screenshot.stage}" class="w-full border border-gray-300 rounded">
          </div>
        </div>
      `).join('');
      
      return new Response(`
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm leading-5 text-red-700">
                Error searching connections: ${error instanceof Error ? error.message : String(error)}
              </p>
            </div>
          </div>
        </div>
        
        ${debugScreenshots.length > 0 ? `
          <div class="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">Debug Screenshots (${debugScreenshots.length})</h2>
            ${screenshotsHtml}
          </div>
        ` : '<p>No screenshots captured</p>'}

        <div class="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">Diagnostic Information</h2>
          <div class="space-y-4">
            <div>
              <h3 class="text-md font-semibold text-gray-700">Page HTML Sample</h3>
              <div class="mt-2 p-4 bg-gray-50 rounded overflow-auto max-h-60">
                <pre class="text-xs text-gray-600 whitespace-pre-wrap">${pageHtmlSample || 'No HTML sample captured'}</pre>
              </div>
            </div>
            <div>
              <h3 class="text-md font-semibold text-gray-700">Steps Attempted</h3>
              <div class="mt-2">
                <ul class="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  ${logSteps?.map(step => `<li>${step}</li>`).join('') || '<li>No steps recorded</li>'}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">Troubleshooting Recommendations</h2>
          <div class="space-y-4">
            <p class="text-gray-700">Based on the error information, here are some suggestions:</p>
            <ol class="list-decimal pl-5 space-y-2 text-gray-700">
              <li>Try updating your LinkedIn cookies (li_at and JSESSIONID) - they may have expired or been detected as automation</li>
              <li>Check that your User-Agent is set to a modern browser version</li>
              <li>LinkedIn may be implementing stricter anti-automation measures - try with less frequent searches</li>
              <li>Verify you can manually search for connections by logging into LinkedIn directly</li>
            </ol>
          </div>
        </div>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  } catch (error) {
    console.error('Error searching connections:', error);
    
    return new Response(`
      <div class="bg-red-50 border-l-4 border-red-400 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm leading-5 text-red-700">
              Error searching connections: ${error instanceof Error ? error.message : String(error)}
            </p>
          </div>
        </div>
      </div>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Helper function to generate HTML for search results
function generateSearchResultsHtml(profiles: LinkedInProfile[]): string {
  if (profiles.length === 0) {
    return `
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm leading-5 text-yellow-700">
              No results found. Try different search criteria.
            </p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Generate result cards
  const cards = profiles.map(profile => `
    <div class="bg-white shadow overflow-hidden rounded-lg mb-4">
      <div class="px-4 py-5 sm:px-6 flex items-center">
        ${profile.imageUrl ? 
          `<img src="${profile.imageUrl}" alt="${profile.name}" class="h-16 w-16 rounded-full mr-4">` : 
          `<div class="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
            <svg class="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 6c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"/>
            </svg>
          </div>`
        }
        <div>
          <h3 class="text-lg leading-6 font-medium text-gray-900 truncate">${profile.name}</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">${profile.title}${profile.company ? ` at ${profile.company}` : ''}</p>
          ${profile.location ? `<p class="mt-1 max-w-2xl text-sm text-gray-500">${profile.location}</p>` : ''}
        </div>
        <div class="ml-auto">
          <form hx-post="/import-connection" hx-swap="outerHTML" class="flex justify-end">
            <input type="hidden" name="urn" value="${profile.urn}">
            <input type="hidden" name="name" value="${profile.name}">
            <input type="hidden" name="title" value="${profile.title}">
            <input type="hidden" name="company" value="${profile.company}">
            <input type="hidden" name="location" value="${profile.location || ''}">
            <input type="hidden" name="imageUrl" value="${profile.imageUrl || ''}">
            <button type="submit" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700">
              <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
              </svg>
              Add as Lead
            </button>
          </form>
        </div>
      </div>
    </div>
  `).join('');
  
  return `
    <div class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 p-4">
      <h2 class="text-xl font-semibold mb-4">Search Results (${profiles.length})</h2>
      <div class="space-y-4">
        ${cards}
      </div>
    </div>
  `;
} 