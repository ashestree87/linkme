import { delay, randomHumanDelay } from '../src/common';

/**
 * Tests for common utility functions
 */
describe('Common utilities', () => {
  describe('delay()', () => {
    it('should resolve after at least the specified time', async () => {
      // Arrange
      const delayTime = 100; // 100ms
      const startTime = Date.now();
      
      // Act
      await delay(delayTime);
      const elapsedTime = Date.now() - startTime;
      
      // Assert
      expect(elapsedTime).toBeGreaterThanOrEqual(delayTime);
    });
    
    it('should resolve close to the specified time', async () => {
      // Arrange
      const delayTime = 200; // 200ms
      const startTime = Date.now();
      
      // Act
      await delay(delayTime);
      const elapsedTime = Date.now() - startTime;
      
      // Assert - add a small buffer for test reliability (50ms)
      expect(elapsedTime).toBeLessThan(delayTime + 50);
    });
  });
  
  describe('randomHumanDelay()', () => {
    it('should delay for a time within the specified range', async () => {
      // Arrange
      const minDelay = 100;
      const maxDelay = 200;
      const startTime = Date.now();
      
      // Act 
      await randomHumanDelay(minDelay, maxDelay);
      const elapsedTime = Date.now() - startTime;
      
      // Assert
      expect(elapsedTime).toBeGreaterThanOrEqual(minDelay);
      expect(elapsedTime).toBeLessThan(maxDelay + 50); // Small buffer for test reliability
    });
    
    it('should use default values when no arguments provided', async () => {
      // We'll mock the delay function to verify the correct range is used
      const mockDelay = jest.spyOn(global, 'setTimeout');
      
      // Act
      randomHumanDelay();
      
      // Assert - verify setTimeout was called with a value between 6000-11000
      const timeoutValue = mockDelay.mock.calls[0][1] as number;
      expect(timeoutValue).toBeGreaterThanOrEqual(6000);
      expect(timeoutValue).toBeLessThanOrEqual(11000);
      
      // Cleanup
      mockDelay.mockRestore();
    });
  });
}); 