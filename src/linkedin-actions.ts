import { ActionResult } from './types';
import { withHumanBrowser, withLinkedInBrowser, handleCaptcha } from './browser';
import { humanClick, humanType, simulateReading } from './human-behavior';
import { randomHumanDelay } from './utils';

/**
 * Connect with a LinkedIn profile using human-like behavior
 * @param profileUrl The URL of the LinkedIn profile to connect with
 * @param customMessage Optional custom message to send with connection request
 * @returns Promise resolving to success status and additional info
 */
export async function connectWithProfile(profileUrl: string, customMessage?: string): Promise<ActionResult> {
  return await withLinkedInBrowser(async (page) => {
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
export async function sendMessageToConnection(profileUrl: string, message: string): Promise<ActionResult> {
  if (!message || message.trim() === '') {
    return {
      success: false,
      message: "Message text cannot be empty"
    };
  }

  return await withLinkedInBrowser(async (page) => {
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

/**
 * Search for connections on LinkedIn with human-like behavior
 * @param searchQuery The search query to find connections
 * @param maxResults Maximum number of results to collect (default: 10)
 * @returns Promise resolving to success status and found connections
 */
export async function searchConnections(searchQuery: string, maxResults: number = 10): Promise<ActionResult & { connections?: Array<{name: string, profileUrl: string, urn: string}> }> {
  if (!searchQuery || searchQuery.trim() === '') {
    return {
      success: false,
      message: "Search query cannot be empty"
    };
  }

  return await withLinkedInBrowser(async (page) => {
    try {
      console.log("Starting connection search for:", searchQuery);
      
      // First go to the LinkedIn homepage to ensure we're properly logged in
      await page.goto('https://www.linkedin.com/', { 
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      
      // Check for captcha before proceeding
      const captchaDetected = await handleCaptcha(page);
      if (captchaDetected) {
        console.log("Captcha was detected and presumably solved. Continuing...");
      }
      
      console.log("Trying modern LinkedIn UI connections page");
      // Navigate to the connections page
      await page.goto('https://www.linkedin.com/mynetwork/invite-connect/connections/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      console.log("Waiting for page to load");
      
      // Wait for the connections list or search box to load
      try {
        await Promise.race([
          page.waitForSelector('.mn-connections__search-input', { timeout: 10000 }),
          page.waitForSelector('input[aria-label="Search connections"]', { timeout: 10000 }),
          page.waitForSelector('.search-global-typeahead__input', { timeout: 10000 })
        ]);
      } catch (e) {
        console.log("Timeout waiting for search input selector:", e);
        // Take a screenshot to see what's on the page
        await page.screenshot({ path: 'connections-page-debug.png' });
        
        // Log the current URL
        const currentUrl = page.url();
        console.log("Current URL:", currentUrl);
        
        // Check if we're on the right page
        if (!currentUrl.includes('mynetwork') && !currentUrl.includes('connections')) {
          return {
            success: false,
            message: "Failed to navigate to connections page. Current URL: " + currentUrl
          };
        }
      }
      
      // Look for various search box selectors, as LinkedIn's UI changes frequently
      const searchSelectors = [
        '.mn-connections__search-input',
        'input[aria-label="Search connections"]',
        '.search-global-typeahead__input',
        '.mn-community-summary__search-input',
        'input.search-global-typeahead__input',
        '#network-search-input'
      ];
      
      let searchBoxFound = false;
      let searchSelector = '';
      
      for (const selector of searchSelectors) {
        try {
          const exists = await page.$(selector);
          if (exists) {
            searchSelector = selector;
            searchBoxFound = true;
            console.log("Found search box with selector:", selector);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!searchBoxFound) {
        console.log("Search box not found. Trying global search instead.");
        
        // Try to use the global search if connections search isn't available
        await page.goto('https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D', {
          waitUntil: 'networkidle0',
          timeout: 60000
        });
        
        const globalSearchSelectors = [
          'input.search-global-typeahead__input',
          '.search-global-typeahead__input'
        ];
        
        for (const selector of globalSearchSelectors) {
          try {
            const exists = await page.$(selector);
            if (exists) {
              searchSelector = selector;
              searchBoxFound = true;
              console.log("Found global search box with selector:", selector);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!searchBoxFound) {
        // If still not found, take a screenshot for debugging
        await page.screenshot({ path: 'search-failure-debug.png' });
        
        return {
          success: false,
          message: "Could not find search input on connections page."
        };
      }
      
      // Click on the search box and enter the search query
      await humanClick(page, searchSelector);
      await randomHumanDelay(500, 1000);
      
      // Clear the input field first
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await randomHumanDelay(200, 500);
      await page.keyboard.press('Backspace');
      await randomHumanDelay(300, 700);
      
      // Type the search query
      await humanType(page, searchSelector, searchQuery);
      
      // Press Enter to submit the search
      await randomHumanDelay(500, 1200);
      await page.keyboard.press('Enter');
      
      console.log("Submitted search query. Waiting for results...");
      
      // Wait for search results to load
      await randomHumanDelay(3000, 5000);
      
      // Check for various result selectors
      const resultSelectors = [
        '.mn-connections__card', // Modern connections list
        '.mn-connection-card', // Alternate connections card
        '.search-result__wrapper', // Search results
        '.search-result', // General search results
        '.reusable-search__result-container', // Newer search results
        '.entity-result', // Even newer search results
        'li.reusable-search__result-container' // Most specific
      ];
      
      let resultsFound = false;
      let resultSelector = '';
      
      for (const selector of resultSelectors) {
        try {
          const results = await page.$$(selector);
          if (results.length > 0) {
            resultsFound = true;
            resultSelector = selector;
            console.log(`Found ${results.length} results with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!resultsFound) {
        // Take a screenshot of the page for debugging
        await page.screenshot({ path: 'no-results-debug.png' });
        
        return {
          success: false,
          message: "No search results found. Either no connections match the query or the UI has changed."
        };
      }
      
      // Extract connection data from the results
      const connections = await page.evaluate((selector, maxResults) => {
        const results = Array.from(document.querySelectorAll(selector)).slice(0, maxResults);
        
        return results.map(result => {
          // Try different attribute locations based on LinkedIn's varying HTML structure
          const profileElement = 
            result.querySelector('a[href*="/in/"]') || 
            result.querySelector('.mn-connection-card__link') ||
            result.querySelector('.app-aware-link');
          
          const nameElement = 
            result.querySelector('.mn-connection-card__name') || 
            result.querySelector('.actor-name') || 
            result.querySelector('.entity-result__title-text') ||
            result.querySelector('.org-people-profile-card__profile-title');
          
          // Get profile URL
          const profileUrl = profileElement ? (profileElement as HTMLAnchorElement).href : '';
          
          // Get name
          const name = nameElement && nameElement.textContent ? nameElement.textContent.trim() : 'Unknown';
          
          // Extract URN (LinkedIn's internal ID) from various possible locations
          let urn = '';
          if (profileUrl) {
            // Try to extract from URL
            const match = profileUrl.match(/\/in\/([^\/]+)/);
            if (match && match[1]) {
              urn = match[1];
            }
          }
          
          // Try data attributes if URN not found in URL
          if (!urn) {
            const dataUrn = 
              result.getAttribute('data-urn') || 
              result.getAttribute('data-entity-urn') ||
              profileElement?.getAttribute('data-entity-urn') || '';
            
            if (dataUrn) {
              const urnMatch = dataUrn.match(/urn:li:fs_miniProfile:(\w+)/);
              urn = urnMatch ? urnMatch[1] : dataUrn;
            }
          }
          
          return { name, profileUrl, urn };
        }).filter(conn => conn.profileUrl); // Only return connections with valid URLs
      }, resultSelector, maxResults);
      
      // Log the number of connections found
      console.log(`Found ${connections.length} connections matching "${searchQuery}"`);
      
      if (connections.length === 0) {
        return {
          success: false,
          message: `No connections found matching "${searchQuery}"`
        };
      }
      
      return {
        success: true,
        message: `Found ${connections.length} connections matching "${searchQuery}"`,
        connections: connections
      };
      
    } catch (error) {
      console.error("Error searching connections:", error);
      return {
        success: false,
        message: `Error searching connections: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });
} 