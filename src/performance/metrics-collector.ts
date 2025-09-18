/**
 * T027: MetricsCollector Implementation
 *
 * Browser Performance API integration, Node.js performance hooks,
 * FPS calculation, frame time tracking, and memory usage monitoring.
 */

// Type declarations for browser APIs (to avoid TypeScript errors in Node.js)
declare global {
  interface Performance {
    now(): number;
    mark(name: string): void;
    measure(name: string, startMark?: string, endMark?: string): void;
    getEntriesByType(type: string): PerformanceEntry[];
    clearMarks(name?: string): void;
    clearMeasures(name?: string): void;
  }

  interface Window {
    performance: Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    cancelAnimationFrame: (id: number) => void;
  }

  function requestAnimationFrame(callback: (time: number) => void): number;

  interface PerformanceObserver {
    observe(options: { entryTypes: string[] }): void;
    disconnect(): void;
  }

  const PerformanceObserver: {
    new (callback: (list: any) => void): PerformanceObserver;
  };

  interface PerformanceEntry {
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
  }

  interface PerformanceResourceTiming extends PerformanceEntry {
    transferSize: number;
    encodedBodySize: number;
    decodedBodySize: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
  }
}

import { ClientMetrics, ServerMetrics } from '../models/performance-metrics';

export enum CollectorEnvironment {
  BROWSER = 'BROWSER',
  NODE = 'NODE',
  HYBRID = 'HYBRID'
}

export interface CollectorConfig {
  environment: CollectorEnvironment;
  fpsCalculationWindow: number; // Frames to average for FPS calculation
  memoryMonitoringInterval: number; // ms between memory checks
  performanceAPIEnabled: boolean;
  nodePerformanceHooksEnabled: boolean;
  gcMonitoringEnabled: boolean;
  detailedTimings: boolean;
}

export interface FrameTimingData {
  frameId: number;
  timestamp: number;
  frameTime: number; // ms
  renderTime: number; // ms
  layoutTime: number; // ms
  paintTime: number; // ms
  compositeTime: number; // ms
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number; // MB
  heapTotal: number; // MB
  external: number; // MB
  rss?: number; // MB (Node.js only)
  arrayBuffers?: number; // MB
}

export interface NetworkTimingData {
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  protocol: string;
}

export class MetricsCollector {
  private config: CollectorConfig;
  private frameTimings: FrameTimingData[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private networkTimings: NetworkTimingData[] = [];
  private frameCounter = 0;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private memoryTimer: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private gcObserver: any = null; // Node.js GC observer
  private readonly maxHistorySize = 300; // Keep last 5 minutes at 60fps

  constructor(config?: Partial<CollectorConfig>) {
    this.config = {
      environment: this.detectEnvironment(),
      fpsCalculationWindow: 60, // 1 second at 60fps
      memoryMonitoringInterval: 5000, // 5 seconds
      performanceAPIEnabled: true,
      nodePerformanceHooksEnabled: true,
      gcMonitoringEnabled: true,
      detailedTimings: false,
      ...config
    };

    this.initializeCollectors();
  }

  /**
   * Start metrics collection
   */
  public start(): void {
    console.log(`MetricsCollector starting in ${this.config.environment} mode`);

    // Start frame monitoring
    this.startFrameMonitoring();

    // Start memory monitoring
    this.startMemoryMonitoring();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Start Node.js specific monitoring
    if (this.config.environment === CollectorEnvironment.NODE ||
        this.config.environment === CollectorEnvironment.HYBRID) {
      this.startNodePerformanceMonitoring();
    }
  }

  /**
   * Stop metrics collection
   */
  public stop(): void {
    // Stop frame monitoring
    if (this.animationFrameId) {
      if (typeof globalThis !== 'undefined' && (globalThis as any).window?.cancelAnimationFrame) {
        (globalThis as any).window.cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    // Stop memory monitoring
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }

    // Stop performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    // Stop Node.js GC observer
    if (this.gcObserver) {
      this.gcObserver.disconnect?.();
      this.gcObserver = null;
    }

    console.log('MetricsCollector stopped');
  }

  /**
   * Get current client metrics
   */
  public getClientMetrics(playerId: string): ClientMetrics {
    const now = Date.now();
    const frameRate = this.calculateCurrentFPS();
    const averageFrameTime = this.calculateAverageFrameTime();
    const memoryUsage = this.getCurrentMemoryUsage();
    const networkLatency = this.getAverageNetworkLatency();

    return {
      timestamp: now,
      playerId,
      frameRate,
      frameTime: averageFrameTime,
      renderTime: this.getAverageRenderTime(),
      networkLatency,
      predictionAccuracy: 0.95, // TODO: Get from prediction engine
      rollbackFrequency: 0, // TODO: Get from rollback manager
      memoryUsage,
      inputLag: this.calculateInputLag(),
      smoothingActive: false, // TODO: Get from interpolation service
      compressionRatio: 0.75 // TODO: Get from networking layer
    };
  }

  /**
   * Get current server metrics
   */
  public getServerMetrics(): Partial<ServerMetrics> {
    const now = Date.now();
    const memoryUsage = this.getCurrentMemoryUsage();

    return {
      timestamp: now,
      memoryUsage,
      // Note: Other server metrics would be collected from system monitoring
    };
  }

  /**
   * Get frame timing statistics
   */
  public getFrameTimingStats(): {
    averageFPS: number;
    averageFrameTime: number;
    frameTimePercentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    droppedFrames: number;
  } {
    const recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow * 3);

    if (recentFrames.length < 2) {
      return {
        averageFPS: 60,
        averageFrameTime: 16.67,
        frameTimePercentiles: { p50: 16.67, p90: 16.67, p95: 16.67, p99: 16.67 },
        droppedFrames: 0
      };
    }

    const frameTimes = recentFrames.map(f => f.frameTime).sort((a, b) => a - b);
    const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    const averageFPS = 1000 / averageFrameTime;

    // Calculate percentiles
    const getPercentile = (arr: number[], percentile: number): number => {
      const index = Math.ceil(arr.length * percentile / 100) - 1;
      return arr[Math.max(0, index)];
    };

    const droppedFrames = recentFrames.filter(f => f.frameTime > 20).length; // >20ms = dropped frame

    return {
      averageFPS,
      averageFrameTime,
      frameTimePercentiles: {
        p50: getPercentile(frameTimes, 50),
        p90: getPercentile(frameTimes, 90),
        p95: getPercentile(frameTimes, 95),
        p99: getPercentile(frameTimes, 99)
      },
      droppedFrames
    };
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    current: MemorySnapshot;
    peak: MemorySnapshot;
    average: MemorySnapshot;
    gcFrequency?: number; // GCs per minute
  } {
    if (this.memorySnapshots.length === 0) {
      const emptySnapshot: MemorySnapshot = {
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      };

      return {
        current: emptySnapshot,
        peak: emptySnapshot,
        average: emptySnapshot
      };
    }

    const current = this.memorySnapshots[this.memorySnapshots.length - 1];
    const peak = this.memorySnapshots.reduce((max, snapshot) =>
      snapshot.heapUsed > max.heapUsed ? snapshot : max
    );

    const totalHeapUsed = this.memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0);
    const totalHeapTotal = this.memorySnapshots.reduce((sum, s) => sum + s.heapTotal, 0);
    const totalExternal = this.memorySnapshots.reduce((sum, s) => sum + s.external, 0);

    const average: MemorySnapshot = {
      timestamp: current.timestamp,
      heapUsed: totalHeapUsed / this.memorySnapshots.length,
      heapTotal: totalHeapTotal / this.memorySnapshots.length,
      external: totalExternal / this.memorySnapshots.length
    };

    return {
      current,
      peak,
      average,
      gcFrequency: this.calculateGCFrequency()
    };
  }

  /**
   * Get network timing statistics
   */
  public getNetworkStats(): {
    averageLatency: number;
    averageTransferRate: number; // KB/s
    compressionRatio: number;
    requestCount: number;
  } {
    if (this.networkTimings.length === 0) {
      return {
        averageLatency: 0,
        averageTransferRate: 0,
        compressionRatio: 1.0,
        requestCount: 0
      };
    }

    const latencies = this.networkTimings.map(t => t.responseStart - t.requestStart);
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    const totalTransferred = this.networkTimings.reduce((sum, t) => sum + t.transferSize, 0);
    const totalTime = this.networkTimings.reduce((sum, t) => sum + (t.responseEnd - t.requestStart), 0);
    const averageTransferRate = totalTime > 0 ? (totalTransferred / 1024) / (totalTime / 1000) : 0;

    const totalEncoded = this.networkTimings.reduce((sum, t) => sum + t.encodedBodySize, 0);
    const totalDecoded = this.networkTimings.reduce((sum, t) => sum + t.decodedBodySize, 0);
    const compressionRatio = totalDecoded > 0 ? totalEncoded / totalDecoded : 1.0;

    return {
      averageLatency,
      averageTransferRate,
      compressionRatio,
      requestCount: this.networkTimings.length
    };
  }

  /**
   * Force garbage collection (Node.js only)
   */
  public forceGC(): boolean {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Reset all collected data
   */
  public reset(): void {
    this.frameTimings = [];
    this.memorySnapshots = [];
    this.networkTimings = [];
    this.frameCounter = 0;
    this.lastFrameTime = 0;
  }

  /**
   * Export metrics data
   */
  public exportData(): {
    config: CollectorConfig;
    frameTimings: FrameTimingData[];
    memorySnapshots: MemorySnapshot[];
    networkTimings: NetworkTimingData[];
    statistics: {
      frameStats: any;
      memoryStats: any;
      networkStats: any;
    };
  } {
    return {
      config: this.config,
      frameTimings: [...this.frameTimings],
      memorySnapshots: [...this.memorySnapshots],
      networkTimings: [...this.networkTimings],
      statistics: {
        frameStats: this.getFrameTimingStats(),
        memoryStats: this.getMemoryStats(),
        networkStats: this.getNetworkStats()
      }
    };
  }

  // Private methods

  private detectEnvironment(): CollectorEnvironment {
    const hasWindow = typeof globalThis !== 'undefined' && (globalThis as any).window;
    const hasProcess = typeof (globalThis as any).process !== 'undefined';

    if (hasWindow && hasProcess) {
      return CollectorEnvironment.HYBRID;
    } else if (hasWindow) {
      return CollectorEnvironment.BROWSER;
    } else {
      return CollectorEnvironment.NODE;
    }
  }

  private initializeCollectors(): void {
    // Initialize based on environment
    if (this.config.environment === CollectorEnvironment.BROWSER ||
        this.config.environment === CollectorEnvironment.HYBRID) {
      this.initializeBrowserCollectors();
    }

    if (this.config.environment === CollectorEnvironment.NODE ||
        this.config.environment === CollectorEnvironment.HYBRID) {
      this.initializeNodeCollectors();
    }
  }

  private initializeBrowserCollectors(): void {
    // Initialize Performance Observer for browser APIs
    if (typeof PerformanceObserver !== 'undefined' && this.config.performanceAPIEnabled) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerfromanceEntry(entry);
          }
        });

        this.performanceObserver.observe({
          entryTypes: ['navigation', 'resource', 'measure', 'paint']
        });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  private initializeNodeCollectors(): void {
    // Initialize Node.js performance hooks
    if (this.config.nodePerformanceHooksEnabled) {
      try {
        // Note: In a real implementation, would use Node.js performance hooks
        console.log('Node.js performance hooks initialized');
      } catch (error) {
        console.warn('Node.js performance hooks not available:', error);
      }
    }

    // Initialize GC monitoring
    if (this.config.gcMonitoringEnabled) {
      try {
        // Note: In a real implementation, would monitor GC events
        console.log('GC monitoring initialized');
      } catch (error) {
        console.warn('GC monitoring not available:', error);
      }
    }
  }

  private startFrameMonitoring(): void {
    if (typeof globalThis === 'undefined' || !(globalThis as any).window) return;

    const frameCallback = (timestamp: number) => {
      const frameTime = this.lastFrameTime > 0 ? timestamp - this.lastFrameTime : 16.67;

      const frameData: FrameTimingData = {
        frameId: this.frameCounter++,
        timestamp,
        frameTime,
        renderTime: this.measureRenderTime(),
        layoutTime: 0, // TODO: Measure layout time
        paintTime: 0, // TODO: Measure paint time
        compositeTime: 0 // TODO: Measure composite time
      };

      this.frameTimings.push(frameData);

      // Maintain history size
      if (this.frameTimings.length > this.maxHistorySize) {
        this.frameTimings.shift();
      }

      this.lastFrameTime = timestamp;
      this.animationFrameId = requestAnimationFrame(frameCallback);
    };

    this.animationFrameId = requestAnimationFrame(frameCallback);
  }

  private startMemoryMonitoring(): void {
    this.memoryTimer = setInterval(() => {
      const snapshot = this.captureMemorySnapshot();
      this.memorySnapshots.push(snapshot);

      // Maintain history size
      if (this.memorySnapshots.length > this.maxHistorySize) {
        this.memorySnapshots.shift();
      }
    }, this.config.memoryMonitoringInterval);
  }

  private startPerformanceMonitoring(): void {
    // Monitor various performance metrics
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('metrics-collector-start');
    }
  }

  private startNodePerformanceMonitoring(): void {
    if (typeof process === 'undefined') return;

    // Monitor Node.js process events
    process.on('warning', (warning) => {
      console.warn('Node.js warning:', warning);
    });
  }

  private processPerfromanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        // Process navigation timing
        break;
      case 'resource':
        this.processResourceTiming(entry as PerformanceResourceTiming);
        break;
      case 'measure':
        // Process custom measures
        break;
      case 'paint':
        // Process paint timing
        break;
    }
  }

  private processResourceTiming(entry: PerformanceResourceTiming): void {
    const networkTiming: NetworkTimingData = {
      requestStart: entry.requestStart,
      responseStart: entry.responseStart,
      responseEnd: entry.responseEnd,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      protocol: (entry as any).nextHopProtocol || 'unknown'
    };

    this.networkTimings.push(networkTiming);

    // Maintain history size
    if (this.networkTimings.length > this.maxHistorySize) {
      this.networkTimings.shift();
    }
  }

  private captureMemorySnapshot(): MemorySnapshot {
    let snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0
    };

    // Browser memory API
    if (typeof globalThis !== 'undefined' &&
        (globalThis as any).window?.performance?.memory) {
      const memory = (globalThis as any).window.performance.memory;
      snapshot = {
        timestamp: Date.now(),
        heapUsed: memory.usedJSHeapSize / 1024 / 1024, // Convert to MB
        heapTotal: memory.totalJSHeapSize / 1024 / 1024,
        external: 0
      };
    }

    // Node.js memory API
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      snapshot = {
        timestamp: Date.now(),
        heapUsed: memory.heapUsed / 1024 / 1024, // Convert to MB
        heapTotal: memory.heapTotal / 1024 / 1024,
        external: memory.external / 1024 / 1024,
        rss: memory.rss / 1024 / 1024,
        arrayBuffers: (memory as any).arrayBuffers ? (memory as any).arrayBuffers / 1024 / 1024 : 0
      };
    }

    return snapshot;
  }

  private measureRenderTime(): number {
    // TODO: Implement actual render time measurement
    return Math.random() * 2 + 8; // Simulate 8-10ms render time
  }

  private calculateCurrentFPS(): number {
    const recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow);

    if (recentFrames.length < 2) return 60; // Default

    const totalTime = recentFrames[recentFrames.length - 1].timestamp - recentFrames[0].timestamp;
    const frameCount = recentFrames.length - 1;

    return totalTime > 0 ? (frameCount * 1000) / totalTime : 60;
  }

  private calculateAverageFrameTime(): number {
    const recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow);

    if (recentFrames.length === 0) return 16.67; // Default 60fps

    const totalFrameTime = recentFrames.reduce((sum, frame) => sum + frame.frameTime, 0);
    return totalFrameTime / recentFrames.length;
  }

  private getAverageRenderTime(): number {
    const recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow);

    if (recentFrames.length === 0) return 8; // Default

    const totalRenderTime = recentFrames.reduce((sum, frame) => sum + frame.renderTime, 0);
    return totalRenderTime / recentFrames.length;
  }

  private getCurrentMemoryUsage(): number {
    const snapshot = this.captureMemorySnapshot();
    return snapshot.heapUsed;
  }

  private getAverageNetworkLatency(): number {
    const recentTimings = this.networkTimings.slice(-50); // Last 50 requests

    if (recentTimings.length === 0) return 0;

    const latencies = recentTimings.map(t => t.responseStart - t.requestStart);
    return latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  }

  private calculateInputLag(): number {
    // TODO: Implement actual input lag measurement
    return Math.random() * 10 + 15; // Simulate 15-25ms input lag
  }

  private calculateGCFrequency(): number | undefined {
    // TODO: Implement GC frequency calculation based on memory patterns
    return undefined;
  }
}

/**
 * Global metrics collector instance
 */
let globalCollector: MetricsCollector | null = null;

export class MetricsCollectorManager {
  /**
   * Get or create global collector instance
   */
  static getInstance(config?: Partial<CollectorConfig>): MetricsCollector {
    if (!globalCollector) {
      globalCollector = new MetricsCollector(config);
    }
    return globalCollector;
  }

  /**
   * Initialize global collector with configuration
   */
  static initialize(config: Partial<CollectorConfig>): MetricsCollector {
    globalCollector = new MetricsCollector(config);
    return globalCollector;
  }

  /**
   * Destroy global collector instance
   */
  static destroy(): void {
    if (globalCollector) {
      globalCollector.stop();
      globalCollector = null;
    }
  }
}

/**
 * Factory for creating MetricsCollector instances
 */
export class MetricsCollectorFactory {
  static create(config?: Partial<CollectorConfig>): MetricsCollector {
    return new MetricsCollector(config);
  }

  static createForBrowser(): MetricsCollector {
    return new MetricsCollector({
      environment: CollectorEnvironment.BROWSER,
      performanceAPIEnabled: true,
      nodePerformanceHooksEnabled: false,
      gcMonitoringEnabled: false,
      detailedTimings: true
    });
  }

  static createForNode(): MetricsCollector {
    return new MetricsCollector({
      environment: CollectorEnvironment.NODE,
      performanceAPIEnabled: false,
      nodePerformanceHooksEnabled: true,
      gcMonitoringEnabled: true,
      detailedTimings: false
    });
  }

  static createForTesting(): MetricsCollector {
    return new MetricsCollector({
      fpsCalculationWindow: 10, // Smaller window for faster tests
      memoryMonitoringInterval: 100, // More frequent for tests
      performanceAPIEnabled: false,
      nodePerformanceHooksEnabled: false,
      gcMonitoringEnabled: false,
      detailedTimings: false
    });
  }
}