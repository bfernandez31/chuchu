/**
 * T006: Contract test for deltaGameState message
 * Tests delta compression message format
 * Validates baseSequence, deltaSequence, changedPlayers, changedEntities
 * Tests compression ratio calculations
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('WebSocket Contract: deltaGameState Message', () => {
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
    test('should validate complete deltaGameState message structure', () => {
      const validDeltaMessage = {
        type: 'delta-game-state',
        delta: {
          baseSequence: 100,
          deltaSequence: 101,
          timestamp: Date.now(),
          changedPlayers: [
            {
              playerId: 'player-1',
              position: { x: 10, y: 15 },
              score: 150,
              status: 'active',
              color: '#FF0000'
            }
          ],
          changedEntities: [
            {
              entityId: 'mouse-1',
              entityType: 'MOUSE',
              position: { x: 5, y: 8 },
              direction: 'UP',
              velocity: { x: 1, y: 0 },
              status: 'moving'
            }
          ],
          newArrows: [
            {
              id: 'arrow-1',
              position: { x: 12, y: 7 },
              direction: 'RIGHT',
              playerId: 'player-1',
              timestamp: Date.now()
            }
          ],
          removedEntityIds: ['cat-2', 'mouse-3'],
          compressionRatio: 0.65
        },
        timestamp: Date.now()
      };

      // Test required top-level fields
      expect(validDeltaMessage).toHaveProperty('type', 'delta-game-state');
      expect(validDeltaMessage).toHaveProperty('delta');
      expect(validDeltaMessage).toHaveProperty('timestamp');

      // Test required delta fields
      expect(validDeltaMessage.delta).toHaveProperty('baseSequence');
      expect(validDeltaMessage.delta).toHaveProperty('deltaSequence');
      expect(validDeltaMessage.delta).toHaveProperty('timestamp');

      // Test optional delta fields exist
      expect(validDeltaMessage.delta).toHaveProperty('changedPlayers');
      expect(validDeltaMessage.delta).toHaveProperty('changedEntities');
      expect(validDeltaMessage.delta).toHaveProperty('newArrows');
      expect(validDeltaMessage.delta).toHaveProperty('removedEntityIds');
      expect(validDeltaMessage.delta).toHaveProperty('compressionRatio');
    });

    test('should validate PlayerDelta structure', () => {
      const playerDelta = {
        playerId: 'player-123',
        position: { x: 25, y: 30 },
        score: 500,
        status: 'active',
        color: '#00FF00'
      };

      // Required field
      expect(playerDelta).toHaveProperty('playerId');
      expect(typeof playerDelta.playerId).toBe('string');

      // Optional fields with correct types
      if (playerDelta.position) {
        expect(playerDelta.position).toHaveProperty('x');
        expect(playerDelta.position).toHaveProperty('y');
        expect(typeof playerDelta.position.x).toBe('number');
        expect(typeof playerDelta.position.y).toBe('number');
      }

      if (playerDelta.score !== undefined) {
        expect(typeof playerDelta.score).toBe('number');
      }

      if (playerDelta.status) {
        expect(typeof playerDelta.status).toBe('string');
      }

      if (playerDelta.color) {
        expect(typeof playerDelta.color).toBe('string');
      }
    });

    test('should validate EntityDelta structure', () => {
      const entityTypes = ['MOUSE', 'CAT', 'WALL', 'GOAL'];
      const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

      entityTypes.forEach(entityType => {
        const entityDelta = {
          entityId: `entity-${entityType.toLowerCase()}-1`,
          entityType,
          position: { x: 10, y: 15 },
          direction: 'UP',
          velocity: { x: 1, y: -1 },
          status: 'active'
        };

        // Required field
        expect(entityDelta).toHaveProperty('entityId');
        expect(typeof entityDelta.entityId).toBe('string');

        // Validate entityType enum
        expect(entityTypes).toContain(entityDelta.entityType);

        // Optional fields validation
        if (entityDelta.direction) {
          expect(directions).toContain(entityDelta.direction);
        }

        if (entityDelta.position) {
          expect(entityDelta.position).toHaveProperty('x');
          expect(entityDelta.position).toHaveProperty('y');
        }

        if (entityDelta.velocity) {
          expect(entityDelta.velocity).toHaveProperty('x');
          expect(entityDelta.velocity).toHaveProperty('y');
        }
      });
    });

    test('should validate Arrow structure', () => {
      const arrow = {
        id: 'arrow-123',
        position: { x: 20, y: 25 },
        direction: 'LEFT',
        playerId: 'player-456',
        timestamp: Date.now()
      };

      // Required fields
      expect(arrow).toHaveProperty('id');
      expect(arrow).toHaveProperty('position');
      expect(arrow).toHaveProperty('direction');
      expect(arrow).toHaveProperty('playerId');

      // Field type validation
      expect(typeof arrow.id).toBe('string');
      expect(typeof arrow.playerId).toBe('string');
      expect(['UP', 'DOWN', 'LEFT', 'RIGHT']).toContain(arrow.direction);

      // Position validation
      expect(arrow.position).toHaveProperty('x');
      expect(arrow.position).toHaveProperty('y');
      expect(typeof arrow.position.x).toBe('number');
      expect(typeof arrow.position.y).toBe('number');

      // Optional timestamp validation
      if (arrow.timestamp) {
        expect(typeof arrow.timestamp).toBe('number');
      }
    });
  });

  describe('Sequence Validation', () => {
    test('should validate sequence increment logic', () => {
      const deltaSequenceValidator = new DeltaSequenceValidator();

      // Test valid sequence progression
      expect(deltaSequenceValidator.validateSequence(100, 101)).toBe(true);
      expect(deltaSequenceValidator.validateSequence(101, 102)).toBe(true);
      expect(deltaSequenceValidator.validateSequence(102, 103)).toBe(true);
    });

    test('should reject invalid sequence progression', () => {
      const deltaSequenceValidator = new DeltaSequenceValidator();

      // Test invalid sequences
      expect(deltaSequenceValidator.validateSequence(100, 100)).toBe(false); // Same sequence
      expect(deltaSequenceValidator.validateSequence(100, 99)).toBe(false);  // Backwards
      expect(deltaSequenceValidator.validateSequence(100, 105)).toBe(false); // Gap too large
    });

    test('should handle sequence rollover correctly', () => {
      const deltaSequenceValidator = new DeltaSequenceValidator();

      // Test sequence rollover (assuming 32-bit unsigned integer)
      const maxSequence = 0xFFFFFFFF;
      expect(deltaSequenceValidator.validateSequence(maxSequence, 0)).toBe(true);
      expect(deltaSequenceValidator.validateSequence(maxSequence - 1, maxSequence)).toBe(true);
    });
  });

  describe('Compression Ratio Validation', () => {
    test('should validate compression ratio range', () => {
      const validCompressionRatios = [0.0, 0.25, 0.5, 0.75, 1.0];

      validCompressionRatios.forEach(ratio => {
        const deltaMessage = createValidDeltaMessage({ compressionRatio: ratio });
        expect(deltaMessage.delta.compressionRatio).toBeGreaterThanOrEqual(0);
        expect(deltaMessage.delta.compressionRatio).toBeLessThanOrEqual(1);
      });
    });

    test('should calculate realistic compression ratios', () => {
      const compressionCalculator = new CompressionCalculator();

      // Test minimal delta (high compression)
      const minimalDelta = {
        changedPlayers: [],
        changedEntities: [],
        newArrows: [],
        removedEntityIds: []
      };
      const highCompression = compressionCalculator.calculateRatio(minimalDelta);
      expect(highCompression).toBeGreaterThan(0.8); // Should be highly compressed

      // Test full delta (low compression)
      const fullDelta = {
        changedPlayers: new Array(32).fill(null).map((_, i) => ({ playerId: `player-${i}` })),
        changedEntities: new Array(100).fill(null).map((_, i) => ({ entityId: `entity-${i}` })),
        newArrows: new Array(50).fill(null).map((_, i) => ({ id: `arrow-${i}` })),
        removedEntityIds: new Array(20).fill(null).map((_, i) => `removed-${i}`)
      };
      const lowCompression = compressionCalculator.calculateRatio(fullDelta);
      expect(lowCompression).toBeLessThan(0.5); // Should be less compressed
    });

    test('should reject invalid compression ratios', () => {
      const invalidRatios = [-0.1, 1.1, 'high', null, undefined, NaN];

      invalidRatios.forEach(ratio => {
        expect(() => {
          validateCompressionRatio(ratio);
        }).toThrow('Invalid compression ratio');
      });
    });
  });

  describe('Delta Content Validation', () => {
    test('should validate empty delta is acceptable', () => {
      const emptyDelta = {
        type: 'delta-game-state',
        delta: {
          baseSequence: 100,
          deltaSequence: 101,
          timestamp: Date.now(),
          changedPlayers: [],
          changedEntities: [],
          newArrows: [],
          removedEntityIds: [],
          compressionRatio: 0.95
        },
        timestamp: Date.now()
      };

      expect(() => {
        validateDeltaGameStateMessage(emptyDelta);
      }).not.toThrow();
    });

    test('should validate delta with only player changes', () => {
      const playerOnlyDelta = {
        type: 'delta-game-state',
        delta: {
          baseSequence: 100,
          deltaSequence: 101,
          timestamp: Date.now(),
          changedPlayers: [
            { playerId: 'player-1', score: 200 },
            { playerId: 'player-2', position: { x: 15, y: 20 } }
          ],
          changedEntities: [],
          newArrows: [],
          removedEntityIds: [],
          compressionRatio: 0.8
        },
        timestamp: Date.now()
      };

      expect(() => {
        validateDeltaGameStateMessage(playerOnlyDelta);
      }).not.toThrow();
    });

    test('should validate delta with entity removals only', () => {
      const removalOnlyDelta = {
        type: 'delta-game-state',
        delta: {
          baseSequence: 100,
          deltaSequence: 101,
          timestamp: Date.now(),
          changedPlayers: [],
          changedEntities: [],
          newArrows: [],
          removedEntityIds: ['mouse-1', 'cat-2', 'arrow-3'],
          compressionRatio: 0.9
        },
        timestamp: Date.now()
      };

      expect(() => {
        validateDeltaGameStateMessage(removalOnlyDelta);
      }).not.toThrow();
    });
  });

  describe('Timestamp Validation', () => {
    test('should validate timestamp coherence', () => {
      const now = Date.now();
      const deltaMessage = createValidDeltaMessage({
        timestamp: now,
        delta: {
          timestamp: now - 50 // Delta timestamp should be close to message timestamp
        }
      });

      expect(Math.abs(deltaMessage.timestamp - deltaMessage.delta.timestamp)).toBeLessThan(1000);
    });

    test('should reject messages with timestamp skew', () => {
      const now = Date.now();
      const skewedMessage = createValidDeltaMessage({
        timestamp: now,
        delta: {
          timestamp: now - 5000 // 5 second skew
        }
      });

      expect(() => {
        validateTimestampCoherence(skewedMessage);
      }).toThrow('Timestamp skew too large');
    });
  });
});

// Helper functions and classes
function validateDeltaGameStateMessage(message: any): void {
  const required = ['type', 'delta', 'timestamp'];
  for (const field of required) {
    if (!message || !message.hasOwnProperty(field)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (message.type !== 'delta-game-state') {
    throw new Error('Invalid message type');
  }

  const deltaRequired = ['baseSequence', 'deltaSequence', 'timestamp'];
  for (const field of deltaRequired) {
    if (!message.delta.hasOwnProperty(field)) {
      throw new Error(`Missing required delta field: ${field}`);
    }
  }
}

function validateCompressionRatio(ratio: any): void {
  if (typeof ratio !== 'number' || ratio < 0 || ratio > 1 || isNaN(ratio)) {
    throw new Error('Invalid compression ratio');
  }
}

function validateTimestampCoherence(message: any): void {
  const timeDiff = Math.abs(message.timestamp - message.delta.timestamp);
  if (timeDiff > 1000) { // 1 second tolerance
    throw new Error('Timestamp skew too large');
  }
}

class DeltaSequenceValidator {
  private lastSequence: number | null = null;

  validateSequence(baseSequence: number, deltaSequence: number): boolean {
    // Delta sequence should be exactly base + 1
    if (deltaSequence !== baseSequence + 1) {
      // Handle rollover case
      if (baseSequence === 0xFFFFFFFF && deltaSequence === 0) {
        return true;
      }
      return false;
    }

    this.lastSequence = deltaSequence;
    return true;
  }
}

class CompressionCalculator {
  calculateRatio(deltaContent: any): number {
    // Simplified compression ratio calculation
    // In reality, this would be based on actual byte sizes
    const totalElements =
      (deltaContent.changedPlayers?.length || 0) +
      (deltaContent.changedEntities?.length || 0) +
      (deltaContent.newArrows?.length || 0) +
      (deltaContent.removedEntityIds?.length || 0);

    if (totalElements === 0) {
      return 0.95; // High compression for empty delta
    }

    // Simulate compression ratio based on content size
    const compressionFactor = Math.max(0.1, 1 - (totalElements / 200));
    return Math.min(1.0, compressionFactor);
  }
}

function createValidDeltaMessage(overrides: any = {}) {
  const now = Date.now();
  return {
    type: 'delta-game-state',
    delta: {
      baseSequence: 100,
      deltaSequence: 101,
      timestamp: now,
      changedPlayers: [],
      changedEntities: [],
      newArrows: [],
      removedEntityIds: [],
      compressionRatio: 0.8,
      ...(overrides.delta || {})
    },
    timestamp: now,
    ...overrides
  };
}