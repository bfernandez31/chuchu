"use strict";
// Performance monitoring exports
// TODO: Implement these modules in T026-T027
// export * from './performance-monitor';
// export * from './metrics-collector';
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserPerformance = exports.PERFORMANCE_CONFIG = void 0;
// Performance monitoring configuration
exports.PERFORMANCE_CONFIG = {
    // Monitoring intervals
    METRICS_COLLECTION_INTERVAL_MS: 1000,
    PERFORMANCE_ALERT_INTERVAL_MS: 5000,
    HISTORY_RETENTION_MS: 300000,
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
    ALERT_HYSTERESIS_FACTOR: 0.9,
    MAX_ALERTS_PER_MINUTE: 10
};
// Browser Performance API integration helpers
exports.BrowserPerformance = {
    isSupported: typeof performance !== 'undefined' && 'mark' in performance,
    mark: function (name) {
        if (exports.BrowserPerformance.isSupported) {
            performance.mark(name);
        }
    },
    measure: function (name, startMark, endMark) {
        if (exports.BrowserPerformance.isSupported) {
            performance.measure(name, startMark, endMark);
            var entries = performance.getEntriesByName(name, 'measure');
            return entries.length > 0 ? entries[entries.length - 1].duration : 0;
        }
        return 0;
    },
    now: function () { return (performance === null || performance === void 0 ? void 0 : performance.now()) || Date.now(); },
    getFrameRate: function () {
        // Simplified frame rate calculation for browser environments
        var lastTime = (performance === null || performance === void 0 ? void 0 : performance.now()) || Date.now();
        var frameCount = 0;
        return new Promise(function (resolve) {
            var measureFrames = function () {
                frameCount++;
                var currentTime = (performance === null || performance === void 0 ? void 0 : performance.now()) || Date.now();
                if (currentTime - lastTime >= 1000) {
                    var fps = frameCount * 1000 / (currentTime - lastTime);
                    resolve(fps);
                }
                else if (typeof globalThis !== 'undefined' && 'requestAnimationFrame' in globalThis) {
                    globalThis.requestAnimationFrame(measureFrames);
                }
                else {
                    // Fallback for Node.js environment
                    setTimeout(measureFrames, 16);
                }
            };
            if (typeof globalThis !== 'undefined' && 'requestAnimationFrame' in globalThis) {
                globalThis.requestAnimationFrame(measureFrames);
            }
            else {
                // Fallback for Node.js environment
                setTimeout(measureFrames, 16);
            }
        });
    }
};
//# sourceMappingURL=index.js.map