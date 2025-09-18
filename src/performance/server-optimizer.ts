/**
 * T040: ServerOptimizer Implementation
 *
 * Server performance optimization with CPU usage monitoring, memory leak detection,
 * connection pool optimization, and garbage collection tuning.
 */

import { PerformanceMonitor } from './performance-monitor';
import { NetworkOptimizer, NetworkOptimizerManager } from '../networking/network-optimizer';

export interface CPUMetrics {
  usage: number; // percentage 0-100
  loadAverage: number[]; // 1, 5, 15 minute averages
  activeHandles: number;
  activeRequests: number;
  timestamp: number;
}

export interface MemoryMetrics {
  heapUsed: number; // bytes
  heapTotal: number; // bytes
  external: number; // bytes
  rss: number; // bytes
  arrayBuffers: number; // bytes
  heapUtilization: number; // percentage
  leakSuspicion: 'none' | 'low' | 'medium' | 'high' | 'critical';
  gcFrequency: number; // GC events per minute
  timestamp: number;
}

export interface ConnectionMetrics {
  activeConnections: number;
  maxConnections: number;
  connectionUtilization: number; // percentage
  averageConnectionAge: number; // ms
  connectionTurnover: number; // connections/minute
  pendingRequests: number;
  rejectedConnections: number;
  timestamp: number;
}

export interface GCMetrics {
  totalGCTime: number; // ms total time spent in GC
  gcFrequency: number; // events per minute
  averageGCDuration: number; // ms average per GC
  majorGCCount: number;
  minorGCCount: number;
  lastGCTimestamp: number;
  memoryFreed: number; // bytes freed in last cycle
  gcEfficiency: number; // percentage
  timestamp: number;
}

export interface OptimizationRecommendation {
  category: 'cpu' | 'memory' | 'connections' | 'gc' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: string;
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface ServerOptimizationConfig {
  monitoringInterval: number; // ms between checks (default: 5000)
  cpuThreshold: number; // percentage (default: 80)
  memoryThreshold: number; // percentage (default: 85)
  connectionThreshold: number; // percentage (default: 90)
  gcThreshold: number; // ms per minute (default: 100)
  autoOptimization: boolean; // enable automatic optimizations
  aggressiveMode: boolean; // enable aggressive optimizations
  enableMemoryLeakDetection: boolean;
  enableConnectionPoolOptimization: boolean;
  enableGCTuning: boolean;
}

export class ServerOptimizer {
  private config: ServerOptimizationConfig;
  private performanceMonitor: PerformanceMonitor;
  private networkOptimizer: NetworkOptimizer;

  // Monitoring data
  private cpuHistory: CPUMetrics[] = [];
  private memoryHistory: MemoryMetrics[] = [];
  private connectionHistory: ConnectionMetrics[] = [];
  private gcHistory: GCMetrics[] = [];

  // Optimization state
  private activeOptimizations: Set<string> = new Set();
  private optimizationResults: Map<string, any> = new Map();
  private lastOptimizationTime: number = 0;

  // Timers
  private monitoringTimer: NodeJS.Timeout | null = null;
  private gcTimer: NodeJS.Timeout | null = null;

  // Memory leak detection
  private memoryBaseline: number = 0;
  private memoryGrowthSamples: number[] = [];
  private suspiciousGrowthCount: number = 0;

  // Connection pool tracking
  private connectionPool: Map<string, any> = new Map();
  private connectionAges: Map<string, number> = new Map();

  // GC tracking
  private gcStats = {
    totalTime: 0,
    eventCount: 0,
    lastEventTime: 0,
    memoryFreedTotal: 0
  };

  constructor(
    performanceMonitor: PerformanceMonitor,
    config?: Partial<ServerOptimizationConfig>
  ) {
    this.performanceMonitor = performanceMonitor;
    this.networkOptimizer = NetworkOptimizerManager.getInstance();

    this.config = {
      monitoringInterval: 5000,
      cpuThreshold: 80,
      memoryThreshold: 85,
      connectionThreshold: 90,
      gcThreshold: 100,
      autoOptimization: true,
      aggressiveMode: false,
      enableMemoryLeakDetection: true,
      enableConnectionPoolOptimization: true,
      enableGCTuning: true,
      ...config
    };

    this.initializeBaselines();
    this.setupGCTracking();
  }

  /**
   * Start server optimization monitoring
   */
  public start(): void {
    if (this.monitoringTimer) {
      console.warn('ServerOptimizer already started');
      return;
    }

    this.monitoringTimer = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();

      if (this.config.autoOptimization) {
        this.applyAutomaticOptimizations();
      }
    }, this.config.monitoringInterval);

    console.log('🚀 ServerOptimizer started with auto-optimization:', this.config.autoOptimization);
  }

  /**
   * Stop server optimization monitoring
   */
  public stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    console.log('🛑 ServerOptimizer stopped');
  }

  /**
   * Collect all server performance metrics
   */
  private collectMetrics(): void {
    const now = Date.now();

    // Collect CPU metrics
    const cpuMetrics = this.collectCPUMetrics(now);
    this.cpuHistory.push(cpuMetrics);

    // Collect memory metrics
    const memoryMetrics = this.collectMemoryMetrics(now);
    this.memoryHistory.push(memoryMetrics);

    // Collect connection metrics
    const connectionMetrics = this.collectConnectionMetrics(now);
    this.connectionHistory.push(connectionMetrics);

    // Collect GC metrics
    const gcMetrics = this.collectGCMetrics(now);
    this.gcHistory.push(gcMetrics);

    // Maintain history size (keep last 100 samples)
    this.maintainHistorySize();

    // Update performance monitor with server metrics
    this.updatePerformanceMonitor(cpuMetrics, memoryMetrics, connectionMetrics);
  }

  /**
   * Collect CPU usage and load metrics
   */
  private collectCPUMetrics(timestamp: number): CPUMetrics {
    const loadAverage = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];

    // Calculate CPU usage (simplified - in production would use process.cpuUsage())
    const usage = this.calculateCPUUsage();

    return {
      usage,
      loadAverage,
      activeHandles: (process as any)._getActiveHandles().length,
      activeRequests: (process as any)._getActiveRequests().length,
      timestamp
    };
  }

  /**
   * Collect memory usage and leak detection metrics
   */
  private collectMemoryMetrics(timestamp: number): MemoryMetrics {
    const memoryUsage = process.memoryUsage();
    const heapUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Detect memory leaks
    const leakSuspicion = this.detectMemoryLeak(memoryUsage.heapUsed);

    // Calculate GC frequency
    const gcFrequency = this.calculateGCFrequency();

    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      arrayBuffers: memoryUsage.arrayBuffers || 0,
      heapUtilization,
      leakSuspicion,
      gcFrequency,
      timestamp
    };
  }

  /**
   * Collect connection pool metrics
   */
  private collectConnectionMetrics(timestamp: number): ConnectionMetrics {
    const activeConnections = this.connectionPool.size;
    const maxConnections = 1000; // Configurable limit
    const connectionUtilization = (activeConnections / maxConnections) * 100;

    // Calculate average connection age
    const now = Date.now();
    const ages = Array.from(this.connectionAges.values());
    const averageConnectionAge = ages.length > 0
      ? ages.reduce((sum, age) => sum + (now - age), 0) / ages.length
      : 0;

    // Calculate connection turnover (simplified)
    const connectionTurnover = this.calculateConnectionTurnover();

    return {
      activeConnections,
      maxConnections,
      connectionUtilization,
      averageConnectionAge,
      connectionTurnover,
      pendingRequests: 0, // Would track from request queue
      rejectedConnections: 0, // Would track rejected connections
      timestamp
    };
  }

  /**
   * Collect garbage collection metrics
   */
  private collectGCMetrics(timestamp: number): GCMetrics {
    const averageGCDuration = this.gcStats.eventCount > 0
      ? this.gcStats.totalTime / this.gcStats.eventCount
      : 0;

    const gcEfficiency = this.calculateGCEfficiency();

    return {
      totalGCTime: this.gcStats.totalTime,
      gcFrequency: this.calculateGCFrequency(),
      averageGCDuration,
      majorGCCount: Math.floor(this.gcStats.eventCount * 0.1), // Estimate
      minorGCCount: Math.floor(this.gcStats.eventCount * 0.9), // Estimate
      lastGCTimestamp: this.gcStats.lastEventTime,
      memoryFreed: this.gcStats.memoryFreedTotal,
      gcEfficiency,
      timestamp
    };
  }

  /**
   * Analyze current performance and generate recommendations
   */
  private analyzePerformance(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze CPU performance
    recommendations.push(...this.analyzeCPUPerformance());

    // Analyze memory performance
    recommendations.push(...this.analyzeMemoryPerformance());

    // Analyze connection performance
    recommendations.push(...this.analyzeConnectionPerformance());

    // Analyze GC performance
    recommendations.push(...this.analyzeGCPerformance());

    return recommendations;
  }

  /**
   * Apply automatic optimizations based on current metrics
   */
  private applyAutomaticOptimizations(): void {
    const recommendations = this.analyzePerformance();
    const now = Date.now();

    // Don't optimize too frequently
    if (now - this.lastOptimizationTime < 30000) { // 30 seconds cooldown
      return;
    }

    const criticalRecommendations = recommendations.filter(r => r.severity === 'critical');
    const highRecommendations = recommendations.filter(r => r.severity === 'high');

    // Apply critical optimizations immediately
    for (const rec of criticalRecommendations) {
      this.applyOptimization(rec);
    }

    // Apply high priority optimizations if not in aggressive mode
    if (this.config.aggressiveMode) {
      for (const rec of highRecommendations) {
        this.applyOptimization(rec);
      }
    }

    this.lastOptimizationTime = now;
  }

  /**
   * Apply a specific optimization
   */
  private applyOptimization(recommendation: OptimizationRecommendation): void {
    const optimizationKey = `${recommendation.category}_${recommendation.title}`;

    if (this.activeOptimizations.has(optimizationKey)) {
      return; // Already applied
    }

    console.log(`🔧 Applying optimization: ${recommendation.title}`);

    switch (recommendation.category) {
      case 'memory':
        this.applyMemoryOptimization(recommendation);
        break;
      case 'cpu':
        this.applyCPUOptimization(recommendation);
        break;
      case 'connections':
        this.applyConnectionOptimization(recommendation);
        break;
      case 'gc':
        this.applyGCOptimization(recommendation);
        break;
    }

    this.activeOptimizations.add(optimizationKey);
    this.optimizationResults.set(optimizationKey, {
      appliedAt: Date.now(),
      recommendation
    });
  }

  /**
   * Force garbage collection (use sparingly)
   */
  public forceGarbageCollection(): void {
    if (global.gc) {
      const beforeMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      global.gc();

      const afterMemory = process.memoryUsage().heapUsed;
      const duration = Date.now() - startTime;
      const memoryFreed = beforeMemory - afterMemory;

      this.gcStats.totalTime += duration;
      this.gcStats.eventCount++;
      this.gcStats.lastEventTime = Date.now();
      this.gcStats.memoryFreedTotal += memoryFreed;

      console.log(`🗑️ Forced GC: ${memoryFreed / 1024 / 1024}MB freed in ${duration}ms`);
    } else {
      console.warn('⚠️ Garbage collection not exposed. Start Node.js with --expose-gc flag.');
    }
  }

  /**
   * Optimize connection pool
   */
  public optimizeConnectionPool(): void {
    if (!this.config.enableConnectionPoolOptimization) return;

    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes
    let closedConnections = 0;

    // Close stale connections
    for (const [connectionId, connectionTime] of this.connectionAges.entries()) {
      if (now - connectionTime > staleThreshold) {
        this.connectionPool.delete(connectionId);
        this.connectionAges.delete(connectionId);
        closedConnections++;
      }
    }

    if (closedConnections > 0) {
      console.log(`🔌 Connection pool optimized: ${closedConnections} stale connections closed`);
    }
  }

  /**
   * Get current server optimization status
   */
  public getOptimizationStatus(): {
    isRunning: boolean;
    config: ServerOptimizationConfig;
    activeOptimizations: string[];
    currentMetrics: {
      cpu: CPUMetrics | null;
      memory: MemoryMetrics | null;
      connections: ConnectionMetrics | null;
      gc: GCMetrics | null;
    };
    recommendations: OptimizationRecommendation[];
    performanceImprovements: {
      cpuReduction: number;
      memoryReduction: number;
      connectionEfficiency: number;
      gcEfficiency: number;
    };
  } {
    const currentCPU = this.cpuHistory[this.cpuHistory.length - 1] || null;
    const currentMemory = this.memoryHistory[this.memoryHistory.length - 1] || null;
    const currentConnections = this.connectionHistory[this.connectionHistory.length - 1] || null;
    const currentGC = this.gcHistory[this.gcHistory.length - 1] || null;

    return {
      isRunning: this.monitoringTimer !== null,
      config: { ...this.config },
      activeOptimizations: Array.from(this.activeOptimizations),
      currentMetrics: {
        cpu: currentCPU,
        memory: currentMemory,
        connections: currentConnections,
        gc: currentGC
      },
      recommendations: this.analyzePerformance(),
      performanceImprovements: this.calculatePerformanceImprovements()
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ServerOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 ServerOptimizer configuration updated');
  }

  /**
   * Export performance data for analysis
   */
  public exportPerformanceData(): {
    exportedAt: string;
    config: ServerOptimizationConfig;
    metrics: {
      cpu: CPUMetrics[];
      memory: MemoryMetrics[];
      connections: ConnectionMetrics[];
      gc: GCMetrics[];
    };
    optimizations: Array<{
      key: string;
      appliedAt: number;
      recommendation: OptimizationRecommendation;
    }>;
  } {
    const optimizations = Array.from(this.optimizationResults.entries()).map(([key, result]) => ({
      key,
      appliedAt: result.appliedAt,
      recommendation: result.recommendation
    }));

    return {
      exportedAt: new Date().toISOString(),
      config: this.config,
      metrics: {
        cpu: [...this.cpuHistory],
        memory: [...this.memoryHistory],
        connections: [...this.connectionHistory],
        gc: [...this.gcHistory]
      },
      optimizations
    };
  }

  // Private helper methods

  private initializeBaselines(): void {
    const memoryUsage = process.memoryUsage();
    this.memoryBaseline = memoryUsage.heapUsed;
    console.log(`📊 Memory baseline set: ${this.memoryBaseline / 1024 / 1024}MB`);
  }

  private setupGCTracking(): void {
    if (this.config.enableGCTuning && global.gc) {
      // Set up periodic GC monitoring
      this.gcTimer = setInterval(() => {
        this.checkGCPerformance();
      }, 60000); // Check every minute
    }
  }

  private calculateCPUUsage(): number {
    // Simplified CPU usage calculation
    // In production, would use process.cpuUsage() for more accurate measurements
    const loadAverage = process.platform !== 'win32' ? require('os').loadavg()[0] : 0;
    const cpuCount = require('os').cpus().length;
    return Math.min(100, (loadAverage / cpuCount) * 100);
  }

  private detectMemoryLeak(currentHeapUsed: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (!this.config.enableMemoryLeakDetection) return 'none';

    // Calculate growth rate
    const growthRate = (currentHeapUsed - this.memoryBaseline) / this.memoryBaseline;
    this.memoryGrowthSamples.push(growthRate);

    // Keep only recent samples
    if (this.memoryGrowthSamples.length > 10) {
      this.memoryGrowthSamples = this.memoryGrowthSamples.slice(-10);
    }

    // Analyze growth pattern
    if (this.memoryGrowthSamples.length < 5) return 'none';

    const averageGrowth = this.memoryGrowthSamples.reduce((sum, rate) => sum + rate, 0) / this.memoryGrowthSamples.length;
    const isConsistentGrowth = this.memoryGrowthSamples.every(rate => rate > 0.05); // 5% growth

    if (averageGrowth > 0.5 && isConsistentGrowth) { // 50% growth
      this.suspiciousGrowthCount++;
      if (this.suspiciousGrowthCount > 3) return 'critical';
      if (this.suspiciousGrowthCount > 2) return 'high';
      return 'medium';
    } else if (averageGrowth > 0.2 && isConsistentGrowth) { // 20% growth
      return 'low';
    }

    this.suspiciousGrowthCount = 0;
    return 'none';
  }

  private calculateGCFrequency(): number {
    const windowMs = 60000; // 1 minute window
    const now = Date.now();
    const recentEvents = this.gcHistory.filter(gc => now - gc.timestamp < windowMs);
    return recentEvents.length;
  }

  private calculateConnectionTurnover(): number {
    // Simplified connection turnover calculation
    return this.connectionPool.size * 0.1; // Assume 10% turnover per minute
  }

  private calculateGCEfficiency(): number {
    if (this.gcStats.eventCount === 0) return 100;

    const averageMemoryFreed = this.gcStats.memoryFreedTotal / this.gcStats.eventCount;
    const averageHeapSize = this.memoryHistory.length > 0
      ? this.memoryHistory.reduce((sum, m) => sum + m.heapUsed, 0) / this.memoryHistory.length
      : 1;

    return Math.min(100, (averageMemoryFreed / averageHeapSize) * 100 * 10); // Scale factor
  }

  private maintainHistorySize(): void {
    const maxSize = 100;

    if (this.cpuHistory.length > maxSize) {
      this.cpuHistory = this.cpuHistory.slice(-maxSize);
    }
    if (this.memoryHistory.length > maxSize) {
      this.memoryHistory = this.memoryHistory.slice(-maxSize);
    }
    if (this.connectionHistory.length > maxSize) {
      this.connectionHistory = this.connectionHistory.slice(-maxSize);
    }
    if (this.gcHistory.length > maxSize) {
      this.gcHistory = this.gcHistory.slice(-maxSize);
    }
  }

  private updatePerformanceMonitor(cpu: CPUMetrics, memory: MemoryMetrics, connections: ConnectionMetrics): void {
    this.performanceMonitor.updateServerMetrics({
      timestamp: Date.now(),
      serverLoad: cpu.usage,
      memoryUsage: memory.heapUsed / 1024 / 1024, // MB
      playerCount: connections.activeConnections, // Use playerCount instead of activeConnections
      messagesSent: 0 // Would track from queue
    });
  }

  private analyzeCPUPerformance(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const currentCPU = this.cpuHistory[this.cpuHistory.length - 1];

    if (!currentCPU) return recommendations;

    if (currentCPU.usage > this.config.cpuThreshold) {
      recommendations.push({
        category: 'cpu',
        severity: currentCPU.usage > 95 ? 'critical' : 'high',
        title: 'High CPU Usage',
        description: `CPU usage is ${currentCPU.usage.toFixed(1)}%, exceeding threshold of ${this.config.cpuThreshold}%`,
        action: 'Reduce tick rate and optimize game loop',
        impact: 'high',
        estimatedImprovement: '15-25% CPU reduction',
        implementationComplexity: 'medium'
      });
    }

    if (currentCPU.activeHandles > 1000) {
      recommendations.push({
        category: 'cpu',
        severity: 'medium',
        title: 'High Handle Count',
        description: `${currentCPU.activeHandles} active handles may indicate resource leaks`,
        action: 'Review and cleanup unused handles',
        impact: 'medium',
        estimatedImprovement: '5-10% CPU reduction',
        implementationComplexity: 'low'
      });
    }

    return recommendations;
  }

  private analyzeMemoryPerformance(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const currentMemory = this.memoryHistory[this.memoryHistory.length - 1];

    if (!currentMemory) return recommendations;

    if (currentMemory.heapUtilization > this.config.memoryThreshold) {
      recommendations.push({
        category: 'memory',
        severity: currentMemory.heapUtilization > 95 ? 'critical' : 'high',
        title: 'High Memory Usage',
        description: `Heap utilization is ${currentMemory.heapUtilization.toFixed(1)}%`,
        action: 'Force garbage collection and review memory usage',
        impact: 'high',
        estimatedImprovement: '10-20% memory reduction',
        implementationComplexity: 'low'
      });
    }

    if (currentMemory.leakSuspicion !== 'none') {
      recommendations.push({
        category: 'memory',
        severity: currentMemory.leakSuspicion === 'critical' ? 'critical' : 'high',
        title: 'Memory Leak Detected',
        description: `${currentMemory.leakSuspicion} suspicion of memory leak`,
        action: 'Investigate memory usage patterns and potential leaks',
        impact: 'high',
        estimatedImprovement: '20-40% memory reduction',
        implementationComplexity: 'high'
      });
    }

    return recommendations;
  }

  private analyzeConnectionPerformance(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const currentConnections = this.connectionHistory[this.connectionHistory.length - 1];

    if (!currentConnections) return recommendations;

    if (currentConnections.connectionUtilization > this.config.connectionThreshold) {
      recommendations.push({
        category: 'connections',
        severity: 'high',
        title: 'High Connection Utilization',
        description: `Connection pool at ${currentConnections.connectionUtilization.toFixed(1)}% capacity`,
        action: 'Optimize connection pool and increase limits',
        impact: 'medium',
        estimatedImprovement: '5-15% server load reduction',
        implementationComplexity: 'medium'
      });
    }

    if (currentConnections.averageConnectionAge > 600000) { // 10 minutes
      recommendations.push({
        category: 'connections',
        severity: 'medium',
        title: 'Stale Connections',
        description: `Average connection age is ${(currentConnections.averageConnectionAge / 60000).toFixed(1)} minutes`,
        action: 'Implement connection cleanup for idle connections',
        impact: 'low',
        estimatedImprovement: '3-8% resource cleanup',
        implementationComplexity: 'low'
      });
    }

    return recommendations;
  }

  private analyzeGCPerformance(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const currentGC = this.gcHistory[this.gcHistory.length - 1];

    if (!currentGC) return recommendations;

    if (currentGC.averageGCDuration > 50) { // 50ms
      recommendations.push({
        category: 'gc',
        severity: 'high',
        title: 'Long GC Pauses',
        description: `Average GC duration is ${currentGC.averageGCDuration.toFixed(1)}ms`,
        action: 'Tune garbage collection settings',
        impact: 'medium',
        estimatedImprovement: '10-20% latency reduction',
        implementationComplexity: 'medium'
      });
    }

    if (currentGC.gcFrequency > 10) { // 10 events per minute
      recommendations.push({
        category: 'gc',
        severity: 'medium',
        title: 'Frequent GC Events',
        description: `GC running ${currentGC.gcFrequency} times per minute`,
        action: 'Optimize memory allocation patterns',
        impact: 'medium',
        estimatedImprovement: '5-15% CPU reduction',
        implementationComplexity: 'high'
      });
    }

    return recommendations;
  }

  private applyMemoryOptimization(recommendation: OptimizationRecommendation): void {
    if (recommendation.title === 'High Memory Usage') {
      this.forceGarbageCollection();
    } else if (recommendation.title === 'Memory Leak Detected') {
      console.warn('🚨 Memory leak detected - manual investigation required');
      // In production, would trigger detailed memory profiling
    }
  }

  private applyCPUOptimization(recommendation: OptimizationRecommendation): void {
    if (recommendation.title === 'High CPU Usage') {
      // Coordinate with NetworkOptimizer to reduce tick rate
      const currentSettings = this.networkOptimizer.getSettings();
      this.networkOptimizer.updateSettings({
        ...currentSettings,
        targetTickRate: Math.max(20, currentSettings.targetTickRate * 0.8)
      });
      console.log('⚡ Reduced tick rate to optimize CPU usage');
    }
  }

  private applyConnectionOptimization(recommendation: OptimizationRecommendation): void {
    if (recommendation.title === 'High Connection Utilization' || recommendation.title === 'Stale Connections') {
      this.optimizeConnectionPool();
    }
  }

  private applyGCOptimization(recommendation: OptimizationRecommendation): void {
    if (recommendation.title === 'Long GC Pauses' || recommendation.title === 'Frequent GC Events') {
      // Adjust GC settings (would require V8 flags in production)
      console.log('🗑️ GC optimization recommended - consider V8 flags: --max-old-space-size, --gc-interval');
    }
  }

  private checkGCPerformance(): void {
    const currentGC = this.gcHistory[this.gcHistory.length - 1];
    if (currentGC && currentGC.gcFrequency > 15) {
      console.warn('⚠️ High GC frequency detected - consider memory optimization');
    }
  }

  private calculatePerformanceImprovements(): {
    cpuReduction: number;
    memoryReduction: number;
    connectionEfficiency: number;
    gcEfficiency: number;
  } {
    // Calculate improvements based on optimization history
    // This is a simplified calculation - production would track before/after metrics

    const optimizationCount = this.activeOptimizations.size;
    const baseImprovement = Math.min(30, optimizationCount * 3); // 3% per optimization, max 30%

    return {
      cpuReduction: baseImprovement * 0.8, // CPU optimizations
      memoryReduction: baseImprovement * 1.2, // Memory optimizations tend to be more effective
      connectionEfficiency: baseImprovement * 0.6, // Connection optimizations
      gcEfficiency: baseImprovement * 0.7 // GC optimizations
    };
  }
}

/**
 * Global server optimizer instance management
 */
let globalServerOptimizer: ServerOptimizer | null = null;

export class ServerOptimizerManager {
  /**
   * Get or create global server optimizer instance
   */
  static getInstance(
    performanceMonitor: PerformanceMonitor,
    config?: Partial<ServerOptimizationConfig>
  ): ServerOptimizer {
    if (!globalServerOptimizer) {
      globalServerOptimizer = new ServerOptimizer(performanceMonitor, config);
    }
    return globalServerOptimizer;
  }

  /**
   * Initialize global server optimizer
   */
  static initialize(
    performanceMonitor: PerformanceMonitor,
    config?: Partial<ServerOptimizationConfig>
  ): ServerOptimizer {
    globalServerOptimizer = new ServerOptimizer(performanceMonitor, config);
    return globalServerOptimizer;
  }

  /**
   * Destroy global server optimizer instance
   */
  static destroy(): void {
    if (globalServerOptimizer) {
      globalServerOptimizer.stop();
      globalServerOptimizer = null;
    }
  }
}

/**
 * Factory for creating ServerOptimizer instances
 */
export class ServerOptimizerFactory {
  static create(
    performanceMonitor: PerformanceMonitor,
    config?: Partial<ServerOptimizationConfig>
  ): ServerOptimizer {
    return new ServerOptimizer(performanceMonitor, config);
  }

  static createForDevelopment(performanceMonitor: PerformanceMonitor): ServerOptimizer {
    return new ServerOptimizer(performanceMonitor, {
      monitoringInterval: 10000, // Slower monitoring for development
      autoOptimization: false, // Manual optimization in development
      aggressiveMode: false,
      enableMemoryLeakDetection: true,
      enableConnectionPoolOptimization: true,
      enableGCTuning: false // Disable GC tuning in development
    });
  }

  static createForProduction(performanceMonitor: PerformanceMonitor): ServerOptimizer {
    return new ServerOptimizer(performanceMonitor, {
      monitoringInterval: 5000,
      autoOptimization: true,
      aggressiveMode: false, // Conservative in production
      cpuThreshold: 75, // Lower threshold in production
      memoryThreshold: 80, // Lower threshold in production
      enableMemoryLeakDetection: true,
      enableConnectionPoolOptimization: true,
      enableGCTuning: true
    });
  }

  static createForTesting(performanceMonitor: PerformanceMonitor): ServerOptimizer {
    return new ServerOptimizer(performanceMonitor, {
      monitoringInterval: 1000, // Fast monitoring for testing
      autoOptimization: false,
      aggressiveMode: true, // Test aggressive optimizations
      enableMemoryLeakDetection: true,
      enableConnectionPoolOptimization: true,
      enableGCTuning: false
    });
  }
}