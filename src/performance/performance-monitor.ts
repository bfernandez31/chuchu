/**
 * T026: PerformanceMonitor Implementation
 *
 * Real-time metrics collection with client and server metric aggregation,
 * alert triggering at configured thresholds, and historical data tracking.
 */

import {
  PerformanceMetrics,
  PerformanceMetricsImpl,
  ServerMetrics,
  ClientMetrics,
  GameMetrics,
  NetworkMetrics,
  PerformanceAlert,
  AlertThreshold,
  MetricsAggregation
} from '../models/performance-metrics';

export enum MonitoringMode {
  DEVELOPMENT = 'DEVELOPMENT',
  PRODUCTION = 'PRODUCTION',
  TESTING = 'TESTING',
  DEBUGGING = 'DEBUGGING'
}

export interface MonitoringConfig {
  mode: MonitoringMode;
  updateInterval: number; // ms between metric updates (default: 1000)
  aggregationInterval: number; // ms between aggregations (default: 60000)
  alertCooldown: number; // ms between duplicate alerts (default: 30000)
  historicalDataRetention: number; // ms to retain data (default: 86400000 - 24h)
  enableRealTimeAlerts: boolean;
  enableDataCollection: boolean;
  enablePerformanceAPI: boolean;
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface AlertCallback {
  (alert: PerformanceAlert): void;
}

export class PerformanceMonitor {
  private config: MonitoringConfig;
  private metrics: PerformanceMetricsImpl;
  private updateTimer: NodeJS.Timeout | null = null;
  private aggregationTimer: NodeJS.Timeout | null = null;
  private alertCallbacks: AlertCallback[] = [];
  private lastAlerts: Map<string, number> = new Map(); // Track alert cooldowns
  private historicalSnapshots: PerformanceSnapshot[] = [];
  private readonly maxSnapshotHistory = 1440; // 24 hours at 1-minute intervals

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      mode: MonitoringMode.PRODUCTION,
      updateInterval: 1000,
      aggregationInterval: 60000,
      alertCooldown: 30000,
      historicalDataRetention: 86400000,
      enableRealTimeAlerts: true,
      enableDataCollection: true,
      enablePerformanceAPI: true,
      ...config
    };

    this.metrics = new PerformanceMetricsImpl();
    this.setupDefaultThresholds();
  }

  /**
   * Start performance monitoring
   */
  public start(): void {
    if (this.updateTimer) {
      console.warn('PerformanceMonitor already started');
      return;
    }

    // Start metrics collection
    this.updateTimer = setInterval(() => {
      this.updateMetrics();
    }, this.config.updateInterval);

    // Start aggregation
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval);

    console.log(`PerformanceMonitor started in ${this.config.mode} mode`);
  }

  /**
   * Stop performance monitoring
   */
  public stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }

    console.log('PerformanceMonitor stopped');
  }

  /**
   * Update server metrics
   */
  public updateServerMetrics(serverMetrics: Partial<ServerMetrics>): void {
    this.metrics.updateServerMetrics(serverMetrics);
    this.checkAlertsIfEnabled();
  }

  /**
   * Add client metrics
   */
  public addClientMetrics(clientMetrics: ClientMetrics): void {
    this.metrics.addClientMetrics(clientMetrics);
    this.checkAlertsIfEnabled();
  }

  /**
   * Update game metrics
   */
  public updateGameMetrics(gameMetrics: Partial<GameMetrics>): void {
    this.metrics.game = {
      ...this.metrics.game,
      ...gameMetrics,
      timestamp: Date.now()
    };
    this.checkAlertsIfEnabled();
  }

  /**
   * Update network metrics
   */
  public updateNetworkMetrics(networkMetrics: Partial<NetworkMetrics>): void {
    this.metrics.network = {
      ...this.metrics.network,
      ...networkMetrics,
      timestamp: Date.now()
    };
    this.checkAlertsIfEnabled();
  }

  /**
   * Get current performance snapshot
   */
  public getSnapshot(): PerformanceSnapshot {
    const alerts = this.metrics.checkThresholds();
    const summary = this.metrics.getPerformanceSummary();

    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      alerts,
      systemHealth: summary.status
    };
  }

  /**
   * Get historical performance data
   */
  public getHistoricalData(timeRange?: {
    start: number;
    end: number;
  }): PerformanceSnapshot[] {
    if (!timeRange) {
      return [...this.historicalSnapshots];
    }

    return this.historicalSnapshots.filter(snapshot =>
      snapshot.timestamp >= timeRange.start &&
      snapshot.timestamp <= timeRange.end
    );
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(timeRange: number = 3600000): {
    serverLoad: { trend: 'increasing' | 'decreasing' | 'stable'; change: number };
    frameRate: { trend: 'increasing' | 'decreasing' | 'stable'; change: number };
    latency: { trend: 'increasing' | 'decreasing' | 'stable'; change: number };
    errorRate: { trend: 'increasing' | 'decreasing' | 'stable'; change: number };
  } {
    const cutoffTime = Date.now() - timeRange;
    const recentSnapshots = this.historicalSnapshots.filter(s => s.timestamp > cutoffTime);

    if (recentSnapshots.length < 2) {
      return {
        serverLoad: { trend: 'stable', change: 0 },
        frameRate: { trend: 'stable', change: 0 },
        latency: { trend: 'stable', change: 0 },
        errorRate: { trend: 'stable', change: 0 }
      };
    }

    const first = recentSnapshots[0];
    const last = recentSnapshots[recentSnapshots.length - 1];

    return {
      serverLoad: this.calculateTrend(
        first.metrics.server.serverLoad,
        last.metrics.server.serverLoad
      ),
      frameRate: this.calculateTrend(
        this.getAverageClientFrameRate(first.metrics),
        this.getAverageClientFrameRate(last.metrics)
      ),
      latency: this.calculateTrend(
        first.metrics.game.averagePlayerLatency,
        last.metrics.game.averagePlayerLatency
      ),
      errorRate: this.calculateTrend(
        first.metrics.game.errorRate,
        last.metrics.game.errorRate
      )
    };
  }

  /**
   * Add alert callback
   */
  public onAlert(callback: AlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove alert callback
   */
  public removeAlertCallback(callback: AlertCallback): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index !== -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Update alert thresholds
   */
  public updateThresholds(thresholds: AlertThreshold[]): void {
    this.metrics.thresholds = thresholds;
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): AlertThreshold[] {
    return [...this.metrics.thresholds];
  }

  /**
   * Force immediate metrics check and alerting
   */
  public forceCheck(): PerformanceAlert[] {
    const alerts = this.metrics.checkThresholds();
    this.processAlerts(alerts);
    return alerts;
  }

  /**
   * Get monitoring statistics
   */
  public getMonitoringStatistics(): {
    uptime: number;
    dataPoints: number;
    alertsTriggered: number;
    averageUpdateTime: number;
    memoryUsage: number;
    config: MonitoringConfig;
  } {
    return {
      uptime: this.updateTimer ? Date.now() - 0 : 0, // TODO: Track actual uptime
      dataPoints: this.historicalSnapshots.length,
      alertsTriggered: this.metrics.activeAlerts.length,
      averageUpdateTime: 5, // TODO: Implement actual measurement
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      config: { ...this.config }
    };
  }

  /**
   * Export performance data
   */
  public exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      exportedAt: new Date().toISOString(),
      config: this.config,
      currentMetrics: this.metrics,
      historicalData: this.historicalSnapshots.slice(-100) // Last 100 snapshots
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'serverLoad', 'frameRate', 'latency', 'errorRate', 'systemHealth'];
    const rows = this.historicalSnapshots.slice(-100).map(snapshot => [
      snapshot.timestamp,
      snapshot.metrics.server.serverLoad,
      this.getAverageClientFrameRate(snapshot.metrics),
      snapshot.metrics.game.averagePlayerLatency,
      snapshot.metrics.game.errorRate,
      snapshot.systemHealth
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Clean up old data
   */
  public cleanup(): void {
    const cutoffTime = Date.now() - this.config.historicalDataRetention;

    // Clean up historical snapshots
    this.historicalSnapshots = this.historicalSnapshots.filter(
      snapshot => snapshot.timestamp > cutoffTime
    );

    // Clean up old alerts
    for (const [alertKey, timestamp] of Array.from(this.lastAlerts)) {
      if (Date.now() - timestamp > this.config.alertCooldown * 2) {
        this.lastAlerts.delete(alertKey);
      }
    }

    // Clean up metrics
    this.metrics.cleanup();
  }

  // Private methods

  private updateMetrics(): void {
    if (!this.config.enableDataCollection) return;

    // Update server metrics with current system state
    this.updateSystemMetrics();

    // Check for alerts
    this.checkAlertsIfEnabled();

    // Create snapshot for historical data
    if (this.shouldCreateSnapshot()) {
      this.createSnapshot();
    }
  }

  private updateSystemMetrics(): void {
    // Update server metrics with current system information
    const memoryUsage = process.memoryUsage();

    this.metrics.updateServerMetrics({
      timestamp: Date.now(),
      memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // MB
      // Note: More comprehensive system metrics would be collected here
    });

    // Update game metrics
    this.metrics.game.timestamp = Date.now();
    this.metrics.game.uptime = process.uptime() * 1000; // Convert to ms

    // Update network metrics
    this.metrics.network.timestamp = Date.now();
  }

  private checkAlertsIfEnabled(): void {
    if (!this.config.enableRealTimeAlerts) return;

    const alerts = this.metrics.checkThresholds();
    this.processAlerts(alerts);
  }

  private processAlerts(alerts: PerformanceAlert[]): void {
    for (const alert of alerts) {
      const alertKey = `${alert.metric}_${alert.level}`;
      const lastAlertTime = this.lastAlerts.get(alertKey) || 0;

      // Check cooldown
      if (Date.now() - lastAlertTime < this.config.alertCooldown) {
        continue;
      }

      // Record alert time
      this.lastAlerts.set(alertKey, Date.now());

      // Notify callbacks
      for (const callback of this.alertCallbacks) {
        try {
          callback(alert);
        } catch (error) {
          console.error('Alert callback error:', error);
        }
      }
    }
  }

  private shouldCreateSnapshot(): boolean {
    if (this.historicalSnapshots.length === 0) return true;

    const lastSnapshot = this.historicalSnapshots[this.historicalSnapshots.length - 1];
    const timeSinceLastSnapshot = Date.now() - lastSnapshot.timestamp;

    return timeSinceLastSnapshot >= this.config.aggregationInterval;
  }

  private createSnapshot(): void {
    const snapshot = this.getSnapshot();
    this.historicalSnapshots.push(snapshot);

    // Maintain history size
    if (this.historicalSnapshots.length > this.maxSnapshotHistory) {
      this.historicalSnapshots = this.historicalSnapshots.slice(-this.maxSnapshotHistory);
    }
  }

  private aggregateMetrics(): void {
    const aggregation = this.metrics.aggregateMetrics('minute');
    console.log('Metrics aggregated:', {
      timestamp: new Date(aggregation.timestamp).toISOString(),
      averages: aggregation.averages
    });
  }

  private setupDefaultThresholds(): void {
    const defaultThresholds: AlertThreshold[] = [
      { metric: 'serverLoad', warning: 70, critical: 90, enabled: true },
      { metric: 'frameRate', warning: 45, critical: 30, enabled: true },
      { metric: 'latency', warning: 200, critical: 500, enabled: true },
      { metric: 'errorRate', warning: 0.05, critical: 0.1, enabled: true },
      { metric: 'memoryUsage', warning: 1000, critical: 1500, enabled: true }
    ];

    this.metrics.thresholds = defaultThresholds;
  }

  private calculateTrend(oldValue: number, newValue: number): {
    trend: 'increasing' | 'decreasing' | 'stable';
    change: number;
  } {
    const change = ((newValue - oldValue) / oldValue) * 100;
    const threshold = 5; // 5% threshold for trend determination

    if (Math.abs(change) < threshold) {
      return { trend: 'stable', change: 0 };
    }

    return {
      trend: change > 0 ? 'increasing' : 'decreasing',
      change: Math.abs(change)
    };
  }

  private getAverageClientFrameRate(metrics: PerformanceMetrics): number {
    if (metrics.clients.size === 0) return 60; // Default

    let totalFrameRate = 0;
    for (const clientMetrics of Array.from(metrics.clients.values())) {
      totalFrameRate += clientMetrics.frameRate;
    }

    return totalFrameRate / metrics.clients.size;
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

export class PerformanceMonitorManager {
  /**
   * Get or create global monitor instance
   */
  static getInstance(config?: Partial<MonitoringConfig>): PerformanceMonitor {
    if (!globalMonitor) {
      globalMonitor = new PerformanceMonitor(config);
    }
    return globalMonitor;
  }

  /**
   * Initialize global monitor with configuration
   */
  static initialize(config: Partial<MonitoringConfig>): PerformanceMonitor {
    globalMonitor = new PerformanceMonitor(config);
    return globalMonitor;
  }

  /**
   * Destroy global monitor instance
   */
  static destroy(): void {
    if (globalMonitor) {
      globalMonitor.stop();
      globalMonitor = null;
    }
  }
}

/**
 * Factory for creating PerformanceMonitor instances
 */
export class PerformanceMonitorFactory {
  static create(config?: Partial<MonitoringConfig>): PerformanceMonitor {
    return new PerformanceMonitor(config);
  }

  static createForDevelopment(): PerformanceMonitor {
    return new PerformanceMonitor({
      mode: MonitoringMode.DEVELOPMENT,
      updateInterval: 5000, // Slower updates for development
      enableRealTimeAlerts: true,
      enableDataCollection: true
    });
  }

  static createForProduction(): PerformanceMonitor {
    return new PerformanceMonitor({
      mode: MonitoringMode.PRODUCTION,
      updateInterval: 1000,
      aggregationInterval: 60000,
      enableRealTimeAlerts: true,
      enableDataCollection: true,
      alertCooldown: 60000 // Longer cooldown in production
    });
  }

  static createForTesting(): PerformanceMonitor {
    return new PerformanceMonitor({
      mode: MonitoringMode.TESTING,
      updateInterval: 100, // Fast updates for testing
      aggregationInterval: 1000,
      enableRealTimeAlerts: false,
      enableDataCollection: true,
      historicalDataRetention: 60000 // Short retention for testing
    });
  }
}