import { launch, Page } from '@cloudflare/puppeteer';

/**
 * Represents a LinkedIn profile lead
 */
export type Lead = {
  urn: string;
  name: string;
  status: "new" | "invited" | "accepted" | "paused" | "failed" | "done";
};

/**
 * Verify if LinkedIn authentication is working
 * @returns Object containing status and message
 */
export async function verifyLinkedInAuth(): Promise<{isValid: boolean, message: string, debugInfo?: any}> {
  // Get the environment from the context
  const env = (globalThis as any).ENVIRONMENT;
  
  // Check if credentials are set
  if (!env?.LI_AT || !env?.CSRF || !env?.USERAGENT) {
    return {
      isValid: false,
      message: "LinkedIn credentials are not configured. Please check environment variables."
    };
  }
  
  // Use the browser binding to test authentication
  try {
    const browser = await launch(env.CRAWLER_BROWSER);
    const page = await browser.newPage();
    const debugInfo: any = {
      timeline: [],
      screenshots: []
    };
    
    try {
      // Set user agent
      await page.setUserAgent(env.USERAGENT);
      debugInfo.timeline.push("Set user agent");
      
      // Set viewport
      await page.setViewport({ width: 1366, height: 768 });
      debugInfo.timeline.push("Set viewport");
      
      // Set default navigation timeout to be longer
      page.setDefaultNavigationTimeout(90000); // 90 seconds
      debugInfo.timeline.push("Set longer navigation timeout (90s)");
      
      // Add logging for requests and responses
      page.on('request', request => {
        if (request.url().includes('linkedin.com')) {
          debugInfo.timeline.push(`Request: ${request.method()} ${request.url()}`);
        }
      });
      
      page.on('response', response => {
        if (response.url().includes('linkedin.com')) {
          debugInfo.timeline.push(`Response: ${response.status()} ${response.url()}`);
        }
      });
      
      // Set authentication cookies
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
        // Add additional cookies that might help
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
      debugInfo.timeline.push("Set LinkedIn cookies");
      
      // Take a screenshot before navigation
      try {
        const beforeScreenshot = await page.screenshot({ encoding: "base64" });
        debugInfo.screenshots.push({
          stage: "before_navigation",
          data: beforeScreenshot
        });
      } catch (screenshotError) {
        debugInfo.timeline.push(`Screenshot error: ${screenshotError}`);
      }
      
      // Navigate to LinkedIn homepage first (often more reliable than feed)
      debugInfo.timeline.push("Navigating to LinkedIn homepage...");
      try {
        await page.goto('https://www.linkedin.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        debugInfo.timeline.push("Successfully loaded LinkedIn homepage");
        
        // Take a screenshot after initial navigation
        try {
          const homeScreenshot = await page.screenshot({ encoding: "base64" });
          debugInfo.screenshots.push({
            stage: "after_homepage",
            data: homeScreenshot
          });
        } catch (screenshotError) {
          debugInfo.timeline.push(`Screenshot error: ${screenshotError}`);
        }
        
        // Wait a moment for any redirects
        await delay(5000);
        
        // Get the current URL to check for redirects
        const currentUrl = page.url();
        debugInfo.timeline.push(`Current URL after waiting: ${currentUrl}`);
        
        // Check if we're at a login page or checkpoint
        const isLoginPage = currentUrl.includes('checkpoint') || 
                            currentUrl.includes('login') ||
                            currentUrl.includes('signin');
        
        if (isLoginPage) {
          debugInfo.timeline.push("Detected login/checkpoint page - authentication cookies invalid");
          
          // Take a screenshot of the login page
          try {
            const loginScreenshot = await page.screenshot({ encoding: "base64" });
            debugInfo.screenshots.push({
              stage: "login_page",
              data: loginScreenshot
            });
          } catch (screenshotError) {
            debugInfo.timeline.push(`Screenshot error: ${screenshotError}`);
          }
          
          return {
            isValid: false,
            message: "LinkedIn redirected to login page. Your authentication cookies are expired or invalid.",
            debugInfo
          };
        }
        
      } catch (homeError) {
        debugInfo.timeline.push(`Homepage navigation error: ${homeError}`);
      }
      
      // Now navigate to the feed page to verify login
      debugInfo.timeline.push("Navigating to LinkedIn feed...");
      
      try {
        await page.goto('https://www.linkedin.com/feed/', { 
          waitUntil: 'domcontentloaded', // Changed from networkidle0 for faster loading
          timeout: 30000 // Increased timeout to 60 seconds
        });
        debugInfo.timeline.push("Successfully loaded LinkedIn feed page");
        
        // Take a screenshot after feed navigation
        try {
          const feedScreenshot = await page.screenshot({ encoding: "base64" });
          debugInfo.screenshots.push({
            stage: "after_feed",
            data: feedScreenshot
          });
        } catch (screenshotError) {
          debugInfo.timeline.push(`Screenshot error: ${screenshotError}`);
        }
        
      } catch (feedError) {
        debugInfo.timeline.push(`Feed navigation error: ${feedError}`);
        return {
          isValid: false,
          message: `LinkedIn feed navigation failed: ${feedError}`,
          debugInfo
        };
      }
      
      // Check if we're logged in by looking for the profile link
      debugInfo.timeline.push("Checking for login indicators...");
      
      const isLoggedIn = await page.evaluate(() => {
        // Log what we're finding to the console
        const selectors = {
          'a[data-control-name="identity_profile_photo"]': !!document.querySelector('a[data-control-name="identity_profile_photo"]'),
          '.global-nav__me-photo': !!document.querySelector('.global-nav__me-photo'),
          '.feed-identity-module__member-photo': !!document.querySelector('.feed-identity-module__member-photo'),
          // Additional selectors that might indicate logged-in state
          '.profile-rail-card__actor-link': !!document.querySelector('.profile-rail-card__actor-link'),
          '.feed-identity-module': !!document.querySelector('.feed-identity-module'),
          // Add common elements that would appear on the page when logged in
          '.search-global-typeahead': !!document.querySelector('.search-global-typeahead'),
          '.global-nav': !!document.querySelector('.global-nav')
        };
        
        // Get the page title
        const pageTitle = document.title;
        
        // Get body text (first 100 chars) to see what's on screen
        const bodyText = document.body.innerText.substring(0, 100);
        
        return {
          selectors,
          anyFound: Object.values(selectors).some(found => found),
          pageTitle,
          bodyText
        };
      });
      
      debugInfo.loginCheck = isLoggedIn;
      debugInfo.timeline.push(`Login check results: ${JSON.stringify(isLoggedIn)}`);
      
      if (isLoggedIn.anyFound) {
        return {
          isValid: true,
          message: "LinkedIn authentication is working correctly.",
          debugInfo
        };
      } else {
        return {
          isValid: false,
          message: `LinkedIn authentication failed. Page title: "${isLoggedIn.pageTitle}". Please update your LI_AT and CSRF cookies.`,
          debugInfo
        };
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    return {
      isValid: false,
      message: `LinkedIn authentication test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Helper function to execute a function with a browser page
 * @param fn Function to execute with the browser page
 * @returns Promise with the function result
 */
export async function withBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  // Get the environment from the context
  const env = (globalThis as any).ENVIRONMENT;
  
  if (!env?.LI_AT || !env?.CSRF || !env?.USERAGENT) {
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
    page.setDefaultNavigationTimeout(30000);
    
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
        timeout: 30000
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
 * Delay execution for specified milliseconds
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random human-like delay between actions
 * @param min Minimum delay in milliseconds (default: 1000)
 * @param max Maximum delay in milliseconds (default: 3000)
 * @returns Promise that resolves after a random delay
 */
export function randomHumanDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(randomDelay);
}

/**
 * Simulates human-like scrolling behavior
 * @param page Puppeteer page object
 * @param scrollDistance Total distance to scroll
 * @param randomize Whether to randomize the scrolling (default: true)
 */
export async function humanScroll(page: any, scrollDistance: number, randomize: boolean = true): Promise<void> {
  // Calculate scrolling parameters
  const steps = randomize ? 
    Math.floor(Math.random() * 5) + 5 : // Random 5-10 steps
    10; // Fixed 10 steps
  
  const stepSize = scrollDistance / steps;
  
  for (let i = 0; i < steps; i++) {
    // Randomize step size a bit for more human-like behavior
    const currentStepSize = randomize ? 
      stepSize * (0.8 + Math.random() * 0.4) : // 80-120% of original step
      stepSize;
    
    await page.evaluate((distance: number) => {
      window.scrollBy(0, distance);
    }, currentStepSize);
    
    // Random pause between scrolls
    await randomHumanDelay(300, 800);
  }
  
  // Slight pause after scrolling completes
  await randomHumanDelay(500, 1200);
}

/**
 * Types text with human-like randomized delays between characters
 * @param page Puppeteer page object
 * @param selector Element selector to type into
 * @param text Text to type
 */
export async function humanType(page: any, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector, { visible: true });
  
  // Focus on the element first
  await page.focus(selector);
  await randomHumanDelay(300, 800);
  
  // Type each character with randomized delays
  for (const char of text) {
    // Type with random delay between 100-300ms
    await page.keyboard.type(char, { delay: Math.floor(Math.random() * 200) + 100 });
  }
  
  // Pause after typing
  await randomHumanDelay(500, 1200);
}

/**
 * Performs a human-like click on an element
 * @param page Puppeteer page object
 * @param selector Element selector to click
 */
export async function humanClick(page: any, selector: string): Promise<void> {
  try {
    // Wait for the element to be visible
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    
    // Get element position
    const elementHandle = await page.$(selector);
    if (!elementHandle) {
      throw new Error(`Element with selector "${selector}" not found`);
    }
    
    // Get the bounding box of the element
    const box = await elementHandle.boundingBox();
    if (!box) {
      throw new Error(`Could not get bounding box for selector "${selector}"`);
    }
    
    // Calculate a random position within the element
    const x = box.x + box.width * (0.3 + Math.random() * 0.4); // 30-70% of width
    const y = box.y + box.height * (0.3 + Math.random() * 0.4); // 30-70% of height
    
    // Move mouse to element with realistic motion
    await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 10) });
    
    // Small delay before clicking
    await randomHumanDelay(100, 500);
    
    // Click the element
    await page.mouse.click(x, y);
    
    // Wait after click
    await randomHumanDelay(500, 1200);
    
  } catch (error) {
    console.error(`Error during human click: ${error}`);
    // Fall back to normal click
    await page.click(selector);
  }
}

/**
 * Moves the mouse in a natural, curved path between two points
 * @param page Puppeteer page object
 * @param startX Starting X coordinate
 * @param startY Starting Y coordinate
 * @param endX Ending X coordinate
 * @param endY Ending Y coordinate
 */
export async function humanMouseMovement(page: any, startX: number, startY: number, endX: number, endY: number): Promise<void> {
  // Calculate distance
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  
  // Calculate number of steps based on distance (more steps for longer distances)
  const steps = Math.max(10, Math.min(25, Math.floor(distance / 20)));
  
  // Generate control points for Bezier curve to create natural mouse movement
  const cp1x = startX + (Math.random() * 0.5 + 0.25) * (endX - startX);
  const cp1y = startY + (Math.random() * 0.8 - 0.4) * (endY - startY);
  const cp2x = startX + (Math.random() * 0.5 + 0.5) * (endX - startX);
  const cp2y = startY + (Math.random() * 0.8 - 0.4) * (endY - startY);
  
  // Move the mouse along the curved path
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Cubic Bezier curve formula
    const x = Math.pow(1 - t, 3) * startX + 
              3 * Math.pow(1 - t, 2) * t * cp1x + 
              3 * (1 - t) * Math.pow(t, 2) * cp2x + 
              Math.pow(t, 3) * endX;
              
    const y = Math.pow(1 - t, 3) * startY + 
              3 * Math.pow(1 - t, 2) * t * cp1y + 
              3 * (1 - t) * Math.pow(t, 2) * cp2y + 
              Math.pow(t, 3) * endY;
    
    await page.mouse.move(x, y);
    
    // Small variable delay between movements
    await delay(Math.random() * 15 + 5);
  }
}

/**
 * Randomly changes viewport size to mimic human browser window adjustments
 * @param page Puppeteer page object
 */
export async function randomViewportAdjustment(page: any): Promise<void> {
  // Common screen resolutions with slight random variations
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
}

/**
 * Simulates human reading behavior by pausing and scrolling slightly
 * @param page Puppeteer page object
 * @param minReadTime Minimum reading time in milliseconds
 * @param maxReadTime Maximum reading time in milliseconds
 */
export async function simulateReading(page: any, minReadTime: number = 5000, maxReadTime: number = 15000): Promise<void> {
  // Calculate random reading time
  const readingTime = Math.floor(Math.random() * (maxReadTime - minReadTime)) + minReadTime;
  
  // Break reading time into sections with micro-scrolling
  const sections = Math.floor(Math.random() * 5) + 2;
  const sectionTime = readingTime / sections;
  
  for (let i = 0; i < sections; i++) {
    // Wait for a section of reading time
    await delay(sectionTime);
    
    // Small scroll (10-60px) to simulate reading progress
    const smallScrollDistance = Math.floor(Math.random() * 50) + 10;
    await page.evaluate((distance: number) => {
      window.scrollBy(0, distance);
    }, smallScrollDistance);
    
    // Occasionally move mouse slightly to simulate pointing at content
    if (Math.random() > 0.7) {
      const viewportSize = await page.viewport();
      const randomX = Math.floor(Math.random() * (viewportSize.width * 0.8)) + (viewportSize.width * 0.1);
      const randomY = Math.floor(Math.random() * (viewportSize.height * 0.6)) + (viewportSize.height * 0.2);
      
      await humanMouseMovement(
        page, 
        page.mouse.position().x, 
        page.mouse.position().y, 
        randomX, 
        randomY
      );
    }
  }
}

/**
 * Simulates a human checking notifications or other elements on LinkedIn
 * @param page Puppeteer page object
 */
export async function randomSiteInteraction(page: any): Promise<void> {
  // List of common interaction selectors on LinkedIn
  const interactionSelectors = [
    '.global-nav__nav > ul > li:nth-child(1) a', // Home button
    '.global-nav__nav > ul > li:nth-child(2) a', // My Network
    '.global-nav__nav > ul > li:nth-child(3) a', // Jobs
    '.global-nav__nav > ul > li:nth-child(4) a', // Messaging
    '.global-nav__nav > ul > li:nth-child(5) a', // Notifications
    '.search-global-typeahead__input', // Search bar
    '.feed-identity-module__actor-meta', // Profile section in sidebar
  ];
  
  // Randomly decide if we should do an interaction (70% chance)
  if (Math.random() > 0.3) {
    // Choose a random interaction
    const selector = interactionSelectors[Math.floor(Math.random() * interactionSelectors.length)];
    
    try {
      // Wait for element to be visible
      await page.waitForSelector(selector, { visible: true, timeout: 5000 });
      
      // Get element position
      const element = await page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          // Get current mouse position
          const currentPosition = await page.evaluate(() => {
            return {
              x: window.event ? (window.event as MouseEvent).clientX : 0,
              y: window.event ? (window.event as MouseEvent).clientY : 0
            };
          });
          
          // Target random position within element
          const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
          const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
          
          // Move mouse to element
          await humanMouseMovement(
            page, 
            currentPosition.x || box.x - 100, 
            currentPosition.y || box.y - 100, 
            targetX, 
            targetY
          );
          
          // Hover on element for a random time
          await randomHumanDelay(1000, 2500);
          
          // 30% chance to actually click the element
          if (Math.random() > 0.7) {
            await page.mouse.click(targetX, targetY);
            
            // Wait while the new page/section loads
            await randomHumanDelay(2000, 5000);
            
            // If we clicked navigation, 80% chance to go back
            if (selector.includes('global-nav') && Math.random() > 0.2) {
              await randomHumanDelay(3000, 8000);
              await page.goBack();
              await randomHumanDelay(1500, 3000);
            }
          }
        }
      }
    } catch (error) {
      // Silently ignore errors - humans don't crash when elements aren't found
      console.log(`Random interaction attempted but failed: ${error}`);
    }
  }
}

/**
 * Enhanced version of withBrowser that includes human-like behavior patterns
 * @param fn Function to execute with the browser page
 * @returns Promise with the function result
 */
export async function withHumanBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  // Get the environment from the context
  const env = (globalThis as any).ENVIRONMENT;
  
  if (!env?.LI_AT || !env?.CSRF || !env?.USERAGENT) {
    throw new Error("LinkedIn credentials are not configured. Please check environment variables.");
  }
  
  // Launch browser with additional human-like settings
  const browser = await launch({
    ...env.CRAWLER_BROWSER,
    args: [
      ...(env.CRAWLER_BROWSER.args || []),
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
    await randomViewportAdjustment(page);
    
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
    page.setDefaultNavigationTimeout(30000 + timeoutVariation);
    
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
        timeout: 30000 + timeoutVariation
      });
      
      // Simulate human reading the page briefly
      await simulateReading(page, 2000, 4000);
      
      // Random chance to do a site interaction
      await randomSiteInteraction(page);
      
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
 * Performs a human-like form fill operation
 * @param page Puppeteer page object
 * @param formData Object containing selectors and values to fill
 */
export async function humanFormFill(page: any, formData: Record<string, string>): Promise<void> {
  // Get form field selectors
  const selectors = Object.keys(formData);
  
  // Randomize order slightly (humans don't always fill forms in the same order)
  if (selectors.length > 2 && Math.random() > 0.7) {
    // Swap two random fields
    const idx1 = Math.floor(Math.random() * selectors.length);
    let idx2 = Math.floor(Math.random() * selectors.length);
    
    // Make sure idx2 is different from idx1
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * selectors.length);
    }
    
    // Swap the selectors
    [selectors[idx1], selectors[idx2]] = [selectors[idx2], selectors[idx1]];
  }
  
  // Fill each field with human-like behavior
  for (const selector of selectors) {
    try {
      // Wait for the field to be visible
      await page.waitForSelector(selector, { visible: true, timeout: 5000 });
      
      // Get field position
      const field = await page.$(selector);
      if (!field) continue;
      
      const box = await field.boundingBox();
      if (!box) continue;
      
      // Get current mouse position or use default
      const currentPosition = await page.evaluate(() => {
        return {
          x: window.event ? (window.event as MouseEvent).clientX : 0,
          y: window.event ? (window.event as MouseEvent).clientY : 0
        };
      });
      
      // Move mouse to the field
      const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
      const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
      
      await humanMouseMovement(
        page, 
        currentPosition.x || targetX - 100, 
        currentPosition.y || targetY - 100, 
        targetX, 
        targetY
      );
      
      // Click on the field
      await page.mouse.click(targetX, targetY);
      await randomHumanDelay(300, 800);
      
      // Type the text with human-like delays
      await humanType(page, selector, formData[selector]);
      
      // Sometimes people pause between fields
      await randomHumanDelay(500, 1500);
    } catch (error) {
      console.warn(`Error filling form field ${selector}: ${error}`);
    }
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

/**
 * Connect with a LinkedIn profile using human-like behavior
 * @param profileUrl The URL of the LinkedIn profile to connect with
 * @param customMessage Optional custom message to send with connection request
 * @returns Promise resolving to success status and additional info
 */
export async function connectWithProfile(profileUrl: string, customMessage?: string): Promise<{success: boolean, message: string}> {
  return await withHumanBrowser(async (page) => {
    try {
      console.log(`Navigating to profile: ${profileUrl}`);
      
      // Navigate to the profile page
      await page.goto(profileUrl, { 
        waitUntil: 'domcontentloaded'
      });
      
      // Check for captcha before proceeding
      const captchaDetected = await handleCaptcha(page);
      if (captchaDetected) {
        console.log("Captcha was detected and presumably solved. Continuing...");
      }
      
      // Simulate human reading the profile
      await simulateReading(page, 8000, 20000);
      
      // Random chance to interact with profile sections before connecting
      if (Math.random() > 0.5) {
        // List of common profile section selectors
        const sectionSelectors = [
          'section.experience-section',
          'section.education-section',
          'section.skills-section',
          'section.accomplishments-section'
        ];
        
        // Choose a random section to scroll to
        const randomSection = sectionSelectors[Math.floor(Math.random() * sectionSelectors.length)];
        
        try {
          const sectionExists = await page.$(randomSection);
          
          if (sectionExists) {
            // Scroll to the section
            await page.evaluate((selector) => {
              const element = document.querySelector(selector);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, randomSection);
            
            await randomHumanDelay(2000, 5000);
            
            // Simulate reading that section
            await simulateReading(page, 3000, 8000);
          }
        } catch (sectionError) {
          console.log(`Error interacting with profile section: ${sectionError}`);
        }
      }
      
      // Find and click the connect button
      // LinkedIn has several possible selectors for the connect button
      const connectButtonSelectors = [
        'button.pv-s-profile-actions--connect',
        'button[aria-label="Connect with this person"]',
        'button[data-control-name="connect"]',
        '.pvs-profile-actions button:nth-child(1)',
        'button:contains("Connect")'
      ];
      
      let connectButtonFound = false;
      
      // Try each selector
      for (const selector of connectButtonSelectors) {
        try {
          const buttonExists = await page.$(selector);
          
          if (buttonExists) {
            // Wait a bit before clicking like a human would
            await randomHumanDelay(1000, 3000);
            
            // Use human click
            await humanClick(page, selector);
            
            connectButtonFound = true;
            break;
          }
        } catch (buttonError) {
          continue;
        }
      }
      
      if (!connectButtonFound) {
        return {
          success: false,
          message: "Could not find connect button. May already be connected or profile requires LinkedIn premium."
        };
      }
      
      // Wait for the connect modal to appear
      await randomHumanDelay(1000, 2000);
      
      // Check if there's a custom message option and add note if requested
      if (customMessage) {
        // Try to find "Add a note" button
        const addNoteSelectors = [
          'button:contains("Add a note")',
          'button[aria-label="Add a note"]',
          '.artdeco-modal__actionbar button:nth-child(1)'
        ];
        
        let addNoteFound = false;
        
        for (const selector of addNoteSelectors) {
          try {
            const noteButtonExists = await page.$(selector);
            
            if (noteButtonExists) {
              await randomHumanDelay(1000, 2000);
              await humanClick(page, selector);
              addNoteFound = true;
              break;
            }
          } catch (noteButtonError) {
            continue;
          }
        }
        
        if (addNoteFound) {
          // Try to find the textarea for the custom message
          const textareaSelectors = [
            'textarea#custom-message',
            '.artdeco-modal textarea',
            'textarea[name="message"]'
          ];
          
          let textareaFound = false;
          
          for (const selector of textareaSelectors) {
            try {
              const textareaExists = await page.$(selector);
              
              if (textareaExists) {
                // Type message with human-like delays
                await humanType(page, selector, customMessage);
                textareaFound = true;
                break;
              }
            } catch (textareaError) {
              continue;
            }
          }
          
          if (!textareaFound) {
            console.log("Could not find textarea for custom message");
          }
        }
      }
      
      // Find and click the send/connect button in the modal
      const sendButtonSelectors = [
        'button:contains("Send")',
        'button[aria-label="Send now"]',
        '.artdeco-modal__actionbar button:nth-child(2)',
        'button[type="submit"]'
      ];
      
      let sendButtonFound = false;
      
      for (const selector of sendButtonSelectors) {
        try {
          const sendButtonExists = await page.$(selector);
          
          if (sendButtonExists) {
            await randomHumanDelay(1500, 3000);
            await humanClick(page, selector);
            sendButtonFound = true;
            break;
          }
        } catch (sendButtonError) {
          continue;
        }
      }
      
      if (!sendButtonFound) {
        return {
          success: false,
          message: "Could not complete connection request. Modal may have changed or connection failed."
        };
      }
      
      // Wait for confirmation or success indication
      await randomHumanDelay(2000, 4000);
      
      // Check if we see a success message or the button changed to "Pending"
      const successIndicators = [
        'button:contains("Pending")',
        '.artdeco-inline-feedback--success',
        '.pv-s-profile-actions--message',
        'button[aria-label="Message"]'
      ];
      
      let requestSent = false;
      
      for (const indicator of successIndicators) {
        try {
          const indicatorExists = await page.$(indicator);
          
          if (indicatorExists) {
            requestSent = true;
            break;
          }
        } catch (indicatorError) {
          continue;
        }
      }
      
      // Final check - see if there are any error messages
      const errorMessages = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.artdeco-inline-feedback--error, .alert-error');
        const errors: string[] = [];
        
        errorElements.forEach((element) => {
          if (element.textContent) {
            errors.push(element.textContent.trim());
          }
        });
        
        return errors;
      });
      
      if (errorMessages.length > 0) {
        return {
          success: false,
          message: `Error sending connection request: ${errorMessages.join(', ')}`
        };
      }
      
      if (requestSent) {
        return {
          success: true,
          message: "Connection request sent successfully"
        };
      } else {
        return {
          success: false,
          message: "Could not confirm if connection request was sent"
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Error connecting with profile: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });
}

/**
 * Send a message to a LinkedIn connection with human-like behavior
 * @param profileUrl The URL of the LinkedIn profile to message
 * @param message The message text to send
 * @returns Promise resolving to success status and additional info
 */
export async function sendMessageToConnection(profileUrl: string, message: string): Promise<{success: boolean, message: string}> {
  if (!message || message.trim() === '') {
    return {
      success: false,
      message: "Message text cannot be empty"
    };
  }

  return await withHumanBrowser(async (page) => {
    try {
      console.log(`Navigating to profile: ${profileUrl}`);
      
      // Navigate to the profile page
      await page.goto(profileUrl, { 
        waitUntil: 'domcontentloaded'
      });
      
      // Check for captcha before proceeding
      const captchaDetected = await handleCaptcha(page);
      if (captchaDetected) {
        console.log("Captcha was detected and presumably solved. Continuing...");
      }
      
      // Simulate human reading the profile briefly
      await simulateReading(page, 3000, 8000);
      
      // Find and click the message button
      const messageButtonSelectors = [
        'button.pv-s-profile-actions--message',
        'button[aria-label="Message"]',
        'button[data-control-name="message"]',
        '.pvs-profile-actions button:nth-child(2)',
        'a.message-anywhere-button'
      ];
      
      let messageButtonFound = false;
      
      // Try each selector
      for (const selector of messageButtonSelectors) {
        try {
          const buttonExists = await page.$(selector);
          
          if (buttonExists) {
            // Wait a bit before clicking like a human would
            await randomHumanDelay(1000, 3000);
            
            // Use human click
            await humanClick(page, selector);
            
            messageButtonFound = true;
            break;
          }
        } catch (buttonError) {
          continue;
        }
      }
      
      if (!messageButtonFound) {
        // Try an alternative approach - check if we're already in a messaging interface
        const messagingIndicators = [
          '.msg-form',
          '.msg-compose-form',
          'textarea[name="message"]',
          '.msg-messaging-container'
        ];
        
        let inMessaging = false;
        
        for (const indicator of messagingIndicators) {
          try {
            const indicatorExists = await page.$(indicator);
            if (indicatorExists) {
              inMessaging = true;
              break;
            }
          } catch (indicatorError) {
            continue;
          }
        }
        
        if (!inMessaging) {
          return {
            success: false,
            message: "Could not find message button. May not be connected or profile doesn't accept messages."
          };
        }
      }
      
      // Wait for the message form to appear
      await randomHumanDelay(2000, 4000);
      
      // Find and focus on the message input field
      const messageInputSelectors = [
        'div.msg-form__contenteditable',
        'div[role="textbox"]',
        '.msg-form__message-texteditor',
        'textarea[name="message"]',
        '.msg-messaging-form__content'
      ];
      
      let messageInputFound = false;
      
      for (const selector of messageInputSelectors) {
        try {
          const inputExists = await page.$(selector);
          
          if (inputExists) {
            // Type message with human-like delays
            await humanType(page, selector, message);
            messageInputFound = true;
            break;
          }
        } catch (inputError) {
          continue;
        }
      }
      
      if (!messageInputFound) {
        return {
          success: false,
          message: "Could not find message input field."
        };
      }
      
      // Find and click the send button
      const sendButtonSelectors = [
        'button.msg-form__send-button',
        'button[aria-label="Send message"]',
        'button[type="submit"]',
        'button:contains("Send")'
      ];
      
      let sendButtonFound = false;
      
      // Random delay before clicking send (like a human reviewing their message)
      await randomHumanDelay(1500, 4000);
      
      for (const selector of sendButtonSelectors) {
        try {
          const sendButtonExists = await page.$(selector);
          
          if (sendButtonExists) {
            await randomHumanDelay(800, 2000);
            await humanClick(page, selector);
            sendButtonFound = true;
            break;
          }
        } catch (sendButtonError) {
          continue;
        }
      }
      
      if (!sendButtonFound) {
        return {
          success: false,
          message: "Could not find send button."
        };
      }
      
      // Wait for confirmation that the message was sent
      await randomHumanDelay(2000, 4000);
      
      // Check for success indicators (message appears in conversation)
      const successIndicators = [
        '.msg-s-message-list__event',
        '.msg-s-event-listitem:last-child',
        '.msg-s-message-group:last-child'
      ];
      
      let messageSent = false;
      
      for (const indicator of successIndicators) {
        try {
          // Look for the latest message that contains our text
          const latestMessageContainsText = await page.evaluate((selector, messageText) => {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) return false;
            
            // Check the last few elements for our message text
            for (let i = elements.length - 1; i >= Math.max(0, elements.length - 3); i--) {
              const elementText = elements[i].textContent || '';
              if (elementText.includes(messageText)) {
                return true;
              }
            }
            
            return false;
          }, indicator, message.substring(0, 30)); // Check first 30 chars to avoid long message issues
          
          if (latestMessageContainsText) {
            messageSent = true;
            break;
          }
        } catch (indicatorError) {
          continue;
        }
      }
      
      // Also check if the input field is now empty (another success indicator)
      const inputFieldEmpty = await page.evaluate((selectors) => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent === '') {
            return true;
          }
        }
        return false;
      }, messageInputSelectors);
      
      if (messageSent || inputFieldEmpty) {
        return {
          success: true,
          message: "Message sent successfully"
        };
      } else {
        // Check for any error messages
        const errorMessages = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.error-message, .alert-error, .msg-form__error-alert');
          const errors: string[] = [];
          
          errorElements.forEach((element) => {
            if (element.textContent) {
              errors.push(element.textContent.trim());
            }
          });
          
          return errors;
        });
        
        if (errorMessages.length > 0) {
          return {
            success: false,
            message: `Error sending message: ${errorMessages.join(', ')}`
          };
        }
        
        return {
          success: false,
          message: "Could not confirm if message was sent"
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error sending message: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });
}

// Re-export all the types and functions from the modular files
export * from './types';
export * from './utils';
export * from './auth';
export * from './browser';
export * from './human-behavior';
export * from './linkedin-actions';

// Note: To avoid circular dependencies, we don't directly import
// human-behavior in browser.ts. Instead, we implement simplified
// versions of those functions directly in withHumanBrowser. 