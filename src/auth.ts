import { launch } from '@cloudflare/puppeteer';
import { AuthResult } from './types';
import { delay, getEnvironment } from './utils';
import { withLinkedInBrowser } from './browser';

/**
 * Verify if LinkedIn authentication is working
 * @returns Object containing status and message
 */
export async function verifyLinkedInAuth(): Promise<AuthResult> {
  // Get the environment from the context
  const env = getEnvironment();
  
  // Check if credentials are set
  if (!env?.LI_AT || !env?.CSRF || !env?.USERAGENT) {
    return {
      isValid: false,
      message: "LinkedIn credentials are not configured. Please check environment variables."
    };
  }
  
  // Use the LinkedIn-optimized browser to test authentication
  try {
    const debugInfo: any = {
      timeline: [],
      screenshots: []
    };
    
    // Use LinkedIn-optimized browser to test authentication
    const result = await withLinkedInBrowser(async (page) => {
      try {
        // Add logging for debugging
        debugInfo.timeline.push("Using LinkedIn-optimized browser for auth verification");
        
        // Take a screenshot to verify the page
        try {
          const screenshot = await page.screenshot({ encoding: "base64" });
          debugInfo.screenshots.push({
            stage: "linkedin_page",
            data: screenshot
          });
        } catch (screenshotError) {
          debugInfo.timeline.push(`Screenshot error: ${screenshotError}`);
        }
        
        // Get the current URL to see if we're properly logged in
        const currentUrl = page.url();
        debugInfo.timeline.push(`Current URL: ${currentUrl}`);
        
        // Check if we're at a login page or checkpoint
        const isLoginPage = currentUrl.includes('checkpoint') || 
                            currentUrl.includes('login') ||
                            currentUrl.includes('signin');
        
        if (isLoginPage) {
          debugInfo.timeline.push("Detected login/checkpoint page - authentication cookies invalid");
          return {
            isValid: false,
            message: "LinkedIn redirected to login page. Your authentication cookies are expired or invalid.",
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
      } catch (error: any) {
        debugInfo.timeline.push(`Auth verification error: ${error.message}`);
        return {
          isValid: false,
          message: `LinkedIn authentication check failed: ${error.message}`,
          debugInfo
        };
      }
    });
    
    return result; 
  } catch (error: any) {
    return {
      isValid: false,
      message: `LinkedIn authentication check failed: ${error.message}`
    };
  }
} 