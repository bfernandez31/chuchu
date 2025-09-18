"use strict";
/**
 * T029: DeltaCompression Implementation
 *
 * Delta state calculation algorithms with protobuf field presence optimization,
 * change detection for players and entities, and compression efficiency monitoring.
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
exports.DeltaCompressionManager = exports.DeltaCompression = void 0;
var DeltaCompression = /** @class */ (function () {
    function DeltaCompression() {
        this.compressionHistory = [];
        this.maxHistorySize = 100;
    }
    /**
     * Create delta state calculation between two game states
     */
    DeltaCompression.prototype.calculateDelta = function (previousState, currentState) {
        var startTime = performance.now();
        var delta = {
            baseSequence: previousState.sequence,
            deltaSequence: currentState.sequence,
            timestamp: currentState.timestamp,
            changedPlayers: [],
            changedEntities: [],
            newArrows: [],
            removedEntityIds: [],
            compressionRatio: 0,
            hasChanges: false
        };
        // Calculate player changes
        delta.changedPlayers = this.calculatePlayerDeltas(Array.from(previousState.players.values()), Array.from(currentState.players.values()));
        // Calculate entity changes
        delta.changedEntities = this.calculateEntityDeltas(Array.from(previousState.board.entities.values()), Array.from(currentState.board.entities.values()));
        // Calculate arrow changes
        delta.newArrows = this.calculateArrowDeltas(previousState.board.arrows, currentState.board.arrows);
        // Find removed entities
        delta.removedEntityIds = this.findRemovedEntities(Array.from(previousState.board.entities.values()), Array.from(currentState.board.entities.values()));
        // Determine if there are changes
        delta.hasChanges = delta.changedPlayers.length > 0 ||
            delta.changedEntities.length > 0 ||
            delta.newArrows.length > 0 ||
            delta.removedEntityIds.length > 0;
        // Calculate compression metrics
        if (delta.hasChanges) {
            var metrics = this.calculateCompressionMetrics(delta, currentState, performance.now() - startTime);
            delta.compressionRatio = metrics.compressionRatio;
            this.recordCompressionMetrics(metrics);
        }
        return delta;
    };
    /**
     * Calculate player deltas with field-level change detection
     */
    DeltaCompression.prototype.calculatePlayerDeltas = function (previousPlayers, currentPlayers) {
        var playerDeltas = [];
        var _loop_1 = function (currentPlayer) {
            var previousPlayer = previousPlayers.find(function (p) { return p.id === currentPlayer.id; });
            if (!previousPlayer) {
                // New player - include all fields
                playerDeltas.push({
                    playerId: currentPlayer.id,
                    position: currentPlayer.position,
                    score: currentPlayer.score,
                    status: currentPlayer.status,
                    color: currentPlayer.color,
                    arrows: currentPlayer.arrows,
                    changedFields: ['position', 'score', 'status', 'color', 'arrows']
                });
                return "continue";
            }
            // Compare fields and build delta
            var delta = {
                playerId: currentPlayer.id,
                changedFields: []
            };
            if (!this_1.isEqual(previousPlayer.position, currentPlayer.position)) {
                delta.position = currentPlayer.position;
                delta.changedFields.push('position');
            }
            if (previousPlayer.score !== currentPlayer.score) {
                delta.score = currentPlayer.score;
                delta.changedFields.push('score');
            }
            if (previousPlayer.status !== currentPlayer.status) {
                delta.status = currentPlayer.status;
                delta.changedFields.push('status');
            }
            if (previousPlayer.color !== currentPlayer.color) {
                delta.color = currentPlayer.color;
                delta.changedFields.push('color');
            }
            if (!this_1.arraysEqual(previousPlayer.arrows, currentPlayer.arrows)) {
                delta.arrows = currentPlayer.arrows;
                delta.changedFields.push('arrows');
            }
            // Only include delta if there are changes
            if (delta.changedFields.length > 0) {
                playerDeltas.push(delta);
            }
        };
        var this_1 = this;
        for (var _i = 0, currentPlayers_1 = currentPlayers; _i < currentPlayers_1.length; _i++) {
            var currentPlayer = currentPlayers_1[_i];
            _loop_1(currentPlayer);
        }
        return playerDeltas;
    };
    /**
     * Calculate entity deltas with field-level change detection
     */
    DeltaCompression.prototype.calculateEntityDeltas = function (previousEntities, currentEntities) {
        var entityDeltas = [];
        var _loop_2 = function (currentEntity) {
            var previousEntity = previousEntities.find(function (e) { return e.id === currentEntity.id; });
            if (!previousEntity) {
                // New entity - include all fields
                entityDeltas.push({
                    entityId: currentEntity.id,
                    entityType: currentEntity.type,
                    position: currentEntity.position,
                    direction: currentEntity.direction,
                    velocity: currentEntity.velocity,
                    status: currentEntity.status,
                    changedFields: ['position', 'direction', 'velocity', 'status']
                });
                return "continue";
            }
            // Compare fields and build delta
            var delta = {
                entityId: currentEntity.id,
                entityType: currentEntity.type,
                changedFields: []
            };
            if (!this_2.isEqual(previousEntity.position, currentEntity.position)) {
                delta.position = currentEntity.position;
                delta.changedFields.push('position');
            }
            if (previousEntity.direction !== currentEntity.direction) {
                delta.direction = currentEntity.direction;
                delta.changedFields.push('direction');
            }
            if (!this_2.isEqual(previousEntity.velocity, currentEntity.velocity)) {
                delta.velocity = currentEntity.velocity;
                delta.changedFields.push('velocity');
            }
            if (previousEntity.status !== currentEntity.status) {
                delta.status = currentEntity.status;
                delta.changedFields.push('status');
            }
            // Only include delta if there are changes
            if (delta.changedFields.length > 0) {
                entityDeltas.push(delta);
            }
        };
        var this_2 = this;
        for (var _i = 0, currentEntities_1 = currentEntities; _i < currentEntities_1.length; _i++) {
            var currentEntity = currentEntities_1[_i];
            _loop_2(currentEntity);
        }
        return entityDeltas;
    };
    /**
     * Calculate arrow deltas (new arrows only)
     */
    DeltaCompression.prototype.calculateArrowDeltas = function (previousArrows, currentArrows) {
        var newArrows = [];
        var _loop_3 = function (currentArrow) {
            var previousArrow = previousArrows.find(function (a) { return a.id === currentArrow.id; });
            if (!previousArrow) {
                newArrows.push({
                    id: currentArrow.id,
                    position: currentArrow.position,
                    direction: currentArrow.direction,
                    playerId: currentArrow.playerId,
                    timestamp: currentArrow.timestamp
                });
            }
        };
        for (var _i = 0, currentArrows_1 = currentArrows; _i < currentArrows_1.length; _i++) {
            var currentArrow = currentArrows_1[_i];
            _loop_3(currentArrow);
        }
        return newArrows;
    };
    /**
     * Find entities that were removed
     */
    DeltaCompression.prototype.findRemovedEntities = function (previousEntities, currentEntities) {
        var removedIds = [];
        var _loop_4 = function (previousEntity) {
            var currentEntity = currentEntities.find(function (e) { return e.id === previousEntity.id; });
            if (!currentEntity) {
                removedIds.push(previousEntity.id);
            }
        };
        for (var _i = 0, previousEntities_1 = previousEntities; _i < previousEntities_1.length; _i++) {
            var previousEntity = previousEntities_1[_i];
            _loop_4(previousEntity);
        }
        return removedIds;
    };
    /**
     * Calculate compression metrics and efficiency
     */
    DeltaCompression.prototype.calculateCompressionMetrics = function (delta, fullState, processingTime) {
        var originalSize = this.getStateSize(fullState);
        var compressedSize = this.getDeltaSize(delta);
        var compressionRatio = originalSize > 0 ? 1 - (compressedSize / originalSize) : 0;
        // Count changed fields vs total fields
        var fieldsChanged = 0;
        var totalFields = 0;
        // Count player fields
        delta.changedPlayers.forEach(function (playerDelta) {
            fieldsChanged += playerDelta.changedFields.length;
            totalFields += 5; // position, score, status, color, arrows
        });
        // Count entity fields
        delta.changedEntities.forEach(function (entityDelta) {
            fieldsChanged += entityDelta.changedFields.length;
            totalFields += 4; // position, direction, velocity, status
        });
        // Add new arrows and removed entities
        fieldsChanged += delta.newArrows.length + delta.removedEntityIds.length;
        totalFields += fullState.board.arrows.length + fullState.board.entities.size;
        return {
            originalSize: originalSize,
            compressedSize: compressedSize,
            compressionRatio: Math.max(0, Math.min(1, compressionRatio)),
            fieldsChanged: fieldsChanged,
            totalFields: totalFields,
            timestamp: Date.now()
        };
    };
    /**
     * Estimate size of full state in bytes
     */
    DeltaCompression.prototype.getStateSize = function (state) {
        return JSON.stringify(state).length;
    };
    /**
     * Estimate size of delta in bytes
     */
    DeltaCompression.prototype.getDeltaSize = function (delta) {
        return JSON.stringify(delta).length;
    };
    /**
     * Record compression metrics for monitoring
     */
    DeltaCompression.prototype.recordCompressionMetrics = function (metrics) {
        this.compressionHistory.push(metrics);
        // Maintain history size limit
        if (this.compressionHistory.length > this.maxHistorySize) {
            this.compressionHistory = this.compressionHistory.slice(-this.maxHistorySize);
        }
    };
    /**
     * Get compression efficiency statistics
     */
    DeltaCompression.prototype.getCompressionStats = function () {
        if (this.compressionHistory.length === 0) {
            return {
                averageCompressionRatio: 0,
                averageFieldsChanged: 0,
                averageProcessingTime: 0,
                totalDeltas: 0,
                efficiencyTrend: 'stable'
            };
        }
        var recent = this.compressionHistory;
        var averageCompressionRatio = recent.reduce(function (sum, m) { return sum + m.compressionRatio; }, 0) / recent.length;
        var averageFieldsChanged = recent.reduce(function (sum, m) { return sum + (m.totalFields > 0 ? m.fieldsChanged / m.totalFields : 0); }, 0) / recent.length;
        // Calculate trend (compare first half vs second half)
        var efficiencyTrend = 'stable';
        if (recent.length >= 10) {
            var midpoint = Math.floor(recent.length / 2);
            var firstHalf = recent.slice(0, midpoint);
            var secondHalf = recent.slice(midpoint);
            var firstAvg = firstHalf.reduce(function (sum, m) { return sum + m.compressionRatio; }, 0) / firstHalf.length;
            var secondAvg = secondHalf.reduce(function (sum, m) { return sum + m.compressionRatio; }, 0) / secondHalf.length;
            var difference = secondAvg - firstAvg;
            if (difference > 0.05) {
                efficiencyTrend = 'improving';
            }
            else if (difference < -0.05) {
                efficiencyTrend = 'declining';
            }
        }
        return {
            averageCompressionRatio: averageCompressionRatio,
            averageFieldsChanged: averageFieldsChanged,
            averageProcessingTime: 0,
            totalDeltas: recent.length,
            efficiencyTrend: efficiencyTrend
        };
    };
    /**
     * Optimize delta based on field importance and frequency
     */
    DeltaCompression.prototype.optimizeDelta = function (delta) {
        var optimized = __assign({}, delta);
        // Priority-based field filtering
        // High priority: position, status changes
        // Medium priority: score, direction changes
        // Low priority: color, minor state changes
        optimized.changedPlayers = optimized.changedPlayers.map(function (playerDelta) {
            var optimizedFields = playerDelta.changedFields.filter(function (field) {
                // Always include high-priority fields
                if (['position', 'status'].includes(field))
                    return true;
                // Include medium-priority fields if compression ratio is good
                if (['score', 'direction'].includes(field) && delta.compressionRatio > 0.3)
                    return true;
                // Include low-priority fields only if compression ratio is excellent
                if (['color'].includes(field) && delta.compressionRatio > 0.7)
                    return true;
                return false;
            });
            return __assign(__assign({}, playerDelta), { changedFields: optimizedFields });
        });
        return optimized;
    };
    /**
     * Helper method to compare objects for equality
     */
    DeltaCompression.prototype.isEqual = function (obj1, obj2) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    };
    /**
     * Helper method to compare arrays for equality
     */
    DeltaCompression.prototype.arraysEqual = function (arr1, arr2) {
        if (arr1.length !== arr2.length)
            return false;
        return JSON.stringify(arr1) === JSON.stringify(arr2);
    };
    /**
     * Reset compression history (for testing)
     */
    DeltaCompression.prototype.resetHistory = function () {
        this.compressionHistory = [];
    };
    /**
     * Get recent compression metrics
     */
    DeltaCompression.prototype.getRecentMetrics = function (count) {
        if (count === void 0) { count = 10; }
        return this.compressionHistory.slice(-count);
    };
    return DeltaCompression;
}());
exports.DeltaCompression = DeltaCompression;
/**
 * Global delta compression instance
 */
var globalDeltaCompression = null;
var DeltaCompressionManager = /** @class */ (function () {
    function DeltaCompressionManager() {
    }
    /**
     * Get or create global delta compression instance
     */
    DeltaCompressionManager.getInstance = function () {
        if (!globalDeltaCompression) {
            globalDeltaCompression = new DeltaCompression();
        }
        return globalDeltaCompression;
    };
    /**
     * Reset global instance (for testing)
     */
    DeltaCompressionManager.reset = function () {
        globalDeltaCompression = null;
    };
    return DeltaCompressionManager;
}());
exports.DeltaCompressionManager = DeltaCompressionManager;
//# sourceMappingURL=delta-compression.js.map