import { launch, Page } from '@cloudflare/puppeteer';

/**
 * Represents a LinkedIn profile lead
 */
export type Lead = {
  urn: string;
  name: string;
  status: "new" | "invited" | "accepted";
};

/**
 * Helper function to execute a function with a browser page
 * @param fn Function to execute with the browser page
 * @returns Promise with the function result
 */
export async function withBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  // Get the environment from the context
  const env = (globalThis as any).ENVIRONMENT;
  
  // Use the browser binding directly
  const browser = await launch(env?.CRAWLER_BROWSER);

  try {
    const page = await browser.newPage();
    
    // Set user agent from environment variable
    await page.setUserAgent(env?.USERAGENT || 'Mozilla/5.0');
    
    // Set LinkedIn cookies
    await page.setCookie(
      {
        name: 'li_at',
        value: env?.LI_AT || '',
        domain: '.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true,
      },
      {
        name: 'JSESSIONID',
        value: env?.CSRF || '',
        domain: '.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true,
      }
    );
    
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