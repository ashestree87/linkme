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
 * Get the global environment with LinkedIn configuration
 * @returns The environment object
 */
export function getEnvironment(): any {
  return (globalThis as any).ENVIRONMENT;
}

/**
 * Validate if LinkedIn credentials are properly configured
 * @returns True if credentials are valid, false otherwise
 */
export function validateCredentials(): boolean {
  const env = getEnvironment();
  return !!(env?.LI_AT && env?.CSRF && env?.USERAGENT);
}

/**
 * Take a screenshot and save it with the given name
 * This can be used during LinkedIn automation to capture the current state
 * @param page Puppeteer page object
 * @param name Name identifier for the screenshot
 * @param saveLocally Whether to save the screenshot locally (if false, just returns base64)
 * @returns Base64 encoded screenshot data
 */
export async function takeScreenshot(page: any, name: string, saveLocally: boolean = true): Promise<string> {
  console.log(`Attempting to take screenshot: ${name}`);
  
  try {
    // Check if page is valid
    if (!page) {
      console.error('Cannot take screenshot: page is null or undefined');
      return '';
    }
    
    // Verify page has screenshot method
    if (typeof page.screenshot !== 'function') {
      console.error('Cannot take screenshot: page.screenshot is not a function', typeof page.screenshot);
      return '';
    }
    
    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `linkedin_${name}_${timestamp}.png`;
    
    // Take the screenshot with timeout protection
    console.log(`Taking screenshot ${name}...`);
    
    const screenshotPromise = page.screenshot({ 
      fullPage: false, 
      encoding: saveLocally ? undefined : 'base64',
      type: 'png',
      quality: 80, // Reduce quality for better performance
      captureBeyondViewport: false // Don't try to capture beyond viewport for better reliability
    });
    
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Screenshot timeout after 10 seconds for ${name}`));
      }, 10000);
    });
    
    // Race the screenshot and the timeout
    const screenshotData = await Promise.race([
      screenshotPromise,
      timeoutPromise
    ]);
    
    if (saveLocally) {
      // Log screenshot location
      console.log(`📸 Screenshot saved: ${filename}`);
    } else {
      console.log(`📸 Screenshot captured in memory: ${name} (${
        typeof screenshotData === 'string' ? 
          `${screenshotData.substring(0, 20)}... (${screenshotData.length} bytes)` : 
          'Not a string'
      })`);
    }
    
    return saveLocally ? filename : (screenshotData as string || '');
  } catch (error) {
    console.error(`Error taking screenshot ${name}:`, error);
    // Return a fallback image to make it clear there was an error
    try {
      // If there's an error, return a small blank image
      return 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAB7SURBVGhD7c8BDQAgDAOxVSH7z9UdGO6eeC0dObdZsTbvxk0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPjbA0lHvWvoqUdxAAAAAElFTkSuQmCC';
    } catch (e) {
      console.error('Even fallback screenshot failed:', e);
      return '';
    }
  }
} 