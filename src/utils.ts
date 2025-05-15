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