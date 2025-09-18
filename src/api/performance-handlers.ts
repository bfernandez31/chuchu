import { Req, Res } from "find-my-way";
import { PerformanceMonitor } from "../performance/performance-monitor";
import { Game } from "../game";
import { AlertThreshold } from "../models/performance-metrics";

/**
 * Performance API handlers implementing the REST endpoints defined in performance-api.json
 * Provides monitoring and metrics collection for the hybrid predictive rendering system
 */

interface QueryParams {
  timeRange?: string;
  includeClients?: string;
  severity?: string;
}

interface RouteParams {
  playerId?: string;
}

// Default performance thresholds
const DEFAULT_THRESHOLDS = {
  frameRate: { warning: 45, critical: 30 },
  latency: { warning: 200, critical: 500 },
  rollbackRate: { warning: 5, critical: 10 },
  cpuUsage: { warning: 70, critical: 90 }
};

let currentThresholds = { ...DEFAULT_THRESHOLDS };
let performanceMonitor: PerformanceMonitor | null = null;
let gameInstance: Game | null = null;

/**
 * Initialize handlers with dependencies
 */
export function initializePerformanceHandlers(monitor: PerformanceMonitor, game: Game) {
  performanceMonitor = monitor;
  gameInstance = game;
}

/**
 * GET /api/v1/performance/metrics
 * Get current system performance metrics
 */
export async function getPerformanceMetrics(
  req: Req<any>,
  res: Res<any>,
  params: RouteParams
): Promise<void> {
  try {
    const queryParams = parseQueryParams(req.url);
    const timeRange = queryParams.timeRange || '5m';
    const includeClients = queryParams.includeClients !== 'false';

    if (!performanceMonitor) {
      throw new Error('Performance monitor not initialized');
    }

    const snapshot = performanceMonitor.getSnapshot();
    const metrics = snapshot.metrics;

    const response = {
      server: {
        cpuUsage: metrics.server.serverLoad || 0,
        memoryUsage: metrics.server.memoryUsage,
        tickRate: metrics.server.tickRate,
        activeConnections: gameInstance?.players?.length || 0,
        uptime: process.uptime()
      },
      game: {
        averageLatency: metrics.server.averageLatency,
        totalRollbacks: metrics.server.rollbackCount,
        predictionAccuracy: (metrics.server.predictionAccuracy * 100),
        frameRate: metrics.server.tickRate,
        activePlayers: gameInstance?.players?.length || 0
      },
      network: {
        messagesSent: metrics.server.messagesSent,
        messagesReceived: metrics.server.messagesReceived,
        bandwidthUsage: metrics.network.outboundBandwidth,
        compressionRatio: metrics.network.compressionSavings > 0 ?
          metrics.network.compressionSavings / (metrics.network.outboundBandwidth * 1024) : 0,
        deltaUpdates: Math.floor(metrics.server.messagesSent * 0.7) // Estimated delta updates
      },
      clients: includeClients ? Array.from(metrics.clients.values()) : undefined,
      timestamp: new Date().toISOString(),
      timeRange
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end(JSON.stringify(response));
  } catch (error) {
    handleError(res, error, 'Failed to retrieve performance metrics');
  }
}

/**
 * GET /api/v1/performance/players/{playerId}
 * Get player-specific performance metrics
 */
export async function getPlayerPerformanceMetrics(
  req: Req<any>,
  res: Res<any>,
  params: RouteParams
): Promise<void> {
  try {
    const { playerId } = params;
    const queryParams = parseQueryParams(req.url);
    const timeRange = queryParams.timeRange || '5m';

    if (!playerId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Bad Request', message: 'Player ID is required' }));
      return;
    }

    if (!performanceMonitor) {
      throw new Error('Performance monitor not initialized');
    }

    // Get historical data for specific player
    const historicalData = performanceMonitor.getHistoricalData({
      start: Date.now() - getTimeRangeMs(timeRange),
      end: Date.now()
    });

    const snapshot = performanceMonitor.getSnapshot();
    const metrics = snapshot.metrics;

    // Extract player-specific metrics from client metrics
    const playerMetrics = extractPlayerMetrics(playerId, historicalData, Array.from(metrics.clients.values()));

    if (!playerMetrics) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not Found', message: 'Player not found' }));
      return;
    }

    const response = {
      playerId,
      metrics: playerMetrics.current,
      history: playerMetrics.history
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end(JSON.stringify(response));
  } catch (error) {
    handleError(res, error, 'Failed to retrieve player metrics');
  }
}

/**
 * GET /api/v1/performance/thresholds
 * Get performance threshold configuration
 */
export async function getPerformanceThresholds(
  req: Req<any>,
  res: Res<any>,
  params: RouteParams
): Promise<void> {
  try {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end(JSON.stringify(currentThresholds));
  } catch (error) {
    handleError(res, error, 'Failed to retrieve thresholds');
  }
}

/**
 * PUT /api/v1/performance/thresholds
 * Update performance thresholds
 */
export async function updatePerformanceThresholds(
  req: Req<any>,
  res: Res<any>,
  params: RouteParams
): Promise<void> {
  try {
    const body = await parseRequestBody(req);

    // Validate threshold structure
    if (!validateThresholds(body)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid threshold values',
        details: 'Thresholds must include frameRate, latency, rollbackRate, and cpuUsage with warning/critical values'
      }));
      return;
    }

    currentThresholds = { ...currentThresholds, ...body };

    // Update performance monitor with new thresholds
    if (performanceMonitor) {
      performanceMonitor.updateThresholds(convertToAlertThresholds(currentThresholds));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end(JSON.stringify(currentThresholds));
  } catch (error) {
    handleError(res, error, 'Failed to update thresholds');
  }
}

/**
 * GET /api/v1/performance/alerts
 * Get active performance alerts
 */
export async function getPerformanceAlerts(
  req: Req<any>,
  res: Res<any>,
  params: RouteParams
): Promise<void> {
  try {
    const queryParams = parseQueryParams(req.url);
    const severity = queryParams.severity;

    if (!performanceMonitor) {
      throw new Error('Performance monitor not initialized');
    }

    const snapshot = performanceMonitor.getSnapshot();
    const alerts = filterAlertsBySeverity(snapshot.alerts, severity);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end(JSON.stringify(alerts));
  } catch (error) {
    handleError(res, error, 'Failed to retrieve alerts');
  }
}

/**
 * GET /api/v1/performance/rollbacks
 * Get rollback statistics
 */
export async function getRollbackStatistics(
  req: Req<any>,
  res: Res<any>,
  params: RouteParams
): Promise<void> {
  try {
    const queryParams = parseQueryParams(req.url);
    const timeRange = queryParams.timeRange || '15m';

    if (!performanceMonitor) {
      throw new Error('Performance monitor not initialized');
    }

    const rollbackStats = generateRollbackStatistics(timeRange, performanceMonitor);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end(JSON.stringify(rollbackStats));
  } catch (error) {
    handleError(res, error, 'Failed to retrieve rollback statistics');
  }
}

/**
 * Parse query parameters from URL
 */
function parseQueryParams(url?: string): QueryParams {
  if (!url) return {};

  const urlObj = new URL(url, 'http://localhost');
  const params: QueryParams = {};

  if (urlObj.searchParams.has('timeRange')) {
    params.timeRange = urlObj.searchParams.get('timeRange') || undefined;
  }
  if (urlObj.searchParams.has('includeClients')) {
    params.includeClients = urlObj.searchParams.get('includeClients') || undefined;
  }
  if (urlObj.searchParams.has('severity')) {
    params.severity = urlObj.searchParams.get('severity') || undefined;
  }

  return params;
}

/**
 * Parse request body for PUT requests
 */
function parseRequestBody(req: Req<any>): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Validate threshold structure
 */
function validateThresholds(thresholds: any): boolean {
  if (!thresholds || typeof thresholds !== 'object') return false;

  const requiredFields = ['frameRate', 'latency', 'rollbackRate', 'cpuUsage'];

  for (const field of requiredFields) {
    if (thresholds[field]) {
      const threshold = thresholds[field];
      if (!threshold.warning || !threshold.critical ||
          typeof threshold.warning !== 'number' ||
          typeof threshold.critical !== 'number') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Handle errors consistently
 */
function handleError(res: Res<any>, error: any, message: string): void {
  console.error(`Performance API Error: ${message}`, error);

  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify({
    error: 'Internal Server Error',
    message,
    details: error.message
  }));
}

/**
 * Convert time range string to milliseconds
 */
function getTimeRangeMs(timeRange: string): number {
  switch (timeRange) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    default: return 5 * 60 * 1000; // default 5m
  }
}

/**
 * Extract player-specific metrics from client metrics array
 */
function extractPlayerMetrics(playerId: string, historicalData: any, clientMetrics?: any[]): any | null {
  // Find current metrics for player
  const currentMetrics = clientMetrics?.find(client => client.playerId === playerId);

  if (!currentMetrics) {
    return null;
  }

  // Generate mock history for now (would be implemented with real historical tracking)
  const history = Array.from({ length: 10 }, (_, i) => ({
    timestamp: new Date(Date.now() - (9 - i) * 30000).toISOString(),
    frameRate: currentMetrics.frameRate + (Math.random() - 0.5) * 10,
    latency: currentMetrics.networkLatency + (Math.random() - 0.5) * 20,
    rollbacks: Math.floor(Math.random() * 3)
  }));

  return {
    current: currentMetrics,
    history
  };
}

/**
 * Convert threshold object to AlertThreshold array format
 */
function convertToAlertThresholds(thresholds: any): AlertThreshold[] {
  const alertThresholds: AlertThreshold[] = [];

  for (const [metric, values] of Object.entries(thresholds)) {
    if (typeof values === 'object' && values !== null) {
      const thresholdValues = values as { warning?: number; critical?: number };

      if (thresholdValues.warning !== undefined && thresholdValues.critical !== undefined) {
        alertThresholds.push({
          metric,
          warning: thresholdValues.warning,
          critical: thresholdValues.critical,
          enabled: true
        });
      }
    }
  }

  return alertThresholds;
}

/**
 * Filter alerts by severity
 */
function filterAlertsBySeverity(alerts: any[], severity?: string): any[] {
  if (!severity) {
    return alerts;
  }

  return alerts.filter(alert => alert.severity === severity);
}

/**
 * Generate rollback statistics
 */
function generateRollbackStatistics(timeRange: string, performanceMonitor: PerformanceMonitor): any {
  const snapshot = performanceMonitor.getSnapshot();
  const timeRangeMs = getTimeRangeMs(timeRange);

  // Mock rollback statistics for now (would be implemented with real rollback tracking)
  return {
    totalRollbacks: Math.floor(Math.random() * 50),
    rollbackRate: Math.random() * 10,
    averageDistance: Math.random() * 5 + 1,
    accuracyImprovement: Math.random() * 20 + 80,
    byPlayer: [] // Would be populated with real player data
  };
}