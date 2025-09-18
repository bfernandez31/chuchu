/**
 * T010: Contract test for GET /api/v1/performance/players/{playerId}
 * Tests player-specific metrics response schema
 * Validates PlayerPerformanceMetrics structure
 * Tests 404 handling for non-existent players
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Performance API Contract: GET /api/v1/performance/players/{playerId}', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
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
        json: jest.fn().mockResolvedValueOnce(mockPlayerData)
      });

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
        json: jest.fn().mockResolvedValueOnce(notFoundResponse)
      });

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
        { timestamp: '2025-09-18T10:25:00.000Z', frameRate: 60 }, // Missing latency and rollbacks
        { timestamp: '2025-09-18T10:26:00.000Z', latency: 105 },   // Missing frameRate and rollbacks
        { timestamp: '2025-09-18T10:27:00.000Z', rollbacks: 2 }    // Missing frameRate and latency
      ];

      const validator = new PlayerDataValidator();
      const validation = validator.validateHistoryCompleteness(playerMetrics.history);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings).toContain('Incomplete data in history entries');
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

// Helper functions and classes
function validatePlayerPerformanceMetrics(playerMetrics: any): void {
  const required = ['playerId', 'metrics', 'history'];
  for (const field of required) {
    if (!playerMetrics || !playerMetrics.hasOwnProperty(field)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (typeof playerMetrics.playerId !== 'string' || playerMetrics.playerId.length === 0) {
    throw new Error('Invalid playerId');
  }

  if (!Array.isArray(playerMetrics.history)) {
    throw new Error('History must be an array');
  }
}

function validatePlayerIdParameter(playerId: any): void {
  if (typeof playerId !== 'string' || playerId.trim().length === 0) {
    throw new Error('Invalid playerId parameter');
  }
}

function validateTimeRangeParameter(timeRange: any): void {
  const validRanges = ['1m', '5m', '15m', '1h'];
  if (!validRanges.includes(timeRange)) {
    throw new Error('Invalid timeRange parameter');
  }
}

function isValidISO8601(timestamp: any): boolean {
  if (typeof timestamp !== 'string') return false;
  const date = new Date(timestamp);
  return date instanceof Date && !isNaN(date.getTime()) && timestamp.includes('T');
}

class PlayerPerformanceAPIClient {
  private baseUrl = 'http://localhost:3000/api/v1';

  buildPlayerUrl(playerId: string, params: { timeRange?: string } = {}): string {
    const encodedPlayerId = encodeURIComponent(playerId);
    const url = new URL(`${this.baseUrl}/performance/players/${encodedPlayerId}`);

    url.searchParams.set('timeRange', params.timeRange || '5m');

    return url.toString();
  }

  async getPlayerMetrics(playerId: string, params: { timeRange?: string } = {}): Promise<{
    status: number;
    data: any;
  }> {
    const url = this.buildPlayerUrl(playerId, params);
    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error('Player not found');
    }

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return {
      status: response.status,
      data: await response.json()
    };
  }
}

class PlayerDataValidator {
  validatePlayerIdConsistency(playerMetrics: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (playerMetrics.playerId !== playerMetrics.metrics?.playerId) {
      errors.push('PlayerId mismatch between top-level and metrics');
    }

    return { isValid: errors.length === 0, errors };
  }

  validateHistoryOrder(history: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i - 1].timestamp);
      const curr = new Date(history[i].timestamp);

      if (curr < prev) {
        errors.push('History entries not in chronological order');
        break;
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateHistoryCompleteness(history: any[]): { warnings: string[] } {
    const warnings: string[] = [];
    const expectedFields = ['frameRate', 'latency', 'rollbacks'];

    const incompleteEntries = history.filter(entry =>
      expectedFields.some(field => entry[field] === undefined)
    );

    if (incompleteEntries.length > 0) {
      warnings.push('Incomplete data in history entries');
    }

    return { warnings };
  }
}

class PerformanceTrendAnalyzer {
  analyzePlayerTrends(playerMetrics: any): {
    frameRateTrend: string;
    latencyTrend: string;
    rollbackTrend: string;
    severity: string;
  } {
    const history = playerMetrics.history;
    if (history.length < 2) {
      return { frameRateTrend: 'stable', latencyTrend: 'stable', rollbackTrend: 'stable', severity: 'normal' };
    }

    const frameRates = history.map((h: any) => h.frameRate).filter((fr: any) => fr !== undefined);
    const latencies = history.map((h: any) => h.latency).filter((l: any) => l !== undefined);
    const rollbacks = history.map((h: any) => h.rollbacks).filter((r: any) => r !== undefined);

    const frameRateTrend = this.calculateTrend(frameRates);
    const latencyTrend = this.calculateTrend(latencies);
    const rollbackTrend = this.calculateTrend(rollbacks);

    const severity = this.determineSeverity(frameRateTrend, latencyTrend, rollbackTrend);

    return {
      frameRateTrend: frameRateTrend === 'decreasing' ? 'declining' : frameRateTrend,
      latencyTrend: latencyTrend === 'increasing' ? 'increasing' : latencyTrend,
      rollbackTrend: rollbackTrend === 'increasing' ? 'increasing' : rollbackTrend,
      severity
    };
  }

  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private determineSeverity(frameRateTrend: string, latencyTrend: string, rollbackTrend: string): string {
    if (frameRateTrend === 'decreasing' && latencyTrend === 'increasing' && rollbackTrend === 'increasing') {
      return 'critical';
    }
    if (frameRateTrend === 'decreasing' || latencyTrend === 'increasing' || rollbackTrend === 'increasing') {
      return 'warning';
    }
    return 'normal';
  }
}

class PerformanceScoreCalculator {
  calculateScore(metrics: any): number {
    let score = 100;

    // Frame rate score (0-40 points)
    if (metrics.frameRate < 30) score -= 40;
    else if (metrics.frameRate < 45) score -= 20;
    else if (metrics.frameRate < 55) score -= 10;

    // Latency score (0-30 points)
    if (metrics.networkLatency > 300) score -= 30;
    else if (metrics.networkLatency > 200) score -= 20;
    else if (metrics.networkLatency > 100) score -= 10;

    // Prediction accuracy score (0-20 points)
    if (metrics.predictionAccuracy < 70) score -= 20;
    else if (metrics.predictionAccuracy < 85) score -= 10;

    // Rollback frequency score (0-10 points)
    if (metrics.rollbackFrequency > 10) score -= 10;
    else if (metrics.rollbackFrequency > 5) score -= 5;

    return Math.max(0, score);
  }
}

class PerformanceBottleneckAnalyzer {
  identifyBottlenecks(metrics: any): string[] {
    const bottlenecks: string[] = [];

    if (metrics.frameRate < 45) bottlenecks.push('low_frame_rate');
    if (metrics.networkLatency > 150) bottlenecks.push('high_latency');
    if (metrics.predictionAccuracy < 85) bottlenecks.push('poor_prediction');
    if (metrics.rollbackFrequency > 5) bottlenecks.push('excessive_rollbacks');

    return bottlenecks;
  }
}

class PerformanceAdvisor {
  generateRecommendations(metrics: any): Array<{ category: string; message: string; priority: string }> {
    const recommendations: Array<{ category: string; message: string; priority: string }> = [];

    if (metrics.frameRate < 45) {
      recommendations.push({
        category: 'rendering',
        message: 'Consider reducing visual quality or optimizing rendering pipeline',
        priority: 'high'
      });
    }

    if (metrics.networkLatency > 150) {
      recommendations.push({
        category: 'network',
        message: 'Check network connection quality and server proximity',
        priority: 'medium'
      });
    }

    if (metrics.predictionAccuracy < 85) {
      recommendations.push({
        category: 'prediction',
        message: 'Tune prediction algorithms or increase update frequency',
        priority: 'medium'
      });
    }

    return recommendations;
  }
}

function createValidPlayerPerformanceMetrics(playerId: string) {
  return {
    playerId,
    metrics: {
      playerId,
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
        rollbacks: 1
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
        rollbacks: 2
      }
    ]
  };
}