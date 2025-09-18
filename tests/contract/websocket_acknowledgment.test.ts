/**
 * T008: Contract test for inputAcknowledgment message
 * Tests server acknowledgment message format
 * Validates playerId, acknowledgedSequence, processingTime
 * Tests acknowledgment timing requirements
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('WebSocket Contract: inputAcknowledgment Message', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
  });

  describe('Message Format Validation', () => {
    test('should validate complete inputAcknowledgment message structure', () => {
      const validAckMessage = {
        type: 'input-acknowledgment',
        playerId: 'player-123',
        acknowledgedSequence: 42,
        processingTime: 15.5
      };

      // Test required fields
      expect(validAckMessage).toHaveProperty('type', 'input-acknowledgment');
      expect(validAckMessage).toHaveProperty('playerId');
      expect(validAckMessage).toHaveProperty('acknowledgedSequence');

      // Test field types
      expect(typeof validAckMessage.playerId).toBe('string');
      expect(typeof validAckMessage.acknowledgedSequence).toBe('number');

      // Test optional field
      if (validAckMessage.processingTime !== undefined) {
        expect(typeof validAckMessage.processingTime).toBe('number');
      }
    });

    test('should validate message with minimal required fields', () => {
      const minimalAckMessage = {
        type: 'input-acknowledgment',
        playerId: 'player-456',
        acknowledgedSequence: 100
      };

      expect(() => {
        validateInputAcknowledgmentMessage(minimalAckMessage);
      }).not.toThrow();
    });

    test('should validate message with optional processingTime', () => {
      const ackWithProcessingTime = {
        type: 'input-acknowledgment',
        playerId: 'player-789',
        acknowledgedSequence: 200,
        processingTime: 8.3
      };

      expect(() => {
        validateInputAcknowledgmentMessage(ackWithProcessingTime);
      }).not.toThrow();
    });
  });

  describe('Field Validation', () => {
    test('should reject message with missing required fields', () => {
      const incompleteMessages = [
        // Missing type
        {
          playerId: 'player-123',
          acknowledgedSequence: 42
        },
        // Missing playerId
        {
          type: 'input-acknowledgment',
          acknowledgedSequence: 42
        },
        // Missing acknowledgedSequence
        {
          type: 'input-acknowledgment',
          playerId: 'player-123'
        }
      ];

      incompleteMessages.forEach((message, index) => {
        expect(() => {
          validateInputAcknowledgmentMessage(message);
        }).toThrow(`Missing required field at index ${index}`);
      });
    });

    test('should reject invalid message type', () => {
      const invalidTypeMessage = {
        type: 'invalid-acknowledgment',
        playerId: 'player-123',
        acknowledgedSequence: 42
      };

      expect(() => {
        validateInputAcknowledgmentMessage(invalidTypeMessage);
      }).toThrow('Invalid message type');
    });

    test('should validate playerId format', () => {
      const validPlayerIds = [
        'player-123',
        'p1',
        'user_456',
        'PLAYER-ABC',
        'guest-session-789'
      ];

      validPlayerIds.forEach(playerId => {
        const message = createValidAcknowledgmentMessage({ playerId });
        expect(typeof message.playerId).toBe('string');
        expect(message.playerId.length).toBeGreaterThan(0);
      });
    });

    test('should reject invalid playerId values', () => {
      const invalidPlayerIds = [null, undefined, '', 123, {}, []];

      invalidPlayerIds.forEach(playerId => {
        expect(() => {
          validateInputAcknowledgmentMessage({
            type: 'input-acknowledgment',
            playerId,
            acknowledgedSequence: 42
          });
        }).toThrow('Invalid playerId');
      });
    });

    test('should validate acknowledgedSequence as positive integer', () => {
      const validSequences = [1, 42, 1000, 999999, 0x7FFFFFFF];

      validSequences.forEach(sequence => {
        const message = createValidAcknowledgmentMessage({ acknowledgedSequence: sequence });
        expect(typeof message.acknowledgedSequence).toBe('number');
        expect(message.acknowledgedSequence).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(message.acknowledgedSequence)).toBe(true);
      });
    });

    test('should reject invalid acknowledgedSequence values', () => {
      const invalidSequences = [-1, 1.5, 'abc', null, undefined, NaN, Infinity];

      invalidSequences.forEach(sequence => {
        expect(() => {
          validateInputAcknowledgmentMessage({
            type: 'input-acknowledgment',
            playerId: 'player-123',
            acknowledgedSequence: sequence
          });
        }).toThrow('Invalid acknowledgedSequence');
      });
    });
  });

  describe('Processing Time Validation', () => {
    test('should validate processingTime as positive number', () => {
      const validProcessingTimes = [0.1, 5.5, 15.2, 50.0, 100.7];

      validProcessingTimes.forEach(processingTime => {
        const message = createValidAcknowledgmentMessage({ processingTime });
        expect(typeof message.processingTime).toBe('number');
        expect(message.processingTime).toBeGreaterThanOrEqual(0);
      });
    });

    test('should reject invalid processingTime values', () => {
      const invalidProcessingTimes = [-1, -0.1, 'fast', null, NaN, Infinity];

      invalidProcessingTimes.forEach(processingTime => {
        expect(() => {
          validateInputAcknowledgmentMessage({
            type: 'input-acknowledgment',
            playerId: 'player-123',
            acknowledgedSequence: 42,
            processingTime
          });
        }).toThrow('Invalid processingTime');
      });
    });

    test('should validate reasonable processingTime bounds', () => {
      const processingTimeValidator = new ProcessingTimeValidator();

      // Normal processing times (should be accepted)
      expect(processingTimeValidator.isReasonable(5.0)).toBe(true);
      expect(processingTimeValidator.isReasonable(15.2)).toBe(true);
      expect(processingTimeValidator.isReasonable(50.0)).toBe(true);

      // Extremely fast (suspicious)
      expect(processingTimeValidator.isReasonable(0.001)).toBe(false);

      // Extremely slow (performance issue)
      expect(processingTimeValidator.isReasonable(1000.0)).toBe(false);
    });
  });

  describe('Acknowledgment Timing Requirements', () => {
    test('should track acknowledgment latency (target: <100ms)', () => {
      const ackTracker = new AcknowledgmentTracker();
      const playerId = 'player-123';

      // Simulate input sent
      const inputTimestamp = Date.now();
      ackTracker.recordInputSent(playerId, 1, inputTimestamp);

      // Simulate acknowledgment received (50ms later)
      const ackTimestamp = inputTimestamp + 50;
      const ackMessage = {
        type: 'input-acknowledgment',
        playerId,
        acknowledgedSequence: 1,
        processingTime: 5.0
      };

      const latency = ackTracker.calculateLatency(ackMessage, ackTimestamp);
      expect(latency).toBe(50);
      expect(latency).toBeLessThan(100); // Target threshold
    });

    test('should detect late acknowledgments', () => {
      const ackTracker = new AcknowledgmentTracker();
      const playerId = 'player-456';

      // Simulate input sent
      const inputTimestamp = Date.now();
      ackTracker.recordInputSent(playerId, 1, inputTimestamp);

      // Simulate late acknowledgment (150ms later)
      const lateAckTimestamp = inputTimestamp + 150;
      const ackMessage = {
        type: 'input-acknowledgment',
        playerId,
        acknowledgedSequence: 1,
        processingTime: 10.0
      };

      const latency = ackTracker.calculateLatency(ackMessage, lateAckTimestamp);
      expect(latency).toBe(150);
      expect(latency).toBeGreaterThan(100); // Exceeds target
      expect(ackTracker.isLate(latency)).toBe(true);
    });

    test('should handle acknowledgment timeout scenarios', () => {
      const ackTracker = new AcknowledgmentTracker();
      const playerId = 'player-timeout';

      // Record input but never receive acknowledgment
      ackTracker.recordInputSent(playerId, 1, Date.now());

      // Advance time significantly
      const timeoutThreshold = 5000; // 5 seconds
      ackTracker.advanceTime(timeoutThreshold + 1000);

      const timedOutInputs = ackTracker.getTimedOutInputs(timeoutThreshold);
      expect(timedOutInputs).toHaveLength(1);
      expect(timedOutInputs[0].playerId).toBe(playerId);
      expect(timedOutInputs[0].sequence).toBe(1);
    });
  });

  describe('Sequence Tracking', () => {
    test('should track acknowledged sequences per player', () => {
      const sequenceTracker = new AcknowledgedSequenceTracker();
      const playerId = 'player-sequence';

      // Acknowledge sequences in order
      sequenceTracker.recordAcknowledgment(playerId, 1);
      sequenceTracker.recordAcknowledgment(playerId, 2);
      sequenceTracker.recordAcknowledgment(playerId, 3);

      expect(sequenceTracker.getLastAcknowledged(playerId)).toBe(3);
      expect(sequenceTracker.isAcknowledged(playerId, 2)).toBe(true);
      expect(sequenceTracker.isAcknowledged(playerId, 4)).toBe(false);
    });

    test('should handle out-of-order acknowledgments', () => {
      const sequenceTracker = new AcknowledgedSequenceTracker();
      const playerId = 'player-ooo';

      // Acknowledge sequences out of order
      sequenceTracker.recordAcknowledgment(playerId, 3);
      sequenceTracker.recordAcknowledgment(playerId, 1);
      sequenceTracker.recordAcknowledgment(playerId, 2);

      expect(sequenceTracker.isAcknowledged(playerId, 1)).toBe(true);
      expect(sequenceTracker.isAcknowledged(playerId, 2)).toBe(true);
      expect(sequenceTracker.isAcknowledged(playerId, 3)).toBe(true);
      expect(sequenceTracker.getConsecutiveAcknowledged(playerId)).toBe(3);
    });

    test('should detect duplicate acknowledgments', () => {
      const sequenceTracker = new AcknowledgedSequenceTracker();
      const playerId = 'player-dup';

      // Acknowledge same sequence twice
      sequenceTracker.recordAcknowledgment(playerId, 1);
      const isDuplicate = sequenceTracker.recordAcknowledgment(playerId, 1);

      expect(isDuplicate).toBe(true);
      expect(sequenceTracker.getLastAcknowledged(playerId)).toBe(1);
    });

    test('should handle sequence rollover', () => {
      const sequenceTracker = new AcknowledgedSequenceTracker();
      const playerId = 'player-rollover';
      const maxSequence = 0xFFFFFFFF;

      // Acknowledge near max sequence
      sequenceTracker.recordAcknowledgment(playerId, maxSequence);

      // Acknowledge rollover sequence
      sequenceTracker.recordAcknowledgment(playerId, 0);
      sequenceTracker.recordAcknowledgment(playerId, 1);

      expect(sequenceTracker.isAcknowledged(playerId, maxSequence)).toBe(true);
      expect(sequenceTracker.isAcknowledged(playerId, 0)).toBe(true);
      expect(sequenceTracker.isAcknowledged(playerId, 1)).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    test('should maintain acknowledgment statistics', () => {
      const ackStats = new AcknowledgmentStatistics();
      const playerId = 'player-stats';

      // Record multiple acknowledgments with different processing times
      ackStats.recordAcknowledgment(playerId, { processingTime: 10.0, latency: 50 });
      ackStats.recordAcknowledgment(playerId, { processingTime: 15.0, latency: 75 });
      ackStats.recordAcknowledgment(playerId, { processingTime: 8.0, latency: 45 });

      const stats = ackStats.getStatistics(playerId);
      expect(stats.averageProcessingTime).toBeCloseTo(11.0, 1);
      expect(stats.averageLatency).toBeCloseTo(56.7, 1);
      expect(stats.totalAcknowledgments).toBe(3);
    });

    test('should detect acknowledgment performance degradation', () => {
      const perfMonitor = new AcknowledgmentPerformanceMonitor();
      const playerId = 'player-perf';

      // Record normal performance
      for (let i = 0; i < 10; i++) {
        perfMonitor.recordAcknowledgment(playerId, { processingTime: 10.0, latency: 50 });
      }

      // Record degraded performance
      for (let i = 0; i < 5; i++) {
        perfMonitor.recordAcknowledgment(playerId, { processingTime: 100.0, latency: 200 });
      }

      const healthCheck = perfMonitor.checkHealth(playerId);
      expect(healthCheck.isHealthy).toBe(false);
      expect(healthCheck.reason).toBe('PERFORMANCE_DEGRADATION');
    });
  });
});

// Helper functions and classes
function validateInputAcknowledgmentMessage(message: any): void {
  if (!message) {
    throw new Error('Message is null or undefined');
  }

  const required = ['type', 'playerId', 'acknowledgedSequence'];
  for (let i = 0; i < required.length; i++) {
    const field = required[i];
    if (!message.hasOwnProperty(field)) {
      throw new Error(`Missing required field at index ${i}`);
    }
  }

  if (message.type !== 'input-acknowledgment') {
    throw new Error('Invalid message type');
  }

  if (typeof message.playerId !== 'string' || message.playerId.length === 0) {
    throw new Error('Invalid playerId');
  }

  if (typeof message.acknowledgedSequence !== 'number' ||
      message.acknowledgedSequence < 0 ||
      !Number.isInteger(message.acknowledgedSequence)) {
    throw new Error('Invalid acknowledgedSequence');
  }

  if (message.processingTime !== undefined &&
      (typeof message.processingTime !== 'number' ||
       message.processingTime < 0 ||
       isNaN(message.processingTime) ||
       !isFinite(message.processingTime))) {
    throw new Error('Invalid processingTime');
  }
}

class ProcessingTimeValidator {
  isReasonable(processingTime: number): boolean {
    // Processing time should be between 0.1ms and 500ms for reasonable performance
    return processingTime >= 0.1 && processingTime <= 500.0;
  }
}

class AcknowledgmentTracker {
  private pendingInputs: Map<string, Map<number, number>> = new Map();
  private currentTime: number = Date.now();

  recordInputSent(playerId: string, sequence: number, timestamp: number): void {
    if (!this.pendingInputs.has(playerId)) {
      this.pendingInputs.set(playerId, new Map());
    }
    this.pendingInputs.get(playerId)!.set(sequence, timestamp);
  }

  calculateLatency(ackMessage: any, ackTimestamp: number): number {
    const playerInputs = this.pendingInputs.get(ackMessage.playerId);
    if (!playerInputs) {
      throw new Error('No pending inputs for player');
    }

    const inputTimestamp = playerInputs.get(ackMessage.acknowledgedSequence);
    if (!inputTimestamp) {
      throw new Error('Input not found for sequence');
    }

    // Remove acknowledged input
    playerInputs.delete(ackMessage.acknowledgedSequence);

    return ackTimestamp - inputTimestamp;
  }

  isLate(latency: number): boolean {
    return latency > 100; // 100ms threshold
  }

  advanceTime(ms: number): void {
    this.currentTime += ms;
  }

  getTimedOutInputs(timeoutThreshold: number): Array<{ playerId: string; sequence: number; timestamp: number }> {
    const timedOut: Array<{ playerId: string; sequence: number; timestamp: number }> = [];
    const cutoffTime = this.currentTime - timeoutThreshold;

    for (const [playerId, playerInputs] of this.pendingInputs) {
      for (const [sequence, timestamp] of playerInputs) {
        if (timestamp < cutoffTime) {
          timedOut.push({ playerId, sequence, timestamp });
        }
      }
    }

    return timedOut;
  }
}

class AcknowledgedSequenceTracker {
  private playerSequences: Map<string, Set<number>> = new Map();
  private lastAcknowledged: Map<string, number> = new Map();

  recordAcknowledgment(playerId: string, sequence: number): boolean {
    if (!this.playerSequences.has(playerId)) {
      this.playerSequences.set(playerId, new Set());
    }

    const playerSeqs = this.playerSequences.get(playerId)!;
    const isDuplicate = playerSeqs.has(sequence);

    playerSeqs.add(sequence);

    const currentLast = this.lastAcknowledged.get(playerId) || 0;
    if (sequence > currentLast) {
      this.lastAcknowledged.set(playerId, sequence);
    }

    return isDuplicate;
  }

  isAcknowledged(playerId: string, sequence: number): boolean {
    const playerSeqs = this.playerSequences.get(playerId);
    return playerSeqs ? playerSeqs.has(sequence) : false;
  }

  getLastAcknowledged(playerId: string): number {
    return this.lastAcknowledged.get(playerId) || 0;
  }

  getConsecutiveAcknowledged(playerId: string): number {
    const playerSeqs = this.playerSequences.get(playerId);
    if (!playerSeqs) return 0;

    let consecutive = 0;
    for (let i = 1; i <= this.getLastAcknowledged(playerId); i++) {
      if (playerSeqs.has(i)) {
        consecutive = i;
      } else {
        break;
      }
    }

    return consecutive;
  }
}

class AcknowledgmentStatistics {
  private playerStats: Map<string, Array<{ processingTime: number; latency: number }>> = new Map();

  recordAcknowledgment(playerId: string, data: { processingTime: number; latency: number }): void {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, []);
    }
    this.playerStats.get(playerId)!.push(data);
  }

  getStatistics(playerId: string): {
    averageProcessingTime: number;
    averageLatency: number;
    totalAcknowledgments: number;
  } {
    const stats = this.playerStats.get(playerId) || [];

    if (stats.length === 0) {
      return { averageProcessingTime: 0, averageLatency: 0, totalAcknowledgments: 0 };
    }

    const avgProcessingTime = stats.reduce((sum, s) => sum + s.processingTime, 0) / stats.length;
    const avgLatency = stats.reduce((sum, s) => sum + s.latency, 0) / stats.length;

    return {
      averageProcessingTime: avgProcessingTime,
      averageLatency: avgLatency,
      totalAcknowledgments: stats.length
    };
  }
}

class AcknowledgmentPerformanceMonitor {
  private recentStats: Map<string, Array<{ processingTime: number; latency: number; timestamp: number }>> = new Map();

  recordAcknowledgment(playerId: string, data: { processingTime: number; latency: number }): void {
    if (!this.recentStats.has(playerId)) {
      this.recentStats.set(playerId, []);
    }

    const playerStats = this.recentStats.get(playerId)!;
    playerStats.push({ ...data, timestamp: Date.now() });

    // Keep only recent entries (last 20)
    if (playerStats.length > 20) {
      playerStats.shift();
    }
  }

  checkHealth(playerId: string): { isHealthy: boolean; reason?: string } {
    const stats = this.recentStats.get(playerId) || [];

    if (stats.length < 5) {
      return { isHealthy: true }; // Not enough data
    }

    const recentStats = stats.slice(-5);
    const avgLatency = recentStats.reduce((sum, s) => sum + s.latency, 0) / recentStats.length;
    const avgProcessingTime = recentStats.reduce((sum, s) => sum + s.processingTime, 0) / recentStats.length;

    if (avgLatency > 150 || avgProcessingTime > 50) {
      return { isHealthy: false, reason: 'PERFORMANCE_DEGRADATION' };
    }

    return { isHealthy: true };
  }
}

function createValidAcknowledgmentMessage(overrides: any = {}) {
  return {
    type: 'input-acknowledgment',
    playerId: 'player-123',
    acknowledgedSequence: 42,
    processingTime: 15.0,
    ...overrides
  };
}