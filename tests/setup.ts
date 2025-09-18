// Global test setup for hybrid predictive rendering tests
import { jest } from '@jest/globals';

// Mock WebSocket for testing
(global as any).WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock Performance API for Node.js environment
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  };
}

// Set up test timeouts and global configurations
jest.setTimeout(10000);

// Global test utilities
(global as any).createMockGameState = () => ({
  sequence: 1,
  timestamp: Date.now(),
  players: [],
  entities: [],
  gamePhase: 'ACTIVE' as const
});

(global as any).createMockPlayerInput = () => ({
  playerId: 'test-player',
  sequence: 1,
  timestamp: Date.now(),
  inputType: 'ARROW_PLACE' as const,
  data: { x: 10, y: 10, direction: 'UP' }
});

// Performance testing helpers
(global as any).measurePerformance = async (fn: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await fn();
  return performance.now() - start;
};

export {};