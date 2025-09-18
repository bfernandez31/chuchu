/**
 * T022: PerformanceMetrics Model
 *
 * Client and server metrics structure with validation ranges,
 * metrics aggregation logic, and performance monitoring.
 */

export interface ServerMetrics {
  timestamp: number;
  tickRate: number;        // 1-120 FPS
  serverLoad: number;      // 0-100%
  memoryUsage: number;     // MB
  entityCount: number;
  playerCount: number;
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;  // <1000ms
  rollbackCount: number;
  predictionAccuracy: number; // 0.0-1.0
}

export interface ClientMetrics {
  timestamp: number;
  playerId: string;
  frameRate: number;       // 1-120 FPS
  frameTime: number;       // ms per frame
  renderTime: number;      // ms spent rendering
  networkLatency: number;  // <1000ms
  predictionAccuracy: number; // 0.0-1.0
  rollbackFrequency: number;  // rollbacks per minute
  memoryUsage: number;     // MB
  inputLag: number;        // ms from input to visual feedback
  smoothingActive: boolean;
  compressionRatio: number; // 0.0-1.0
}

export interface GameMetrics {
  timestamp: number;
  gameId: string;
  activeConnections: number;
  messageRate: number;     // messages per second
  stateUpdatesPerSecond: number;
  averagePlayerLatency: number;
  bandwidthUsage: number;  // KB/s
  errorRate: number;       // 0.0-1.0
  uptime: number;          // seconds
}

export interface NetworkMetrics {
  timestamp: number;
  inboundBandwidth: number;  // KB/s
  outboundBandwidth: number; // KB/s
  packetLoss: number;        // 0.0-1.0
  jitter: number;            // ms
  connectionCount: number;
  reconnectionRate: number;  // reconnections per hour
  compressionSavings: number; // bytes saved by compression
}

export interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  enabled: boolean;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  level: 'WARNING' | 'CRITICAL';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved: boolean;
  resolvedAt?: number;
}

export interface MetricsAggregation {
  period: 'minute' | 'hour' | 'day';
  timestamp: number;
  averages: Record<string, number>;
  maximums: Record<string, number>;
  minimums: Record<string, number>;
  counts: Record<string, number>;
}

export interface PerformanceMetrics {
  // Core metrics
  server: ServerMetrics;
  game: GameMetrics;
  network: NetworkMetrics;
  clients: Map<string, ClientMetrics>;

  // Thresholds and alerts
  thresholds: AlertThreshold[];
  activeAlerts: PerformanceAlert[];

  // Historical data
  aggregations: MetricsAggregation[];

  // Validation
  isValid(): boolean;
  checkThresholds(): PerformanceAlert[];
  addClientMetrics(clientMetrics: ClientMetrics): void;
  updateServerMetrics(serverMetrics: Partial<ServerMetrics>): void;
}

export class PerformanceMetricsImpl implements PerformanceMetrics {
  public server: ServerMetrics;
  public game: GameMetrics;
  public network: NetworkMetrics;
  public clients: Map<string, ClientMetrics>;
  public thresholds: AlertThreshold[];
  public activeAlerts: PerformanceAlert[];
  public aggregations: MetricsAggregation[];

  constructor(data?: Partial<PerformanceMetrics>) {
    this.server = data?.server || this.createDefaultServerMetrics();
    this.game = data?.game || this.createDefaultGameMetrics();
    this.network = data?.network || this.createDefaultNetworkMetrics();
    this.clients = data?.clients || new Map();
    this.thresholds = data?.thresholds || this.createDefaultThresholds();
    this.activeAlerts = data?.activeAlerts || [];
    this.aggregations = data?.aggregations || [];
  }

  /**
   * Validate all metrics are within acceptable ranges
   */
  public isValid(): boolean {
    try {
      // Server metrics validation
      if (!this.isServerMetricsValid()) return false;

      // Game metrics validation
      if (!this.isGameMetricsValid()) return false;

      // Network metrics validation
      if (!this.isNetworkMetricsValid()) return false;

      // Client metrics validation
      for (const [playerId, clientMetrics] of Array.from(this.clients)) {
        if (!this.isClientMetricsValid(clientMetrics)) return false;
      }

      return true;
    } catch (error) {
      console.error('Performance metrics validation error:', error);
      return false;
    }
  }

  /**
   * Check all metrics against thresholds and generate alerts
   */
  public checkThresholds(): PerformanceAlert[] {
    const newAlerts: PerformanceAlert[] = [];

    // Check server metrics
    newAlerts.push(...this.checkServerThresholds());

    // Check game metrics
    newAlerts.push(...this.checkGameThresholds());

    // Check network metrics
    newAlerts.push(...this.checkNetworkThresholds());

    // Check client metrics
    for (const [playerId, clientMetrics] of Array.from(this.clients)) {
      newAlerts.push(...this.checkClientThresholds(clientMetrics));
    }

    // Add new alerts to active alerts
    for (const alert of newAlerts) {
      this.activeAlerts.push(alert);
    }

    // Check for resolved alerts
    this.checkResolvedAlerts();

    return newAlerts;
  }

  /**
   * Add or update client metrics
   */
  public addClientMetrics(clientMetrics: ClientMetrics): void {
    if (!this.isClientMetricsValid(clientMetrics)) {
      throw new Error('Invalid client metrics provided');
    }

    this.clients.set(clientMetrics.playerId, clientMetrics);
  }

  /**
   * Update server metrics
   */
  public updateServerMetrics(serverMetrics: Partial<ServerMetrics>): void {
    this.server = {
      ...this.server,
      ...serverMetrics,
      timestamp: Date.now()
    };

    if (!this.isServerMetricsValid()) {
      throw new Error('Invalid server metrics provided');
    }
  }

  /**
   * Aggregate metrics over specified period
   */
  public aggregateMetrics(period: 'minute' | 'hour' | 'day'): MetricsAggregation {
    const now = Date.now();
    const aggregation: MetricsAggregation = {
      period,
      timestamp: now,
      averages: {},
      maximums: {},
      minimums: {},
      counts: {}
    };

    // Server metrics aggregation
    aggregation.averages.serverTickRate = this.server.tickRate;
    aggregation.averages.serverLoad = this.server.serverLoad;
    aggregation.averages.memoryUsage = this.server.memoryUsage;
    aggregation.averages.playerCount = this.server.playerCount;

    // Game metrics aggregation
    aggregation.averages.messageRate = this.game.messageRate;
    aggregation.averages.stateUpdatesPerSecond = this.game.stateUpdatesPerSecond;
    aggregation.averages.averagePlayerLatency = this.game.averagePlayerLatency;

    // Network metrics aggregation
    aggregation.averages.bandwidthUsage = this.network.inboundBandwidth + this.network.outboundBandwidth;
    aggregation.averages.packetLoss = this.network.packetLoss;
    aggregation.averages.connectionCount = this.network.connectionCount;

    // Client metrics aggregation
    if (this.clients.size > 0) {
      let totalFrameRate = 0;
      let totalLatency = 0;
      let totalRollbacks = 0;

      for (const [playerId, clientMetrics] of Array.from(this.clients)) {
        totalFrameRate += clientMetrics.frameRate;
        totalLatency += clientMetrics.networkLatency;
        totalRollbacks += clientMetrics.rollbackFrequency;
      }

      aggregation.averages.clientFrameRate = totalFrameRate / this.clients.size;
      aggregation.averages.clientLatency = totalLatency / this.clients.size;
      aggregation.averages.clientRollbacks = totalRollbacks / this.clients.size;
    }

    this.aggregations.push(aggregation);

    // Maintain aggregation history size
    if (this.aggregations.length > 1000) {
      this.aggregations = this.aggregations.slice(-1000);
    }

    return aggregation;
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check server performance
    if (this.server.serverLoad > 80) {
      issues.push('High server load');
      recommendations.push('Consider scaling server resources');
      score -= 20;
    }

    if (this.server.tickRate < 50) {
      issues.push('Low tick rate');
      recommendations.push('Optimize game loop performance');
      score -= 15;
    }

    // Check network performance
    if (this.network.packetLoss > 0.05) {
      issues.push('High packet loss');
      recommendations.push('Investigate network connectivity');
      score -= 25;
    }

    // Check client performance
    let lowFrameRateClients = 0;
    for (const [playerId, clientMetrics] of Array.from(this.clients)) {
      if (clientMetrics.frameRate < 45) {
        lowFrameRateClients++;
      }
    }

    if (lowFrameRateClients > this.clients.size * 0.2) {
      issues.push('Multiple clients with low frame rate');
      recommendations.push('Optimize client rendering or reduce quality');
      score -= 20;
    }

    // Determine overall status
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (score < 60) {
      status = 'CRITICAL';
    } else if (score < 80) {
      status = 'WARNING';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  /**
   * Clean up old metrics and alerts
   */
  public cleanup(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour

    // Remove old client metrics
    for (const [playerId, clientMetrics] of Array.from(this.clients)) {
      if (clientMetrics.timestamp < cutoffTime) {
        this.clients.delete(playerId);
      }
    }

    // Remove resolved alerts older than 1 hour
    this.activeAlerts = this.activeAlerts.filter(alert =>
      !alert.resolved || (alert.resolvedAt && alert.resolvedAt > cutoffTime)
    );

    // Keep only recent aggregations
    this.aggregations = this.aggregations.filter(agg => agg.timestamp > cutoffTime);
  }

  // Private validation methods

  private isServerMetricsValid(): boolean {
    const s = this.server;
    return s.timestamp > 0 &&
           s.tickRate >= 1 && s.tickRate <= 120 &&
           s.serverLoad >= 0 && s.serverLoad <= 100 &&
           s.memoryUsage >= 0 &&
           s.entityCount >= 0 &&
           s.playerCount >= 0 &&
           s.averageLatency >= 0 && s.averageLatency <= 10000 &&
           s.predictionAccuracy >= 0.0 && s.predictionAccuracy <= 1.0;
  }

  private isGameMetricsValid(): boolean {
    const g = this.game;
    return g.timestamp > 0 &&
           g.gameId.length > 0 &&
           g.activeConnections >= 0 &&
           g.messageRate >= 0 &&
           g.stateUpdatesPerSecond >= 0 &&
           g.averagePlayerLatency >= 0 &&
           g.bandwidthUsage >= 0 &&
           g.errorRate >= 0.0 && g.errorRate <= 1.0 &&
           g.uptime >= 0;
  }

  private isNetworkMetricsValid(): boolean {
    const n = this.network;
    return n.timestamp > 0 &&
           n.inboundBandwidth >= 0 &&
           n.outboundBandwidth >= 0 &&
           n.packetLoss >= 0.0 && n.packetLoss <= 1.0 &&
           n.jitter >= 0 &&
           n.connectionCount >= 0 &&
           n.reconnectionRate >= 0;
  }

  private isClientMetricsValid(clientMetrics: ClientMetrics): boolean {
    const c = clientMetrics;
    return c.timestamp > 0 &&
           c.playerId.length > 0 &&
           c.frameRate >= 1 && c.frameRate <= 120 &&
           c.frameTime > 0 &&
           c.renderTime >= 0 &&
           c.networkLatency >= 0 && c.networkLatency <= 10000 &&
           c.predictionAccuracy >= 0.0 && c.predictionAccuracy <= 1.0 &&
           c.rollbackFrequency >= 0 &&
           c.memoryUsage >= 0 &&
           c.inputLag >= 0 &&
           c.compressionRatio >= 0.0 && c.compressionRatio <= 1.0;
  }

  // Private threshold checking methods

  private checkServerThresholds(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    const checks = [
      { metric: 'serverLoad', value: this.server.serverLoad, thresholds: { warning: 70, critical: 90 } },
      { metric: 'tickRate', value: this.server.tickRate, thresholds: { warning: 45, critical: 30 }, inverted: true },
      { metric: 'memoryUsage', value: this.server.memoryUsage, thresholds: { warning: 1000, critical: 1500 } },
      { metric: 'averageLatency', value: this.server.averageLatency, thresholds: { warning: 200, critical: 500 } }
    ];

    for (const check of checks) {
      const threshold = this.thresholds.find(t => t.metric === check.metric);
      if (!threshold || !threshold.enabled) continue;

      const isInverted = check.inverted || false;
      const warningTriggered = isInverted ?
        check.value < threshold.warning :
        check.value > threshold.warning;
      const criticalTriggered = isInverted ?
        check.value < threshold.critical :
        check.value > threshold.critical;

      if (criticalTriggered) {
        alerts.push(this.createAlert('CRITICAL', check.metric, check.value, threshold.critical));
      } else if (warningTriggered) {
        alerts.push(this.createAlert('WARNING', check.metric, check.value, threshold.warning));
      }
    }

    return alerts;
  }

  private checkGameThresholds(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (this.game.errorRate > 0.1) {
      alerts.push(this.createAlert('CRITICAL', 'errorRate', this.game.errorRate, 0.1));
    }

    if (this.game.averagePlayerLatency > 300) {
      alerts.push(this.createAlert('WARNING', 'averagePlayerLatency', this.game.averagePlayerLatency, 300));
    }

    return alerts;
  }

  private checkNetworkThresholds(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (this.network.packetLoss > 0.05) {
      alerts.push(this.createAlert('WARNING', 'packetLoss', this.network.packetLoss, 0.05));
    }

    if (this.network.packetLoss > 0.1) {
      alerts.push(this.createAlert('CRITICAL', 'packetLoss', this.network.packetLoss, 0.1));
    }

    return alerts;
  }

  private checkClientThresholds(clientMetrics: ClientMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (clientMetrics.frameRate < 30) {
      alerts.push(this.createAlert('CRITICAL', 'clientFrameRate', clientMetrics.frameRate, 30));
    } else if (clientMetrics.frameRate < 45) {
      alerts.push(this.createAlert('WARNING', 'clientFrameRate', clientMetrics.frameRate, 45));
    }

    if (clientMetrics.networkLatency > 500) {
      alerts.push(this.createAlert('WARNING', 'clientLatency', clientMetrics.networkLatency, 500));
    }

    return alerts;
  }

  private checkResolvedAlerts(): void {
    for (const alert of this.activeAlerts) {
      if (alert.resolved) continue;

      // Check if alert condition is resolved
      let isResolved = false;

      switch (alert.metric) {
        case 'serverLoad':
          isResolved = this.server.serverLoad < alert.threshold;
          break;
        case 'tickRate':
          isResolved = this.server.tickRate >= alert.threshold;
          break;
        case 'packetLoss':
          isResolved = this.network.packetLoss < alert.threshold;
          break;
        // Add more resolution checks as needed
      }

      if (isResolved) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();
      }
    }
  }

  private createAlert(level: 'WARNING' | 'CRITICAL', metric: string, value: number, threshold: number): PerformanceAlert {
    return {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      level,
      metric,
      value,
      threshold,
      message: `${metric} ${level.toLowerCase()}: ${value} ${level === 'WARNING' ? '>' : '>>'} ${threshold}`,
      resolved: false
    };
  }

  private createDefaultServerMetrics(): ServerMetrics {
    return {
      timestamp: Date.now(),
      tickRate: 60,
      serverLoad: 0,
      memoryUsage: 0,
      entityCount: 0,
      playerCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      rollbackCount: 0,
      predictionAccuracy: 1.0
    };
  }

  private createDefaultGameMetrics(): GameMetrics {
    return {
      timestamp: Date.now(),
      gameId: 'default_game',
      activeConnections: 0,
      messageRate: 0,
      stateUpdatesPerSecond: 0,
      averagePlayerLatency: 0,
      bandwidthUsage: 0,
      errorRate: 0,
      uptime: 0
    };
  }

  private createDefaultNetworkMetrics(): NetworkMetrics {
    return {
      timestamp: Date.now(),
      inboundBandwidth: 0,
      outboundBandwidth: 0,
      packetLoss: 0,
      jitter: 0,
      connectionCount: 0,
      reconnectionRate: 0,
      compressionSavings: 0
    };
  }

  private createDefaultThresholds(): AlertThreshold[] {
    return [
      { metric: 'serverLoad', warning: 70, critical: 90, enabled: true },
      { metric: 'tickRate', warning: 45, critical: 30, enabled: true },
      { metric: 'memoryUsage', warning: 1000, critical: 1500, enabled: true },
      { metric: 'averageLatency', warning: 200, critical: 500, enabled: true },
      { metric: 'packetLoss', warning: 0.05, critical: 0.1, enabled: true },
      { metric: 'clientFrameRate', warning: 45, critical: 30, enabled: true },
      { metric: 'errorRate', warning: 0.05, critical: 0.1, enabled: true }
    ];
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory for creating PerformanceMetrics instances
 */
export class PerformanceMetricsFactory {
  static create(): PerformanceMetrics {
    return new PerformanceMetricsImpl();
  }

  static createWithThresholds(thresholds: AlertThreshold[]): PerformanceMetrics {
    return new PerformanceMetricsImpl({ thresholds });
  }

  static createForTesting(): PerformanceMetrics {
    const metrics = new PerformanceMetricsImpl();

    // Add sample client metrics
    metrics.addClientMetrics({
      timestamp: Date.now(),
      playerId: 'test_player_1',
      frameRate: 60,
      frameTime: 16.67,
      renderTime: 12,
      networkLatency: 50,
      predictionAccuracy: 0.95,
      rollbackFrequency: 2,
      memoryUsage: 128,
      inputLag: 25,
      smoothingActive: true,
      compressionRatio: 0.7
    });

    return metrics;
  }
}