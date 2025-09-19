/**
 * T016: Integration test for Performance Monitoring
 * Tests real-time metrics collection
 * Validates performance API endpoints
 * Tests alert triggering at thresholds
 * Verifies metrics accuracy (±5%)
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Extend Jest matchers for this test file
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
import {
  MockGameServer,
  MockPlayerClient,
  PerformanceAPIClient,
  MetricsCollector,
  AlertMonitor,
  AlertResponseTracker,
  AlertHistoryTracker,
  HistoricalDataValidator,
  MetricsAggregationTester,
  DashboardSimulator,
  PerformanceMonitoringValidator
} from '../mocks';

describe('Integration Test: Performance Monitoring (Scenario 5)', () => {
  let gameServer: MockGameServer;
  let playerClient: MockPlayerClient;
  let performanceAPI: PerformanceAPIClient;
  let metricsCollector: MetricsCollector;

  beforeEach(async () => {
    gameServer = new MockGameServer({
      hybridRendering: true,
      performanceMonitoring: true,
      metricsCollection: true
    });
    await gameServer.start();

    playerClient = new MockPlayerClient({
      playerId: 'perf-monitor-player',
      metricsReporting: true
    });

    performanceAPI = new PerformanceAPIClient('http://localhost:3000/api/v1');
    metricsCollector = new MetricsCollector();

    await playerClient.connect('ws://localhost:3000');
    await playerClient.enterGameState('active');
  });

  afterEach(async () => {
    await playerClient.disconnect();
    await gameServer.stop();
  });

  describe('Performance API Endpoints', () => {
    test('should respond to performance metrics API within 100ms', async () => {
      const startTime = performance.now();

      const response = await performanceAPI.getMetrics({
        timeRange: '5m',
        includeClients: true
      });

      const responseTime = performance.now() - startTime;

      // ✅ Performance API responds within 100ms
      expect(responseTime).toBeLessThan(100);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('server');
      expect(response.data).toHaveProperty('game');
      expect(response.data).toHaveProperty('network');
    });

    test('should provide accurate real-time metrics', async () => {
      // Generate some activity to create metrics
      for (let i = 0; i < 5; i++) {
        await playerClient.placeArrow({ x: i * 3, y: i * 2 }, 'UP');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const actualMetrics = metricsCollector.getCurrentMetrics();
      const apiMetrics = await performanceAPI.getMetrics();

      // ✅ Metrics reflect actual system performance (±5% accuracy)
      const serverCpuDiff = Math.abs(actualMetrics.server.cpuUsage - apiMetrics.data.server.cpuUsage);
      const serverMemoryDiff = Math.abs(actualMetrics.server.memoryUsage - apiMetrics.data.server.memoryUsage);
      const networkLatencyDiff = Math.abs(actualMetrics.game.averageLatency - apiMetrics.data.game.averageLatency);

      expect(serverCpuDiff / actualMetrics.server.cpuUsage).toBeLessThan(0.05); // <5%
      expect(serverMemoryDiff / actualMetrics.server.memoryUsage).toBeLessThan(0.05);
      expect(networkLatencyDiff / actualMetrics.game.averageLatency).toBeLessThan(0.05);
    });

    test('should handle player-specific metrics API', async () => {
      const startTime = performance.now();

      const playerMetrics = await performanceAPI.getPlayerMetrics('perf-monitor-player', {
        timeRange: '5m'
      });

      const responseTime = performance.now() - startTime;

      expect(responseTime).toBeLessThan(100);
      expect(playerMetrics.status).toBe(200);
      expect(playerMetrics.data.playerId).toBe('perf-monitor-player');
      expect(playerMetrics.data.metrics).toHaveProperty('frameRate');
      expect(playerMetrics.data.metrics).toHaveProperty('networkLatency');
      expect(playerMetrics.data.history).toBeInstanceOf(Array);
    });

    test('should update performance thresholds successfully', async () => {
      const newThresholds = {
        frameRate: { warning: 50, critical: 35 },
        latency: { warning: 150, critical: 300 },
        rollbackRate: { warning: 4, critical: 8 },
        cpuUsage: { warning: 60, critical: 80 }
      };

      const response = await performanceAPI.updateThresholds(newThresholds);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject(newThresholds);

      // Verify thresholds are applied
      const currentThresholds = await performanceAPI.getThresholds();
      expect(currentThresholds.data).toMatchObject(newThresholds);
    });
  });

  describe('Alert System Validation', () => {
    test('should trigger alerts at configured thresholds', async () => {
      const alertMonitor = new AlertMonitor();
      alertMonitor.startMonitoring();

      // Configure strict thresholds to trigger alerts
      await performanceAPI.updateThresholds({
        frameRate: { warning: 59, critical: 55 },
        latency: { warning: 100, critical: 200 },
        rollbackRate: { warning: 2, critical: 5 },
        cpuUsage: { warning: 50, critical: 70 }
      });

      // Simulate conditions that should trigger alerts
      await gameServer.simulateHighLoad();
      await playerClient.simulatePerformanceDegradation();

      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const alerts = alertMonitor.getTriggeredAlerts();

      // ✅ Alerts trigger correctly for threshold violations
      expect(alerts.length).toBeGreaterThan(0);

      const frameRateAlert = alerts.find(alert => alert.metric === 'frameRate');
      expect(frameRateAlert).toBeDefined();
      expect(['WARNING', 'CRITICAL']).toContain(frameRateAlert.severity);
      expect(frameRateAlert.currentValue).toBeLessThan(frameRateAlert.threshold);
    });

    test('should respond to alerts within 30 seconds', async () => {
      const alertResponseTracker = new AlertResponseTracker();
      alertResponseTracker.startTracking();

      // Configure thresholds and trigger violation
      await performanceAPI.updateThresholds({
        cpuUsage: { warning: 30, critical: 50 }
      });

      const violationStartTime = performance.now();
      await gameServer.simulateCpuSpike(70); // Trigger critical alert

      const firstAlertTime = await alertResponseTracker.waitForFirstAlert();
      const alertLatency = firstAlertTime - violationStartTime;

      // ✅ Alert responsiveness: < 30 seconds from trigger
      expect(alertLatency).toBeLessThan(30000);

      const alertDetails = alertResponseTracker.getLatestAlert();
      expect(alertDetails.metric).toBe('cpuUsage');
      expect(alertDetails.severity).toBe('CRITICAL');
    });

    test('should maintain alert history and escalation', async () => {
      const alertHistoryTracker = new AlertHistoryTracker();
      alertHistoryTracker.startTracking();

      // Configure cascading thresholds
      await performanceAPI.updateThresholds({
        latency: { warning: 120, critical: 250 }
      });

      // Trigger escalating violations
      await playerClient.simulateNetworkDegradation(150); // Warning
      await new Promise(resolve => setTimeout(resolve, 1000));
      await playerClient.simulateNetworkDegradation(300); // Critical

      const alertHistory = alertHistoryTracker.getAlertHistory();

      expect(alertHistory.length).toBe(2);
      expect(alertHistory[0].severity).toBe('WARNING');
      expect(alertHistory[1].severity).toBe('CRITICAL');
      expect(alertHistory[1].timestamp).toBeGreaterThan(alertHistory[0].timestamp);
    });
  });

  describe('Metrics Collection Accuracy', () => {
    test('should collect comprehensive system metrics', async () => {
      metricsCollector.startCollection();

      // Generate various types of activity
      const testDuration = 1000; // 1 second (reduced for test speed)
      const endTime = Date.now() + testDuration;

      while (Date.now() < endTime) {
        await playerClient.placeArrow(
          { x: Math.random() * 25, y: Math.random() * 25 },
          ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)]
        );
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
      }

      const collectedMetrics = metricsCollector.stopCollection();

      // Verify comprehensive metrics collection
      expect(collectedMetrics.server).toHaveProperty('cpuUsage');
      expect(collectedMetrics.server).toHaveProperty('memoryUsage');
      expect(collectedMetrics.server).toHaveProperty('activeConnections');

      expect(collectedMetrics.game).toHaveProperty('averageLatency');
      expect(collectedMetrics.game).toHaveProperty('predictionAccuracy');
      expect(collectedMetrics.game).toHaveProperty('totalRollbacks');

      expect(collectedMetrics.network).toHaveProperty('messagesSent');
      expect(collectedMetrics.network).toHaveProperty('bandwidthUsage');
      expect(collectedMetrics.network).toHaveProperty('compressionRatio');

      expect(collectedMetrics.clients).toBeInstanceOf(Array);
      expect(collectedMetrics.clients[0]).toHaveProperty('frameRate');
      expect(collectedMetrics.clients[0]).toHaveProperty('networkLatency');
    });

    test('should maintain historical data accuracy', async () => {
      const historicalDataValidator = new HistoricalDataValidator();
      historicalDataValidator.startValidation();

      // Generate activity over time periods
      const timeRanges = ['1m', '5m', '15m'];

      for (const timeRange of timeRanges) {
        const startTime = Date.now();

        // Generate activity for the time range
        const duration = timeRange === '1m' ? 60000 : timeRange === '5m' ? 300000 : 900000;
        await historicalDataValidator.simulateActivityForDuration(duration / 10); // Scaled for test

        const historicalMetrics = await performanceAPI.getMetrics({ timeRange });

        // ✅ Historical data tracked and retrievable
        expect(historicalMetrics.data.timeRange).toBe(timeRange);
        expect(historicalMetrics.data.timestamp).toBeDefined();

        // Verify data retention
        expect(historicalMetrics.data.server.uptime).toBeGreaterThan(0);
        expect(historicalMetrics.data.game.totalRollbacks).toBeGreaterThanOrEqual(0);
      }

      const validationResults = historicalDataValidator.stopValidation();
      expect(validationResults.dataIntegrity).toBe(true);
      expect(validationResults.timeRangeAccuracy).toBeGreaterThan(95);
    });

    test('should handle metrics aggregation correctly', async () => {
      const aggregationTester = new MetricsAggregationTester();

      // Generate known activity patterns
      const testPattern = {
        actions: 5,
        expectedLatency: 150,
        expectedFrameRate: 60,
        duration: 500
      };

      aggregationTester.executePattern(testPattern, playerClient);

      const aggregatedMetrics = await performanceAPI.getMetrics({ timeRange: '5m' });

      // Verify aggregation accuracy
      const latencyDiff = Math.abs(aggregatedMetrics.data.game.averageLatency - testPattern.expectedLatency);
      expect(latencyDiff / testPattern.expectedLatency).toBeLessThan(0.1); // <10% for aggregated data

      // Verify client metrics aggregation
      if (aggregatedMetrics.data.clients && aggregatedMetrics.data.clients.length > 0) {
        const clientMetrics = aggregatedMetrics.data.clients[0];
        const frameRateDiff = Math.abs(clientMetrics.frameRate - testPattern.expectedFrameRate);
        expect(frameRateDiff / testPattern.expectedFrameRate).toBeLessThan(0.05);
      }
    });
  });

  describe('Dashboard Integration', () => {
    test('should support real-time dashboard updates', async () => {
      const dashboardSimulator = new DashboardSimulator();
      dashboardSimulator.startSimulation();

      // Simulate dashboard polling
      const pollingInterval = 200; // 200ms
      const pollingDuration = 1000; // 1 second
      const metricsUpdates: any[] = [];

      const endTime = Date.now() + pollingDuration;
      while (Date.now() < endTime) {
        const metrics = await performanceAPI.getMetrics({ timeRange: '1m' });
        metricsUpdates.push({
          timestamp: Date.now(),
          data: metrics.data
        });
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }

      // ✅ Dashboard displays real-time system status
      expect(metricsUpdates.length).toBeGreaterThanOrEqual(3); // Should have multiple updates

      // Verify data freshness
      const timestamps = metricsUpdates.map(update => new Date(update.data.timestamp).getTime());
      const isDataFresh = timestamps.every((timestamp, index) => {
        if (index === 0) return true;
        return timestamp >= timestamps[index - 1]; // Timestamps should be increasing
      });

      expect(isDataFresh).toBe(true);

      const dashboardResults = dashboardSimulator.stopSimulation();
      expect(dashboardResults.updateConsistency).toBeGreaterThan(95);
      expect(dashboardResults.dataLatency).toBeLessThan(2000); // <2s data latency
    });
  });

  describe('Scenario 5 Success Criteria', () => {
    test('should meet all performance monitoring criteria', async () => {
      const scenarioValidator = new PerformanceMonitoringValidator();
      scenarioValidator.startValidation();

      // Execute comprehensive monitoring test
      await scenarioValidator.executeComprehensiveTest({
        duration: 1000,
        apiCalls: 3,
        alertTests: 1,
        metricsValidation: true
      }, performanceAPI, playerClient);

      const validationResults = scenarioValidator.stopValidation();

      // ✅ Performance API responds within 100ms
      expect(validationResults.averageApiResponseTime).toBeLessThan(100);
      expect(validationResults.maxApiResponseTime).toBeLessThan(150);

      // ✅ Metrics reflect actual system performance (±5% accuracy)
      expect(validationResults.metricsAccuracy).toBeGreaterThan(95);
      expect(validationResults.maxMetricsDeviation).toBeLessThan(5);

      // ✅ Alerts trigger correctly for threshold violations
      expect(validationResults.alertAccuracy).toBe(100);
      expect(validationResults.falsePositiveRate).toBeLessThan(5);

      // ✅ Dashboard displays real-time system status
      expect(validationResults.dashboardResponseiveness).toBeGreaterThan(95);
      expect(validationResults.realTimeDataAccuracy).toBeGreaterThan(98);

      // Additional performance metrics
      expect(validationResults.alertResponseTime).toBeLessThan(30); // seconds
      expect(validationResults.dataRetentionAccuracy).toBe(100);
      expect(validationResults.historicalDataIntegrity).toBe(true);
    });
  });
});
