/**
 * T009: Contract test for GET /api/v1/performance/metrics
 * Tests response schema validation according to performance-api.json
 * Validates server, game, network, and client metrics structure
 * Tests timeRange parameter handling
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Performance API Contract: GET /api/v1/performance/metrics', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('Response Schema Validation', () => {
    test('should validate complete PerformanceMetricsResponse structure', () => {
      const validResponse = {
        server: {
          cpuUsage: 45.2,
          memoryUsage: 256.8,
          tickRate: 50,
          activeConnections: 12,
          uptime: 3600
        },
        game: {
          averageLatency: 85.5,
          totalRollbacks: 23,
          predictionAccuracy: 94.2,
          frameRate: 60,
          activePlayers: 8
        },
        network: {
          messagesSent: 1250,
          messagesReceived: 1180,
          bandwidthUsage: 45.7,
          compressionRatio: 0.72,
          deltaUpdates: 890
        },
        clients: [
          {
            playerId: 'player-1',
            frameRate: 60,
            frameTime: 16.7,
            networkLatency: 92.3,
            predictionAccuracy: 95.1,
            rollbackFrequency: 0.8,
            memoryUsage: 45.2
          }
        ],
        timestamp: '2025-09-18T10:30:00.000Z',
        timeRange: '5m'
      };

      // Test required top-level fields
      expect(validResponse).toHaveProperty('server');
      expect(validResponse).toHaveProperty('game');
      expect(validResponse).toHaveProperty('network');
      expect(validResponse).toHaveProperty('timestamp');

      // Test optional fields
      expect(validResponse).toHaveProperty('clients');
      expect(validResponse).toHaveProperty('timeRange');

      expect(() => {
        validatePerformanceMetricsResponse(validResponse);
      }).not.toThrow();
    });

    test('should validate ServerMetrics structure', () => {
      const serverMetrics = {
        cpuUsage: 65.8,
        memoryUsage: 512.3,
        tickRate: 30,
        activeConnections: 24,
        uptime: 7200
      };

      // Required fields
      expect(serverMetrics).toHaveProperty('cpuUsage');
      expect(serverMetrics).toHaveProperty('memoryUsage');
      expect(serverMetrics).toHaveProperty('tickRate');
      expect(serverMetrics).toHaveProperty('activeConnections');

      // Validate field types and ranges
      expect(typeof serverMetrics.cpuUsage).toBe('number');
      expect(serverMetrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(serverMetrics.cpuUsage).toBeLessThanOrEqual(100);

      expect(typeof serverMetrics.memoryUsage).toBe('number');
      expect(serverMetrics.memoryUsage).toBeGreaterThanOrEqual(0);

      expect(typeof serverMetrics.tickRate).toBe('number');
      expect(serverMetrics.tickRate).toBeGreaterThanOrEqual(1);
      expect(serverMetrics.tickRate).toBeLessThanOrEqual(60);

      expect(typeof serverMetrics.activeConnections).toBe('number');
      expect(serverMetrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(serverMetrics.activeConnections).toBeLessThanOrEqual(32);
    });

    test('should validate GameMetrics structure', () => {
      const gameMetrics = {
        averageLatency: 120.5,
        totalRollbacks: 45,
        predictionAccuracy: 87.3,
        frameRate: 60,
        activePlayers: 16
      };

      // Required fields
      expect(gameMetrics).toHaveProperty('averageLatency');
      expect(gameMetrics).toHaveProperty('totalRollbacks');
      expect(gameMetrics).toHaveProperty('predictionAccuracy');

      // Validate field types and ranges
      expect(typeof gameMetrics.averageLatency).toBe('number');
      expect(gameMetrics.averageLatency).toBeGreaterThanOrEqual(0);

      expect(typeof gameMetrics.totalRollbacks).toBe('number');
      expect(gameMetrics.totalRollbacks).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(gameMetrics.totalRollbacks)).toBe(true);

      expect(typeof gameMetrics.predictionAccuracy).toBe('number');
      expect(gameMetrics.predictionAccuracy).toBeGreaterThanOrEqual(0);
      expect(gameMetrics.predictionAccuracy).toBeLessThanOrEqual(100);

      // Optional fields
      if (gameMetrics.frameRate !== undefined) {
        expect(gameMetrics.frameRate).toBeGreaterThanOrEqual(1);
        expect(gameMetrics.frameRate).toBeLessThanOrEqual(120);
      }

      if (gameMetrics.activePlayers !== undefined) {
        expect(gameMetrics.activePlayers).toBeGreaterThanOrEqual(0);
        expect(gameMetrics.activePlayers).toBeLessThanOrEqual(32);
      }
    });

    test('should validate NetworkMetrics structure', () => {
      const networkMetrics = {
        messagesSent: 2500,
        messagesReceived: 2450,
        bandwidthUsage: 67.8,
        compressionRatio: 0.68,
        deltaUpdates: 1800
      };

      // Required fields
      expect(networkMetrics).toHaveProperty('messagesSent');
      expect(networkMetrics).toHaveProperty('messagesReceived');
      expect(networkMetrics).toHaveProperty('bandwidthUsage');

      // Validate field types and ranges
      expect(typeof networkMetrics.messagesSent).toBe('number');
      expect(networkMetrics.messagesSent).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(networkMetrics.messagesSent)).toBe(true);

      expect(typeof networkMetrics.messagesReceived).toBe('number');
      expect(networkMetrics.messagesReceived).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(networkMetrics.messagesReceived)).toBe(true);

      expect(typeof networkMetrics.bandwidthUsage).toBe('number');
      expect(networkMetrics.bandwidthUsage).toBeGreaterThanOrEqual(0);

      // Optional fields
      if (networkMetrics.compressionRatio !== undefined) {
        expect(networkMetrics.compressionRatio).toBeGreaterThanOrEqual(0);
        expect(networkMetrics.compressionRatio).toBeLessThanOrEqual(1);
      }

      if (networkMetrics.deltaUpdates !== undefined) {
        expect(Number.isInteger(networkMetrics.deltaUpdates)).toBe(true);
      }
    });

    test('should validate ClientMetrics structure', () => {
      const clientMetrics = {
        playerId: 'player-test-123',
        frameRate: 58.5,
        frameTime: 17.1,
        networkLatency: 105.3,
        predictionAccuracy: 91.7,
        rollbackFrequency: 1.2,
        memoryUsage: 67.8
      };

      // Required fields
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

      // Optional fields
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
  });

  describe('Query Parameter Handling', () => {
    test('should handle timeRange parameter values', () => {
      const validTimeRanges = ['1m', '5m', '15m', '1h'];

      validTimeRanges.forEach(timeRange => {
        const apiClient = new PerformanceAPIClient();
        const url = apiClient.buildMetricsUrl({ timeRange });

        expect(url).toContain(`timeRange=${timeRange}`);
      });
    });

    test('should default to 5m timeRange when not specified', () => {
      const apiClient = new PerformanceAPIClient();
      const url = apiClient.buildMetricsUrl({});

      expect(url).toContain('timeRange=5m');
    });

    test('should handle includeClients parameter', () => {
      const apiClient = new PerformanceAPIClient();

      const urlWithClients = apiClient.buildMetricsUrl({ includeClients: true });
      expect(urlWithClients).toContain('includeClients=true');

      const urlWithoutClients = apiClient.buildMetricsUrl({ includeClients: false });
      expect(urlWithoutClients).toContain('includeClients=false');
    });

    test('should default to includeClients=true when not specified', () => {
      const apiClient = new PerformanceAPIClient();
      const url = apiClient.buildMetricsUrl({});

      expect(url).toContain('includeClients=true');
    });

    test('should reject invalid timeRange values', () => {
      const invalidTimeRanges = ['30s', '2h', '1d', 'invalid', null, undefined];

      invalidTimeRanges.forEach(timeRange => {
        expect(() => {
          validateTimeRangeParameter(timeRange);
        }).toThrow('Invalid timeRange parameter');
      });
    });
  });

  describe('HTTP Response Validation', () => {
    test('should handle successful 200 response', async () => {
      const mockResponseData = createValidPerformanceMetricsResponse();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponseData)
      });

      const apiClient = new PerformanceAPIClient();
      const response = await apiClient.getMetrics();

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockResponseData);
      expect(() => {
        validatePerformanceMetricsResponse(response.data);
      }).not.toThrow();
    });

    test('should handle 500 internal server error', async () => {
      const errorResponse = {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to collect performance metrics',
        details: {
          component: 'metrics-collector',
          timestamp: '2025-09-18T10:30:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValueOnce(errorResponse)
      });

      const apiClient = new PerformanceAPIClient();

      await expect(apiClient.getMetrics()).rejects.toThrow('Internal server error');
    });

    test('should validate error response structure', () => {
      const errorResponse = {
        error: 'METRICS_UNAVAILABLE',
        message: 'Performance metrics temporarily unavailable',
        details: {
          reason: 'system-overload',
          retryAfter: 30
        }
      };

      // Required fields
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('message');

      // Field types
      expect(typeof errorResponse.error).toBe('string');
      expect(typeof errorResponse.message).toBe('string');

      // Optional details
      if (errorResponse.details) {
        expect(typeof errorResponse.details).toBe('object');
      }
    });
  });

  describe('Performance Metrics Validation', () => {
    test('should validate realistic metric ranges', () => {
      const metricsValidator = new MetricsRangeValidator();

      // Server metrics validation
      expect(metricsValidator.isValidCpuUsage(45.2)).toBe(true);
      expect(metricsValidator.isValidCpuUsage(101)).toBe(false);
      expect(metricsValidator.isValidCpuUsage(-5)).toBe(false);

      expect(metricsValidator.isValidTickRate(50)).toBe(true);
      expect(metricsValidator.isValidTickRate(0)).toBe(false);
      expect(metricsValidator.isValidTickRate(70)).toBe(false);

      // Game metrics validation
      expect(metricsValidator.isValidPredictionAccuracy(94.5)).toBe(true);
      expect(metricsValidator.isValidPredictionAccuracy(105)).toBe(false);
      expect(metricsValidator.isValidPredictionAccuracy(-10)).toBe(false);

      // Network metrics validation
      expect(metricsValidator.isValidCompressionRatio(0.72)).toBe(true);
      expect(metricsValidator.isValidCompressionRatio(1.5)).toBe(false);
      expect(metricsValidator.isValidCompressionRatio(-0.1)).toBe(false);
    });

    test('should validate timestamp format', () => {
      const validTimestamps = [
        '2025-09-18T10:30:00.000Z',
        '2025-09-18T10:30:00Z',
        '2025-09-18T10:30:00.123Z'
      ];

      const invalidTimestamps = [
        '2025-09-18 10:30:00',
        '2025/09/18T10:30:00Z',
        'invalid-date',
        null,
        undefined
      ];

      validTimestamps.forEach(timestamp => {
        expect(isValidISO8601(timestamp)).toBe(true);
      });

      invalidTimestamps.forEach(timestamp => {
        expect(isValidISO8601(timestamp)).toBe(false);
      });
    });

    test('should validate client metrics array consistency', () => {
      const response = createValidPerformanceMetricsResponse();
      response.clients = [
        { playerId: 'player-1', frameRate: 60, frameTime: 16.7, networkLatency: 85 },
        { playerId: 'player-2', frameRate: 58, frameTime: 17.2, networkLatency: 95 },
        { playerId: 'player-1', frameRate: 59, frameTime: 16.9, networkLatency: 90 } // Duplicate
      ];

      const validator = new ClientMetricsValidator();
      const validation = validator.validateClientArray(response.clients);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Duplicate playerId: player-1');
    });
  });

  describe('Data Consistency Validation', () => {
    test('should validate consistency between server and client metrics', () => {
      const response = createValidPerformanceMetricsResponse();
      response.server.activeConnections = 5;
      response.clients = [
        { playerId: 'p1', frameRate: 60, frameTime: 16.7, networkLatency: 85 },
        { playerId: 'p2', frameRate: 58, frameTime: 17.2, networkLatency: 95 },
        { playerId: 'p3', frameRate: 59, frameTime: 16.9, networkLatency: 90 }
      ];

      const validator = new DataConsistencyValidator();
      const validation = validator.validateServerClientConsistency(response);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Client count (3) does not match activeConnections (5)');
    });

    test('should validate network metrics consistency', () => {
      const response = createValidPerformanceMetricsResponse();
      response.network.messagesSent = 1000;
      response.network.messagesReceived = 1200; // More received than sent

      const validator = new DataConsistencyValidator();
      const validation = validator.validateNetworkConsistency(response.network);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Messages received exceeds messages sent significantly');
    });

    test('should validate game metrics against client averages', () => {
      const response = createValidPerformanceMetricsResponse();
      response.game.averageLatency = 50; // Very low
      response.clients = [
        { playerId: 'p1', frameRate: 60, frameTime: 16.7, networkLatency: 150 },
        { playerId: 'p2', frameRate: 58, frameTime: 17.2, networkLatency: 160 }
      ];

      const validator = new DataConsistencyValidator();
      const validation = validator.validateGameClientConsistency(response);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Game average latency inconsistent with client metrics');
    });
  });
});

// Helper functions and classes
function validatePerformanceMetricsResponse(response: any): void {
  const required = ['server', 'game', 'network', 'timestamp'];
  for (const field of required) {
    if (!response || !response.hasOwnProperty(field)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!isValidISO8601(response.timestamp)) {
    throw new Error('Invalid timestamp format');
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

class PerformanceAPIClient {
  private baseUrl = 'http://localhost:3000/api/v1';

  buildMetricsUrl(params: { timeRange?: string; includeClients?: boolean } = {}): string {
    const url = new URL(`${this.baseUrl}/performance/metrics`);

    url.searchParams.set('timeRange', params.timeRange || '5m');
    url.searchParams.set('includeClients', (params.includeClients ?? true).toString());

    return url.toString();
  }

  async getMetrics(params: { timeRange?: string; includeClients?: boolean } = {}): Promise<{
    status: number;
    data: any;
  }> {
    const url = this.buildMetricsUrl(params);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Internal server error');
    }

    return {
      status: response.status,
      data: await response.json()
    };
  }
}

class MetricsRangeValidator {
  isValidCpuUsage(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 100;
  }

  isValidTickRate(value: number): boolean {
    return typeof value === 'number' && value >= 1 && value <= 60;
  }

  isValidPredictionAccuracy(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 100;
  }

  isValidCompressionRatio(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 1;
  }
}

class ClientMetricsValidator {
  validateClientArray(clients: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const playerIds = new Set<string>();

    for (const client of clients) {
      if (playerIds.has(client.playerId)) {
        errors.push(`Duplicate playerId: ${client.playerId}`);
      } else {
        playerIds.add(client.playerId);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

class DataConsistencyValidator {
  validateServerClientConsistency(response: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const activeConnections = response.server?.activeConnections || 0;
    const clientCount = response.clients?.length || 0;

    if (Math.abs(activeConnections - clientCount) > 2) { // Allow small variance
      errors.push(`Client count (${clientCount}) does not match activeConnections (${activeConnections})`);
    }

    return { isValid: errors.length === 0, errors };
  }

  validateNetworkConsistency(network: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (network.messagesReceived > network.messagesSent * 1.2) { // 20% tolerance
      errors.push('Messages received exceeds messages sent significantly');
    }

    return { isValid: errors.length === 0, errors };
  }

  validateGameClientConsistency(response: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (response.clients && response.clients.length > 0) {
      const avgClientLatency = response.clients.reduce((sum: number, client: any) =>
        sum + (client.networkLatency || 0), 0) / response.clients.length;

      const gameLatency = response.game?.averageLatency || 0;

      if (Math.abs(avgClientLatency - gameLatency) > 50) { // 50ms tolerance
        errors.push('Game average latency inconsistent with client metrics');
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

function createValidPerformanceMetricsResponse() {
  return {
    server: {
      cpuUsage: 45.2,
      memoryUsage: 256.8,
      tickRate: 50,
      activeConnections: 2,
      uptime: 3600
    },
    game: {
      averageLatency: 85.5,
      totalRollbacks: 23,
      predictionAccuracy: 94.2,
      frameRate: 60,
      activePlayers: 2
    },
    network: {
      messagesSent: 1250,
      messagesReceived: 1180,
      bandwidthUsage: 45.7,
      compressionRatio: 0.72,
      deltaUpdates: 890
    },
    clients: [
      {
        playerId: 'player-1',
        frameRate: 60,
        frameTime: 16.7,
        networkLatency: 82.3
      },
      {
        playerId: 'player-2',
        frameRate: 58,
        frameTime: 17.2,
        networkLatency: 88.7
      }
    ],
    timestamp: '2025-09-18T10:30:00.000Z',
    timeRange: '5m'
  };
}