/**
 * T030: NetworkOptimizer Implementation
 *
 * Adaptive tick rate management (50Hz → 20Hz), bandwidth usage optimization,
 * connection quality monitoring, and message prioritization.
 */

import { DeltaCompression, CompressionMetrics } from './delta-compression';

export interface NetworkMetrics {
  tickRate: number;
  bandwidth: number;
  latency: number;
  packetLoss: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  messagesPerSecond: number;
  averageMessageSize: number;
  compressionRatio: number;
  timestamp: number;
}

export interface AdaptiveSettings {
  targetTickRate: number;
  maxBandwidth: number; // bytes per second
  latencyThreshold: number; // ms
  packetLossThreshold: number; // percentage
  compressionEnabled: boolean;
  prioritizationEnabled: boolean;
}

export interface ConnectionQuality {
  playerId: string;
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  score: number; // 0-100
  lastUpdated: number;
}

export interface MessagePriority {
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  maxDelay: number; // ms
  dropThreshold: number; // quality score below which to drop
}

export class NetworkOptimizer {
  private currentSettings: AdaptiveSettings;
  private networkHistory: NetworkMetrics[] = [];
  private connectionQualities: Map<string, ConnectionQuality> = new Map();
  private messagePriorities: Map<string, MessagePriority> = new Map();
  private deltaCompression: DeltaCompression;
  private readonly maxHistorySize = 100;

  // Adaptive tick rate settings
  private baseTickRate = 50; // Hz
  private minTickRate = 20; // Hz
  private maxTickRate = 60; // Hz
  private currentTickRate = 50; // Hz

  // Bandwidth tracking
  private bandwidthBuffer: number[] = [];
  private targetBandwidth = 100000; // 100KB/s target

  constructor(initialSettings?: Partial<AdaptiveSettings>) {
    this.currentSettings = {
      targetTickRate: 50,
      maxBandwidth: 500000, // 500KB/s
      latencyThreshold: 200, // ms
      packetLossThreshold: 5, // %
      compressionEnabled: true,
      prioritizationEnabled: true,
      ...initialSettings
    };

    this.deltaCompression = new DeltaCompression();
    this.initializeMessagePriorities();
  }

  /**
   * Initialize message priority definitions
   */
  private initializeMessagePriorities(): void {
    const priorities: Array<[string, MessagePriority]> = [
      ['rollback-correction', { type: 'rollback-correction', priority: 'critical', maxDelay: 16, dropThreshold: 0 }],
      ['input-acknowledgment', { type: 'input-acknowledgment', priority: 'high', maxDelay: 50, dropThreshold: 10 }],
      ['delta-game-state', { type: 'delta-game-state', priority: 'high', maxDelay: 33, dropThreshold: 20 }],
      ['predictive-input', { type: 'predictive-input', priority: 'medium', maxDelay: 100, dropThreshold: 30 }],
      ['performance-broadcast', { type: 'performance-broadcast', priority: 'low', maxDelay: 1000, dropThreshold: 50 }],
      ['queue-update', { type: 'queue-update', priority: 'low', maxDelay: 500, dropThreshold: 40 }],
      ['score-update', { type: 'score-update', priority: 'low', maxDelay: 2000, dropThreshold: 60 }]
    ];

    priorities.forEach(([type, priority]) => {
      this.messagePriorities.set(type, priority);
    });
  }

  /**
   * Calculate optimal tick rate based on current network conditions
   */
  calculateOptimalTickRate(playerCount: number, networkMetrics: NetworkMetrics): number {
    let optimalRate = this.baseTickRate;

    // Adjust based on player count
    if (playerCount > 16) {
      optimalRate *= 0.8; // Reduce by 20% for high player count
    } else if (playerCount < 4) {
      optimalRate *= 1.1; // Increase by 10% for low player count
    }

    // Adjust based on connection quality
    if (networkMetrics.connectionQuality === 'poor' || networkMetrics.connectionQuality === 'critical') {
      optimalRate *= 0.6; // Significant reduction for poor connections
    } else if (networkMetrics.connectionQuality === 'fair') {
      optimalRate *= 0.8; // Moderate reduction
    } else if (networkMetrics.connectionQuality === 'excellent') {
      optimalRate *= 1.2; // Increase for excellent connections
    }

    // Adjust based on bandwidth usage
    if (networkMetrics.bandwidth > this.currentSettings.maxBandwidth * 0.8) {
      optimalRate *= 0.7; // Reduce rate to save bandwidth
    }

    // Adjust based on latency
    if (networkMetrics.latency > this.currentSettings.latencyThreshold) {
      optimalRate *= 0.8; // Reduce rate for high latency
    }

    // Apply constraints
    optimalRate = Math.max(this.minTickRate, Math.min(this.maxTickRate, optimalRate));

    // Smooth transitions - don't change too rapidly
    const maxChange = this.currentTickRate * 0.2; // Max 20% change per adjustment
    if (optimalRate > this.currentTickRate + maxChange) {
      optimalRate = this.currentTickRate + maxChange;
    } else if (optimalRate < this.currentTickRate - maxChange) {
      optimalRate = this.currentTickRate - maxChange;
    }

    this.currentTickRate = Math.round(optimalRate);
    return this.currentTickRate;
  }

  /**
   * Monitor connection quality for a player
   */
  updateConnectionQuality(playerId: string, latency: number, jitter: number, packetLoss: number, bandwidth: number): void {
    // Calculate connection quality score (0-100)
    let score = 100;

    // Penalize high latency
    if (latency > 50) score -= Math.min(40, (latency - 50) / 5);

    // Penalize jitter
    if (jitter > 10) score -= Math.min(20, (jitter - 10) / 2);

    // Penalize packet loss
    score -= packetLoss * 10; // 1% loss = 10 point penalty

    // Penalize low bandwidth
    if (bandwidth < 50000) score -= Math.min(20, (50000 - bandwidth) / 2500);

    score = Math.max(0, Math.min(100, score));

    this.connectionQualities.set(playerId, {
      playerId,
      latency,
      jitter,
      packetLoss,
      bandwidth,
      score,
      lastUpdated: Date.now()
    });
  }

  /**
   * Get connection quality category based on score
   */
  private getQualityCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'critical';
  }

  /**
   * Optimize bandwidth usage by adjusting message frequency and compression
   */
  optimizeBandwidth(currentUsage: number): {
    compressionLevel: number;
    messageFrequencyMultiplier: number;
    recommendedActions: string[];
  } {
    const targetUsage = this.currentSettings.maxBandwidth * 0.8; // Target 80% of max
    const usageRatio = currentUsage / targetUsage;

    let compressionLevel = 1.0;
    let messageFrequencyMultiplier = 1.0;
    const recommendedActions: string[] = [];

    if (usageRatio > 1.2) {
      // Critical bandwidth usage
      compressionLevel = 0.6; // Aggressive compression
      messageFrequencyMultiplier = 0.7; // Reduce message frequency
      recommendedActions.push('Enable aggressive compression');
      recommendedActions.push('Reduce non-critical message frequency');
      recommendedActions.push('Consider dropping low-priority messages');
    } else if (usageRatio > 1.0) {
      // High bandwidth usage
      compressionLevel = 0.8; // Moderate compression
      messageFrequencyMultiplier = 0.85; // Slightly reduce frequency
      recommendedActions.push('Enable moderate compression');
      recommendedActions.push('Prioritize critical messages');
    } else if (usageRatio < 0.6) {
      // Low bandwidth usage - can increase quality
      compressionLevel = 1.2; // Higher quality
      messageFrequencyMultiplier = 1.1; // Slight increase in frequency
      recommendedActions.push('Increase message quality');
      recommendedActions.push('Enable additional features');
    }

    return {
      compressionLevel,
      messageFrequencyMultiplier,
      recommendedActions
    };
  }

  /**
   * Prioritize messages based on connection quality and message importance
   */
  prioritizeMessages(messages: Array<{ type: string, data: any, timestamp: number }>, playerId: string): Array<{ type: string, data: any, timestamp: number, priority: number, shouldDrop: boolean }> {
    if (!this.currentSettings.prioritizationEnabled) {
      return messages.map(msg => ({ ...msg, priority: 50, shouldDrop: false }));
    }

    const connectionQuality = this.connectionQualities.get(playerId);
    const qualityScore = connectionQuality?.score || 50;

    return messages.map(msg => {
      const messagePriority = this.messagePriorities.get(msg.type);

      if (!messagePriority) {
        return { ...msg, priority: 50, shouldDrop: false };
      }

      // Calculate priority score (0-100, higher is more important)
      let priorityScore = 50;

      switch (messagePriority.priority) {
        case 'critical': priorityScore = 95; break;
        case 'high': priorityScore = 80; break;
        case 'medium': priorityScore = 60; break;
        case 'low': priorityScore = 30; break;
      }

      // Adjust based on message age
      const age = Date.now() - msg.timestamp;
      if (age > messagePriority.maxDelay) {
        priorityScore *= 0.5; // Reduce priority for old messages
      }

      // Determine if message should be dropped
      const shouldDrop = qualityScore < messagePriority.dropThreshold;

      return {
        ...msg,
        priority: priorityScore,
        shouldDrop
      };
    }).sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
  }

  /**
   * Get current network metrics
   */
  getCurrentNetworkMetrics(): NetworkMetrics {
    const recentBandwidth = this.bandwidthBuffer.length > 0
      ? this.bandwidthBuffer.reduce((sum, b) => sum + b, 0) / this.bandwidthBuffer.length
      : 0;

    // Calculate average connection quality
    const qualities = Array.from(this.connectionQualities.values());
    const avgQualityScore = qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q.score, 0) / qualities.length
      : 50;

    const avgLatency = qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q.latency, 0) / qualities.length
      : 0;

    const avgPacketLoss = qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q.packetLoss, 0) / qualities.length
      : 0;

    return {
      tickRate: this.currentTickRate,
      bandwidth: recentBandwidth,
      latency: avgLatency,
      packetLoss: avgPacketLoss,
      connectionQuality: this.getQualityCategory(avgQualityScore),
      messagesPerSecond: 0, // Would need to track this
      averageMessageSize: 0, // Would need to track this
      compressionRatio: this.deltaCompression.getCompressionStats().averageCompressionRatio,
      timestamp: Date.now()
    };
  }

  /**
   * Record bandwidth usage
   */
  recordBandwidthUsage(bytes: number): void {
    this.bandwidthBuffer.push(bytes);

    // Keep only recent samples (last 10 seconds assuming 1 sample per second)
    if (this.bandwidthBuffer.length > 10) {
      this.bandwidthBuffer = this.bandwidthBuffer.slice(-10);
    }
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): {
    tickRateRecommendation: number;
    bandwidthOptimization: any;
    connectionIssues: string[];
    performanceImpact: 'low' | 'medium' | 'high';
  } {
    const metrics = this.getCurrentNetworkMetrics();
    const connectionIssues: string[] = [];

    // Check for connection issues
    if (metrics.latency > this.currentSettings.latencyThreshold) {
      connectionIssues.push(`High latency: ${metrics.latency}ms`);
    }

    if (metrics.packetLoss > this.currentSettings.packetLossThreshold) {
      connectionIssues.push(`Packet loss: ${metrics.packetLoss.toFixed(1)}%`);
    }

    if (metrics.connectionQuality === 'poor' || metrics.connectionQuality === 'critical') {
      connectionIssues.push(`Poor connection quality: ${metrics.connectionQuality}`);
    }

    // Calculate performance impact
    let performanceImpact: 'low' | 'medium' | 'high' = 'low';
    if (connectionIssues.length > 2 || metrics.connectionQuality === 'critical') {
      performanceImpact = 'high';
    } else if (connectionIssues.length > 0 || metrics.connectionQuality === 'poor') {
      performanceImpact = 'medium';
    }

    return {
      tickRateRecommendation: this.calculateOptimalTickRate(8, metrics), // Assume 8 players
      bandwidthOptimization: this.optimizeBandwidth(metrics.bandwidth),
      connectionIssues,
      performanceImpact
    };
  }

  /**
   * Update network optimization settings
   */
  updateSettings(newSettings: Partial<AdaptiveSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings(): AdaptiveSettings {
    return { ...this.currentSettings };
  }

  /**
   * Reset network history and connection data
   */
  reset(): void {
    this.networkHistory = [];
    this.connectionQualities.clear();
    this.bandwidthBuffer = [];
    this.currentTickRate = this.baseTickRate;
  }

  /**
   * Get connection qualities for all players
   */
  getConnectionQualities(): ConnectionQuality[] {
    return Array.from(this.connectionQualities.values())
      .filter(quality => Date.now() - quality.lastUpdated < 30000); // Only recent data
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics(): {
    averageTickRate: number;
    averageBandwidth: number;
    averageLatency: number;
    totalConnections: number;
    qualityDistribution: Record<string, number>;
  } {
    const qualities = this.getConnectionQualities();

    const qualityDistribution: Record<string, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0
    };

    let totalLatency = 0;
    qualities.forEach(quality => {
      qualityDistribution[this.getQualityCategory(quality.score)]++;
      totalLatency += quality.latency;
    });

    const averageBandwidth = this.bandwidthBuffer.length > 0
      ? this.bandwidthBuffer.reduce((sum, b) => sum + b, 0) / this.bandwidthBuffer.length
      : 0;

    return {
      averageTickRate: this.currentTickRate,
      averageBandwidth,
      averageLatency: qualities.length > 0 ? totalLatency / qualities.length : 0,
      totalConnections: qualities.length,
      qualityDistribution
    };
  }
}

/**
 * Global network optimizer instance
 */
let globalNetworkOptimizer: NetworkOptimizer | null = null;

export class NetworkOptimizerManager {
  /**
   * Get or create global network optimizer instance
   */
  static getInstance(settings?: Partial<AdaptiveSettings>): NetworkOptimizer {
    if (!globalNetworkOptimizer) {
      globalNetworkOptimizer = new NetworkOptimizer(settings);
    }
    return globalNetworkOptimizer;
  }

  /**
   * Reset global instance (for testing)
   */
  static reset(): void {
    globalNetworkOptimizer = null;
  }
}