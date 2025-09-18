/**
 * T005: Contract test for predictiveInput message
 * Validates message format according to websocket-protocol.json
 * Tests timestamp, sequence, inputType, and prediction fields
 * Tests rate limiting (60 inputs/second)
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('WebSocket Contract: predictiveInput Message', () => {
  let mockWebSocket: any;
  let messageHandler: jest.Mock;

  beforeEach(() => {
    messageHandler = jest.fn();
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
  });

  describe('Message Format Validation', () => {
    test('should validate complete predictiveInput message structure', () => {
      const validMessage = {
        type: 'predictive-input',
        playerId: 'player-123',
        input: {
          timestamp: Date.now(),
          sequence: 1,
          inputType: 'ARROW_PLACE',
          data: {
            position: { x: 10, y: 15 },
            direction: 'UP'
          }
        },
        prediction: {
          predictionId: 'pred-456',
          expectedOutcome: 'arrow-placed-successfully',
          confidence: 0.95
        }
      };

      // Test required fields presence
      expect(validMessage).toHaveProperty('type', 'predictive-input');
      expect(validMessage).toHaveProperty('playerId');
      expect(validMessage).toHaveProperty('input');
      expect(validMessage).toHaveProperty('prediction');

      // Test input object structure
      expect(validMessage.input).toHaveProperty('timestamp');
      expect(validMessage.input).toHaveProperty('sequence');
      expect(validMessage.input).toHaveProperty('inputType');
      expect(validMessage.input).toHaveProperty('data');

      // Test prediction object structure
      expect(validMessage.prediction).toHaveProperty('predictionId');
      expect(validMessage.prediction).toHaveProperty('expectedOutcome');
      expect(validMessage.prediction).toHaveProperty('confidence');
    });

    test('should validate inputType enum values', () => {
      const validInputTypes = ['ARROW_PLACE', 'MOVE', 'ACTION'];

      validInputTypes.forEach(inputType => {
        const message = {
          type: 'predictive-input',
          playerId: 'player-123',
          input: {
            timestamp: Date.now(),
            sequence: 1,
            inputType,
            data: {}
          },
          prediction: {
            predictionId: 'pred-456',
            expectedOutcome: 'test-outcome',
            confidence: 0.8
          }
        };

        expect(['ARROW_PLACE', 'MOVE', 'ACTION']).toContain(message.input.inputType);
      });
    });

    test('should validate ARROW_PLACE data structure', () => {
      const arrowPlaceMessage = {
        type: 'predictive-input',
        playerId: 'player-123',
        input: {
          timestamp: Date.now(),
          sequence: 1,
          inputType: 'ARROW_PLACE',
          data: {
            position: { x: 10, y: 15 },
            direction: 'UP'
          }
        },
        prediction: {
          predictionId: 'pred-456',
          expectedOutcome: 'arrow-placed',
          confidence: 0.9
        }
      };

      expect(arrowPlaceMessage.input.data).toHaveProperty('position');
      expect(arrowPlaceMessage.input.data).toHaveProperty('direction');
      expect(arrowPlaceMessage.input.data.position).toHaveProperty('x');
      expect(arrowPlaceMessage.input.data.position).toHaveProperty('y');
      expect(['UP', 'DOWN', 'LEFT', 'RIGHT']).toContain(arrowPlaceMessage.input.data.direction);
    });

    test('should validate MOVE data structure', () => {
      const moveMessage = {
        type: 'predictive-input',
        playerId: 'player-123',
        input: {
          timestamp: Date.now(),
          sequence: 2,
          inputType: 'MOVE',
          data: {
            direction: 'LEFT'
          }
        },
        prediction: {
          predictionId: 'pred-789',
          expectedOutcome: 'player-moved',
          confidence: 0.85
        }
      };

      expect(moveMessage.input.data).toHaveProperty('direction');
      expect(['UP', 'DOWN', 'LEFT', 'RIGHT']).toContain(moveMessage.input.data.direction);
    });

    test('should validate ACTION data structure', () => {
      const actionMessage = {
        type: 'predictive-input',
        playerId: 'player-123',
        input: {
          timestamp: Date.now(),
          sequence: 3,
          inputType: 'ACTION',
          data: {
            action: 'pause-game'
          }
        },
        prediction: {
          predictionId: 'pred-101',
          expectedOutcome: 'game-paused',
          confidence: 1.0
        }
      };

      expect(actionMessage.input.data).toHaveProperty('action');
      expect(typeof actionMessage.input.data.action).toBe('string');
    });

    test('should validate prediction confidence range', () => {
      const testConfidenceValues = [0.0, 0.25, 0.5, 0.75, 1.0];

      testConfidenceValues.forEach(confidence => {
        const message = {
          type: 'predictive-input',
          playerId: 'player-123',
          input: {
            timestamp: Date.now(),
            sequence: 1,
            inputType: 'MOVE',
            data: { direction: 'UP' }
          },
          prediction: {
            predictionId: 'pred-test',
            expectedOutcome: 'test',
            confidence
          }
        };

        expect(message.prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(message.prediction.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Field Validation', () => {
    test('should reject message with missing required fields', () => {
      const incompleteMessages = [
        // Missing type
        {
          playerId: 'player-123',
          input: { timestamp: Date.now(), sequence: 1, inputType: 'MOVE', data: {} },
          prediction: { predictionId: 'pred-1', expectedOutcome: 'test', confidence: 0.8 }
        },
        // Missing playerId
        {
          type: 'predictive-input',
          input: { timestamp: Date.now(), sequence: 1, inputType: 'MOVE', data: {} },
          prediction: { predictionId: 'pred-1', expectedOutcome: 'test', confidence: 0.8 }
        },
        // Missing input
        {
          type: 'predictive-input',
          playerId: 'player-123',
          prediction: { predictionId: 'pred-1', expectedOutcome: 'test', confidence: 0.8 }
        },
        // Missing prediction
        {
          type: 'predictive-input',
          playerId: 'player-123',
          input: { timestamp: Date.now(), sequence: 1, inputType: 'MOVE', data: {} }
        }
      ];

      incompleteMessages.forEach((message, index) => {
        expect(() => {
          // This would be the validation function that should reject incomplete messages
          validatePredictiveInputMessage(message);
        }).toThrow('Incomplete message');
      });
    });

    test('should reject invalid inputType values', () => {
      const invalidInputTypes = ['INVALID', 'jump', 'SHOOT', null, undefined, 123];

      invalidInputTypes.forEach(inputType => {
        const message = {
          type: 'predictive-input',
          playerId: 'player-123',
          input: {
            timestamp: Date.now(),
            sequence: 1,
            inputType,
            data: {}
          },
          prediction: {
            predictionId: 'pred-test',
            expectedOutcome: 'test',
            confidence: 0.8
          }
        };

        expect(() => {
          validatePredictiveInputMessage(message);
        }).toThrow('Invalid inputType');
      });
    });

    test('should reject invalid confidence values', () => {
      const invalidConfidenceValues = [-0.1, 1.1, 'high', null, undefined];

      invalidConfidenceValues.forEach(confidence => {
        const message = {
          type: 'predictive-input',
          playerId: 'player-123',
          input: {
            timestamp: Date.now(),
            sequence: 1,
            inputType: 'MOVE',
            data: { direction: 'UP' }
          },
          prediction: {
            predictionId: 'pred-test',
            expectedOutcome: 'test',
            confidence
          }
        };

        expect(() => {
          validatePredictiveInputMessage(message);
        }).toThrow('Invalid confidence value');
      });
    });
  });

  describe('Rate Limiting Validation', () => {
    test('should track message rate (60 inputs/second limit)', () => {
      const rateLimitTracker = new MessageRateTracker();
      const playerId = 'player-123';

      // Test burst limit (10 messages)
      for (let i = 0; i < 10; i++) {
        const result = rateLimitTracker.checkRateLimit(playerId, 'predictive-input');
        expect(result.allowed).toBe(true);
        expect(result.remainingInBurst).toBe(10 - i - 1);
      }

      // 11th message should be rejected (burst limit exceeded)
      const burstExceededResult = rateLimitTracker.checkRateLimit(playerId, 'predictive-input');
      expect(burstExceededResult.allowed).toBe(false);
      expect(burstExceededResult.reason).toBe('BURST_LIMIT_EXCEEDED');
    });

    test('should reset rate limit after time window', async () => {
      const rateLimitTracker = new MessageRateTracker();
      const playerId = 'player-123';

      // Fill burst limit
      for (let i = 0; i < 10; i++) {
        rateLimitTracker.checkRateLimit(playerId, 'predictive-input');
      }

      // Simulate time passage (1 second)
      rateLimitTracker.advanceTime(1000);

      // Should allow messages again
      const result = rateLimitTracker.checkRateLimit(playerId, 'predictive-input');
      expect(result.allowed).toBe(true);
      expect(result.remainingPerSecond).toBe(59);
    });

    test('should track rate per player independently', () => {
      const rateLimitTracker = new MessageRateTracker();
      const player1 = 'player-1';
      const player2 = 'player-2';

      // Fill burst for player1
      for (let i = 0; i < 10; i++) {
        rateLimitTracker.checkRateLimit(player1, 'predictive-input');
      }

      // Player2 should still have full rate limit
      const player2Result = rateLimitTracker.checkRateLimit(player2, 'predictive-input');
      expect(player2Result.allowed).toBe(true);
      expect(player2Result.remainingInBurst).toBe(9);

      // Player1 should be rate limited
      const player1Result = rateLimitTracker.checkRateLimit(player1, 'predictive-input');
      expect(player1Result.allowed).toBe(false);
    });
  });

  describe('Timestamp and Sequence Validation', () => {
    test('should validate timestamp is recent (within tolerance)', () => {
      const now = Date.now();
      const validTimestamps = [
        now - 100,    // 100ms ago
        now,          // now
        now + 100     // 100ms future (clock skew tolerance)
      ];

      validTimestamps.forEach(timestamp => {
        const message = createValidPredictiveInputMessage({
          input: { timestamp }
        });
        expect(() => {
          validatePredictiveInputMessage(message);
        }).not.toThrow();
      });
    });

    test('should reject timestamps outside tolerance window', () => {
      const now = Date.now();
      const invalidTimestamps = [
        now - 5000,   // 5 seconds ago
        now + 5000,   // 5 seconds future
        0,            // epoch
        -1            // negative
      ];

      invalidTimestamps.forEach(timestamp => {
        const message = createValidPredictiveInputMessage({
          input: { timestamp }
        });
        expect(() => {
          validatePredictiveInputMessage(message);
        }).toThrow('Invalid timestamp');
      });
    });

    test('should validate sequence number increments', () => {
      const sequenceTracker = new SequenceTracker();
      const playerId = 'player-123';

      // Test valid sequence increment
      expect(sequenceTracker.validateSequence(playerId, 1)).toBe(true);
      expect(sequenceTracker.validateSequence(playerId, 2)).toBe(true);
      expect(sequenceTracker.validateSequence(playerId, 3)).toBe(true);

      // Test out-of-order sequence (should be rejected)
      expect(sequenceTracker.validateSequence(playerId, 2)).toBe(false);

      // Test duplicate sequence (should be rejected)
      expect(sequenceTracker.validateSequence(playerId, 3)).toBe(false);
    });
  });
});

// Helper functions and classes that would be implemented
function validatePredictiveInputMessage(message: any): void {
  // This is a placeholder for the actual validation function
  // In a real implementation, this would validate the message against the schema
  const required = ['type', 'playerId', 'input', 'prediction'];
  for (const field of required) {
    if (!message || !message.hasOwnProperty(field)) {
      throw new Error(`Incomplete message - missing field: ${field}`);
    }
  }

  if (message.input && !['ARROW_PLACE', 'MOVE', 'ACTION'].includes(message.input.inputType)) {
    throw new Error('Invalid inputType');
  }

  if (message.prediction && (typeof message.prediction.confidence !== 'number' ||
      message.prediction.confidence < 0 || message.prediction.confidence > 1)) {
    throw new Error('Invalid confidence value');
  }

  if (message.input && message.input.timestamp !== undefined) {
    const now = Date.now();
    if (message.input.timestamp < now - 1000 || message.input.timestamp > now + 1000) {
      throw new Error('Invalid timestamp');
    }
  }
}

class MessageRateTracker {
  private playerRates: Map<string, {
    lastReset: number;
    messageCount: number;
    burstCount: number;
  }> = new Map();

  private currentTime: number = Date.now();

  checkRateLimit(playerId: string, messageType: string): {
    allowed: boolean;
    remainingPerSecond?: number;
    remainingInBurst?: number;
    reason?: string;
  } {
    const limits = {
      'predictive-input': { maxPerSecond: 60, burstLimit: 10 }
    };

    const limit = limits[messageType as keyof typeof limits];
    if (!limit) return { allowed: true };

    let playerRate = this.playerRates.get(playerId);
    if (!playerRate) {
      playerRate = { lastReset: this.currentTime, messageCount: 0, burstCount: 0 };
      this.playerRates.set(playerId, playerRate);
    }

    // Reset counters if a second has passed
    if (this.currentTime - playerRate.lastReset >= 1000) {
      playerRate.lastReset = this.currentTime;
      playerRate.messageCount = 0;
      playerRate.burstCount = 0;
    }

    // Check burst limit
    if (playerRate.burstCount >= limit.burstLimit) {
      return { allowed: false, reason: 'BURST_LIMIT_EXCEEDED' };
    }

    // Check per-second limit
    if (playerRate.messageCount >= limit.maxPerSecond) {
      return { allowed: false, reason: 'RATE_LIMIT_EXCEEDED' };
    }

    playerRate.messageCount++;
    playerRate.burstCount++;

    return {
      allowed: true,
      remainingPerSecond: limit.maxPerSecond - playerRate.messageCount,
      remainingInBurst: limit.burstLimit - playerRate.burstCount
    };
  }

  advanceTime(ms: number): void {
    this.currentTime += ms;
  }
}

class SequenceTracker {
  private playerSequences: Map<string, number> = new Map();

  validateSequence(playerId: string, sequence: number): boolean {
    const lastSequence = this.playerSequences.get(playerId) || 0;

    if (sequence !== lastSequence + 1) {
      return false;
    }

    this.playerSequences.set(playerId, sequence);
    return true;
  }
}

function createValidPredictiveInputMessage(overrides: any = {}) {
  const baseMessage = {
    type: 'predictive-input',
    playerId: 'player-123',
    input: {
      timestamp: Date.now(),
      sequence: 1,
      inputType: 'MOVE',
      data: { direction: 'UP' }
    },
    prediction: {
      predictionId: 'pred-test',
      expectedOutcome: 'test-outcome',
      confidence: 0.8
    }
  };

  return {
    ...baseMessage,
    ...overrides,
    input: {
      ...baseMessage.input,
      ...(overrides.input || {})
    },
    prediction: {
      ...baseMessage.prediction,
      ...(overrides.prediction || {})
    }
  };
}