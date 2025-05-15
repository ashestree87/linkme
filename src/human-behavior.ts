import { delay, randomHumanDelay } from './utils';

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