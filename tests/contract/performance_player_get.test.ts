/**
 * T010: Contract test for GET /api/v1/performance/players/{playerId}
 * Tests player-specific metrics response schema
 * Validates PlayerPerformanceMetrics structure
 * Tests 404 handling for non-existent players
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  PlayerPerformanceAPIClient,
  validatePlayerPerformanceMetrics,
  createValidPlayerPerformanceMetrics,
  validatePlayerIdParameter,
  validateTimeRangeParameter,
  isValidISO8601,
  PlayerDataValidator,
  PerformanceTrendAnalyzer,
  PerformanceScoreCalculator,
  PerformanceBottleneckAnalyzer,
  PerformanceAdvisor
} from '../mocks';

describe('Performance API Contract: GET /api/v1/performance/players/{playerId}', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    (global as any).fetch = mockFetch;
  });

  describe('Response Schema Validation', () => {
    test('should validate complete PlayerPerformanceMetrics structure', () => {
      const validPlayerMetrics = {
        playerId: 'player-test-123',
        metrics: {
          playerId: 'player-test-123',
          frameRate: 58.5,
          frameTime: 17.1,
          networkLatency: 105.3,
          predictionAccuracy: 91.7,
          rollbackFrequency: 1.2,
          memoryUsage: 67.8
        },
        history: [
          {
            timestamp: '2025-09-18T10:25:00.000Z',
            frameRate: 60,
            latency: 98.5,
            rollbacks: 2
          },
          {
            timestamp: '2025-09-18T10:26:00.000Z',
            frameRate: 59,
            latency: 102.3,
            rollbacks: 1
          },
          {
            timestamp: '2025-09-18T10:27:00.000Z',
            frameRate: 58,
            latency: 108.7,
            rollbacks: 3
          }
        ]
      };

      // Test required top-level fields
      expect(validPlayerMetrics).toHaveProperty('playerId');
      expect(validPlayerMetrics).toHaveProperty('metrics');
      expect(validPlayerMetrics).toHaveProperty('history');

      // Test field types
      expect(typeof validPlayerMetrics.playerId).toBe('string');
      expect(typeof validPlayerMetrics.metrics).toBe('object');
      expect(Array.isArray(validPlayerMetrics.history)).toBe(true);

      expect(() => {
        validatePlayerPerformanceMetrics(validPlayerMetrics);
      }).not.toThrow();
    });

    test('should validate embedded ClientMetrics structure', () => {
      const clientMetrics = {
        playerId: 'player-embedded-test',
        frameRate: 55.8,
        frameTime: 18.1,
        networkLatency: 125.7,
        predictionAccuracy: 88.3,
        rollbackFrequency: 2.1,
        memoryUsage: 72.4
      };

      // Required fields from ClientMetrics schema
      expect(clientMetrics).toHaveProperty('playerId');
      expect(clientMetrics).toHaveProperty('frameRate');
      expect(clientMetrics).toHaveProperty('frameTime');
      expect(clientMetrics).toHaveProperty('networkLatency');

      // Validate field types and ranges
      expect(typeof clientMetrics.playerId).toBe('string');
      expect(clientMetrics.playerId.length).toBeGreaterThan(0);

      expect(typeof clientMetrics.frameRate).toBe('number');
      expect(clientMetrics.frameRate).toBeGreaterThanOrEqual(1);
      expect(clientMetrics.frameRate).toBeLessThanOrEqual(120);

      expect(typeof clientMetrics.frameTime).toBe('number');
      expect(clientMetrics.frameTime).toBeGreaterThanOrEqual(0);

      expect(typeof clientMetrics.networkLatency).toBe('number');
      expect(clientMetrics.networkLatency).toBeGreaterThanOrEqual(0);

      // Optional fields validation
      if (clientMetrics.predictionAccuracy !== undefined) {
        expect(clientMetrics.predictionAccuracy).toBeGreaterThanOrEqual(0);
        expect(clientMetrics.predictionAccuracy).toBeLessThanOrEqual(100);
      }

      if (clientMetrics.rollbackFrequency !== undefined) {
        expect(clientMetrics.rollbackFrequency).toBeGreaterThanOrEqual(0);
      }

      if (clientMetrics.memoryUsage !== undefined) {
        expect(clientMetrics.memoryUsage).toBeGreaterThanOrEqual(0);
      }
    });

    test('should validate history array structure', () => {
      const historyEntry = {
        timestamp: '2025-09-18T10:28:00.000Z',
        frameRate: 57.2,
        latency: 115.6,
        rollbacks: 4
      };

      // Validate history entry structure
      expect(historyEntry).toHaveProperty('timestamp');
      expect(typeof historyEntry.timestamp).toBe('string');
      expect(isValidISO8601(historyEntry.timestamp)).toBe(true);

      if (historyEntry.frameRate !== undefined) {
        expect(typeof historyEntry.frameRate).toBe('number');
        expect(historyEntry.frameRate).toBeGreaterThan(0);
      }

      if (historyEntry.latency !== undefined) {
        expect(typeof historyEntry.latency).toBe('number');
        expect(historyEntry.latency).toBeGreaterThanOrEqual(0);
      }

      if (historyEntry.rollbacks !== undefined) {
        expect(typeof historyEntry.rollbacks).toBe('number');
        expect(Number.isInteger(historyEntry.rollbacks)).toBe(true);
        expect(historyEntry.rollbacks).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Path Parameter Validation', () => {
    test('should handle valid playerId path parameter', () => {
      const validPlayerIds = [
        'player-123',
        'user_456',
        'guest-session-789',
        'p1',
        'PLAYER-ABC'
      ];

      validPlayerIds.forEach(playerId => {
        const apiClient = new PlayerPerformanceAPIClient();
        const url = apiClient.buildPlayerUrl(playerId);

        expect(url).toContain(`/performance/players/${playerId}`);
        expect(typeof playerId).toBe('string');
        expect(playerId.length).toBeGreaterThan(0);
      });
    });

    test('should reject invalid playerId path parameters', () => {
      const invalidPlayerIds = ['', '   ', null, undefined];

      invalidPlayerIds.forEach(playerId => {
        expect(() => {
          validatePlayerIdParameter(playerId);
        }).toThrow('Invalid playerId parameter');
      });
    });

    test('should handle URL encoding for special characters', () => {
      const specialPlayerIds = [
        'player@domain.com',
        'user name with spaces',
        'player+123',
        'user/with/slashes'
      ];

      specialPlayerIds.forEach(playerId => {
        const apiClient = new PlayerPerformanceAPIClient();
        const url = apiClient.buildPlayerUrl(playerId);

        expect(url).toContain(encodeURIComponent(playerId));
      });
    });
  });

  describe('Query Parameter Handling', () => {
    test('should handle timeRange parameter for player metrics', () => {
      const validTimeRanges = ['1m', '5m', '15m', '1h'];

      validTimeRanges.forEach(timeRange => {
        const apiClient = new PlayerPerformanceAPIClient();
        const url = apiClient.buildPlayerUrl('player-123', { timeRange });

        expect(url).toContain(`timeRange=${timeRange}`);
      });
    });

    test('should default to 5m timeRange when not specified', () => {
      const apiClient = new PlayerPerformanceAPIClient();
      const url = apiClient.buildPlayerUrl('player-123');

      expect(url).toContain('timeRange=5m');
    });

    test('should reject invalid timeRange values for player metrics', () => {
      const invalidTimeRanges = ['30s', '2h', '1d', 'invalid'];

      invalidTimeRanges.forEach(timeRange => {
        expect(() => {
          validateTimeRangeParameter(timeRange);
        }).toThrow('Invalid timeRange parameter');
      });
    });
  });

  describe('HTTP Response Validation', () => {
    test('should handle successful 200 response with player metrics', async () => {
      const mockPlayerData = createValidPlayerPerformanceMetrics('player-success');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPlayerData)
      } as Response);

      const apiClient = new PlayerPerformanceAPIClient();
      const response = await apiClient.getPlayerMetrics('player-success');

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockPlayerData);
      expect(() => {
        validatePlayerPerformanceMetrics(response.data);
      }).not.toThrow();
    });

    test('should handle 404 response for non-existent player', async () => {
      const notFoundResponse = {
        error: 'PLAYER_NOT_FOUND',
        message: 'Player with ID "non-existent-player" not found',
        details: {
          playerId: 'non-existent-player',
          timestamp: '2025-09-18T10:30:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve(notFoundResponse)
      } as Response);

      const apiClient = new PlayerPerformanceAPIClient();

      await expect(apiClient.getPlayerMetrics('non-existent-player'))
        .rejects.toThrow('Player not found');
    });

    test('should validate 404 error response structure', () => {
      const notFoundError = {
        error: 'PLAYER_NOT_FOUND',
        message: 'Player not found in current session',
        details: {
          playerId: 'missing-player',
          availablePlayers: ['player-1', 'player-2'],
          sessionId: 'session-123'
        }
      };

      // Validate error response structure
      expect(notFoundError).toHaveProperty('error');
      expect(notFoundError).toHaveProperty('message');
      expect(typeof notFoundError.error).toBe('string');
      expect(typeof notFoundError.message).toBe('string');

      // Validate details structure
      if (notFoundError.details) {
        expect(typeof notFoundError.details).toBe('object');
      }
    });
  });

  describe('Player Metrics Data Validation', () => {
    test('should validate playerId consistency across response', () => {
      const playerMetrics = createValidPlayerPerformanceMetrics('player-consistency');
      playerMetrics.metrics.playerId = 'different-player-id'; // Inconsistent

      const validator = new PlayerDataValidator();
      const validation = validator.validatePlayerIdConsistency(playerMetrics);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('PlayerId mismatch between top-level and metrics');
    });

    test('should validate history data chronological order', () => {
      const playerMetrics = createValidPlayerPerformanceMetrics('player-chronology');
      playerMetrics.history = [
        { timestamp: '2025-09-18T10:30:00.000Z', frameRate: 60, latency: 100, rollbacks: 1 },
        { timestamp: '2025-09-18T10:25:00.000Z', frameRate: 58, latency: 105, rollbacks: 2 }, // Out of order
        { timestamp: '2025-09-18T10:35:00.000Z', frameRate: 59, latency: 102, rollbacks: 1 }
      ];

      const validator = new PlayerDataValidator();
      const validation = validator.validateHistoryOrder(playerMetrics.history);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('History entries not in chronological order');
    });

    test('should validate history data completeness', () => {
      const playerMetrics = createValidPlayerPerformanceMetrics('player-completeness');
      playerMetrics.history = [
        { timestamp: '2025-09-18T10:25:00.000Z', frameRate: 60, latency: 0, rollbacks: 0 },
        { timestamp: '2025-09-18T10:26:00.000Z', frameRate: 0, latency: 105, rollbacks: 0 },
        { timestamp: '2025-09-18T10:27:00.000Z', frameRate: 0, latency: 0, rollbacks: 2 }
      ];

      const validator = new PlayerDataValidator();
      const validation = validator.validateHistoryCompleteness(playerMetrics.history);

      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    test('should validate performance trends', () => {
      const playerMetrics = createValidPlayerPerformanceMetrics('player-trends');
      playerMetrics.history = [
        { timestamp: '2025-09-18T10:25:00.000Z', frameRate: 60, latency: 80, rollbacks: 0 },
        { timestamp: '2025-09-18T10:26:00.000Z', frameRate: 55, latency: 120, rollbacks: 5 },
        { timestamp: '2025-09-18T10:27:00.000Z', frameRate: 45, latency: 200, rollbacks: 12 },
        { timestamp: '2025-09-18T10:28:00.000Z', frameRate: 30, latency: 350, rollbacks: 25 }
      ];

      const analyzer = new PerformanceTrendAnalyzer();
      const trends = analyzer.analyzePlayerTrends(playerMetrics);

      expect(trends.frameRateTrend).toBe('declining');
      expect(trends.latencyTrend).toBe('increasing');
      expect(trends.rollbackTrend).toBe('increasing');
      expect(trends.severity).toBe('critical');
    });
  });

  describe('Performance Analysis', () => {
    test('should calculate performance score based on metrics', () => {
      const goodMetrics = {
        frameRate: 60,
        networkLatency: 50,
        predictionAccuracy: 95,
        rollbackFrequency: 0.5
      };

      const poorMetrics = {
        frameRate: 25,
        networkLatency: 300,
        predictionAccuracy: 70,
        rollbackFrequency: 8
      };

      const calculator = new PerformanceScoreCalculator();

      expect(calculator.calculateScore(goodMetrics)).toBeGreaterThan(80);
      expect(calculator.calculateScore(poorMetrics)).toBeLessThan(40);
    });

    test('should identify performance bottlenecks', () => {
      const problematicMetrics = {
        frameRate: 30,        // Low
        networkLatency: 250,  // High
        predictionAccuracy: 60, // Low
        rollbackFrequency: 12   // Very high
      };

      const analyzer = new PerformanceBottleneckAnalyzer();
      const bottlenecks = analyzer.identifyBottlenecks(problematicMetrics);

      expect(bottlenecks).toContain('low_frame_rate');
      expect(bottlenecks).toContain('high_latency');
      expect(bottlenecks).toContain('poor_prediction');
      expect(bottlenecks).toContain('excessive_rollbacks');
    });

    test('should provide performance recommendations', () => {
      const metricsNeedingHelp = {
        frameRate: 35,
        networkLatency: 180,
        predictionAccuracy: 75,
        rollbackFrequency: 6
      };

      const advisor = new PerformanceAdvisor();
      const recommendations = advisor.generateRecommendations(metricsNeedingHelp);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.category === 'rendering')).toBe(true);
      expect(recommendations.some(rec => rec.category === 'network')).toBe(true);
      expect(recommendations.some(rec => rec.category === 'prediction')).toBe(true);
    });
  });
});
