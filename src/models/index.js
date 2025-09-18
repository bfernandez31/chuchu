"use strict";
// Model exports for hybrid predictive rendering system
// TODO: Implement these modules in T018-T022
// export * from './authoritative-game-state';
// export * from './predictive-game-state';
// export * from './player-input';
// export * from './state-reconciliation';
// export * from './performance-metrics';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERFORMANCE_RANGES = void 0;
// Validation ranges for performance metrics
exports.PERFORMANCE_RANGES = {
    FPS: { min: 1, max: 120 },
    LATENCY_MS: { min: 0, max: 1000 },
    CPU_USAGE: { min: 0, max: 100 },
    MEMORY_MB: { min: 0, max: 8192 },
    BANDWIDTH_KBPS: { min: 0, max: 10000 },
    COMPRESSION_RATIO: { min: 0, max: 1 }
};
//# sourceMappingURL=index.js.map