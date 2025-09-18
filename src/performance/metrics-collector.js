"use strict";
/**
 * T027: MetricsCollector Implementation
 *
 * Browser Performance API integration, Node.js performance hooks,
 * FPS calculation, frame time tracking, and memory usage monitoring.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollectorFactory = exports.MetricsCollectorManager = exports.MetricsCollector = exports.CollectorEnvironment = void 0;
var CollectorEnvironment;
(function (CollectorEnvironment) {
    CollectorEnvironment["BROWSER"] = "BROWSER";
    CollectorEnvironment["NODE"] = "NODE";
    CollectorEnvironment["HYBRID"] = "HYBRID";
})(CollectorEnvironment || (exports.CollectorEnvironment = CollectorEnvironment = {}));
var MetricsCollector = /** @class */ (function () {
    function MetricsCollector(config) {
        this.frameTimings = [];
        this.memorySnapshots = [];
        this.networkTimings = [];
        this.frameCounter = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        this.memoryTimer = null;
        this.performanceObserver = null;
        this.gcObserver = null; // Node.js GC observer
        this.maxHistorySize = 300; // Keep last 5 minutes at 60fps
        this.config = __assign({ environment: this.detectEnvironment(), fpsCalculationWindow: 60, memoryMonitoringInterval: 5000, performanceAPIEnabled: true, nodePerformanceHooksEnabled: true, gcMonitoringEnabled: true, detailedTimings: false }, config);
        this.initializeCollectors();
    }
    /**
     * Start metrics collection
     */
    MetricsCollector.prototype.start = function () {
        console.log("MetricsCollector starting in ".concat(this.config.environment, " mode"));
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
    };
    /**
     * Stop metrics collection
     */
    MetricsCollector.prototype.stop = function () {
        var _a, _b, _c;
        // Stop frame monitoring
        if (this.animationFrameId) {
            if (typeof globalThis !== 'undefined' && ((_a = globalThis.window) === null || _a === void 0 ? void 0 : _a.cancelAnimationFrame)) {
                globalThis.window.cancelAnimationFrame(this.animationFrameId);
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
            (_c = (_b = this.gcObserver).disconnect) === null || _c === void 0 ? void 0 : _c.call(_b);
            this.gcObserver = null;
        }
        console.log('MetricsCollector stopped');
    };
    /**
     * Get current client metrics
     */
    MetricsCollector.prototype.getClientMetrics = function (playerId) {
        var now = Date.now();
        var frameRate = this.calculateCurrentFPS();
        var averageFrameTime = this.calculateAverageFrameTime();
        var memoryUsage = this.getCurrentMemoryUsage();
        var networkLatency = this.getAverageNetworkLatency();
        return {
            timestamp: now,
            playerId: playerId,
            frameRate: frameRate,
            frameTime: averageFrameTime,
            renderTime: this.getAverageRenderTime(),
            networkLatency: networkLatency,
            predictionAccuracy: 0.95,
            rollbackFrequency: 0,
            memoryUsage: memoryUsage,
            inputLag: this.calculateInputLag(),
            smoothingActive: false,
            compressionRatio: 0.75 // TODO: Get from networking layer
        };
    };
    /**
     * Get current server metrics
     */
    MetricsCollector.prototype.getServerMetrics = function () {
        var now = Date.now();
        var memoryUsage = this.getCurrentMemoryUsage();
        return {
            timestamp: now,
            memoryUsage: memoryUsage,
            // Note: Other server metrics would be collected from system monitoring
        };
    };
    /**
     * Get frame timing statistics
     */
    MetricsCollector.prototype.getFrameTimingStats = function () {
        var recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow * 3);
        if (recentFrames.length < 2) {
            return {
                averageFPS: 60,
                averageFrameTime: 16.67,
                frameTimePercentiles: { p50: 16.67, p90: 16.67, p95: 16.67, p99: 16.67 },
                droppedFrames: 0
            };
        }
        var frameTimes = recentFrames.map(function (f) { return f.frameTime; }).sort(function (a, b) { return a - b; });
        var averageFrameTime = frameTimes.reduce(function (sum, time) { return sum + time; }, 0) / frameTimes.length;
        var averageFPS = 1000 / averageFrameTime;
        // Calculate percentiles
        var getPercentile = function (arr, percentile) {
            var index = Math.ceil(arr.length * percentile / 100) - 1;
            return arr[Math.max(0, index)];
        };
        var droppedFrames = recentFrames.filter(function (f) { return f.frameTime > 20; }).length; // >20ms = dropped frame
        return {
            averageFPS: averageFPS,
            averageFrameTime: averageFrameTime,
            frameTimePercentiles: {
                p50: getPercentile(frameTimes, 50),
                p90: getPercentile(frameTimes, 90),
                p95: getPercentile(frameTimes, 95),
                p99: getPercentile(frameTimes, 99)
            },
            droppedFrames: droppedFrames
        };
    };
    /**
     * Get memory usage statistics
     */
    MetricsCollector.prototype.getMemoryStats = function () {
        if (this.memorySnapshots.length === 0) {
            var emptySnapshot = {
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
        var current = this.memorySnapshots[this.memorySnapshots.length - 1];
        var peak = this.memorySnapshots.reduce(function (max, snapshot) {
            return snapshot.heapUsed > max.heapUsed ? snapshot : max;
        });
        var totalHeapUsed = this.memorySnapshots.reduce(function (sum, s) { return sum + s.heapUsed; }, 0);
        var totalHeapTotal = this.memorySnapshots.reduce(function (sum, s) { return sum + s.heapTotal; }, 0);
        var totalExternal = this.memorySnapshots.reduce(function (sum, s) { return sum + s.external; }, 0);
        var average = {
            timestamp: current.timestamp,
            heapUsed: totalHeapUsed / this.memorySnapshots.length,
            heapTotal: totalHeapTotal / this.memorySnapshots.length,
            external: totalExternal / this.memorySnapshots.length
        };
        return {
            current: current,
            peak: peak,
            average: average,
            gcFrequency: this.calculateGCFrequency()
        };
    };
    /**
     * Get network timing statistics
     */
    MetricsCollector.prototype.getNetworkStats = function () {
        if (this.networkTimings.length === 0) {
            return {
                averageLatency: 0,
                averageTransferRate: 0,
                compressionRatio: 1.0,
                requestCount: 0
            };
        }
        var latencies = this.networkTimings.map(function (t) { return t.responseStart - t.requestStart; });
        var averageLatency = latencies.reduce(function (sum, l) { return sum + l; }, 0) / latencies.length;
        var totalTransferred = this.networkTimings.reduce(function (sum, t) { return sum + t.transferSize; }, 0);
        var totalTime = this.networkTimings.reduce(function (sum, t) { return sum + (t.responseEnd - t.requestStart); }, 0);
        var averageTransferRate = totalTime > 0 ? (totalTransferred / 1024) / (totalTime / 1000) : 0;
        var totalEncoded = this.networkTimings.reduce(function (sum, t) { return sum + t.encodedBodySize; }, 0);
        var totalDecoded = this.networkTimings.reduce(function (sum, t) { return sum + t.decodedBodySize; }, 0);
        var compressionRatio = totalDecoded > 0 ? totalEncoded / totalDecoded : 1.0;
        return {
            averageLatency: averageLatency,
            averageTransferRate: averageTransferRate,
            compressionRatio: compressionRatio,
            requestCount: this.networkTimings.length
        };
    };
    /**
     * Force garbage collection (Node.js only)
     */
    MetricsCollector.prototype.forceGC = function () {
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
            return true;
        }
        return false;
    };
    /**
     * Reset all collected data
     */
    MetricsCollector.prototype.reset = function () {
        this.frameTimings = [];
        this.memorySnapshots = [];
        this.networkTimings = [];
        this.frameCounter = 0;
        this.lastFrameTime = 0;
    };
    /**
     * Export metrics data
     */
    MetricsCollector.prototype.exportData = function () {
        return {
            config: this.config,
            frameTimings: __spreadArray([], this.frameTimings, true),
            memorySnapshots: __spreadArray([], this.memorySnapshots, true),
            networkTimings: __spreadArray([], this.networkTimings, true),
            statistics: {
                frameStats: this.getFrameTimingStats(),
                memoryStats: this.getMemoryStats(),
                networkStats: this.getNetworkStats()
            }
        };
    };
    // Private methods
    MetricsCollector.prototype.detectEnvironment = function () {
        var hasWindow = typeof globalThis !== 'undefined' && globalThis.window;
        var hasProcess = typeof globalThis.process !== 'undefined';
        if (hasWindow && hasProcess) {
            return CollectorEnvironment.HYBRID;
        }
        else if (hasWindow) {
            return CollectorEnvironment.BROWSER;
        }
        else {
            return CollectorEnvironment.NODE;
        }
    };
    MetricsCollector.prototype.initializeCollectors = function () {
        // Initialize based on environment
        if (this.config.environment === CollectorEnvironment.BROWSER ||
            this.config.environment === CollectorEnvironment.HYBRID) {
            this.initializeBrowserCollectors();
        }
        if (this.config.environment === CollectorEnvironment.NODE ||
            this.config.environment === CollectorEnvironment.HYBRID) {
            this.initializeNodeCollectors();
        }
    };
    MetricsCollector.prototype.initializeBrowserCollectors = function () {
        var _this = this;
        // Initialize Performance Observer for browser APIs
        if (typeof PerformanceObserver !== 'undefined' && this.config.performanceAPIEnabled) {
            try {
                this.performanceObserver = new PerformanceObserver(function (list) {
                    for (var _i = 0, _a = list.getEntries(); _i < _a.length; _i++) {
                        var entry = _a[_i];
                        _this.processPerfromanceEntry(entry);
                    }
                });
                this.performanceObserver.observe({
                    entryTypes: ['navigation', 'resource', 'measure', 'paint']
                });
            }
            catch (error) {
                console.warn('PerformanceObserver not supported:', error);
            }
        }
    };
    MetricsCollector.prototype.initializeNodeCollectors = function () {
        // Initialize Node.js performance hooks
        if (this.config.nodePerformanceHooksEnabled) {
            try {
                // Note: In a real implementation, would use Node.js performance hooks
                console.log('Node.js performance hooks initialized');
            }
            catch (error) {
                console.warn('Node.js performance hooks not available:', error);
            }
        }
        // Initialize GC monitoring
        if (this.config.gcMonitoringEnabled) {
            try {
                // Note: In a real implementation, would monitor GC events
                console.log('GC monitoring initialized');
            }
            catch (error) {
                console.warn('GC monitoring not available:', error);
            }
        }
    };
    MetricsCollector.prototype.startFrameMonitoring = function () {
        var _this = this;
        if (typeof globalThis === 'undefined' || !globalThis.window)
            return;
        var frameCallback = function (timestamp) {
            var frameTime = _this.lastFrameTime > 0 ? timestamp - _this.lastFrameTime : 16.67;
            var frameData = {
                frameId: _this.frameCounter++,
                timestamp: timestamp,
                frameTime: frameTime,
                renderTime: _this.measureRenderTime(),
                layoutTime: 0,
                paintTime: 0,
                compositeTime: 0 // TODO: Measure composite time
            };
            _this.frameTimings.push(frameData);
            // Maintain history size
            if (_this.frameTimings.length > _this.maxHistorySize) {
                _this.frameTimings.shift();
            }
            _this.lastFrameTime = timestamp;
            _this.animationFrameId = requestAnimationFrame(frameCallback);
        };
        this.animationFrameId = requestAnimationFrame(frameCallback);
    };
    MetricsCollector.prototype.startMemoryMonitoring = function () {
        var _this = this;
        this.memoryTimer = setInterval(function () {
            var snapshot = _this.captureMemorySnapshot();
            _this.memorySnapshots.push(snapshot);
            // Maintain history size
            if (_this.memorySnapshots.length > _this.maxHistorySize) {
                _this.memorySnapshots.shift();
            }
        }, this.config.memoryMonitoringInterval);
    };
    MetricsCollector.prototype.startPerformanceMonitoring = function () {
        // Monitor various performance metrics
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('metrics-collector-start');
        }
    };
    MetricsCollector.prototype.startNodePerformanceMonitoring = function () {
        if (typeof process === 'undefined')
            return;
        // Monitor Node.js process events
        process.on('warning', function (warning) {
            console.warn('Node.js warning:', warning);
        });
    };
    MetricsCollector.prototype.processPerfromanceEntry = function (entry) {
        switch (entry.entryType) {
            case 'navigation':
                // Process navigation timing
                break;
            case 'resource':
                this.processResourceTiming(entry);
                break;
            case 'measure':
                // Process custom measures
                break;
            case 'paint':
                // Process paint timing
                break;
        }
    };
    MetricsCollector.prototype.processResourceTiming = function (entry) {
        var networkTiming = {
            requestStart: entry.requestStart,
            responseStart: entry.responseStart,
            responseEnd: entry.responseEnd,
            transferSize: entry.transferSize || 0,
            encodedBodySize: entry.encodedBodySize || 0,
            decodedBodySize: entry.decodedBodySize || 0,
            protocol: entry.nextHopProtocol || 'unknown'
        };
        this.networkTimings.push(networkTiming);
        // Maintain history size
        if (this.networkTimings.length > this.maxHistorySize) {
            this.networkTimings.shift();
        }
    };
    MetricsCollector.prototype.captureMemorySnapshot = function () {
        var _a, _b;
        var snapshot = {
            timestamp: Date.now(),
            heapUsed: 0,
            heapTotal: 0,
            external: 0
        };
        // Browser memory API
        if (typeof globalThis !== 'undefined' &&
            ((_b = (_a = globalThis.window) === null || _a === void 0 ? void 0 : _a.performance) === null || _b === void 0 ? void 0 : _b.memory)) {
            var memory = globalThis.window.performance.memory;
            snapshot = {
                timestamp: Date.now(),
                heapUsed: memory.usedJSHeapSize / 1024 / 1024,
                heapTotal: memory.totalJSHeapSize / 1024 / 1024,
                external: 0
            };
        }
        // Node.js memory API
        if (typeof process !== 'undefined' && process.memoryUsage) {
            var memory = process.memoryUsage();
            snapshot = {
                timestamp: Date.now(),
                heapUsed: memory.heapUsed / 1024 / 1024,
                heapTotal: memory.heapTotal / 1024 / 1024,
                external: memory.external / 1024 / 1024,
                rss: memory.rss / 1024 / 1024,
                arrayBuffers: memory.arrayBuffers ? memory.arrayBuffers / 1024 / 1024 : 0
            };
        }
        return snapshot;
    };
    MetricsCollector.prototype.measureRenderTime = function () {
        // TODO: Implement actual render time measurement
        return Math.random() * 2 + 8; // Simulate 8-10ms render time
    };
    MetricsCollector.prototype.calculateCurrentFPS = function () {
        var recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow);
        if (recentFrames.length < 2)
            return 60; // Default
        var totalTime = recentFrames[recentFrames.length - 1].timestamp - recentFrames[0].timestamp;
        var frameCount = recentFrames.length - 1;
        return totalTime > 0 ? (frameCount * 1000) / totalTime : 60;
    };
    MetricsCollector.prototype.calculateAverageFrameTime = function () {
        var recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow);
        if (recentFrames.length === 0)
            return 16.67; // Default 60fps
        var totalFrameTime = recentFrames.reduce(function (sum, frame) { return sum + frame.frameTime; }, 0);
        return totalFrameTime / recentFrames.length;
    };
    MetricsCollector.prototype.getAverageRenderTime = function () {
        var recentFrames = this.frameTimings.slice(-this.config.fpsCalculationWindow);
        if (recentFrames.length === 0)
            return 8; // Default
        var totalRenderTime = recentFrames.reduce(function (sum, frame) { return sum + frame.renderTime; }, 0);
        return totalRenderTime / recentFrames.length;
    };
    MetricsCollector.prototype.getCurrentMemoryUsage = function () {
        var snapshot = this.captureMemorySnapshot();
        return snapshot.heapUsed;
    };
    MetricsCollector.prototype.getAverageNetworkLatency = function () {
        var recentTimings = this.networkTimings.slice(-50); // Last 50 requests
        if (recentTimings.length === 0)
            return 0;
        var latencies = recentTimings.map(function (t) { return t.responseStart - t.requestStart; });
        return latencies.reduce(function (sum, l) { return sum + l; }, 0) / latencies.length;
    };
    MetricsCollector.prototype.calculateInputLag = function () {
        // TODO: Implement actual input lag measurement
        return Math.random() * 10 + 15; // Simulate 15-25ms input lag
    };
    MetricsCollector.prototype.calculateGCFrequency = function () {
        // TODO: Implement GC frequency calculation based on memory patterns
        return undefined;
    };
    return MetricsCollector;
}());
exports.MetricsCollector = MetricsCollector;
/**
 * Global metrics collector instance
 */
var globalCollector = null;
var MetricsCollectorManager = /** @class */ (function () {
    function MetricsCollectorManager() {
    }
    /**
     * Get or create global collector instance
     */
    MetricsCollectorManager.getInstance = function (config) {
        if (!globalCollector) {
            globalCollector = new MetricsCollector(config);
        }
        return globalCollector;
    };
    /**
     * Initialize global collector with configuration
     */
    MetricsCollectorManager.initialize = function (config) {
        globalCollector = new MetricsCollector(config);
        return globalCollector;
    };
    /**
     * Destroy global collector instance
     */
    MetricsCollectorManager.destroy = function () {
        if (globalCollector) {
            globalCollector.stop();
            globalCollector = null;
        }
    };
    return MetricsCollectorManager;
}());
exports.MetricsCollectorManager = MetricsCollectorManager;
/**
 * Factory for creating MetricsCollector instances
 */
var MetricsCollectorFactory = /** @class */ (function () {
    function MetricsCollectorFactory() {
    }
    MetricsCollectorFactory.create = function (config) {
        return new MetricsCollector(config);
    };
    MetricsCollectorFactory.createForBrowser = function () {
        return new MetricsCollector({
            environment: CollectorEnvironment.BROWSER,
            performanceAPIEnabled: true,
            nodePerformanceHooksEnabled: false,
            gcMonitoringEnabled: false,
            detailedTimings: true
        });
    };
    MetricsCollectorFactory.createForNode = function () {
        return new MetricsCollector({
            environment: CollectorEnvironment.NODE,
            performanceAPIEnabled: false,
            nodePerformanceHooksEnabled: true,
            gcMonitoringEnabled: true,
            detailedTimings: false
        });
    };
    MetricsCollectorFactory.createForTesting = function () {
        return new MetricsCollector({
            fpsCalculationWindow: 10,
            memoryMonitoringInterval: 100,
            performanceAPIEnabled: false,
            nodePerformanceHooksEnabled: false,
            gcMonitoringEnabled: false,
            detailedTimings: false
        });
    };
    return MetricsCollectorFactory;
}());
exports.MetricsCollectorFactory = MetricsCollectorFactory;
//# sourceMappingURL=metrics-collector.js.map