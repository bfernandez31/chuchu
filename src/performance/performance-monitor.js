"use strict";
/**
 * T026: PerformanceMonitor Implementation
 *
 * Real-time metrics collection with client and server metric aggregation,
 * alert triggering at configured thresholds, and historical data tracking.
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
exports.PerformanceMonitorFactory = exports.PerformanceMonitorManager = exports.PerformanceMonitor = exports.MonitoringMode = void 0;
var performance_metrics_1 = require("../models/performance-metrics");
var MonitoringMode;
(function (MonitoringMode) {
    MonitoringMode["DEVELOPMENT"] = "DEVELOPMENT";
    MonitoringMode["PRODUCTION"] = "PRODUCTION";
    MonitoringMode["TESTING"] = "TESTING";
    MonitoringMode["DEBUGGING"] = "DEBUGGING";
})(MonitoringMode || (exports.MonitoringMode = MonitoringMode = {}));
var PerformanceMonitor = /** @class */ (function () {
    function PerformanceMonitor(config) {
        this.updateTimer = null;
        this.aggregationTimer = null;
        this.alertCallbacks = [];
        this.lastAlerts = new Map(); // Track alert cooldowns
        this.historicalSnapshots = [];
        this.maxSnapshotHistory = 1440; // 24 hours at 1-minute intervals
        this.config = __assign({ mode: MonitoringMode.PRODUCTION, updateInterval: 1000, aggregationInterval: 60000, alertCooldown: 30000, historicalDataRetention: 86400000, enableRealTimeAlerts: true, enableDataCollection: true, enablePerformanceAPI: true }, config);
        this.metrics = new performance_metrics_1.PerformanceMetricsImpl();
        this.setupDefaultThresholds();
    }
    /**
     * Start performance monitoring
     */
    PerformanceMonitor.prototype.start = function () {
        var _this = this;
        if (this.updateTimer) {
            console.warn('PerformanceMonitor already started');
            return;
        }
        // Start metrics collection
        this.updateTimer = setInterval(function () {
            _this.updateMetrics();
        }, this.config.updateInterval);
        // Start aggregation
        this.aggregationTimer = setInterval(function () {
            _this.aggregateMetrics();
        }, this.config.aggregationInterval);
        console.log("PerformanceMonitor started in ".concat(this.config.mode, " mode"));
    };
    /**
     * Stop performance monitoring
     */
    PerformanceMonitor.prototype.stop = function () {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        if (this.aggregationTimer) {
            clearInterval(this.aggregationTimer);
            this.aggregationTimer = null;
        }
        console.log('PerformanceMonitor stopped');
    };
    /**
     * Update server metrics
     */
    PerformanceMonitor.prototype.updateServerMetrics = function (serverMetrics) {
        this.metrics.updateServerMetrics(serverMetrics);
        this.checkAlertsIfEnabled();
    };
    /**
     * Add client metrics
     */
    PerformanceMonitor.prototype.addClientMetrics = function (clientMetrics) {
        this.metrics.addClientMetrics(clientMetrics);
        this.checkAlertsIfEnabled();
    };
    /**
     * Update game metrics
     */
    PerformanceMonitor.prototype.updateGameMetrics = function (gameMetrics) {
        this.metrics.game = __assign(__assign(__assign({}, this.metrics.game), gameMetrics), { timestamp: Date.now() });
        this.checkAlertsIfEnabled();
    };
    /**
     * Update network metrics
     */
    PerformanceMonitor.prototype.updateNetworkMetrics = function (networkMetrics) {
        this.metrics.network = __assign(__assign(__assign({}, this.metrics.network), networkMetrics), { timestamp: Date.now() });
        this.checkAlertsIfEnabled();
    };
    /**
     * Get current performance snapshot
     */
    PerformanceMonitor.prototype.getSnapshot = function () {
        var alerts = this.metrics.checkThresholds();
        var summary = this.metrics.getPerformanceSummary();
        return {
            timestamp: Date.now(),
            metrics: this.metrics,
            alerts: alerts,
            systemHealth: summary.status
        };
    };
    /**
     * Get historical performance data
     */
    PerformanceMonitor.prototype.getHistoricalData = function (timeRange) {
        if (!timeRange) {
            return __spreadArray([], this.historicalSnapshots, true);
        }
        return this.historicalSnapshots.filter(function (snapshot) {
            return snapshot.timestamp >= timeRange.start &&
                snapshot.timestamp <= timeRange.end;
        });
    };
    /**
     * Get performance trends
     */
    PerformanceMonitor.prototype.getPerformanceTrends = function (timeRange) {
        if (timeRange === void 0) { timeRange = 3600000; }
        var cutoffTime = Date.now() - timeRange;
        var recentSnapshots = this.historicalSnapshots.filter(function (s) { return s.timestamp > cutoffTime; });
        if (recentSnapshots.length < 2) {
            return {
                serverLoad: { trend: 'stable', change: 0 },
                frameRate: { trend: 'stable', change: 0 },
                latency: { trend: 'stable', change: 0 },
                errorRate: { trend: 'stable', change: 0 }
            };
        }
        var first = recentSnapshots[0];
        var last = recentSnapshots[recentSnapshots.length - 1];
        return {
            serverLoad: this.calculateTrend(first.metrics.server.serverLoad, last.metrics.server.serverLoad),
            frameRate: this.calculateTrend(this.getAverageClientFrameRate(first.metrics), this.getAverageClientFrameRate(last.metrics)),
            latency: this.calculateTrend(first.metrics.game.averagePlayerLatency, last.metrics.game.averagePlayerLatency),
            errorRate: this.calculateTrend(first.metrics.game.errorRate, last.metrics.game.errorRate)
        };
    };
    /**
     * Add alert callback
     */
    PerformanceMonitor.prototype.onAlert = function (callback) {
        this.alertCallbacks.push(callback);
    };
    /**
     * Remove alert callback
     */
    PerformanceMonitor.prototype.removeAlertCallback = function (callback) {
        var index = this.alertCallbacks.indexOf(callback);
        if (index !== -1) {
            this.alertCallbacks.splice(index, 1);
        }
    };
    /**
     * Update alert thresholds
     */
    PerformanceMonitor.prototype.updateThresholds = function (thresholds) {
        this.metrics.thresholds = thresholds;
    };
    /**
     * Get current thresholds
     */
    PerformanceMonitor.prototype.getThresholds = function () {
        return __spreadArray([], this.metrics.thresholds, true);
    };
    /**
     * Force immediate metrics check and alerting
     */
    PerformanceMonitor.prototype.forceCheck = function () {
        var alerts = this.metrics.checkThresholds();
        this.processAlerts(alerts);
        return alerts;
    };
    /**
     * Get monitoring statistics
     */
    PerformanceMonitor.prototype.getMonitoringStatistics = function () {
        return {
            uptime: this.updateTimer ? Date.now() - 0 : 0,
            dataPoints: this.historicalSnapshots.length,
            alertsTriggered: this.metrics.activeAlerts.length,
            averageUpdateTime: 5,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            config: __assign({}, this.config)
        };
    };
    /**
     * Export performance data
     */
    PerformanceMonitor.prototype.exportData = function (format) {
        var _this = this;
        if (format === void 0) { format = 'json'; }
        var data = {
            exportedAt: new Date().toISOString(),
            config: this.config,
            currentMetrics: this.metrics,
            historicalData: this.historicalSnapshots.slice(-100) // Last 100 snapshots
        };
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
        // CSV format
        var headers = ['timestamp', 'serverLoad', 'frameRate', 'latency', 'errorRate', 'systemHealth'];
        var rows = this.historicalSnapshots.slice(-100).map(function (snapshot) { return [
            snapshot.timestamp,
            snapshot.metrics.server.serverLoad,
            _this.getAverageClientFrameRate(snapshot.metrics),
            snapshot.metrics.game.averagePlayerLatency,
            snapshot.metrics.game.errorRate,
            snapshot.systemHealth
        ]; });
        return __spreadArray([headers.join(',')], rows.map(function (row) { return row.join(','); }), true).join('\n');
    };
    /**
     * Clean up old data
     */
    PerformanceMonitor.prototype.cleanup = function () {
        var cutoffTime = Date.now() - this.config.historicalDataRetention;
        // Clean up historical snapshots
        this.historicalSnapshots = this.historicalSnapshots.filter(function (snapshot) { return snapshot.timestamp > cutoffTime; });
        // Clean up old alerts
        for (var _i = 0, _a = Array.from(this.lastAlerts); _i < _a.length; _i++) {
            var _b = _a[_i], alertKey = _b[0], timestamp = _b[1];
            if (Date.now() - timestamp > this.config.alertCooldown * 2) {
                this.lastAlerts.delete(alertKey);
            }
        }
        // Clean up metrics
        this.metrics.cleanup();
    };
    // Private methods
    PerformanceMonitor.prototype.updateMetrics = function () {
        if (!this.config.enableDataCollection)
            return;
        // Update server metrics with current system state
        this.updateSystemMetrics();
        // Check for alerts
        this.checkAlertsIfEnabled();
        // Create snapshot for historical data
        if (this.shouldCreateSnapshot()) {
            this.createSnapshot();
        }
    };
    PerformanceMonitor.prototype.updateSystemMetrics = function () {
        // Update server metrics with current system information
        var memoryUsage = process.memoryUsage();
        this.metrics.updateServerMetrics({
            timestamp: Date.now(),
            memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // MB
            // Note: More comprehensive system metrics would be collected here
        });
        // Update game metrics
        this.metrics.game.timestamp = Date.now();
        this.metrics.game.uptime = process.uptime() * 1000; // Convert to ms
        // Update network metrics
        this.metrics.network.timestamp = Date.now();
    };
    PerformanceMonitor.prototype.checkAlertsIfEnabled = function () {
        if (!this.config.enableRealTimeAlerts)
            return;
        var alerts = this.metrics.checkThresholds();
        this.processAlerts(alerts);
    };
    PerformanceMonitor.prototype.processAlerts = function (alerts) {
        for (var _i = 0, alerts_1 = alerts; _i < alerts_1.length; _i++) {
            var alert_1 = alerts_1[_i];
            var alertKey = "".concat(alert_1.metric, "_").concat(alert_1.level);
            var lastAlertTime = this.lastAlerts.get(alertKey) || 0;
            // Check cooldown
            if (Date.now() - lastAlertTime < this.config.alertCooldown) {
                continue;
            }
            // Record alert time
            this.lastAlerts.set(alertKey, Date.now());
            // Notify callbacks
            for (var _a = 0, _b = this.alertCallbacks; _a < _b.length; _a++) {
                var callback = _b[_a];
                try {
                    callback(alert_1);
                }
                catch (error) {
                    console.error('Alert callback error:', error);
                }
            }
        }
    };
    PerformanceMonitor.prototype.shouldCreateSnapshot = function () {
        if (this.historicalSnapshots.length === 0)
            return true;
        var lastSnapshot = this.historicalSnapshots[this.historicalSnapshots.length - 1];
        var timeSinceLastSnapshot = Date.now() - lastSnapshot.timestamp;
        return timeSinceLastSnapshot >= this.config.aggregationInterval;
    };
    PerformanceMonitor.prototype.createSnapshot = function () {
        var snapshot = this.getSnapshot();
        this.historicalSnapshots.push(snapshot);
        // Maintain history size
        if (this.historicalSnapshots.length > this.maxSnapshotHistory) {
            this.historicalSnapshots = this.historicalSnapshots.slice(-this.maxSnapshotHistory);
        }
    };
    PerformanceMonitor.prototype.aggregateMetrics = function () {
        var aggregation = this.metrics.aggregateMetrics('minute');
        console.log('Metrics aggregated:', {
            timestamp: new Date(aggregation.timestamp).toISOString(),
            averages: aggregation.averages
        });
    };
    PerformanceMonitor.prototype.setupDefaultThresholds = function () {
        var defaultThresholds = [
            { metric: 'serverLoad', warning: 70, critical: 90, enabled: true },
            { metric: 'frameRate', warning: 45, critical: 30, enabled: true },
            { metric: 'latency', warning: 200, critical: 500, enabled: true },
            { metric: 'errorRate', warning: 0.05, critical: 0.1, enabled: true },
            { metric: 'memoryUsage', warning: 1000, critical: 1500, enabled: true }
        ];
        this.metrics.thresholds = defaultThresholds;
    };
    PerformanceMonitor.prototype.calculateTrend = function (oldValue, newValue) {
        var change = ((newValue - oldValue) / oldValue) * 100;
        var threshold = 5; // 5% threshold for trend determination
        if (Math.abs(change) < threshold) {
            return { trend: 'stable', change: 0 };
        }
        return {
            trend: change > 0 ? 'increasing' : 'decreasing',
            change: Math.abs(change)
        };
    };
    PerformanceMonitor.prototype.getAverageClientFrameRate = function (metrics) {
        if (metrics.clients.size === 0)
            return 60; // Default
        var totalFrameRate = 0;
        for (var _i = 0, _a = Array.from(metrics.clients.values()); _i < _a.length; _i++) {
            var clientMetrics = _a[_i];
            totalFrameRate += clientMetrics.frameRate;
        }
        return totalFrameRate / metrics.clients.size;
    };
    return PerformanceMonitor;
}());
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Global performance monitor instance
 */
var globalMonitor = null;
var PerformanceMonitorManager = /** @class */ (function () {
    function PerformanceMonitorManager() {
    }
    /**
     * Get or create global monitor instance
     */
    PerformanceMonitorManager.getInstance = function (config) {
        if (!globalMonitor) {
            globalMonitor = new PerformanceMonitor(config);
        }
        return globalMonitor;
    };
    /**
     * Initialize global monitor with configuration
     */
    PerformanceMonitorManager.initialize = function (config) {
        globalMonitor = new PerformanceMonitor(config);
        return globalMonitor;
    };
    /**
     * Destroy global monitor instance
     */
    PerformanceMonitorManager.destroy = function () {
        if (globalMonitor) {
            globalMonitor.stop();
            globalMonitor = null;
        }
    };
    return PerformanceMonitorManager;
}());
exports.PerformanceMonitorManager = PerformanceMonitorManager;
/**
 * Factory for creating PerformanceMonitor instances
 */
var PerformanceMonitorFactory = /** @class */ (function () {
    function PerformanceMonitorFactory() {
    }
    PerformanceMonitorFactory.create = function (config) {
        return new PerformanceMonitor(config);
    };
    PerformanceMonitorFactory.createForDevelopment = function () {
        return new PerformanceMonitor({
            mode: MonitoringMode.DEVELOPMENT,
            updateInterval: 5000,
            enableRealTimeAlerts: true,
            enableDataCollection: true
        });
    };
    PerformanceMonitorFactory.createForProduction = function () {
        return new PerformanceMonitor({
            mode: MonitoringMode.PRODUCTION,
            updateInterval: 1000,
            aggregationInterval: 60000,
            enableRealTimeAlerts: true,
            enableDataCollection: true,
            alertCooldown: 60000 // Longer cooldown in production
        });
    };
    PerformanceMonitorFactory.createForTesting = function () {
        return new PerformanceMonitor({
            mode: MonitoringMode.TESTING,
            updateInterval: 100,
            aggregationInterval: 1000,
            enableRealTimeAlerts: false,
            enableDataCollection: true,
            historicalDataRetention: 60000 // Short retention for testing
        });
    };
    return PerformanceMonitorFactory;
}());
exports.PerformanceMonitorFactory = PerformanceMonitorFactory;
//# sourceMappingURL=performance-monitor.js.map