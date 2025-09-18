/**
 * T007: Contract test for rollbackCorrection message
 * Tests rollback correction message structure
 * Validates correctionId, rollbackToSequence, corrections array
 * Tests priority levels and affected entities
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('WebSocket Contract: rollbackCorrection Message', () => {
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
    test('should validate complete rollbackCorrection message structure', () => {
      const validRollbackMessage = {
        type: 'rollback-correction',
        correction: {
          correctionId: 'correction-123',
          affectedEntities: ['player-1', 'mouse-2', 'arrow-3'],
          rollbackToSequence: 95,
          corrections: [
            {
              entityId: 'player-1',
              correctionType: 'POSITION',
              newValue: { x: 10, y: 15 },
              smoothingDuration: 25
            },
            {
              entityId: 'mouse-2',
              correctionType: 'VELOCITY',
              newValue: { x: 1, y: -1 },
              smoothingDuration: 30
            }
          ],
          replayInputs: [
            {
              playerId: 'player-1',
              timestamp: Date.now() - 100,
              sequence: 96,
              inputType: 'ARROW_PLACE',
              data: { position: { x: 5, y: 8 }, direction: 'UP' },
              predicted: true,
              acknowledged: false
            }
          ],
          priority: 'HIGH'
        }
      };

      // Test required top-level fields
      expect(validRollbackMessage).toHaveProperty('type', 'rollback-correction');
      expect(validRollbackMessage).toHaveProperty('correction');

      // Test required correction fields
      expect(validRollbackMessage.correction).toHaveProperty('correctionId');
      expect(validRollbackMessage.correction).toHaveProperty('rollbackToSequence');
      expect(validRollbackMessage.correction).toHaveProperty('corrections');

      // Test field types
      expect(typeof validRollbackMessage.correction.correctionId).toBe('string');
      expect(typeof validRollbackMessage.correction.rollbackToSequence).toBe('number');
      expect(Array.isArray(validRollbackMessage.correction.corrections)).toBe(true);
    });

    test('should validate EntityCorrection structure', () => {
      const correctionTypes = ['POSITION', 'VELOCITY', 'STATE', 'CREATION'];

      correctionTypes.forEach(correctionType => {
        const entityCorrection = {
          entityId: `entity-${correctionType.toLowerCase()}`,
          correctionType,
          newValue: getNewValueForCorrectionType(correctionType),
          smoothingDuration: 25
        };

        // Required fields
        expect(entityCorrection).toHaveProperty('entityId');
        expect(entityCorrection).toHaveProperty('correctionType');
        expect(entityCorrection).toHaveProperty('newValue');

        // Validate correctionType enum
        expect(correctionTypes).toContain(entityCorrection.correctionType);

        // Validate smoothingDuration range
        if (entityCorrection.smoothingDuration !== undefined) {
          expect(entityCorrection.smoothingDuration).toBeGreaterThanOrEqual(16);
          expect(entityCorrection.smoothingDuration).toBeLessThanOrEqual(50);
        }
      });
    });

    test('should validate PlayerInput structure in replayInputs', () => {
      const playerInput = {
        playerId: 'player-123',
        timestamp: Date.now(),
        sequence: 100,
        inputType: 'MOVE',
        data: { direction: 'UP' },
        predicted: true,
        acknowledged: false
      };

      // Required fields
      expect(playerInput).toHaveProperty('playerId');
      expect(playerInput).toHaveProperty('timestamp');
      expect(playerInput).toHaveProperty('sequence');
      expect(playerInput).toHaveProperty('inputType');

      // Field type validation
      expect(typeof playerInput.playerId).toBe('string');
      expect(typeof playerInput.timestamp).toBe('number');
      expect(typeof playerInput.sequence).toBe('number');
      expect(['ARROW_PLACE', 'MOVE', 'ACTION']).toContain(playerInput.inputType);

      // Optional boolean fields
      if (playerInput.predicted !== undefined) {
        expect(typeof playerInput.predicted).toBe('boolean');
      }
      if (playerInput.acknowledged !== undefined) {
        expect(typeof playerInput.acknowledged).toBe('boolean');
      }
    });

    test('should validate priority enum values', () => {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];

      validPriorities.forEach(priority => {
        const rollbackMessage = createValidRollbackMessage({ priority });
        expect(validPriorities).toContain(rollbackMessage.correction.priority);
      });
    });
  });

  describe('Correction Type Validation', () => {
    test('should validate POSITION correction newValue structure', () => {
      const positionCorrection = {
        entityId: 'player-1',
        correctionType: 'POSITION',
        newValue: { x: 15.5, y: 20.3 },
        smoothingDuration: 30
      };

      expect(positionCorrection.newValue).toHaveProperty('x');
      expect(positionCorrection.newValue).toHaveProperty('y');
      expect(typeof positionCorrection.newValue.x).toBe('number');
      expect(typeof positionCorrection.newValue.y).toBe('number');
    });

    test('should validate VELOCITY correction newValue structure', () => {
      const velocityCorrection = {
        entityId: 'mouse-1',
        correctionType: 'VELOCITY',
        newValue: { x: 2.0, y: -1.5 },
        smoothingDuration: 20
      };

      expect(velocityCorrection.newValue).toHaveProperty('x');
      expect(velocityCorrection.newValue).toHaveProperty('y');
      expect(typeof velocityCorrection.newValue.x).toBe('number');
      expect(typeof velocityCorrection.newValue.y).toBe('number');
    });

    test('should validate STATE correction newValue', () => {
      const stateCorrection = {
        entityId: 'cat-1',
        correctionType: 'STATE',
        newValue: 'stunned',
        smoothingDuration: 16
      };

      expect(typeof stateCorrection.newValue).toBe('string');
    });

    test('should validate CREATION correction newValue structure', () => {
      const creationCorrection = {
        entityId: 'new-mouse-1',
        correctionType: 'CREATION',
        newValue: {
          entityType: 'MOUSE',
          position: { x: 10, y: 10 },
          direction: 'UP',
          status: 'active'
        },
        smoothingDuration: 25
      };

      expect(creationCorrection.newValue).toHaveProperty('entityType');
      expect(creationCorrection.newValue).toHaveProperty('position');
      expect(['MOUSE', 'CAT', 'WALL', 'GOAL']).toContain(creationCorrection.newValue.entityType);
    });
  });

  describe('Smoothing Duration Validation', () => {
    test('should validate smoothing duration range (16-50ms)', () => {
      const validDurations = [16, 20, 25, 30, 40, 50];

      validDurations.forEach(duration => {
        const correction = {
          entityId: 'test-entity',
          correctionType: 'POSITION',
          newValue: { x: 0, y: 0 },
          smoothingDuration: duration
        };

        expect(correction.smoothingDuration).toBeGreaterThanOrEqual(16);
        expect(correction.smoothingDuration).toBeLessThanOrEqual(50);
      });
    });

    test('should reject invalid smoothing durations', () => {
      const invalidDurations = [15, 51, 0, -1, 100, null, undefined, 'fast'];

      invalidDurations.forEach(duration => {
        expect(() => {
          validateSmoothingDuration(duration);
        }).toThrow('Invalid smoothing duration');
      });
    });

    test('should calculate appropriate smoothing duration based on correction severity', () => {
      const smoothingCalculator = new SmoothingDurationCalculator();

      // Minor position correction (small delta)
      const minorCorrection = smoothingCalculator.calculateDuration('POSITION', { x: 1, y: 1 });
      expect(minorCorrection).toBeLessThanOrEqual(25);

      // Major position correction (large delta)
      const majorCorrection = smoothingCalculator.calculateDuration('POSITION', { x: 10, y: 15 });
      expect(majorCorrection).toBeGreaterThanOrEqual(30);

      // State corrections should be fast
      const stateCorrection = smoothingCalculator.calculateDuration('STATE', 'new-state');
      expect(stateCorrection).toBeLessThanOrEqual(20);
    });
  });

  describe('Rollback Sequence Validation', () => {
    test('should validate rollback sequence is in the past', () => {
      const sequenceValidator = new RollbackSequenceValidator();
      const currentSequence = 100;

      // Valid rollback sequences (in the past)
      expect(sequenceValidator.validateRollbackSequence(currentSequence, 95)).toBe(true);
      expect(sequenceValidator.validateRollbackSequence(currentSequence, 90)).toBe(true);
      expect(sequenceValidator.validateRollbackSequence(currentSequence, 50)).toBe(true);

      // Invalid rollback sequences
      expect(sequenceValidator.validateRollbackSequence(currentSequence, 100)).toBe(false); // Same
      expect(sequenceValidator.validateRollbackSequence(currentSequence, 105)).toBe(false); // Future
    });

    test('should limit rollback distance to prevent excessive corrections', () => {
      const sequenceValidator = new RollbackSequenceValidator();
      const currentSequence = 100;
      const maxRollbackDistance = 20;

      // Within limit
      expect(sequenceValidator.validateRollbackDistance(currentSequence, 85, maxRollbackDistance)).toBe(true);

      // Exceeds limit
      expect(sequenceValidator.validateRollbackDistance(currentSequence, 70, maxRollbackDistance)).toBe(false);
    });

    test('should handle sequence rollover in rollback validation', () => {
      const sequenceValidator = new RollbackSequenceValidator();
      const maxSequence = 0xFFFFFFFF;

      // Rollover case: current sequence is 5, rollback to near max
      expect(sequenceValidator.validateRollbackSequence(5, maxSequence - 2)).toBe(true);
    });
  });

  describe('Priority-Based Processing', () => {
    test('should process HIGH priority corrections immediately', () => {
      const priorityProcessor = new CorrectionPriorityProcessor();
      const highPriorityCorrection = createValidRollbackMessage({ priority: 'HIGH' });

      const processResult = priorityProcessor.shouldProcessImmediately(highPriorityCorrection);
      expect(processResult.immediate).toBe(true);
      expect(processResult.reason).toBe('HIGH_PRIORITY');
    });

    test('should queue LOW priority corrections for batch processing', () => {
      const priorityProcessor = new CorrectionPriorityProcessor();
      const lowPriorityCorrection = createValidRollbackMessage({ priority: 'LOW' });

      const processResult = priorityProcessor.shouldProcessImmediately(lowPriorityCorrection);
      expect(processResult.immediate).toBe(false);
      expect(processResult.reason).toBe('QUEUE_FOR_BATCH');
    });

    test('should determine priority based on correction impact', () => {
      const priorityCalculator = new CorrectionPriorityCalculator();

      // Large position correction should be HIGH priority
      const largePositionCorrection = {
        correctionType: 'POSITION',
        oldValue: { x: 0, y: 0 },
        newValue: { x: 20, y: 25 }
      };
      expect(priorityCalculator.calculatePriority(largePositionCorrection)).toBe('HIGH');

      // Small position correction should be LOW priority
      const smallPositionCorrection = {
        correctionType: 'POSITION',
        oldValue: { x: 10, y: 10 },
        newValue: { x: 10.5, y: 10.2 }
      };
      expect(priorityCalculator.calculatePriority(smallPositionCorrection)).toBe('LOW');

      // Entity creation should be MEDIUM priority
      const creationCorrection = {
        correctionType: 'CREATION',
        newValue: { entityType: 'MOUSE' }
      };
      expect(priorityCalculator.calculatePriority(creationCorrection)).toBe('MEDIUM');
    });
  });

  describe('Affected Entities Validation', () => {
    test('should validate affected entities list consistency', () => {
      const rollbackMessage = {
        type: 'rollback-correction',
        correction: {
          correctionId: 'test-correction',
          affectedEntities: ['player-1', 'mouse-2'],
          rollbackToSequence: 95,
          corrections: [
            { entityId: 'player-1', correctionType: 'POSITION', newValue: { x: 0, y: 0 } },
            { entityId: 'mouse-2', correctionType: 'VELOCITY', newValue: { x: 1, y: 0 } }
          ],
          priority: 'MEDIUM'
        }
      };

      const validator = new AffectedEntitiesValidator();
      expect(validator.validateConsistency(rollbackMessage.correction)).toBe(true);
    });

    test('should detect inconsistency between affected entities and corrections', () => {
      const inconsistentMessage = {
        type: 'rollback-correction',
        correction: {
          correctionId: 'test-correction',
          affectedEntities: ['player-1', 'mouse-2'],
          rollbackToSequence: 95,
          corrections: [
            { entityId: 'player-1', correctionType: 'POSITION', newValue: { x: 0, y: 0 } },
            { entityId: 'cat-3', correctionType: 'STATE', newValue: 'active' } // Not in affected list
          ],
          priority: 'MEDIUM'
        }
      };

      const validator = new AffectedEntitiesValidator();
      expect(validator.validateConsistency(inconsistentMessage.correction)).toBe(false);
    });
  });
});

// Helper functions and classes
function validateSmoothingDuration(duration: any): void {
  if (typeof duration !== 'number' || duration < 16 || duration > 50 || isNaN(duration)) {
    throw new Error('Invalid smoothing duration');
  }
}

function getNewValueForCorrectionType(correctionType: string): any {
  switch (correctionType) {
    case 'POSITION':
    case 'VELOCITY':
      return { x: 10, y: 15 };
    case 'STATE':
      return 'active';
    case 'CREATION':
      return { entityType: 'MOUSE', position: { x: 5, y: 5 } };
    default:
      return {};
  }
}

class SmoothingDurationCalculator {
  calculateDuration(correctionType: string, newValue: any): number {
    switch (correctionType) {
      case 'POSITION':
        const deltaX = Math.abs(newValue.x || 0);
        const deltaY = Math.abs(newValue.y || 0);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        return Math.min(50, Math.max(16, 16 + distance * 2));

      case 'VELOCITY':
        return 25; // Standard velocity correction duration

      case 'STATE':
        return 16; // Fast state transitions

      case 'CREATION':
        return 30; // Smooth entity creation

      default:
        return 25;
    }
  }
}

class RollbackSequenceValidator {
  validateRollbackSequence(currentSequence: number, rollbackSequence: number): boolean {
    // Handle sequence rollover
    if (currentSequence < 1000 && rollbackSequence > 0xFFFFFF00) {
      return true; // Rollover case
    }

    return rollbackSequence < currentSequence;
  }

  validateRollbackDistance(currentSequence: number, rollbackSequence: number, maxDistance: number): boolean {
    const distance = currentSequence - rollbackSequence;
    return distance <= maxDistance && distance >= 0;
  }
}

class CorrectionPriorityProcessor {
  shouldProcessImmediately(rollbackMessage: any): { immediate: boolean; reason: string } {
    const priority = rollbackMessage.correction.priority;

    switch (priority) {
      case 'HIGH':
        return { immediate: true, reason: 'HIGH_PRIORITY' };
      case 'MEDIUM':
        return { immediate: false, reason: 'QUEUE_FOR_BATCH' };
      case 'LOW':
        return { immediate: false, reason: 'QUEUE_FOR_BATCH' };
      default:
        return { immediate: false, reason: 'UNKNOWN_PRIORITY' };
    }
  }
}

class CorrectionPriorityCalculator {
  calculatePriority(correction: any): string {
    if (correction.correctionType === 'CREATION') {
      return 'MEDIUM';
    }

    if (correction.correctionType === 'POSITION') {
      const oldPos = correction.oldValue || { x: 0, y: 0 };
      const newPos = correction.newValue || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(newPos.x - oldPos.x, 2) +
        Math.pow(newPos.y - oldPos.y, 2)
      );

      return distance > 10 ? 'HIGH' : 'LOW';
    }

    return 'MEDIUM';
  }
}

class AffectedEntitiesValidator {
  validateConsistency(correction: any): boolean {
    const affectedEntities = new Set(correction.affectedEntities || []);
    const correctionEntities = new Set(
      correction.corrections?.map((c: any) => c.entityId) || []
    );

    // Check if all correction entities are in affected entities list
    for (const entityId of correctionEntities) {
      if (!affectedEntities.has(entityId)) {
        return false;
      }
    }

    return true;
  }
}

function createValidRollbackMessage(overrides: any = {}) {
  return {
    type: 'rollback-correction',
    correction: {
      correctionId: 'correction-123',
      affectedEntities: ['player-1'],
      rollbackToSequence: 95,
      corrections: [
        {
          entityId: 'player-1',
          correctionType: 'POSITION',
          newValue: { x: 10, y: 15 },
          smoothingDuration: 25
        }
      ],
      replayInputs: [],
      priority: 'MEDIUM',
      ...overrides
    }
  };
}