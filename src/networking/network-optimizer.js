"use strict";
/**
 * T030: NetworkOptimizer Implementation
 *
 * Adaptive tick rate management (50Hz → 20Hz), bandwidth usage optimization,
 * connection quality monitoring, and message prioritization.
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
exports.NetworkOptimizerManager = exports.NetworkOptimizer = void 0;
var delta_compression_1 = require("./delta-compression");
var NetworkOptimizer = /** @class */ (function () {
    function NetworkOptimizer(initialSettings) {
        this.networkHistory = [];
        this.connectionQualities = new Map();
        this.messagePriorities = new Map();
        this.maxHistorySize = 100;
        // Adaptive tick rate settings
        this.baseTickRate = 50; // Hz
        this.minTickRate = 20; // Hz
        this.maxTickRate = 60; // Hz
        this.currentTickRate = 50; // Hz
        // Bandwidth tracking
        this.bandwidthBuffer = [];
        this.targetBandwidth = 100000; // 100KB/s target
        this.currentSettings = __assign({ targetTickRate: 50, maxBandwidth: 500000, latencyThreshold: 200, packetLossThreshold: 5, compressionEnabled: true, prioritizationEnabled: true }, initialSettings);
        this.deltaCompression = new delta_compression_1.DeltaCompression();
        this.initializeMessagePriorities();
    }
    /**
     * Initialize message priority definitions
     */
    NetworkOptimizer.prototype.initializeMessagePriorities = function () {
        var _this = this;
        var priorities = [
            ['rollback-correction', { type: 'rollback-correction', priority: 'critical', maxDelay: 16, dropThreshold: 0 }],
            ['input-acknowledgment', { type: 'input-acknowledgment', priority: 'high', maxDelay: 50, dropThreshold: 10 }],
            ['delta-game-state', { type: 'delta-game-state', priority: 'high', maxDelay: 33, dropThreshold: 20 }],
            ['predictive-input', { type: 'predictive-input', priority: 'medium', maxDelay: 100, dropThreshold: 30 }],
            ['performance-broadcast', { type: 'performance-broadcast', priority: 'low', maxDelay: 1000, dropThreshold: 50 }],
            ['queue-update', { type: 'queue-update', priority: 'low', maxDelay: 500, dropThreshold: 40 }],
            ['score-update', { type: 'score-update', priority: 'low', maxDelay: 2000, dropThreshold: 60 }]
        ];
        priorities.forEach(function (_a) {
            var type = _a[0], priority = _a[1];
            _this.messagePriorities.set(type, priority);
        });
    };
    /**
     * Calculate optimal tick rate based on current network conditions
     */
    NetworkOptimizer.prototype.calculateOptimalTickRate = function (playerCount, networkMetrics) {
        var optimalRate = this.baseTickRate;
        // Adjust based on player count
        if (playerCount > 16) {
            optimalRate *= 0.8; // Reduce by 20% for high player count
        }
        else if (playerCount < 4) {
            optimalRate *= 1.1; // Increase by 10% for low player count
        }
        // Adjust based on connection quality
        if (networkMetrics.connectionQuality === 'poor' || networkMetrics.connectionQuality === 'critical') {
            optimalRate *= 0.6; // Significant reduction for poor connections
        }
        else if (networkMetrics.connectionQuality === 'fair') {
            optimalRate *= 0.8; // Moderate reduction
        }
        else if (networkMetrics.connectionQuality === 'excellent') {
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
        var maxChange = this.currentTickRate * 0.2; // Max 20% change per adjustment
        if (optimalRate > this.currentTickRate + maxChange) {
            optimalRate = this.currentTickRate + maxChange;
        }
        else if (optimalRate < this.currentTickRate - maxChange) {
            optimalRate = this.currentTickRate - maxChange;
        }
        this.currentTickRate = Math.round(optimalRate);
        return this.currentTickRate;
    };
    /**
     * Monitor connection quality for a player
     */
    NetworkOptimizer.prototype.updateConnectionQuality = function (playerId, latency, jitter, packetLoss, bandwidth) {
        // Calculate connection quality score (0-100)
        var score = 100;
        // Penalize high latency
        if (latency > 50)
            score -= Math.min(40, (latency - 50) / 5);
        // Penalize jitter
        if (jitter > 10)
            score -= Math.min(20, (jitter - 10) / 2);
        // Penalize packet loss
        score -= packetLoss * 10; // 1% loss = 10 point penalty
        // Penalize low bandwidth
        if (bandwidth < 50000)
            score -= Math.min(20, (50000 - bandwidth) / 2500);
        score = Math.max(0, Math.min(100, score));
        this.connectionQualities.set(playerId, {
            playerId: playerId,
            latency: latency,
            jitter: jitter,
            packetLoss: packetLoss,
            bandwidth: bandwidth,
            score: score,
            lastUpdated: Date.now()
        });
    };
    /**
     * Get connection quality category based on score
     */
    NetworkOptimizer.prototype.getQualityCategory = function (score) {
        if (score >= 90)
            return 'excellent';
        if (score >= 75)
            return 'good';
        if (score >= 50)
            return 'fair';
        if (score >= 25)
            return 'poor';
        return 'critical';
    };
    /**
     * Optimize bandwidth usage by adjusting message frequency and compression
     */
    NetworkOptimizer.prototype.optimizeBandwidth = function (currentUsage) {
        var targetUsage = this.currentSettings.maxBandwidth * 0.8; // Target 80% of max
        var usageRatio = currentUsage / targetUsage;
        var compressionLevel = 1.0;
        var messageFrequencyMultiplier = 1.0;
        var recommendedActions = [];
        if (usageRatio > 1.2) {
            // Critical bandwidth usage
            compressionLevel = 0.6; // Aggressive compression
            messageFrequencyMultiplier = 0.7; // Reduce message frequency
            recommendedActions.push('Enable aggressive compression');
            recommendedActions.push('Reduce non-critical message frequency');
            recommendedActions.push('Consider dropping low-priority messages');
        }
        else if (usageRatio > 1.0) {
            // High bandwidth usage
            compressionLevel = 0.8; // Moderate compression
            messageFrequencyMultiplier = 0.85; // Slightly reduce frequency
            recommendedActions.push('Enable moderate compression');
            recommendedActions.push('Prioritize critical messages');
        }
        else if (usageRatio < 0.6) {
            // Low bandwidth usage - can increase quality
            compressionLevel = 1.2; // Higher quality
            messageFrequencyMultiplier = 1.1; // Slight increase in frequency
            recommendedActions.push('Increase message quality');
            recommendedActions.push('Enable additional features');
        }
        return {
            compressionLevel: compressionLevel,
            messageFrequencyMultiplier: messageFrequencyMultiplier,
            recommendedActions: recommendedActions
        };
    };
    /**
     * Prioritize messages based on connection quality and message importance
     */
    NetworkOptimizer.prototype.prioritizeMessages = function (messages, playerId) {
        var _this = this;
        if (!this.currentSettings.prioritizationEnabled) {
            return messages.map(function (msg) { return (__assign(__assign({}, msg), { priority: 50, shouldDrop: false })); });
        }
        var connectionQuality = this.connectionQualities.get(playerId);
        var qualityScore = (connectionQuality === null || connectionQuality === void 0 ? void 0 : connectionQuality.score) || 50;
        return messages.map(function (msg) {
            var messagePriority = _this.messagePriorities.get(msg.type);
            if (!messagePriority) {
                return __assign(__assign({}, msg), { priority: 50, shouldDrop: false });
            }
            // Calculate priority score (0-100, higher is more important)
            var priorityScore = 50;
            switch (messagePriority.priority) {
                case 'critical':
                    priorityScore = 95;
                    break;
                case 'high':
                    priorityScore = 80;
                    break;
                case 'medium':
                    priorityScore = 60;
                    break;
                case 'low':
                    priorityScore = 30;
                    break;
            }
            // Adjust based on message age
            var age = Date.now() - msg.timestamp;
            if (age > messagePriority.maxDelay) {
                priorityScore *= 0.5; // Reduce priority for old messages
            }
            // Determine if message should be dropped
            var shouldDrop = qualityScore < messagePriority.dropThreshold;
            return __assign(__assign({}, msg), { priority: priorityScore, shouldDrop: shouldDrop });
        }).sort(function (a, b) { return b.priority - a.priority; }); // Sort by priority (highest first)
    };
    /**
     * Get current network metrics
     */
    NetworkOptimizer.prototype.getCurrentNetworkMetrics = function () {
        var recentBandwidth = this.bandwidthBuffer.length > 0
            ? this.bandwidthBuffer.reduce(function (sum, b) { return sum + b; }, 0) / this.bandwidthBuffer.length
            : 0;
        // Calculate average connection quality
        var qualities = Array.from(this.connectionQualities.values());
        var avgQualityScore = qualities.length > 0
            ? qualities.reduce(function (sum, q) { return sum + q.score; }, 0) / qualities.length
            : 50;
        var avgLatency = qualities.length > 0
            ? qualities.reduce(function (sum, q) { return sum + q.latency; }, 0) / qualities.length
            : 0;
        var avgPacketLoss = qualities.length > 0
            ? qualities.reduce(function (sum, q) { return sum + q.packetLoss; }, 0) / qualities.length
            : 0;
        return {
            tickRate: this.currentTickRate,
            bandwidth: recentBandwidth,
            latency: avgLatency,
            packetLoss: avgPacketLoss,
            connectionQuality: this.getQualityCategory(avgQualityScore),
            messagesPerSecond: 0,
            averageMessageSize: 0,
            compressionRatio: this.deltaCompression.getCompressionStats().averageCompressionRatio,
            timestamp: Date.now()
        };
    };
    /**
     * Record bandwidth usage
     */
    NetworkOptimizer.prototype.recordBandwidthUsage = function (bytes) {
        this.bandwidthBuffer.push(bytes);
        // Keep only recent samples (last 10 seconds assuming 1 sample per second)
        if (this.bandwidthBuffer.length > 10) {
            this.bandwidthBuffer = this.bandwidthBuffer.slice(-10);
        }
    };
    /**
     * Get optimization recommendations
     */
    NetworkOptimizer.prototype.getOptimizationRecommendations = function () {
        var metrics = this.getCurrentNetworkMetrics();
        var connectionIssues = [];
        // Check for connection issues
        if (metrics.latency > this.currentSettings.latencyThreshold) {
            connectionIssues.push("High latency: ".concat(metrics.latency, "ms"));
        }
        if (metrics.packetLoss > this.currentSettings.packetLossThreshold) {
            connectionIssues.push("Packet loss: ".concat(metrics.packetLoss.toFixed(1), "%"));
        }
        if (metrics.connectionQuality === 'poor' || metrics.connectionQuality === 'critical') {
            connectionIssues.push("Poor connection quality: ".concat(metrics.connectionQuality));
        }
        // Calculate performance impact
        var performanceImpact = 'low';
        if (connectionIssues.length > 2 || metrics.connectionQuality === 'critical') {
            performanceImpact = 'high';
        }
        else if (connectionIssues.length > 0 || metrics.connectionQuality === 'poor') {
            performanceImpact = 'medium';
        }
        return {
            tickRateRecommendation: this.calculateOptimalTickRate(8, metrics),
            bandwidthOptimization: this.optimizeBandwidth(metrics.bandwidth),
            connectionIssues: connectionIssues,
            performanceImpact: performanceImpact
        };
    };
    /**
     * Update network optimization settings
     */
    NetworkOptimizer.prototype.updateSettings = function (newSettings) {
        this.currentSettings = __assign(__assign({}, this.currentSettings), newSettings);
    };
    /**
     * Get current settings
     */
    NetworkOptimizer.prototype.getSettings = function () {
        return __assign({}, this.currentSettings);
    };
    /**
     * Reset network history and connection data
     */
    NetworkOptimizer.prototype.reset = function () {
        this.networkHistory = [];
        this.connectionQualities.clear();
        this.bandwidthBuffer = [];
        this.currentTickRate = this.baseTickRate;
    };
    /**
     * Get connection qualities for all players
     */
    NetworkOptimizer.prototype.getConnectionQualities = function () {
        return Array.from(this.connectionQualities.values())
            .filter(function (quality) { return Date.now() - quality.lastUpdated < 30000; }); // Only recent data
    };
    /**
     * Get network statistics
     */
    NetworkOptimizer.prototype.getNetworkStatistics = function () {
        var _this = this;
        var qualities = this.getConnectionQualities();
        var qualityDistribution = {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0,
            critical: 0
        };
        var totalLatency = 0;
        qualities.forEach(function (quality) {
            qualityDistribution[_this.getQualityCategory(quality.score)]++;
            totalLatency += quality.latency;
        });
        var averageBandwidth = this.bandwidthBuffer.length > 0
            ? this.bandwidthBuffer.reduce(function (sum, b) { return sum + b; }, 0) / this.bandwidthBuffer.length
            : 0;
        return {
            averageTickRate: this.currentTickRate,
            averageBandwidth: averageBandwidth,
            averageLatency: qualities.length > 0 ? totalLatency / qualities.length : 0,
            totalConnections: qualities.length,
            qualityDistribution: qualityDistribution
        };
    };
    return NetworkOptimizer;
}());
exports.NetworkOptimizer = NetworkOptimizer;
/**
 * Global network optimizer instance
 */
var globalNetworkOptimizer = null;
var NetworkOptimizerManager = /** @class */ (function () {
    function NetworkOptimizerManager() {
    }
    /**
     * Get or create global network optimizer instance
     */
    NetworkOptimizerManager.getInstance = function (settings) {
        if (!globalNetworkOptimizer) {
            globalNetworkOptimizer = new NetworkOptimizer(settings);
        }
        return globalNetworkOptimizer;
    };
    /**
     * Reset global instance (for testing)
     */
    NetworkOptimizerManager.reset = function () {
        globalNetworkOptimizer = null;
    };
    return NetworkOptimizerManager;
}());
exports.NetworkOptimizerManager = NetworkOptimizerManager;
//# sourceMappingURL=network-optimizer.js.map