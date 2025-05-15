import { AdminEnv, LinkedInProfile } from './types';
import { withBrowser, withHumanBrowser, verifyLinkedInAuth } from '../common';

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
    
    try {
      // First try with human-like browser
      console.log('Attempting LinkedIn search with human-like browser...');
      return await withHumanBrowser(async (page) => {
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
        
        // Give the page time to load all results - using variable sleep for human-like behavior
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 3000));
        
        // Scroll down a bit to load more results (simulating human behavior)
        await page.evaluate(() => {
          window.scrollBy(0, 500 + Math.random() * 300);
        });
        
        // Wait a bit after scrolling
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
        
        // Extract profile information with improved selectors
        const profiles = await page.evaluate(() => {
          const results: Array<{
            urn: string;
            name: string;
            title: string;
            company: string;
            location: string;
            imageUrl: string | null;
          }> = [];
          
          // Try multiple selectors to find result cards
          const selectors = [
            '[data-test-search-result]',
            '.artdeco-list__item',
            '.search-results__result-item',
            '.entity-result__item'
          ];
          
          let cards: NodeListOf<Element> | null = null;
          
          // Try each selector until we find cards
          for (const selector of selectors) {
            const foundCards = document.querySelectorAll(selector);
            if (foundCards.length > 0) {
              cards = foundCards;
              break;
            }
          }
          
          // If no cards found with specific selectors, try a more generic approach
          if (!cards || cards.length === 0) {
            cards = document.querySelectorAll('[data-control-name*="search_srp"], .artdeco-entity-lockup');
          }
          
          console.log('Found cards:', cards?.length || 0);
          
          if (cards && cards.length > 0) {
            cards.forEach((card) => {
              try {
                // Extract URN from data attributes
                let urn = '';
                const urnEl = card.querySelector('[data-test-lead-urn], [data-entity-urn], [data-id]');
                if (urnEl) {
                  urn = urnEl.getAttribute('data-test-lead-urn') || 
                        urnEl.getAttribute('data-entity-urn') || 
                        urnEl.getAttribute('data-id') || '';
                }
                
                // If no URN found in data attributes, try to extract from href
                if (!urn) {
                  const linkEl = card.querySelector('a[href*="/in/"], a[href*="/lead/"]');
                  if (linkEl) {
                    const href = linkEl.getAttribute('href') || '';
                    const inMatch = href.match(/\/in\/([^\/\?]+)/);
                    const leadMatch = href.match(/\/lead\/([^\/\?]+)/);
                    urn = inMatch ? inMatch[1] : leadMatch ? leadMatch[1] : '';
                  }
                }
                
                // Extract name with multiple selectors
                const nameSelectors = [
                  '[data-test-result-lockup-name]',
                  '.artdeco-entity-lockup__title',
                  '.entity-result__title-text',
                  '.result-lockup__name',
                  '.search-result__title',
                  'h3',
                  '.name'
                ];
                
                let name = '';
                for (const selector of nameSelectors) {
                  const nameEl = card.querySelector(selector);
                  if (nameEl) {
                    name = nameEl.textContent?.trim() || '';
                    if (name) break;
                  }
                }
                
                // Extract title with multiple selectors
                const titleSelectors = [
                  '[data-test-result-lockup-headline]',
                  '.artdeco-entity-lockup__subtitle',
                  '.entity-result__primary-subtitle',
                  '.result-lockup__highlight-keyword',
                  '.search-result__subtitle',
                  '.headline'
                ];
                
                let title = '';
                for (const selector of titleSelectors) {
                  const titleEl = card.querySelector(selector);
                  if (titleEl) {
                    title = titleEl.textContent?.trim() || '';
                    if (title) break;
                  }
                }
                
                // Extract company with multiple selectors
                const companySelectors = [
                  '[data-test-result-lockup-current-company]',
                  '.entity-result__secondary-subtitle',
                  '.artdeco-entity-lockup__caption',
                  '.result-lockup__position-company',
                  '.search-result__company-name'
                ];
                
                let company = '';
                for (const selector of companySelectors) {
                  const companyEl = card.querySelector(selector);
                  if (companyEl) {
                    company = companyEl.textContent?.trim() || '';
                    if (company) break;
                  }
                }
                
                // Extract location with multiple selectors
                const locationSelectors = [
                  '[data-test-result-lockup-location]',
                  '.entity-result__tertiary-subtitle',
                  '.result-lockup__misc-item',
                  '.search-result__location'
                ];
                
                let location = '';
                for (const selector of locationSelectors) {
                  const locationEl = card.querySelector(selector);
                  if (locationEl) {
                    location = locationEl.textContent?.trim() || '';
                    if (location) break;
                  }
                }
                
                // Extract image URL
                const imgEl = card.querySelector('img');
                const imageUrl = imgEl?.getAttribute('src') || null;
                
                // Add to results if we have at least a name or URN
                if (name || urn) {
                  results.push({
                    urn: urn || `unnamed_${results.length}`,
                    name: name || `Unknown Name ${results.length}`,
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
          }
          
          return results;
        });
        
        // If the profiles array is empty, try to get recent connections
        if (profiles.length === 0 && allEmpty) {
          // Navigate to the connections page instead with human-like behavior
          console.log('No results found, trying homepage for recent connections');
          
          // Add a slight delay before navigating
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          
          await page.goto('https://www.linkedin.com/sales/homepage', { waitUntil: 'domcontentloaded' });
          
          // Use variable sleep for human-like behavior
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
          
          // Scroll down slightly to load more content
          await page.evaluate(() => {
            window.scrollBy(0, 300 + Math.random() * 200);
          });
          
          // Wait for scrolling to complete
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          
          // Try to extract recent connections from the homepage with improved selectors
          const recentProfiles = await page.evaluate(() => {
            const results: Array<{
              urn: string;
              name: string;
              title: string;
              company: string;
              location: string;
              imageUrl: string | null;
            }> = [];
            
            // Look for various card types on the homepage
            const cardSelectors = [
              '.artdeco-card',
              '.feed-shared-update',
              '.profile-card',
              '.connection-card'
            ];
            
            let cards: NodeListOf<Element> | null = null;
            
            // Try each selector
            for (const selector of cardSelectors) {
              const foundCards = document.querySelectorAll(selector);
              if (foundCards.length > 0) {
                cards = foundCards;
                break;
              }
            }
            
            if (cards && cards.length > 0) {
              cards.forEach((card) => {
                try {
                  // Extract name with multiple selectors
                  const nameSelectors = [
                    'a.ember-view strong',
                    '.feed-shared-actor__name',
                    '.actor-name',
                    '.profile-card__name',
                    'h3',
                    '.name',
                    'a[data-control-name="actor"]'
                  ];
                  
                  let name = '';
                  let nameEl = null;
                  
                  for (const selector of nameSelectors) {
                    nameEl = card.querySelector(selector);
                    if (nameEl) {
                      name = nameEl.textContent?.trim() || '';
                      if (name) break;
                    }
                  }
                  
                  if (!name) return; // Skip if no name found
                  
                  // Extract URN from links
                  let urn = '';
                  const linkSelectors = [
                    'a.ember-view',
                    'a[data-control-name="actor"]',
                    'a[href*="/in/"]',
                    'a[href*="/lead/"]'
                  ];
                  
                  let linkEl = null;
                  
                  for (const selector of linkSelectors) {
                    linkEl = card.querySelector(selector);
                    if (linkEl) {
                      const href = linkEl.getAttribute('href') || '';
                      const inMatch = href.match(/\/in\/([^\/\?]+)/);
                      const leadMatch = href.match(/\/lead\/([^\/\?]+)/);
                      
                      if (inMatch) {
                        urn = inMatch[1];
                        break;
                      } else if (leadMatch) {
                        urn = leadMatch[1];
                        break;
                      }
                    }
                  }
                  
                  if (!urn) urn = `unnamed_${results.length}`; // Generate a placeholder if no URN
                  
                  // Extract title and company
                  const subtitleSelectors = [
                    '.artdeco-entity-lockup__subtitle',
                    '.feed-shared-actor__description',
                    '.profile-card__occupation',
                    '.actor-title'
                  ];
                  
                  let subtitle = '';
                  let subtitleEl = null;
                  
                  for (const selector of subtitleSelectors) {
                    subtitleEl = card.querySelector(selector);
                    if (subtitleEl) {
                      subtitle = subtitleEl.textContent?.trim() || '';
                      if (subtitle) break;
                    }
                  }
                  
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
                  
                  // Add to results
                  results.push({
                    urn,
                    name,
                    title,
                    company,
                    location: '',
                    imageUrl
                  });
                } catch (e) {
                  console.error('Error parsing card:', e);
                }
              });
            }
            
            return results;
          });
          
          // Add any found profiles to the results
          return recentProfiles;
        }
        
        return profiles;
      });
    } catch (humanBrowserError: unknown) {
      // If human browser fails, fall back to regular browser
      const errorMessage = humanBrowserError instanceof Error ? 
        humanBrowserError.message : 
        'Unknown error';
      
      console.warn('Human browser search failed, falling back to standard browser:', errorMessage);
      
      if (humanBrowserError instanceof Error && humanBrowserError.stack) {
        console.warn('Error stack:', humanBrowserError.stack.split('\n')[0]);
      }
      
      return await withBrowser(async (page) => {
        console.log('Retrying with standard browser...');
        // Simplified implementation for fallback
        
        // Build the search URL 
        let searchUrl = 'https://www.linkedin.com/sales/search/people?';
        const params = new URLSearchParams();
        
        const allEmpty = !keywords && !location && !industry;
        
        if (allEmpty) {
          params.append('viewAllFilters', 'true');
          params.append('sortCriteria', 'CREATED_TIME');
        } else {
          if (keywords) params.append('keywords', keywords);
          if (location) params.append('geoIncluded', location);
          if (industry) params.append('industryIncluded', industry);
        }
        
        searchUrl += params.toString();
        console.log('Fallback search with URL:', searchUrl);
        
        // Basic navigation with standard browser
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Wait for results to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Simple scroll to load more results
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract profiles with basic selectors
        const profiles = await page.evaluate(() => {
          const results: Array<{
            urn: string;
            name: string;
            title: string;
            company: string;
            location: string;
            imageUrl: string | null;
          }> = [];
          
          // Use simple selectors that are likely to work
          const cards = document.querySelectorAll('[data-test-search-result], .search-result, .entity-result');
          
          cards.forEach(card => {
            try {
              // Get name, title, etc. using simple selectors
              const nameEl = card.querySelector('h3, .name, [data-test-result-lockup-name]');
              const titleEl = card.querySelector('.headline, [data-test-result-lockup-headline]');
              const companyEl = card.querySelector('[data-test-result-lockup-current-company]');
              const locationEl = card.querySelector('[data-test-result-lockup-location]');
              const imgEl = card.querySelector('img');
              
              // Get profile URL to extract URN
              const profileLink = card.querySelector('a[href*="/in/"], a[href*="/lead/"]');
              
              // Extract values
              const name = nameEl?.textContent?.trim() || '';
              const title = titleEl?.textContent?.trim() || '';
              const company = companyEl?.textContent?.trim() || '';
              const location = locationEl?.textContent?.trim() || '';
              const imageUrl = imgEl?.getAttribute('src') || null;
              
              // Extract URN from profile link
              let urn = '';
              if (profileLink) {
                const href = profileLink.getAttribute('href') || '';
                const inMatch = href.match(/\/in\/([^\/\?]+)/);
                const leadMatch = href.match(/\/lead\/([^\/\?]+)/);
                urn = inMatch ? inMatch[1] : leadMatch ? leadMatch[1] : '';
              }
              
              // Add to results if we have basic information
              if (name || urn) {
                results.push({
                  urn: urn || `unnamed_${results.length}`,
                  name: name || `Unknown Name ${results.length}`,
                  title,
                  company,
                  location,
                  imageUrl
                });
              }
            } catch (e) {
              console.error('Error parsing profile card:', e);
            }
          });
          
          return results;
        });
        
        // If no results found in main search, try the homepage
        if (profiles.length === 0 && allEmpty) {
          console.log('No results in fallback search, trying homepage');
          return await getRecentConnectionsFromHomepage(page);
        }
        
        return profiles;
      });
    }
  } catch (error) {
    console.error('LinkedIn search error:', error);
    throw error;
  }
}

/**
 * Helper function to get recent connections from homepage
 * Extracted to avoid code duplication in fallback path
 */
async function getRecentConnectionsFromHomepage(page: any): Promise<LinkedInProfile[]> {
  // Navigate to the connections page
  await page.goto('https://www.linkedin.com/sales/homepage', { waitUntil: 'domcontentloaded' });
  
  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Extract recent connections from the homepage
  return await page.evaluate(() => {
    const results: Array<{
      urn: string;
      name: string;
      title: string;
      company: string;
      location: string;
      imageUrl: string | null;
    }> = [];
    
    // Look for various card types on the homepage
    const cardSelectors = [
      '.artdeco-card',
      '.feed-shared-update',
      '.profile-card',
      '.connection-card'
    ];
    
    let cards: NodeListOf<Element> | null = null;
    
    // Try each selector
    for (const selector of cardSelectors) {
      const foundCards = document.querySelectorAll(selector);
      if (foundCards.length > 0) {
        cards = foundCards;
        break;
      }
    }
    
    if (cards && cards.length > 0) {
      cards.forEach((card) => {
        try {
          // Extract name with multiple selectors
          const nameSelectors = [
            'a.ember-view strong',
            '.feed-shared-actor__name',
            '.actor-name',
            '.profile-card__name',
            'h3',
            '.name',
            'a[data-control-name="actor"]'
          ];
          
          let name = '';
          let nameEl = null;
          
          for (const selector of nameSelectors) {
            nameEl = card.querySelector(selector);
            if (nameEl) {
              name = nameEl.textContent?.trim() || '';
              if (name) break;
            }
          }
          
          if (!name) return; // Skip if no name found
          
          // Extract URN from links
          let urn = '';
          const linkSelectors = [
            'a.ember-view',
            'a[data-control-name="actor"]',
            'a[href*="/in/"]',
            'a[href*="/lead/"]'
          ];
          
          let linkEl = null;
          
          for (const selector of linkSelectors) {
            linkEl = card.querySelector(selector);
            if (linkEl) {
              const href = linkEl.getAttribute('href') || '';
              const inMatch = href.match(/\/in\/([^\/\?]+)/);
              const leadMatch = href.match(/\/lead\/([^\/\?]+)/);
              
              if (inMatch) {
                urn = inMatch[1];
                break;
              } else if (leadMatch) {
                urn = leadMatch[1];
                break;
              }
            }
          }
          
          if (!urn) urn = `unnamed_${results.length}`; // Generate a placeholder if no URN
          
          // Extract title and company
          const subtitleSelectors = [
            '.artdeco-entity-lockup__subtitle',
            '.feed-shared-actor__description',
            '.profile-card__occupation',
            '.actor-title'
          ];
          
          let subtitle = '';
          let subtitleEl = null;
          
          for (const selector of subtitleSelectors) {
            subtitleEl = card.querySelector(selector);
            if (subtitleEl) {
              subtitle = subtitleEl.textContent?.trim() || '';
              if (subtitle) break;
            }
          }
          
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
          
          // Add to results
          results.push({
            urn,
            name,
            title,
            company,
            location: '',
            imageUrl
          });
        } catch (e) {
          console.error('Error parsing card:', e);
        }
      });
    }
    
    return results;
  });
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
    
    // Import debug functionality
    const { createDebugSession, addDebugLog, captureDebugScreenshot, createDebugEnabledPage, completeDebugSession, getDebugSession } = await import('../debug');
    
    // Create a debug session for this search operation
    const debugSessionId = createDebugSession();
    addDebugLog(debugSessionId, `Starting connection search with criteria: ${JSON.stringify({ title, company, industry })}`);

    // Create a viewer pane for real-time feedback
    const viewerUrl = `/debug/viewer/${debugSessionId}`;
    
    // First immediately return a response with loading indicator and embedded debug viewer
    const response = new Response(`
      <div id="search-results-container">
        <div class="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">
            Searching Connections
            <span class="inline-block ml-3">
              <span class="animate-pulse inline-flex h-2 w-2 rounded-full bg-blue-500 opacity-75"></span>
              <span class="animate-pulse inline-flex h-2 w-2 rounded-full bg-blue-500 opacity-75 ml-1" style="animation-delay: 0.2s"></span>
              <span class="animate-pulse inline-flex h-2 w-2 rounded-full bg-blue-500 opacity-75 ml-1" style="animation-delay: 0.4s"></span>
            </span>
          </h2>
          
          <div class="mb-6">
            <p class="text-gray-700">Please wait while we search for connections that match your criteria...</p>
            <div class="mt-4 flex">
              <a href="${viewerUrl}" target="_blank" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                View Real-Time Progress
              </a>
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-md overflow-hidden border border-gray-200">
            <iframe src="${viewerUrl}" class="w-full h-96 border-0"></iframe>
          </div>
        </div>
      </div>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
    
    // Start the search operation in the background
    // We don't await this since we already returned the response
    searchConnectionsBackground(env, debugSessionId, { title, company, industry })
      .catch(error => {
        console.error('Background search error:', error);
        completeDebugSession(debugSessionId, `Search failed: ${error.message}`);
      });
    
    return response;
    
  } catch (error) {
    console.error('Error searching connections:', error);
    
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
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Background process for searching connections
 * This runs after we've already returned a response to the user
 */
async function searchConnectionsBackground(
  env: AdminEnv, 
  debugSessionId: string, 
  criteria: { title: string, company: string, industry: string }
): Promise<void> {
  const { title, company, industry } = criteria;
  
  try {
    const { withHumanBrowser, withBrowser } = await import('../common');
    const { addDebugLog, captureDebugScreenshot, createDebugEnabledPage, completeDebugSession } = await import('../debug');
    
    // Log the start of the process
    addDebugLog(debugSessionId, "Starting LinkedIn connections search");
    
    try {
      // First try with human browser
      addDebugLog(debugSessionId, "Attempting to use human-like browser");
      await withHumanBrowser<void>(async (page) => {
        try {
          // Configure screenshot settings
          const config = {
            enabled: true,
            frequency: 'high' as 'high',
            saveLocally: false,
            maxScreenshots: 30
          };
          
          // Wrap page with debug capabilities
          const debugPage = createDebugEnabledPage(page, debugSessionId, config);
          
          // Navigate to LinkedIn connections page with appropriate error handling
          addDebugLog(debugSessionId, "Navigating to LinkedIn My Network page");
          
          // Use a try/catch for each navigation to handle context destroyed errors
          try {
            // Navigate with more generous timeout and more resilient settings
            await debugPage.goto('https://www.linkedin.com/mynetwork/', { 
              waitUntil: 'domcontentloaded', 
              timeout: 60000 
            });
            
            // Capture screenshot with proper error handling
            await captureDebugScreenshot(debugPage, debugSessionId, "LinkedIn Network Page");
            addDebugLog(debugSessionId, "Successfully loaded My Network page");
          } catch (error) {
            const navError = error as Error;
            addDebugLog(debugSessionId, `Navigation error: ${navError.message}`);
            // Don't rethrow, try to continue if possible
          }
          
          // Small delay to ensure the page loads properly - simulate human behavior
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
          
          // Try to capture screenshot after navigation completed
          try {
            await captureDebugScreenshot(debugPage, debugSessionId, "After Navigation Completed");
          } catch (error) {
            const screenshotError = error as Error;
            addDebugLog(debugSessionId, `Screenshot error after navigation: ${screenshotError.message}`);
          }
          
          // Check for connection tab/section and click it if needed
          addDebugLog(debugSessionId, "Looking for connections section");
          
          try {
            // Wait for connections elements to be visible
            await debugPage.waitForSelector('.mn-connections, a[href="/mynetwork/connections/"]', { timeout: 10000 })
              .catch(() => addDebugLog(debugSessionId, "Could not find connections element with standard selector"));
            
            // Take a screenshot of connections section
            await captureDebugScreenshot(debugPage, debugSessionId, "Connections Section");
            
            // Click on connections tab if it exists
            const hasConnectionsTab = await debugPage.evaluate(() => {
              const connectionsTab = document.querySelector('a[href="/mynetwork/connections/"]');
              if (connectionsTab) {
                (connectionsTab as HTMLElement).click();
                return true;
              }
              
              // Try alternative selectors if the first one doesn't work
              const alternativeSelectors = [
                '.mn-community-summary__entity-info a',
                '.artdeco-card a[href*="connections"]',
                '.mn-community-summary__section-title a'
              ];
              
              for (const selector of alternativeSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.includes('Connections')) {
                  (element as HTMLElement).click();
                  return true;
                }
              }
              
              return false;
            });
            
            if (hasConnectionsTab) {
              addDebugLog(debugSessionId, "Clicked on connections tab");
              // Wait for the page to load after click - simulate human waiting
              await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
              
              // Take another screenshot
              await captureDebugScreenshot(debugPage, debugSessionId, "After Clicking Connections Tab");
            } else {
              addDebugLog(debugSessionId, "No connections tab found, continuing with current page");
            }
          } catch (error) {
            const selectorError = error as Error;
            addDebugLog(debugSessionId, `Error finding connections section: ${selectorError.message}`);
          }
          
          // Apply search filters if any were provided
          if (title || company || industry) {
            addDebugLog(debugSessionId, "Applying search filters");
            
            try {
              // Look for search box and enter criteria
              const searchBox = await debugPage.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="Filter"]');
              if (searchBox) {
                addDebugLog(debugSessionId, "Found search input field");
                await captureDebugScreenshot(debugPage, debugSessionId, "Before Entering Search");
                
                // Combine search criteria
                const searchQuery = [
                  title ? `title:"${title}"` : '',
                  company ? `company:"${company}"` : '',
                  industry ? `industry:"${industry}"` : ''
                ].filter(Boolean).join(' ');
                
                // Clear previous input if any
                await searchBox.click({ clickCount: 3 }); // Triple click to select all text
                await searchBox.press('Backspace'); // Delete selected text
                
                // Type search query with human-like typing speed
                await searchBox.type(searchQuery, { delay: 50 + Math.random() * 100 });
                addDebugLog(debugSessionId, `Entered search query: ${searchQuery}`);
                
                // Take screenshot after typing
                await captureDebugScreenshot(debugPage, debugSessionId, "After Entering Search");
                
                // Wait briefly before pressing Enter - human-like behavior
                await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                
                // Press Enter to search
                await searchBox.press('Enter');
                addDebugLog(debugSessionId, "Pressed Enter to search");
                
                // Wait for results to load with human-like randomness
                await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 2000));
                await captureDebugScreenshot(debugPage, debugSessionId, "Search Results");
              } else {
                addDebugLog(debugSessionId, "Could not find search input field");
              }
            } catch (error) {
              const searchError = error as Error;
              addDebugLog(debugSessionId, `Error applying search filters: ${searchError.message}`);
            }
          }
          
          // Extract connection results
          addDebugLog(debugSessionId, "Extracting connection results");
          
          try {
            // Take final screenshot of results
            await captureDebugScreenshot(debugPage, debugSessionId, "Final Results");
            
            // Attempt to extract connection data
            const connectionResults = await debugPage.evaluate(() => {
              const connections: Array<{ name: string, title: string, urn: string, imageUrl: string | null, company: string, location: string }> = [];
              
              // Try multiple selectors to find connection cards
              const cardSelectors = [
                '.mn-connection-card',
                '.connection-card',
                '.artdeco-list__item',
                '.search-result'
              ];
              
              let cards: NodeListOf<Element> | null = null;
              
              // Try each selector until we find some connection cards
              for (const selector of cardSelectors) {
                const foundCards = document.querySelectorAll(selector);
                if (foundCards.length > 0) {
                  cards = foundCards;
                  break;
                }
              }
              
              if (!cards || cards.length === 0) {
                // If no cards found with standard selectors, try a more generic approach
                cards = document.querySelectorAll('[data-control-name="connection_profile"], .artdeco-entity-lockup');
              }
              
              console.log('Found cards:', cards?.length || 0);
              
              if (cards && cards.length > 0) {
                cards.forEach(card => {
                  try {
                    // Extract profile information from card
                    const nameElement = card.querySelector('.mn-connection-card__name, .artdeco-entity-lockup__title, [data-test-connection-card-name], h3, strong');
                    const titleElement = card.querySelector('.mn-connection-card__occupation, .artdeco-entity-lockup__subtitle, [data-test-connection-card-occupation], .entity-result__primary-subtitle');
                    const imgElement = card.querySelector('img');
                    const profileLink = card.querySelector('a[href*="/in/"]');
                    const companyElement = card.querySelector('.entity-result__secondary-subtitle, .artdeco-entity-lockup__caption');
                    const locationElement = card.querySelector('.entity-result__tertiary-subtitle');
                    
                    const name = nameElement ? nameElement.textContent?.trim() || '' : '';
                    const title = titleElement ? titleElement.textContent?.trim() || '' : '';
                    const imageUrl = imgElement ? imgElement.getAttribute('src') : null;
                    const company = companyElement ? companyElement.textContent?.trim() || '' : '';
                    const location = locationElement ? locationElement.textContent?.trim() || '' : '';
                    
                    // Extract the URN (profile identifier) from URL
                    let urn = '';
                    if (profileLink) {
                      const href = profileLink.getAttribute('href') || '';
                      const match = href.match(/\/in\/([^/]+)/);
                      urn = match ? match[1] : '';
                    }
                    
                    if (name) {
                      connections.push({ 
                        name, 
                        title, 
                        urn, 
                        imageUrl,
                        company,
                        location 
                      });
                    }
                  } catch (cardError) {
                    // Skip this card if there's an error
                    console.error("Error processing connection card:", cardError);
                  }
                });
              }
              
              return connections;
            });
            
            addDebugLog(debugSessionId, `Found ${connectionResults.length} connections`);
            
            // Add results to debug log
            if (connectionResults.length > 0) {
              addDebugLog(debugSessionId, `Sample connection: ${JSON.stringify(connectionResults[0])}`);
              
              // Store connection results in the debug session for later retrieval
              for (let i = 0; i < Math.min(connectionResults.length, 50); i++) {
                const connection = connectionResults[i];
                addDebugLog(debugSessionId, `Connection ${i+1}: ${connection.name} - ${connection.title || 'No title'} ${connection.company ? 'at ' + connection.company : ''}`);
              }
            } else {
              addDebugLog(debugSessionId, "No connections found matching criteria");
            }
            
            // Mark session as complete with success
            completeDebugSession(debugSessionId);
            
          } catch (error) {
            const extractError = error as Error;
            addDebugLog(debugSessionId, `Error extracting connections: ${extractError.message}`);
            throw extractError;
          }
          
        } catch (error) {
          const pageError = error as Error;
          addDebugLog(debugSessionId, `Page error: ${pageError.message}`);
          
          // Try one last screenshot if possible
          try {
            await captureDebugScreenshot(page, debugSessionId, "Error State");
          } catch (error) {
            const screenshotError = error as Error;
            addDebugLog(debugSessionId, `Failed to capture error screenshot: ${screenshotError.message}`);
          }
          
          throw pageError;
        }
      });
      
    } catch (browserError: unknown) {
      // If human browser fails, try with regular browser as fallback
      const typedError = browserError as Error;
      addDebugLog(debugSessionId, `Human browser failed: ${typedError.message || 'Unknown error'}`);
      if (typedError.stack) {
        addDebugLog(debugSessionId, `Error stack: ${typedError.stack.split('\n')[0]}`);
      }
      addDebugLog(debugSessionId, "Trying with standard browser...");
      
      // Fallback to regular browser
      await withBrowser<void>(async (page) => {
        try {
          // Configure screenshot settings
          const config = {
            enabled: true,
            frequency: 'high' as 'high',
            saveLocally: false,
            maxScreenshots: 30
          };
          
          // Wrap page with debug capabilities
          const debugPage = createDebugEnabledPage(page, debugSessionId, config);
          
          addDebugLog(debugSessionId, "Using standard browser as fallback");
          
          // Basic version of the search without human-like behavior
          await debugPage.goto('https://www.linkedin.com/mynetwork/connections/', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
          });
          
          await captureDebugScreenshot(debugPage, debugSessionId, "LinkedIn Connections Page (Fallback)");
          
          // If we have search criteria, use the search box
          if (title || company || industry) {
            addDebugLog(debugSessionId, "Applying search filters (fallback mode)");
            
            const searchBox = await debugPage.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="Filter"]');
            if (searchBox) {
              // Combine search criteria
              const searchQuery = [
                title ? `title:"${title}"` : '',
                company ? `company:"${company}"` : '',
                industry ? `industry:"${industry}"` : ''
              ].filter(Boolean).join(' ');
              
              await searchBox.click();
              await searchBox.type(searchQuery);
              await searchBox.press('Enter');
              
              addDebugLog(debugSessionId, `Entered search query: ${searchQuery}`);
              await new Promise(resolve => setTimeout(resolve, 5000));
              await captureDebugScreenshot(debugPage, debugSessionId, "Search Results (Fallback)");
            }
          }
          
          // Extract connection data using simplified selectors
          const connectionResults = await debugPage.evaluate(() => {
            const connections: Array<{ name: string, title: string, urn: string, imageUrl: string | null }> = [];
            
            // Try common connection card selectors
            const cards = document.querySelectorAll('.mn-connection-card, .search-result, .entity-result');
            
            cards.forEach(card => {
              try {
                // Extract basic details
                const nameEl = card.querySelector('h3, .entity-result__title, .mn-connection-card__name');
                const titleEl = card.querySelector('.entity-result__primary-subtitle, .mn-connection-card__occupation');
                const imgEl = card.querySelector('img');
                const profileLink = card.querySelector('a[href*="/in/"]');
                
                const name = nameEl?.textContent?.trim() || '';
                const title = titleEl?.textContent?.trim() || '';
                const imageUrl = imgEl?.getAttribute('src') || null;
                
                // Extract profile identifier
                let urn = '';
                if (profileLink) {
                  const href = profileLink.getAttribute('href') || '';
                  const match = href.match(/\/in\/([^/]+)/);
                  urn = match ? match[1] : '';
                }
                
                if (name) {
                  connections.push({
                    name,
                    title,
                    urn,
                    imageUrl
                  });
                }
              } catch (e) {
                console.error('Error parsing connection card:', e);
              }
            });
            
            return connections;
          });
          
          addDebugLog(debugSessionId, `Found ${connectionResults.length} connections (fallback mode)`);
          
          if (connectionResults.length > 0) {
            addDebugLog(debugSessionId, `Sample connection: ${JSON.stringify(connectionResults[0])}`);
          } else {
            addDebugLog(debugSessionId, "No connections found matching criteria (fallback mode)");
          }
          
          completeDebugSession(debugSessionId);
        } catch (error) {
          const pageError = error as Error;
          addDebugLog(debugSessionId, `Fallback browser error: ${pageError.message}`);
          throw pageError;
        }
      });
    }
    
  } catch (error) {
    const { addDebugLog, completeDebugSession } = await import('../debug');
    const typedError = error as Error;
    addDebugLog(debugSessionId, `Search operation failed: ${typedError.message}`);
    completeDebugSession(debugSessionId, typedError.message);
    throw error;
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