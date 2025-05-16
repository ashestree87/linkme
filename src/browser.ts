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
  console.log("Launching standard browser...");
  let browser;
  
  try {
    browser = await launch(env.CRAWLER_BROWSER);
    console.log("Standard browser launched successfully");
  } catch (launchError) {
    console.error("Error launching standard browser:", launchError);
    throw launchError;
  }

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
  
  // Create global timeout protection
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Human browser operation timed out after 2 minutes"));
    }, 120000); // 2 minute global timeout
  });
  
  // Launch browser directly like in withBrowser, don't try to modify launch options
  console.log("Launching human-like browser...");
  let browser;
  
  try {
    browser = await launch(env.CRAWLER_BROWSER);
    console.log("Human-like browser launched successfully");
  } catch (launchError) {
    console.error("Error launching human-like browser:", launchError);
    throw launchError;
  }

  try {
    // Create page with more timeout
    console.log("Creating new page...");
    const page = await browser.newPage();
    console.log("Page created successfully");
    
    // Enhanced set of fingerprinting evasion techniques
    console.log("Setting advanced browser fingerprint evasions...");
    await page.evaluateOnNewDocument(() => {
      // Override the navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications' || 
            parameters.name === 'geolocation' || 
            // @ts-ignore - These are valid permission names in real browsers
            parameters.name === 'microphone' || 
            // @ts-ignore - These are valid permission names in real browsers
            parameters.name === 'camera') {
          return Promise.resolve({ state: 'prompt' });
        }
        return originalQuery(parameters);
      };
      
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
            },
            {
              0: {
                type: 'application/x-google-chrome-pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                enabledPlugin: Plugin,
              },
              name: 'Chrome PDF Plugin',
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1,
            },
            {
              0: {
                type: 'application/x-nacl',
                suffixes: '',
                description: 'Native Client Executable',
                enabledPlugin: Plugin,
              },
              name: 'Native Client',
              description: 'Native Client Executable',
              filename: 'internal-nacl-plugin',
              length: 1,
            }
          ];
        },
      });
      
      // Add mimeTypes to match plugins
      // @ts-ignore
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => {
          return {
            length: 3,
            0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: {} },
            1: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: {} },
            2: { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable', enabledPlugin: {} },
          };
        },
      });
      
      // Add a web history
      // @ts-ignore
      window.history.length = Math.floor(Math.random() * 5) + 3;
      
      // Override platform with common platforms
      Object.defineProperty(navigator, 'platform', {
        get: () => {
          const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
          return platforms[Math.floor(Math.random() * platforms.length)];
        },
      });
      
      // Override product sub to look like a real browser
      Object.defineProperty(navigator, 'productSub', {
        get: () => '20030107',
      });
      
      // Override hardware concurrency (CPU cores) with a reasonable number
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => Math.floor(Math.random() * 8) + 4, // 4-12 cores
      });
      
      // Add a fake canvas fingerprint
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (type === 'image/png' && this.width === 320 && this.height === 200) {
          return 'data:image/png;base64,iVBORw0KGgoAAAAN'; // beginning of a base64 image
        }
        return originalToDataURL.apply(this, [type] as unknown as [string, number]);
      };
      
      // Override language with common settings
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
      });
      
      // Override languages array
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Make sure WebGL vendor and renderer are not suspicious
      const getParameterProxy = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameterProxy.apply(this, [parameter] as unknown as [number]);
      };
    });
    
    // Choose a random viewport from common sizes
    console.log("Setting viewport...");
    const viewports = [
      { width: 1366 + Math.floor(Math.random() * 20), height: 768 + Math.floor(Math.random() * 20) },
      { width: 1440 + Math.floor(Math.random() * 20), height: 900 + Math.floor(Math.random() * 20) },
      { width: 1536 + Math.floor(Math.random() * 20), height: 864 + Math.floor(Math.random() * 20) },
      { width: 1920 + Math.floor(Math.random() * 20), height: 1080 + Math.floor(Math.random() * 20) },
      { width: 1280 + Math.floor(Math.random() * 20), height: 800 + Math.floor(Math.random() * 20) }
    ];
    
    const selectedViewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(selectedViewport);
    console.log("Viewport set successfully");
    
    await randomHumanDelay(500, 1000);
    
    // Set random user agent from a pool of real browser user agents
    console.log("Setting user agent...");
    const userAgents = [
      env.USERAGENT, // keep whatever the environment is supplying most of the time
      // Chrome 136 on Windows 10
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',  
      // Safari 18.4 on macOS Sonoma (14.7.5)
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',  
      // Edge 136 on Windows 10
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
    ];
    
    // 80% chance to use the provided user agent, 20% chance to use another one
    const selectedUserAgent = Math.random() > 0.2 ? 
      userAgents[0] : 
      userAgents[Math.floor(Math.random() * userAgents.length)];
    
    await page.setUserAgent(selectedUserAgent);
    console.log("User agent set successfully");
    
    // Set default navigation timeout to be variable (like humans have different patience levels)
    const timeoutVariation = Math.floor(Math.random() * 10000);
    page.setDefaultNavigationTimeout(60000 + timeoutVariation);
    
    // Add randomized headers
    console.log("Setting HTTP headers...");
    const languages = ['en-US,en;q=0.9', 'en-US,en;q=0.8,es;q=0.3', 'en-GB,en;q=0.9,en-US;q=0.8'];
    await page.setExtraHTTPHeaders({
      'Accept-Language': languages[Math.floor(Math.random() * languages.length)],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'sec-ch-ua': '"Google Chrome";v="136", "Not A(Brand";v="99", "Chromium";v="136"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    });
    console.log("HTTP headers set successfully");
    
    // Set LinkedIn cookies with some randomness in the timing
    console.log("Setting cookies...");
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
      },
      {
        name: 'li_rm',
        value: 'AQHuFb8NCRg5rgAAAYyBQ_CgG20Y',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
      }
    );
    console.log("Cookies set successfully");
    
    // First navigate to LinkedIn homepage with human behavior
    console.log("Navigating to LinkedIn homepage with human-like behavior...");
    try {
      // Navigate with variable timing for loading
      const waitUntilOptions = ['domcontentloaded', 'networkidle0', 'networkidle2'];
      const randomWaitOption = waitUntilOptions[Math.floor(Math.random() * 1)]; // Mostly use domcontentloaded
      
      await Promise.race([
        page.goto('https://www.linkedin.com/', { 
          waitUntil: randomWaitOption as any,
          timeout: 60000 + timeoutVariation
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Navigation timeout")), 70000))
      ]);
      console.log("LinkedIn homepage navigation completed");
      
      // We'll do basic simple reading simulation here to avoid circular dependency
      // We can't import from human-behavior as that would create a circular dependency
      
      // Calculate random reading time
      const readingTime = Math.floor(Math.random() * 2000) + 2000;
      await delay(readingTime);
      
      // Small scroll to simulate reading progress
      console.log("Simulating human reading behavior...");
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
          console.log("Attempting random interaction with element:", selector);
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
    
    console.log("Executing user-provided function...");
    // Execute the provided function with timeout protection
    return await Promise.race([
      fn(page),
      timeoutPromise
    ]);
  } finally {
    // Close browser with slight delay like a human would
    try {
      console.log("Closing human-like browser...");
      await randomHumanDelay(300, 600);
      await browser.close();
      console.log("Human-like browser closed successfully");
    } catch (closeError) {
      console.error("Error closing human-like browser:", closeError);
    }
  }
}

/**
 * Handles captchas and security challenges by detecting them and providing feedback
 * @param page Puppeteer page object
 * @param timeoutMs Maximum time to wait for captcha resolution in milliseconds
 * @returns Promise that resolves to true if captcha was detected and presumably solved
 */
export async function handleCaptcha(page: any, timeoutMs: number = 120000): Promise<boolean> {
  // Enhanced set of selectors for both CAPTCHAs and LinkedIn security challenges
  const captchaSelectors = [
    // Google reCAPTCHA selectors
    '.recaptcha-checkbox-border',
    'iframe[src*="recaptcha"]',
    'iframe[src*="captcha"]',
    '.captcha-container',
    '#captcha',
    'img[alt*="captcha"]',
    'input[name="captcha"]',
    '.g-recaptcha',
    
    // LinkedIn security challenge selectors
    '.challenge-dialog',
    '.secondary-challenge-dialog',
    '.verification-card',
    '#captcha-challenge',
    '#challenge-content',
    '.security-verification',
    '.verification-challenge',
    '[data-id="security-challenge"]',
    'form[name="security-challenge-form"]',
    '.artdeco-card__header:contains("Security Verification")',
    'h2:contains("Let\'s do a quick security check")',
    'h2:contains("Security verification")',
    'button:contains("Verify")',
    'button[aria-label="Verify it\'s you"]',
    // Phone verification selectors
    '#phone-verify',
    '.phone-verification'
  ];
  
  // Take a screenshot before checking for captchas (for debugging)
  try {
    await page.screenshot({ path: 'pre-captcha-check.png' });
    console.log('Saved pre-captcha screenshot for debugging');
  } catch (screenshotError) {
    console.log('Could not save pre-captcha screenshot:', screenshotError);
  }
  
  // Check if any captcha elements are present
  console.log('Checking for captcha or security challenge...');
  const captchaDetected = await page.evaluate((selectors: string[]) => {
    for (const selector of selectors) {
      // For text-based contains selectors, we need special handling
      if (selector.includes(':contains(')) {
        const baseSelector = selector.split(':contains(')[0];
        const textToContain = selector.split(':contains(')[1].slice(0, -2); // remove the ")" and quote
        
        // Find all elements of that type
        const elements = document.querySelectorAll(baseSelector);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (el.textContent && el.textContent.includes(textToContain)) {
            // For debugging, expose what was found
            console.log(`Found security challenge element: ${baseSelector} containing "${textToContain}"`);
            return { 
              found: true, 
              selector: baseSelector, 
              text: el.textContent.trim(),
              type: 'text-match'
            };
          }
        }
      } else {
        // Standard selector check
        const element = document.querySelector(selector);
        if (element) {
          // For debugging, capture more details about what was found
          let elementDetails = {
            tag: element.tagName,
            id: (element as HTMLElement).id || 'no-id',
            classes: (element as HTMLElement).className || 'no-class'
          };
          
          console.log(`Found captcha element: ${selector}`, elementDetails);
          return { 
            found: true, 
            selector, 
            type: 'selector-match',
            details: elementDetails
          };
        }
      }
    }
    return { found: false };
  }, captchaSelectors);
  
  if (captchaDetected.found) {
    console.log('Challenge detected!', captchaDetected);
    
    // Take a screenshot of the CAPTCHA/challenge
    try {
      const screenshotBuffer = await page.screenshot({ 
        fullPage: true,
        encoding: 'base64'
      });
      
      // Log that we've detected a CAPTCHA and have a screenshot
      console.log(`CAPTCHA/security challenge detected! Type: ${captchaDetected.type}`);
      
      // Here we'd ideally push this screenshot to a debug session or external service
      // so it can be manually resolved
      
      // For now, we'll just pause to give time for manual intervention
      console.log('Waiting for manual resolution...');
      
      // Wait for navigation or timeout
      try {
        // Wait for a navigation event that would happen after captcha is solved
        await Promise.race([
          page.waitForNavigation({ timeout: timeoutMs }),
          // Also consider the page to be ready if captcha elements disappear
          page.waitForFunction(
            (selectorToCheck: string) => {
              return !document.querySelector(selectorToCheck);
            },
            { timeout: timeoutMs },
            captchaDetected.selector
          )
        ]);
        
        console.log('Challenge appears to be resolved, continuing...');
        return true;
      } catch (error) {
        console.error('Challenge resolution timeout or error:', error);
        throw new Error('Security challenge resolution timeout');
      }
    } catch (screenshotError) {
      console.error('Error taking challenge screenshot:', screenshotError);
    }
  }
  
  console.log('No security challenges detected, continuing...');
  return false;
}

/**
 * LinkedIn specific browser handler with enhanced detection evasion
 * @param fn Function to execute with the browser page
 * @returns Promise with the function result
 */
export async function withLinkedInBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  // Get the environment from the context
  const env = getEnvironment();
  
  if (!validateCredentials()) {
    throw new Error("LinkedIn credentials are not configured. Please check environment variables.");
  }
  
  // Create global timeout protection (extended for LinkedIn which can be slow)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("LinkedIn operation timed out after 3 minutes"));
    }, 180000); // 3 minute global timeout
  });
  
  console.log("Launching LinkedIn-optimized browser...");
  let browser;
  
  try {
    // LinkedIn-specific launch - prefer stealth mode if available
    browser = await launch(env.CRAWLER_BROWSER);
    console.log("LinkedIn-optimized browser launched successfully");
  } catch (launchError) {
    console.error("Error launching LinkedIn-optimized browser:", launchError);
    throw launchError;
  }

  try {
    // Create page with extended timeout for LinkedIn
    console.log("Creating new page for LinkedIn...");
    const page = await browser.newPage();
    console.log("Page created successfully");
    
    // Apply all advanced evasion techniques specific to LinkedIn
    console.log("Setting LinkedIn-specific fingerprint evasions...");
    await page.evaluateOnNewDocument(() => {
      // Override navigator properties with exactly what LinkedIn expects to see
      
      // Make it look like Chrome on Windows - LinkedIn's most common browser
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      });
      
      // Hide that we're using automation
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Set plugins that LinkedIn expects to see
      // @ts-ignore
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            // Chrome PDF Plugin
            {
              0: {
                type: 'application/x-google-chrome-pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                enabledPlugin: true,
              },
              name: 'Chrome PDF Plugin',
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1,
            },
            // Chrome PDF Viewer
            {
              0: {
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                enabledPlugin: true,
              },
              name: 'Chrome PDF Viewer',
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1,
            },
            // Native Client
            {
              0: {
                type: 'application/x-nacl',
                suffixes: '',
                description: 'Native Client Executable',
                enabledPlugin: true,
              },
              name: 'Native Client',
              description: 'Native Client Executable',
              filename: 'internal-nacl-plugin',
              length: 1,
            }
          ];
        },
        enumerable: true,
        configurable: true,
      });
      
      // Matching mimeTypes
      // @ts-ignore
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => {
          return {
            length: 3,
            0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: {} },
            1: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: {} },
            2: { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable', enabledPlugin: {} },
          };
        },
        enumerable: true,
        configurable: true,
      });
      
      // Make platform consistent with userAgent
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        enumerable: true,
        configurable: true,
      });
      
      // Set connection properties LinkedIn checks for
      // @ts-ignore
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false
        }),
        enumerable: true,
        configurable: true,
      });
      
      // Fixed language settings
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
        enumerable: true,
        configurable: true,
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        enumerable: true,
        configurable: true,
      });
      
      // Chrome product values
      Object.defineProperty(navigator, 'productSub', {
        get: () => '20030107',
        enumerable: true,
        configurable: true,
      });
      
      Object.defineProperty(navigator, 'product', {
        get: () => 'Gecko',
        enumerable: true,
        configurable: true,
      });
      
      Object.defineProperty(navigator, 'vendor', {
        get: () => 'Google Inc.',
        enumerable: true,
        configurable: true,
      });
      
      // Set hardware concurrency (CPU cores)
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        enumerable: true,
        configurable: true,
      });
      
      // Override permissions API that LinkedIn sometimes checks
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications' || 
            parameters.name === 'geolocation' || 
            // @ts-ignore - These are valid permission names in real browsers
            parameters.name === 'microphone' || 
            // @ts-ignore - These are valid permission names in real browsers
            parameters.name === 'camera') {
          return Promise.resolve({ state: 'prompt' });
        }
        return originalQuery(parameters);
      };
      
      // Fix WebGL rendering information
      const getParameterProxy = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Google Inc. (Intel)';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        }
        return getParameterProxy.apply(this, [parameter] as unknown as [number]);
      };
      
      // Fix canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (type === 'image/png' && this.width === 320 && this.height === 200) {
          return 'data:image/png;base64,iVBORw0KGgoAAAAN...'; // truncated for clarity
        }
        return originalToDataURL.apply(this, [type] as unknown as [string, number]);
      };
      
      // Add history length like a real browser
      // @ts-ignore - We need to override this read-only property
      window.history.length = 3;
      
      // Spoof screen resolution to common laptop size
      Object.defineProperty(window.screen, 'width', { get: () => 1920 });
      Object.defineProperty(window.screen, 'height', { get: () => 1080 });
      Object.defineProperty(window.screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(window.screen, 'availHeight', { get: () => 1040 });
      Object.defineProperty(window.screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24 });
    });
    
    // Set viewport to a common resolution for LinkedIn
    console.log("Setting viewport for LinkedIn...");
    await page.setViewport({ width: 1920, height: 1080 });
    console.log("Viewport set successfully");
    
    await randomHumanDelay(500, 1000);
    
    // Set user agent to match the one used in evaluateOnNewDocument
    console.log("Setting user agent...");
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36');
    console.log("User agent set successfully");
    
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(90000);
    
    // Add LinkedIn-specific HTTP headers
    console.log("Setting LinkedIn-specific HTTP headers...");
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'sec-ch-ua': '"Google Chrome";v="137", "Not;A=Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Connection': 'keep-alive',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1'
    });
    console.log("HTTP headers set successfully");
    
    // Set LinkedIn cookies with deliberate timing
    console.log("Setting LinkedIn cookies with realistic timing...");
    await randomHumanDelay(700, 1200);
    
    // Set main auth cookie first
    await page.setCookie({
      name: 'li_at',
      value: env.LI_AT,
      domain: '.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });
    
    await randomHumanDelay(300, 800);
    
    // Set CSRF token
    await page.setCookie({
      name: 'JSESSIONID',
      value: env.CSRF,
      domain: '.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });
    
    await randomHumanDelay(200, 600);
    
    // Add all other essential LinkedIn cookies
    await page.setCookie(
      {
        name: 'lidc',
        value: 'b=VGST00:s=V:r=V:g=2500',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'lang',
        value: 'v=2&lang=en-us',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'li_rm',
        value: 'AQHuFb8NCRg5rgAAAYyBQ_CgG20Y',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'li_mc',
        value: 'MTsyMTs2MDs3',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
      },
      {
        name: 'bcookie',
        value: 'v=2&xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None',
      }
    );
    console.log("Cookies set successfully");
    
    // First navigate to LinkedIn homepage with enhanced human behavior
    console.log("Initial navigation to LinkedIn homepage...");
    
    try {
      // Navigate to homepage with careful handling
      await Promise.race([
        page.goto('https://www.linkedin.com/', { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Initial navigation timeout")), 35000))
      ]);
      
      console.log("LinkedIn homepage loaded, waiting for stability...");
      
      // Give the page time to fully load and execute JavaScript
      await randomHumanDelay(2000, 4000);
      
      // Check for any security challenges right away
      const captchaDetected = await handleCaptcha(page);
      if (captchaDetected) {
        console.log("Security verification handled during initial navigation");
      }
      
      // Check if we've been redirected to login page despite having cookies
      const currentUrl = page.url();
      console.log(`Current URL after initial navigation: ${currentUrl}`);
      
      if (currentUrl.includes('/login') || 
          currentUrl.includes('/checkpoint') || 
          currentUrl.includes('/authwall')) {
        console.error("LinkedIn redirected to login/checkpoint page despite cookies");
        throw new Error("LinkedIn authentication failed - cookies may be expired");
      }
      
      // Do some simple human-like interactions to establish the session 
      console.log("Performing human-like interactions...");
      
      // Scroll down slightly
      await page.evaluate(() => {
        window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
      });
      
      await randomHumanDelay(1000, 2500);
      
      // Move mouse to a random position
      const viewportSize = await page.viewport();
      if (viewportSize) {
        const randomX = Math.floor(Math.random() * (viewportSize.width * 0.8)) + (viewportSize.width * 0.1);
        const randomY = Math.floor(Math.random() * (viewportSize.height * 0.6)) + (viewportSize.height * 0.2);
        await page.mouse.move(randomX, randomY);
      }
      
      await randomHumanDelay(800, 1500);
      
      // Now execute the provided function
      return await fn(page);
      
    } catch (error) {
      console.error("LinkedIn navigation error:", error);
      
      // Try to take a screenshot to help debug the error
      try {
        await page.screenshot({ path: 'linkedin-error.png' });
        console.log("Error screenshot saved to linkedin-error.png");
      } catch (screenshotError) {
        console.error("Could not save error screenshot:", screenshotError);
      }
      
      throw error;
    }
  } finally {
    // Make sure to close the browser
    if (browser) {
      await browser.close();
      console.log("LinkedIn browser closed");
    }
  }
} 