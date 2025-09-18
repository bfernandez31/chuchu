"use strict";
// Networking optimization exports
// TODO: Implement these modules in T028-T030
// export * from './delta-compression';
// export * from './network-optimizer';
Object.defineProperty(exports, "__esModule", { value: true });
exports.NETWORK_CONFIG = void 0;
// Network optimization configuration
exports.NETWORK_CONFIG = {
    // Adaptive tick rates
    DEFAULT_TICK_RATE_HZ: 50,
    MINIMUM_TICK_RATE_HZ: 20,
    MAXIMUM_TICK_RATE_HZ: 60,
    // Compression settings
    DELTA_COMPRESSION_THRESHOLD: 0.3,
    MAX_DELTA_HISTORY: 10,
    // Batching configuration
    DEFAULT_BATCH_DELAY_MS: 5,
    ADAPTIVE_BATCH_MIN_MS: 1,
    ADAPTIVE_BATCH_MAX_MS: 16,
    // Message prioritization
    PRIORITY_LEVELS: {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3 // Metrics, debugging info
    },
    // Bandwidth optimization
    TARGET_BANDWIDTH_KBPS: 100,
    BANDWIDTH_MEASUREMENT_WINDOW_MS: 5000,
    // Connection quality thresholds
    QUALITY_THRESHOLDS: {
        EXCELLENT: { latency: 50, packetLoss: 0.01 },
        GOOD: { latency: 100, packetLoss: 0.02 },
        FAIR: { latency: 200, packetLoss: 0.05 },
        POOR: { latency: 500, packetLoss: 0.1 }
    }
};
//# sourceMappingURL=index.js.map