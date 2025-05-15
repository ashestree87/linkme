import { launch, Page } from '@cloudflare/puppeteer';
import { delay, getEnvironment, randomHumanDelay, validateCredentials } from './utils';

/**
 * Helper function to execute a function with a browser page
 * @param fn Function to execute with the browser page
 * @returns Promise with the function result
 */
export async function withBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  // Get the environment from the context
  const env = getEnvironment();
  
  if (!validateCredentials()) {
    throw new Error("LinkedIn credentials are not configured. Please check environment variables.");
  }
  
  // Use the browser binding directly
  const browser = await launch(env.CRAWLER_BROWSER);

  try {
    // Create page with more timeout
    const page = await browser.newPage();
    
    // Set viewport size to a common resolution
    await page.setViewport({ width: 1366, height: 768 });
    
    // Set user agent from environment variable
    await page.setUserAgent(env.USERAGENT);
    
    // Set default navigation timeout to be longer
    page.setDefaultNavigationTimeout(60000);
    
    // Disable cache for fresh results
    await page.setCacheEnabled(false);
    
    // Add extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive'
    });
    
    // Set LinkedIn cookies
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
      },
      // Add a few other essential cookies
      {
        name: 'lidc',
        value: 'b=VGST00:s=V:r=V:g=2500',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
      },
      {
        name: 'lang',
        value: 'v=2&lang=en-us',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
      }
    );
    
    // First navigate to LinkedIn homepage to establish cookies
    try {
      await page.goto('https://www.linkedin.com/', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      // Wait a moment for cookies and session to establish
      await delay(2000);
      
    } catch (navError) {
      console.warn("Initial LinkedIn navigation warning (continuing anyway):", navError);
    }
    
    // Execute the provided function
    return await fn(page);
  } finally {
    // Make sure to close the browser
    await browser.close();
  }
}

/**
 * Enhanced version of withBrowser that includes human-like behavior patterns
 * @param fn Function to execute with the browser page
 * @returns Promise with the function result
 */
export async function withHumanBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  // Get the environment from the context
  const env = getEnvironment();
  
  if (!validateCredentials()) {
    throw new Error("LinkedIn credentials are not configured. Please check environment variables.");
  }
  
  // Launch browser with additional human-like settings
  const browser = await launch({
    ...env.CRAWLER_BROWSER,
    args: [
      // Safely check if args exists and is an array before spreading
      ...(env.CRAWLER_BROWSER && Array.isArray(env.CRAWLER_BROWSER.args) ? env.CRAWLER_BROWSER.args : []),
      '--disable-blink-features=AutomationControlled', // Hide automation
      '--disable-features=IsolateOrigins,site-per-process' // Disable site isolation
    ]
  });

  try {
    // Create page with more timeout
    const page = await browser.newPage();
    
    // Set JavaScript flags to appear more like a real browser
    await page.evaluateOnNewDocument(() => {
      // Override the navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // Add a fake language plugin (most browsers have at least one)
      // @ts-ignore
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            {
              0: {
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                enabledPlugin: Plugin,
              },
              name: 'PDF Viewer',
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1,
            }
          ];
        },
      });
      
      // Add a web history
      // @ts-ignore
      window.history.length = Math.floor(Math.random() * 5) + 3;
    });
    
    // Choose a random viewport from common sizes
    const viewports = [
      { width: 1366 + Math.floor(Math.random() * 20), height: 768 + Math.floor(Math.random() * 20) },
      { width: 1440 + Math.floor(Math.random() * 20), height: 900 + Math.floor(Math.random() * 20) },
      { width: 1536 + Math.floor(Math.random() * 20), height: 864 + Math.floor(Math.random() * 20) },
      { width: 1920 + Math.floor(Math.random() * 20), height: 1080 + Math.floor(Math.random() * 20) },
      { width: 1280 + Math.floor(Math.random() * 20), height: 800 + Math.floor(Math.random() * 20) }
    ];
    
    const selectedViewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(selectedViewport);
    await randomHumanDelay(500, 1000);
    
    // Set random user agent from a pool of real browser user agents
    const userAgents = [
      env.USERAGENT, // Use the provided one most of the time
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
    ];
    
    // 80% chance to use the provided user agent, 20% chance to use another one
    const selectedUserAgent = Math.random() > 0.2 ? 
      userAgents[0] : 
      userAgents[Math.floor(Math.random() * userAgents.length)];
    
    await page.setUserAgent(selectedUserAgent);
    
    // Set default navigation timeout to be variable (like humans have different patience levels)
    const timeoutVariation = Math.floor(Math.random() * 10000);
    page.setDefaultNavigationTimeout(60000 + timeoutVariation);
    
    // Add randomized headers
    const languages = ['en-US,en;q=0.9', 'en-US,en;q=0.8,es;q=0.3', 'en-GB,en;q=0.9,en-US;q=0.8'];
    await page.setExtraHTTPHeaders({
      'Accept-Language': languages[Math.floor(Math.random() * languages.length)],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Set LinkedIn cookies with some randomness in the timing
    await randomHumanDelay(300, 800);
    
    // Set cookies in a more natural way (not all at once)
    await page.setCookie({
      name: 'li_at',
      value: env.LI_AT,
      domain: '.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
    
    await randomHumanDelay(200, 600);
    
    await page.setCookie({
      name: 'JSESSIONID',
      value: env.CSRF,
      domain: '.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
    
    await randomHumanDelay(150, 400);
    
    // Add other essential cookies
    await page.setCookie(
      {
        name: 'lidc',
        value: 'b=VGST00:s=V:r=V:g=2500',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
      },
      {
        name: 'lang',
        value: 'v=2&lang=en-us',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
      }
    );
    
    // First navigate to LinkedIn homepage with human behavior
    try {
      console.log("Navigating to LinkedIn homepage...");
      
      // Navigate with variable timing for loading
      const waitUntilOptions = ['domcontentloaded', 'networkidle0', 'networkidle2'];
      const randomWaitOption = waitUntilOptions[Math.floor(Math.random() * 1)]; // Mostly use domcontentloaded
      
      await page.goto('https://www.linkedin.com/', { 
        waitUntil: randomWaitOption as any,
        timeout: 60000 + timeoutVariation
      });
      
      // We'll do basic simple reading simulation here to avoid circular dependency
      // We can't import from human-behavior as that would create a circular dependency
      
      // Calculate random reading time
      const readingTime = Math.floor(Math.random() * 2000) + 2000;
      await delay(readingTime);
      
      // Small scroll to simulate reading progress
      const smallScrollDistance = Math.floor(Math.random() * 50) + 10;
      await page.evaluate((distance: number) => {
        window.scrollBy(0, distance);
      }, smallScrollDistance);
      
      // Do a simple random site interaction
      if (Math.random() > 0.7) {
        // List of common interaction selectors on LinkedIn
        const interactionSelectors = [
          '.global-nav__nav > ul > li:nth-child(1) a', // Home button
          '.global-nav__nav > ul > li:nth-child(2) a', // My Network
          '.search-global-typeahead__input', // Search bar
        ];
        
        // Choose a random interaction
        const selector = interactionSelectors[Math.floor(Math.random() * interactionSelectors.length)];
        
        try {
          const buttonExists = await page.$(selector);
          
          if (buttonExists) {
            // Click it
            await randomHumanDelay(1000, 2000);
            await page.click(selector);
            
            // Wait while the new page/section loads
            await randomHumanDelay(2000, 4000);
          }
        } catch (error) {
          // Silently ignore errors - humans don't crash when elements aren't found
          console.log(`Random interaction attempted but failed: ${error}`);
        }
      }
      
    } catch (navError) {
      console.warn("Initial LinkedIn navigation warning (continuing anyway):", navError);
    }
    
    // Execute the provided function
    return await fn(page);
  } finally {
    // Close browser with slight delay like a human would
    await randomHumanDelay(800, 1500);
    await browser.close();
  }
}

/**
 * Handles captchas by detecting them and waiting for manual intervention
 * @param page Puppeteer page object
 * @param timeoutMs Maximum time to wait for captcha resolution in milliseconds
 * @returns Promise that resolves to true if captcha was detected and presumably solved
 */
export async function handleCaptcha(page: any, timeoutMs: number = 120000): Promise<boolean> {
  const captchaSelectors = [
    '.recaptcha-checkbox-border',
    'iframe[src*="recaptcha"]',
    'iframe[src*="captcha"]',
    '.captcha-container',
    '#captcha',
    'img[alt*="captcha"]',
    'input[name="captcha"]',
    '.g-recaptcha'
  ];
  
  // Check if any captcha elements are present
  const captchaDetected = await page.evaluate((selectors: string[]) => {
    for (const selector of selectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    return false;
  }, captchaSelectors);
  
  if (captchaDetected) {
    console.log('Captcha detected! Waiting for manual resolution...');
    
    // Wait for navigation or timeout
    try {
      // Wait for a navigation event that would happen after captcha is solved
      await Promise.race([
        page.waitForNavigation({ timeout: timeoutMs }),
        // Also consider the page to be ready if captcha elements disappear
        page.waitForFunction(
          (selectors: string[]) => {
            return selectors.every(selector => !document.querySelector(selector));
          },
          { timeout: timeoutMs },
          captchaSelectors
        )
      ]);
      
      console.log('Captcha appears to be resolved, continuing...');
      return true;
    } catch (error) {
      console.error('Captcha resolution timeout or error:', error);
      throw new Error('Captcha resolution timeout');
    }
  }
  
  return false;
}

// Note: To avoid circular dependencies, we don't directly import from human-behavior.
// Instead, we implement simplified versions of the needed functions directly in withHumanBrowser. 