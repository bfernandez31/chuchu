"use strict";
/**
 * T022: PerformanceMetrics Model
 *
 * Client and server metrics structure with validation ranges,
 * metrics aggregation logic, and performance monitoring.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMetricsFactory = exports.PerformanceMetricsImpl = void 0;
var PerformanceMetricsImpl = /** @class */ (function () {
    function PerformanceMetricsImpl(data) {
        this.server = (data === null || data === void 0 ? void 0 : data.server) || this.createDefaultServerMetrics();
        this.game = (data === null || data === void 0 ? void 0 : data.game) || this.createDefaultGameMetrics();
        this.network = (data === null || data === void 0 ? void 0 : data.network) || this.createDefaultNetworkMetrics();
        this.clients = (data === null || data === void 0 ? void 0 : data.clients) || new Map();
        this.thresholds = (data === null || data === void 0 ? void 0 : data.thresholds) || this.createDefaultThresholds();
        this.activeAlerts = (data === null || data === void 0 ? void 0 : data.activeAlerts) || [];
        this.aggregations = (data === null || data === void 0 ? void 0 : data.aggregations) || [];
    }
    /**
     * Validate all metrics are within acceptable ranges
     */
    PerformanceMetricsImpl.prototype.isValid = function () {
        try {
            // Server metrics validation
            if (!this.isServerMetricsValid())
                return false;
            // Game metrics validation
            if (!this.isGameMetricsValid())
                return false;
            // Network metrics validation
            if (!this.isNetworkMetricsValid())
                return false;
            // Client metrics validation
            for (var _i = 0, _a = Array.from(this.clients); _i < _a.length; _i++) {
                var _b = _a[_i], playerId = _b[0], clientMetrics = _b[1];
                if (!this.isClientMetricsValid(clientMetrics))
                    return false;
            }
            return true;
        }
        catch (error) {
            console.error('Performance metrics validation error:', error);
            return false;
        }
    };
    /**
     * Check all metrics against thresholds and generate alerts
     */
    PerformanceMetricsImpl.prototype.checkThresholds = function () {
        var newAlerts = [];
        // Check server metrics
        newAlerts.push.apply(newAlerts, this.checkServerThresholds());
        // Check game metrics
        newAlerts.push.apply(newAlerts, this.checkGameThresholds());
        // Check network metrics
        newAlerts.push.apply(newAlerts, this.checkNetworkThresholds());
        // Check client metrics
        for (var _i = 0, _a = Array.from(this.clients); _i < _a.length; _i++) {
            var _b = _a[_i], playerId = _b[0], clientMetrics = _b[1];
            newAlerts.push.apply(newAlerts, this.checkClientThresholds(clientMetrics));
        }
        // Add new alerts to active alerts
        for (var _c = 0, newAlerts_1 = newAlerts; _c < newAlerts_1.length; _c++) {
            var alert_1 = newAlerts_1[_c];
            this.activeAlerts.push(alert_1);
        }
        // Check for resolved alerts
        this.checkResolvedAlerts();
        return newAlerts;
    };
    /**
     * Add or update client metrics
     */
    PerformanceMetricsImpl.prototype.addClientMetrics = function (clientMetrics) {
        if (!this.isClientMetricsValid(clientMetrics)) {
            throw new Error('Invalid client metrics provided');
        }
        this.clients.set(clientMetrics.playerId, clientMetrics);
    };
    /**
     * Update server metrics
     */
    PerformanceMetricsImpl.prototype.updateServerMetrics = function (serverMetrics) {
        this.server = __assign(__assign(__assign({}, this.server), serverMetrics), { timestamp: Date.now() });
        if (!this.isServerMetricsValid()) {
            throw new Error('Invalid server metrics provided');
        }
    };
    /**
     * Aggregate metrics over specified period
     */
    PerformanceMetricsImpl.prototype.aggregateMetrics = function (period) {
        var now = Date.now();
        var aggregation = {
            period: period,
            timestamp: now,
            averages: {},
            maximums: {},
            minimums: {},
            counts: {}
        };
        // Server metrics aggregation
        aggregation.averages.serverTickRate = this.server.tickRate;
        aggregation.averages.serverLoad = this.server.serverLoad;
        aggregation.averages.memoryUsage = this.server.memoryUsage;
        aggregation.averages.playerCount = this.server.playerCount;
        // Game metrics aggregation
        aggregation.averages.messageRate = this.game.messageRate;
        aggregation.averages.stateUpdatesPerSecond = this.game.stateUpdatesPerSecond;
        aggregation.averages.averagePlayerLatency = this.game.averagePlayerLatency;
        // Network metrics aggregation
        aggregation.averages.bandwidthUsage = this.network.inboundBandwidth + this.network.outboundBandwidth;
        aggregation.averages.packetLoss = this.network.packetLoss;
        aggregation.averages.connectionCount = this.network.connectionCount;
        // Client metrics aggregation
        if (this.clients.size > 0) {
            var totalFrameRate = 0;
            var totalLatency = 0;
            var totalRollbacks = 0;
            for (var _i = 0, _a = Array.from(this.clients); _i < _a.length; _i++) {
                var _b = _a[_i], playerId = _b[0], clientMetrics = _b[1];
                totalFrameRate += clientMetrics.frameRate;
                totalLatency += clientMetrics.networkLatency;
                totalRollbacks += clientMetrics.rollbackFrequency;
            }
            aggregation.averages.clientFrameRate = totalFrameRate / this.clients.size;
            aggregation.averages.clientLatency = totalLatency / this.clients.size;
            aggregation.averages.clientRollbacks = totalRollbacks / this.clients.size;
        }
        this.aggregations.push(aggregation);
        // Maintain aggregation history size
        if (this.aggregations.length > 1000) {
            this.aggregations = this.aggregations.slice(-1000);
        }
        return aggregation;
    };
    /**
     * Get performance summary
     */
    PerformanceMetricsImpl.prototype.getPerformanceSummary = function () {
        var issues = [];
        var recommendations = [];
        var score = 100;
        // Check server performance
        if (this.server.serverLoad > 80) {
            issues.push('High server load');
            recommendations.push('Consider scaling server resources');
            score -= 20;
        }
        if (this.server.tickRate < 50) {
            issues.push('Low tick rate');
            recommendations.push('Optimize game loop performance');
            score -= 15;
        }
        // Check network performance
        if (this.network.packetLoss > 0.05) {
            issues.push('High packet loss');
            recommendations.push('Investigate network connectivity');
            score -= 25;
        }
        // Check client performance
        var lowFrameRateClients = 0;
        for (var _i = 0, _a = Array.from(this.clients); _i < _a.length; _i++) {
            var _b = _a[_i], playerId = _b[0], clientMetrics = _b[1];
            if (clientMetrics.frameRate < 45) {
                lowFrameRateClients++;
            }
        }
        if (lowFrameRateClients > this.clients.size * 0.2) {
            issues.push('Multiple clients with low frame rate');
            recommendations.push('Optimize client rendering or reduce quality');
            score -= 20;
        }
        // Determine overall status
        var status = 'HEALTHY';
        if (score < 60) {
            status = 'CRITICAL';
        }
        else if (score < 80) {
            status = 'WARNING';
        }
        return {
            status: status,
            score: Math.max(0, score),
            issues: issues,
            recommendations: recommendations
        };
    };
    /**
     * Clean up old metrics and alerts
     */
    PerformanceMetricsImpl.prototype.cleanup = function () {
        var cutoffTime = Date.now() - 3600000; // 1 hour
        // Remove old client metrics
        for (var _i = 0, _a = Array.from(this.clients); _i < _a.length; _i++) {
            var _b = _a[_i], playerId = _b[0], clientMetrics = _b[1];
            if (clientMetrics.timestamp < cutoffTime) {
                this.clients.delete(playerId);
            }
        }
        // Remove resolved alerts older than 1 hour
        this.activeAlerts = this.activeAlerts.filter(function (alert) {
            return !alert.resolved || (alert.resolvedAt && alert.resolvedAt > cutoffTime);
        });
        // Keep only recent aggregations
        this.aggregations = this.aggregations.filter(function (agg) { return agg.timestamp > cutoffTime; });
    };
    // Private validation methods
    PerformanceMetricsImpl.prototype.isServerMetricsValid = function () {
        var s = this.server;
        return s.timestamp > 0 &&
            s.tickRate >= 1 && s.tickRate <= 120 &&
            s.serverLoad >= 0 && s.serverLoad <= 100 &&
            s.memoryUsage >= 0 &&
            s.entityCount >= 0 &&
            s.playerCount >= 0 &&
            s.averageLatency >= 0 && s.averageLatency <= 10000 &&
            s.predictionAccuracy >= 0.0 && s.predictionAccuracy <= 1.0;
    };
    PerformanceMetricsImpl.prototype.isGameMetricsValid = function () {
        var g = this.game;
        return g.timestamp > 0 &&
            g.gameId.length > 0 &&
            g.activeConnections >= 0 &&
            g.messageRate >= 0 &&
            g.stateUpdatesPerSecond >= 0 &&
            g.averagePlayerLatency >= 0 &&
            g.bandwidthUsage >= 0 &&
            g.errorRate >= 0.0 && g.errorRate <= 1.0 &&
            g.uptime >= 0;
    };
    PerformanceMetricsImpl.prototype.isNetworkMetricsValid = function () {
        var n = this.network;
        return n.timestamp > 0 &&
            n.inboundBandwidth >= 0 &&
            n.outboundBandwidth >= 0 &&
            n.packetLoss >= 0.0 && n.packetLoss <= 1.0 &&
            n.jitter >= 0 &&
            n.connectionCount >= 0 &&
            n.reconnectionRate >= 0;
    };
    PerformanceMetricsImpl.prototype.isClientMetricsValid = function (clientMetrics) {
        var c = clientMetrics;
        return c.timestamp > 0 &&
            c.playerId.length > 0 &&
            c.frameRate >= 1 && c.frameRate <= 120 &&
            c.frameTime > 0 &&
            c.renderTime >= 0 &&
            c.networkLatency >= 0 && c.networkLatency <= 10000 &&
            c.predictionAccuracy >= 0.0 && c.predictionAccuracy <= 1.0 &&
            c.rollbackFrequency >= 0 &&
            c.memoryUsage >= 0 &&
            c.inputLag >= 0 &&
            c.compressionRatio >= 0.0 && c.compressionRatio <= 1.0;
    };
    // Private threshold checking methods
    PerformanceMetricsImpl.prototype.checkServerThresholds = function () {
        var alerts = [];
        var checks = [
            { metric: 'serverLoad', value: this.server.serverLoad, thresholds: { warning: 70, critical: 90 } },
            { metric: 'tickRate', value: this.server.tickRate, thresholds: { warning: 45, critical: 30 }, inverted: true },
            { metric: 'memoryUsage', value: this.server.memoryUsage, thresholds: { warning: 1000, critical: 1500 } },
            { metric: 'averageLatency', value: this.server.averageLatency, thresholds: { warning: 200, critical: 500 } }
        ];
        var _loop_1 = function (check) {
            var threshold = this_1.thresholds.find(function (t) { return t.metric === check.metric; });
            if (!threshold || !threshold.enabled)
                return "continue";
            var isInverted = check.inverted || false;
            var warningTriggered = isInverted ?
                check.value < threshold.warning :
                check.value > threshold.warning;
            var criticalTriggered = isInverted ?
                check.value < threshold.critical :
                check.value > threshold.critical;
            if (criticalTriggered) {
                alerts.push(this_1.createAlert('CRITICAL', check.metric, check.value, threshold.critical));
            }
            else if (warningTriggered) {
                alerts.push(this_1.createAlert('WARNING', check.metric, check.value, threshold.warning));
            }
        };
        var this_1 = this;
        for (var _i = 0, checks_1 = checks; _i < checks_1.length; _i++) {
            var check = checks_1[_i];
            _loop_1(check);
        }
        return alerts;
    };
    PerformanceMetricsImpl.prototype.checkGameThresholds = function () {
        var alerts = [];
        if (this.game.errorRate > 0.1) {
            alerts.push(this.createAlert('CRITICAL', 'errorRate', this.game.errorRate, 0.1));
        }
        if (this.game.averagePlayerLatency > 300) {
            alerts.push(this.createAlert('WARNING', 'averagePlayerLatency', this.game.averagePlayerLatency, 300));
        }
        return alerts;
    };
    PerformanceMetricsImpl.prototype.checkNetworkThresholds = function () {
        var alerts = [];
        if (this.network.packetLoss > 0.05) {
            alerts.push(this.createAlert('WARNING', 'packetLoss', this.network.packetLoss, 0.05));
        }
        if (this.network.packetLoss > 0.1) {
            alerts.push(this.createAlert('CRITICAL', 'packetLoss', this.network.packetLoss, 0.1));
        }
        return alerts;
    };
    PerformanceMetricsImpl.prototype.checkClientThresholds = function (clientMetrics) {
        var alerts = [];
        if (clientMetrics.frameRate < 30) {
            alerts.push(this.createAlert('CRITICAL', 'clientFrameRate', clientMetrics.frameRate, 30));
        }
        else if (clientMetrics.frameRate < 45) {
            alerts.push(this.createAlert('WARNING', 'clientFrameRate', clientMetrics.frameRate, 45));
        }
        if (clientMetrics.networkLatency > 500) {
            alerts.push(this.createAlert('WARNING', 'clientLatency', clientMetrics.networkLatency, 500));
        }
        return alerts;
    };
    PerformanceMetricsImpl.prototype.checkResolvedAlerts = function () {
        for (var _i = 0, _a = this.activeAlerts; _i < _a.length; _i++) {
            var alert_2 = _a[_i];
            if (alert_2.resolved)
                continue;
            // Check if alert condition is resolved
            var isResolved = false;
            switch (alert_2.metric) {
                case 'serverLoad':
                    isResolved = this.server.serverLoad < alert_2.threshold;
                    break;
                case 'tickRate':
                    isResolved = this.server.tickRate >= alert_2.threshold;
                    break;
                case 'packetLoss':
                    isResolved = this.network.packetLoss < alert_2.threshold;
                    break;
                // Add more resolution checks as needed
            }
            if (isResolved) {
                alert_2.resolved = true;
                alert_2.resolvedAt = Date.now();
            }
        }
    };
    PerformanceMetricsImpl.prototype.createAlert = function (level, metric, value, threshold) {
        return {
            id: this.generateAlertId(),
            timestamp: Date.now(),
            level: level,
            metric: metric,
            value: value,
            threshold: threshold,
            message: "".concat(metric, " ").concat(level.toLowerCase(), ": ").concat(value, " ").concat(level === 'WARNING' ? '>' : '>>', " ").concat(threshold),
            resolved: false
        };
    };
    PerformanceMetricsImpl.prototype.createDefaultServerMetrics = function () {
        return {
            timestamp: Date.now(),
            tickRate: 60,
            serverLoad: 0,
            memoryUsage: 0,
            entityCount: 0,
            playerCount: 0,
            messagesSent: 0,
            messagesReceived: 0,
            averageLatency: 0,
            rollbackCount: 0,
            predictionAccuracy: 1.0
        };
    };
    PerformanceMetricsImpl.prototype.createDefaultGameMetrics = function () {
        return {
            timestamp: Date.now(),
            gameId: 'default_game',
            activeConnections: 0,
            messageRate: 0,
            stateUpdatesPerSecond: 0,
            averagePlayerLatency: 0,
            bandwidthUsage: 0,
            errorRate: 0,
            uptime: 0
        };
    };
    PerformanceMetricsImpl.prototype.createDefaultNetworkMetrics = function () {
        return {
            timestamp: Date.now(),
            inboundBandwidth: 0,
            outboundBandwidth: 0,
            packetLoss: 0,
            jitter: 0,
            connectionCount: 0,
            reconnectionRate: 0,
            compressionSavings: 0
        };
    };
    PerformanceMetricsImpl.prototype.createDefaultThresholds = function () {
        return [
            { metric: 'serverLoad', warning: 70, critical: 90, enabled: true },
            { metric: 'tickRate', warning: 45, critical: 30, enabled: true },
            { metric: 'memoryUsage', warning: 1000, critical: 1500, enabled: true },
            { metric: 'averageLatency', warning: 200, critical: 500, enabled: true },
            { metric: 'packetLoss', warning: 0.05, critical: 0.1, enabled: true },
            { metric: 'clientFrameRate', warning: 45, critical: 30, enabled: true },
            { metric: 'errorRate', warning: 0.05, critical: 0.1, enabled: true }
        ];
    };
    PerformanceMetricsImpl.prototype.generateAlertId = function () {
        return "alert_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    return PerformanceMetricsImpl;
}());
exports.PerformanceMetricsImpl = PerformanceMetricsImpl;
/**
 * Factory for creating PerformanceMetrics instances
 */
var PerformanceMetricsFactory = /** @class */ (function () {
    function PerformanceMetricsFactory() {
    }
    PerformanceMetricsFactory.create = function () {
        return new PerformanceMetricsImpl();
    };
    PerformanceMetricsFactory.createWithThresholds = function (thresholds) {
        return new PerformanceMetricsImpl({ thresholds: thresholds });
    };
    PerformanceMetricsFactory.createForTesting = function () {
        var metrics = new PerformanceMetricsImpl();
        // Add sample client metrics
        metrics.addClientMetrics({
            timestamp: Date.now(),
            playerId: 'test_player_1',
            frameRate: 60,
            frameTime: 16.67,
            renderTime: 12,
            networkLatency: 50,
            predictionAccuracy: 0.95,
            rollbackFrequency: 2,
            memoryUsage: 128,
            inputLag: 25,
            smoothingActive: true,
            compressionRatio: 0.7
        });
        return metrics;
    };
    return PerformanceMetricsFactory;
}());
exports.PerformanceMetricsFactory = PerformanceMetricsFactory;
//# sourceMappingURL=performance-metrics.js.map