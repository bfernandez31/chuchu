// Performance monitoring exports
// TODO: Implement these modules in T026-T027
// export * from './performance-monitor';
// export * from './metrics-collector';

// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  // Monitoring intervals
  METRICS_COLLECTION_INTERVAL_MS: 1000,
  PERFORMANCE_ALERT_INTERVAL_MS: 5000,
  HISTORY_RETENTION_MS: 300000, // 5 minutes

  // Threshold defaults
  DEFAULT_THRESHOLDS: {
    serverCpuUsage: 80,
    serverMemoryMB: 2048,
    averageLatencyMs: 200,
    clientFPS: 45,
    inputLatencyMs: 50,
    bandwidthUsageKbps: 1000,
    packetLossRate: 0.05
  },

  // Alert configuration
  ALERT_HYSTERESIS_FACTOR: 0.9, // Prevent flapping
  MAX_ALERTS_PER_MINUTE: 10
} as const;

// Browser Performance API integration helpers
export const BrowserPerformance = {
  isSupported: typeof performance !== 'undefined' && 'mark' in performance,

  mark: (name: string) => {
    if (BrowserPerformance.isSupported) {
      performance.mark(name);
    }
  },

  measure: (name: string, startMark: string, endMark?: string) => {
    if (BrowserPerformance.isSupported) {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      return entries.length > 0 ? entries[entries.length - 1].duration : 0;
    }
    return 0;
  },

  now: () => performance?.now() || Date.now(),

  getFrameRate: () => {
    // Simplified frame rate calculation for browser environments
    let lastTime = performance?.now() || Date.now();
    let frameCount = 0;

    return new Promise<number>((resolve) => {
      const measureFrames = () => {
        frameCount++;
        const currentTime = performance?.now() || Date.now();

        if (currentTime - lastTime >= 1000) {
          const fps = frameCount * 1000 / (currentTime - lastTime);
          resolve(fps);
        } else if (typeof globalThis !== 'undefined' && 'requestAnimationFrame' in globalThis) {
          (globalThis as any).requestAnimationFrame(measureFrames);
        } else {
          // Fallback for Node.js environment
          setTimeout(measureFrames, 16);
        }
      };

      if (typeof globalThis !== 'undefined' && 'requestAnimationFrame' in globalThis) {
        (globalThis as any).requestAnimationFrame(measureFrames);
      } else {
        // Fallback for Node.js environment
        setTimeout(measureFrames, 16);
      }
    });
  }
};