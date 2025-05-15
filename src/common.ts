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
 * @param min Minimum delay in milliseconds (default: 6000)
 * @param max Maximum delay in milliseconds (default: 11000)
 * @returns Promise that resolves after a random delay
 */
export function randomHumanDelay(min: number = 6000, max: number = 11000): Promise<void> {
  const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(randomDelay);
} 