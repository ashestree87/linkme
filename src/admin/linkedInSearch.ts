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
    const { addDebugLog, addTestScreenshot, getDebugSessionWithDiagnostics, completeDebugSession } = await import('../debug');
    
    // Log the start of the process
    addDebugLog(debugSessionId, "Starting LinkedIn connections search");
    
    // Test screenshot functionality to make sure it's working
    addDebugLog(debugSessionId, "Testing screenshot functionality");
    addTestScreenshot(debugSessionId);
    
    // Check if session is recording screenshots properly
    const diagnostics = getDebugSessionWithDiagnostics(debugSessionId);
    if (diagnostics && diagnostics._diagnostics) {
      addDebugLog(debugSessionId, `Debug session diagnostics: ${JSON.stringify(diagnostics._diagnostics)}`);
    }
    
    // Create search query from criteria
    let searchQuery = '';
    if (title) searchQuery += title + ' ';
    if (company) searchQuery += company + ' ';
    if (industry) searchQuery += industry + ' ';
    searchQuery = searchQuery.trim();
    
    if (!searchQuery) {
      searchQuery = "connections"; // Default search if no criteria provided
    }
    
    addDebugLog(debugSessionId, `Will search for connections with query: "${searchQuery}"`);
    
    try {
      // Try to use browser but with direct approach to avoid multiple layers of abstraction
      addDebugLog(debugSessionId, "Attempting to launch browser directly");
      
      // Import the minimal necessary modules
      const { launch } = await import('@cloudflare/puppeteer');
      const { captureDebugScreenshot } = await import('../debug');
      
      // Launch browser directly
      addDebugLog(debugSessionId, "Launching browser using Cloudflare binding");
      const browser = await launch(env.CRAWLER_BROWSER);
      addDebugLog(debugSessionId, "Browser launched successfully");
      
      try {
        // Create a new page
        addDebugLog(debugSessionId, "Creating new browser page");
        const page = await browser.newPage();
        addDebugLog(debugSessionId, "Browser page created successfully");
        
        // Set basic options
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(env.USERAGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)');
        
        // Set LinkedIn cookies
        addDebugLog(debugSessionId, "Setting LinkedIn cookies");
        await page.setCookie(
          {
            name: 'li_at',
            value: env.LI_AT,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true,
          },
          {
            name: 'JSESSIONID',
            value: env.CSRF,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true,
          }
        );
        
        // Navigate to LinkedIn
        addDebugLog(debugSessionId, "Navigating to LinkedIn");
        await page.goto('https://www.linkedin.com/', { waitUntil: 'domcontentloaded' });
        addDebugLog(debugSessionId, "Loaded LinkedIn homepage");
        
        // Take a screenshot to verify page loaded
        try {
          const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
          const base64Image = screenshot.toString('base64');
          addDebugLog(debugSessionId, "Captured screenshot of LinkedIn homepage");
          
          // Add the screenshot to debug session
          const { addDebugScreenshot } = await import('../debug');
          addDebugScreenshot(debugSessionId, "LinkedIn Homepage", base64Image);
        } catch (screenshotError: unknown) {
          const errorMessage = screenshotError instanceof Error ? screenshotError.message : String(screenshotError);
          addDebugLog(debugSessionId, `Failed to capture screenshot: ${errorMessage}`);
        }
        
        // Navigate to connections page
        addDebugLog(debugSessionId, "Navigating to LinkedIn connections page");
        await page.goto('https://www.linkedin.com/mynetwork/invite-connect/connections/', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        addDebugLog(debugSessionId, "Loaded connections page");
        
        // Take another screenshot
        try {
          const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
          const base64Image = screenshot.toString('base64');
          addDebugLog(debugSessionId, "Captured screenshot of connections page");
          
          // Add the screenshot to debug session
          const { addDebugScreenshot } = await import('../debug');
          addDebugScreenshot(debugSessionId, "Connections Page", base64Image);
        } catch (screenshotError: unknown) {
          const errorMessage = screenshotError instanceof Error ? screenshotError.message : String(screenshotError);
          addDebugLog(debugSessionId, `Failed to capture screenshot: ${errorMessage}`);
        }
        
        // Try to find the search input
        addDebugLog(debugSessionId, "Looking for search input field");
        const searchSelectors = [
          '.mn-connections__search-input',
          'input[aria-label="Search connections"]',
          '.search-global-typeahead__input',
          '.mn-community-summary__search-input',
          'input.search-global-typeahead__input',
          '#network-search-input'
        ];
        
        let searchInput = null;
        for (const selector of searchSelectors) {
          try {
            searchInput = await page.$(selector);
            if (searchInput) {
              addDebugLog(debugSessionId, `Found search input with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue trying other selectors
          }
        }
        
        if (!searchInput) {
          addDebugLog(debugSessionId, "Could not find search input on connections page");
          
          // Try global search instead
          addDebugLog(debugSessionId, "Trying global search instead");
          await page.goto('https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          const globalSearchSelectors = [
            'input.search-global-typeahead__input',
            '.search-global-typeahead__input'
          ];
          
          for (const selector of globalSearchSelectors) {
            try {
              searchInput = await page.$(selector);
              if (searchInput) {
                addDebugLog(debugSessionId, `Found global search input with selector: ${selector}`);
                break;
              }
            } catch (e) {
              // Continue trying other selectors
            }
          }
        }
        
        // If still no search input found, we'll fetch some connections anyway
        if (!searchInput) {
          addDebugLog(debugSessionId, "Could not find any search input, will try to get visible connections");
          
          // Extract whatever connections are visible
          const connections = await page.evaluate(() => {
            // Use various selectors to find connection cards/elements
            const selectors = [
              '.mn-connections__card',
              '.mn-connection-card',
              '.entity-result__item',
              '.reusable-search__result-container'
            ];
            
            let cards: Element[] = [];
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                cards = Array.from(elements);
                break;
              }
            }
            
            // Extract connection data
            return cards.map(card => {
              const nameEl = card.querySelector('h3, .name, .mn-connection-card__name, .entity-result__title-text');
              const linkEl = card.querySelector('a[href*="/in/"]') as HTMLAnchorElement | null;
              
              return {
                name: nameEl ? nameEl.textContent?.trim() || 'Unknown' : 'Unknown',
                profileUrl: linkEl ? linkEl.href : '',
                urn: linkEl ? linkEl.href.match(/\/in\/([^\/]+)/)?.[1] || '' : ''
              };
            }).filter(c => c.profileUrl); // Only return those with profile URLs
          });
          
          if (connections.length > 0) {
            addDebugLog(debugSessionId, `Found ${connections.length} connections without searching`);
            connections.forEach((conn, index) => {
              addDebugLog(debugSessionId, `${index + 1}. ${conn.name} - ${conn.profileUrl}`);
            });
          } else {
            addDebugLog(debugSessionId, "No connections found on the page");
          }
        } else {
          // We found a search input, so use it
          addDebugLog(debugSessionId, `Entering search query: "${searchQuery}"`);
          
          // Type into the search box
          await searchInput.click();
          await searchInput.type(searchQuery);
          await page.keyboard.press('Enter');
          
          addDebugLog(debugSessionId, "Search query submitted, waiting for results");
          
          // Wait briefly for results (no long timeouts)
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => {
            addDebugLog(debugSessionId, `Navigation wait timed out (this may be normal): ${e.message}`);
          });
          
          // Take screenshot of search results
          try {
            const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
            const base64Image = screenshot.toString('base64');
            addDebugLog(debugSessionId, "Captured screenshot of search results");
            
            // Add the screenshot to debug session
            const { addDebugScreenshot } = await import('../debug');
            addDebugScreenshot(debugSessionId, "Search Results", base64Image);
          } catch (screenshotError: unknown) {
            const errorMessage = screenshotError instanceof Error ? screenshotError.message : String(screenshotError);
            addDebugLog(debugSessionId, `Failed to capture results screenshot: ${errorMessage}`);
          }
          
          // Extract the search results
          const connections = await page.evaluate(() => {
            // Use various selectors to find result items
            const selectors = [
              '.mn-connections__card',
              '.mn-connection-card',
              '.search-result__wrapper',
              '.search-result',
              '.reusable-search__result-container',
              '.entity-result',
              'li.reusable-search__result-container'
            ];
            
            let results: Element[] = [];
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                results = Array.from(elements);
                break;
              }
            }
            
            // Extract connection data
            return results.map(result => {
              const nameEl = result.querySelector('h3, .name, .mn-connection-card__name, .entity-result__title-text, .actor-name');
              const linkEl = result.querySelector('a[href*="/in/"]') as HTMLAnchorElement | null;
              
              return {
                name: nameEl ? nameEl.textContent?.trim() || 'Unknown' : 'Unknown',
                profileUrl: linkEl ? linkEl.href : '',
                urn: linkEl ? linkEl.href.match(/\/in\/([^\/]+)/)?.[1] || '' : ''
              };
            }).filter(c => c.profileUrl); // Only return those with profile URLs
          });
          
          // Log the results
          if (connections.length > 0) {
            addDebugLog(debugSessionId, `Found ${connections.length} connections matching search query`);
            connections.forEach((conn, index) => {
              addDebugLog(debugSessionId, `${index + 1}. ${conn.name} - ${conn.profileUrl}`);
            });
          } else {
            addDebugLog(debugSessionId, "No connections found matching the search query");
          }
        }
        
      } finally {
        // Always close the browser to avoid resource leaks
        addDebugLog(debugSessionId, "Closing browser");
        await browser.close();
        addDebugLog(debugSessionId, "Browser closed successfully");
      }
      
      // Mark the search as complete
      addDebugLog(debugSessionId, "Search process completed successfully");
      completeDebugSession(debugSessionId, "Search completed successfully");
      
    } catch (browserError: unknown) {
      // Handle browser-specific errors
      const errorMessage = browserError instanceof Error ? browserError.message : String(browserError);
      addDebugLog(debugSessionId, `Browser error: ${errorMessage}`);
      
      // As a fallback, return mock results
      addDebugLog(debugSessionId, "Falling back to mock results due to browser error");
      
      const mockResults = [
        { name: "John Smith (mock)", profileUrl: "https://linkedin.com/in/johnsmith", urn: "johnsmith" },
        { name: "Jane Doe (mock)", profileUrl: "https://linkedin.com/in/janedoe", urn: "janedoe" },
        { name: "Bob Johnson (mock)", profileUrl: "https://linkedin.com/in/bobjohnson", urn: "bobjohnson" }
      ];
      
      // Log the mock results
      addDebugLog(debugSessionId, `Returning ${mockResults.length} mock connections as fallback`);
      mockResults.forEach((conn, index) => {
        addDebugLog(debugSessionId, `${index + 1}. ${conn.name} - ${conn.profileUrl}`);
      });
      
      // Complete the session with a note about fallback
      completeDebugSession(debugSessionId, "Search completed with mock fallback data");
    }
    
  } catch (error) {
    // Import debug functions if not already imported
    const { addDebugLog, completeDebugSession } = await import('../debug');
    
    const typedError = error as Error;
    const errorMessage = typedError.message || String(error);
    const stackTrace = typedError.stack || 'No stack trace';
    
    addDebugLog(debugSessionId, `ERROR: ${errorMessage}`);
    addDebugLog(debugSessionId, `Stack trace: ${stackTrace}`);
    
    completeDebugSession(debugSessionId, `Error: ${errorMessage}`);
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