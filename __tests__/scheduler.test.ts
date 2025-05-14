import scheduler from '../src/scheduler';

/**
 * Tests for the scheduler module
 * Testing the KV → scheduler → queue enqueuing path with mocked environment
 */

// Define mock types for testing
type ExecutionContext = {
  waitUntil: (promise: Promise<any>) => void;
};

type ScheduledEvent = {
  cron: string;
  scheduledTime: number;
};

describe('Scheduler', () => {
  // Mock environment setup
  const mockEnv = {
    // Mock KV namespace
    TARGETS: {
      list: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
    },
    // Mock queues
    LINKEDIN_CONNECTIONS_QUEUE: {
      send: jest.fn(),
    },
    LINKEDIN_DMS_QUEUE: {
      send: jest.fn(),
    },
  };
  
  // Mock execution context
  const mockCtx = { waitUntil: jest.fn() } as ExecutionContext;
  
  // Mock scheduled event
  const mockEvent = { 
    cron: "0 * * * *", 
    scheduledTime: Date.now() 
  } as ScheduledEvent;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });
  
  it('should enqueue new leads to the connections queue', async () => {
    // Arrange
    const now = Date.now();
    const pastTimestamp = now - 60000; // 1 minute ago
    
    // Mock KV list to return one key
    mockEnv.TARGETS.list.mockResolvedValue({
      keys: [{ name: 'lead123' }],
    });
    
    // Mock KV get to return a lead with "new" status and past next_action_at
    mockEnv.TARGETS.get.mockResolvedValue(JSON.stringify({
      urn: 'lead123',
      name: 'Test Lead',
      status: 'new',
      next_action_at: pastTimestamp,
    }));
    
    // Act
    await scheduler.scheduled(mockEvent, mockEnv, mockCtx);
    
    // Assert
    // Verify connections queue was called with correct data
    expect(mockEnv.LINKEDIN_CONNECTIONS_QUEUE.send).toHaveBeenCalledWith({
      urn: 'lead123',
      name: 'Test Lead',
    });
    
    // Verify DMs queue was NOT called
    expect(mockEnv.LINKEDIN_DMS_QUEUE.send).not.toHaveBeenCalled();
    
    // Verify the lead was updated in KV with a new next_action_at time
    expect(mockEnv.TARGETS.put).toHaveBeenCalledWith(
      'lead123',
      expect.stringContaining('"status":"new"')
    );
    
    // Get the updated lead from the put call
    const updatedLead = JSON.parse(mockEnv.TARGETS.put.mock.calls[0][1]);
    
    // Verify the next_action_at was updated to a future time (25-35 minutes from now)
    const minExpectedTime = now + (25 * 60 * 1000);
    const maxExpectedTime = now + (35 * 60 * 1000);
    expect(updatedLead.next_action_at).toBeGreaterThanOrEqual(minExpectedTime);
    expect(updatedLead.next_action_at).toBeLessThanOrEqual(maxExpectedTime);
  });
  
  it('should enqueue accepted leads to the DMs queue', async () => {
    // Arrange
    const now = Date.now();
    const pastTimestamp = now - 60000; // 1 minute ago
    
    // Mock KV list to return one key
    mockEnv.TARGETS.list.mockResolvedValue({
      keys: [{ name: 'lead456' }],
    });
    
    // Mock KV get to return a lead with "accepted" status and past next_action_at
    mockEnv.TARGETS.get.mockResolvedValue(JSON.stringify({
      urn: 'lead456',
      name: 'Accepted Lead',
      status: 'accepted',
      next_action_at: pastTimestamp,
    }));
    
    // Act
    await scheduler.scheduled(mockEvent, mockEnv, mockCtx);
    
    // Assert
    // Verify DMs queue was called with correct data
    expect(mockEnv.LINKEDIN_DMS_QUEUE.send).toHaveBeenCalledWith({
      urn: 'lead456',
      name: 'Accepted Lead',
    });
    
    // Verify connections queue was NOT called
    expect(mockEnv.LINKEDIN_CONNECTIONS_QUEUE.send).not.toHaveBeenCalled();
    
    // Verify the lead was updated in KV
    expect(mockEnv.TARGETS.put).toHaveBeenCalledWith(
      'lead456',
      expect.stringContaining('"status":"accepted"')
    );
  });
  
  it('should not enqueue leads with future next_action_at', async () => {
    // Arrange
    const now = Date.now();
    const futureTimestamp = now + 3600000; // 1 hour in the future
    
    // Mock KV list to return one key
    mockEnv.TARGETS.list.mockResolvedValue({
      keys: [{ name: 'lead789' }],
    });
    
    // Mock KV get to return a lead with future next_action_at
    mockEnv.TARGETS.get.mockResolvedValue(JSON.stringify({
      urn: 'lead789',
      name: 'Future Lead',
      status: 'new',
      next_action_at: futureTimestamp,
    }));
    
    // Act
    await scheduler.scheduled(mockEvent, mockEnv, mockCtx);
    
    // Assert
    // Verify no queues were called
    expect(mockEnv.LINKEDIN_CONNECTIONS_QUEUE.send).not.toHaveBeenCalled();
    expect(mockEnv.LINKEDIN_DMS_QUEUE.send).not.toHaveBeenCalled();
    
    // Verify the lead was NOT updated in KV
    expect(mockEnv.TARGETS.put).not.toHaveBeenCalled();
  });
  
  it('should process multiple leads in a single run', async () => {
    // Arrange
    const now = Date.now();
    const pastTimestamp = now - 60000; // 1 minute ago
    
    // Mock KV list to return multiple keys
    mockEnv.TARGETS.list.mockResolvedValue({
      keys: [{ name: 'lead1' }, { name: 'lead2' }],
    });
    
    // Mock KV get to return different leads based on the key
    mockEnv.TARGETS.get.mockImplementation((key) => {
      if (key === 'lead1') {
        return Promise.resolve(JSON.stringify({
          urn: 'lead1',
          name: 'New Lead',
          status: 'new',
          next_action_at: pastTimestamp,
        }));
      } else {
        return Promise.resolve(JSON.stringify({
          urn: 'lead2',
          name: 'Accepted Lead',
          status: 'accepted',
          next_action_at: pastTimestamp,
        }));
      }
    });
    
    // Act
    await scheduler.scheduled(mockEvent, mockEnv, mockCtx);
    
    // Assert
    // Verify both queues were called with correct data
    expect(mockEnv.LINKEDIN_CONNECTIONS_QUEUE.send).toHaveBeenCalledWith({
      urn: 'lead1',
      name: 'New Lead',
    });
    
    expect(mockEnv.LINKEDIN_DMS_QUEUE.send).toHaveBeenCalledWith({
      urn: 'lead2',
      name: 'Accepted Lead',
    });
    
    // Verify both leads were updated in KV
    expect(mockEnv.TARGETS.put).toHaveBeenCalledTimes(2);
  });
}); 