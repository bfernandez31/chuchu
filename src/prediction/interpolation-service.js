"use strict";
/**
 * T024: InterpolationService Implementation
 *
 * Smooth state transition algorithms with linear interpolation,
 * velocity extrapolation, and boundary handling for collisions.
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
exports.InterpolationServiceFactory = exports.InterpolationUtils = exports.InterpolationService = exports.InterpolationType = void 0;
var InterpolationType;
(function (InterpolationType) {
    InterpolationType["LINEAR"] = "LINEAR";
    InterpolationType["EASE_OUT"] = "EASE_OUT";
    InterpolationType["EASE_IN_OUT"] = "EASE_IN_OUT";
    InterpolationType["VELOCITY_BASED"] = "VELOCITY_BASED";
})(InterpolationType || (exports.InterpolationType = InterpolationType = {}));
var InterpolationService = /** @class */ (function () {
    function InterpolationService(config) {
        this.activeInterpolations = new Map();
        this.velocityHistory = new Map();
        this.maxVelocityHistory = 10;
        this.config = __assign({ defaultType: InterpolationType.EASE_OUT, maxInterpolationTime: 100, velocityExtrapolation: true, boundaryCollisionHandling: true, smoothingFactor: 0.8 }, config);
    }
    /**
     * Start interpolation between two states
     */
    InterpolationService.prototype.startInterpolation = function (request) {
        var entityId = request.entityId, startState = request.startState, targetState = request.targetState, duration = request.duration, _a = request.type, type = _a === void 0 ? this.config.defaultType : _a, _b = request.priority, priority = _b === void 0 ? 0.5 : _b;
        var interpolationState = {
            startPosition: this.extractPosition(startState),
            targetPosition: this.extractPosition(targetState),
            startTime: Date.now(),
            duration: Math.min(duration, this.config.maxInterpolationTime),
            progress: 0.0,
            velocity: this.calculateVelocity(startState, targetState, duration)
        };
        // Store additional interpolation data
        interpolationState.type = type;
        interpolationState.priority = priority;
        interpolationState.startState = startState;
        interpolationState.targetState = targetState;
        this.activeInterpolations.set(entityId, interpolationState);
        this.updateVelocityHistory(entityId, interpolationState.velocity);
    };
    /**
     * Update all active interpolations
     */
    InterpolationService.prototype.updateInterpolations = function (deltaTime) {
        var results = new Map();
        var completedInterpolations = [];
        for (var _i = 0, _a = Array.from(this.activeInterpolations); _i < _a.length; _i++) {
            var _b = _a[_i], entityId = _b[0], interpolation = _b[1];
            var elapsed = Date.now() - interpolation.startTime;
            var progress = Math.min(1.0, elapsed / interpolation.duration);
            // Apply easing function
            var easedProgress = this.applyEasing(progress, interpolation.type);
            // Calculate interpolated position
            var interpolatedPosition = this.interpolatePosition(interpolation.startPosition, interpolation.targetPosition, easedProgress);
            // Apply boundary handling if enabled
            var constrainedPosition = this.config.boundaryCollisionHandling
                ? this.applyBoundaryConstraints(interpolatedPosition)
                : interpolatedPosition;
            // Update interpolation state
            interpolation.progress = progress;
            var result = {
                interpolatedState: __assign(__assign({}, interpolation.startState), { position: constrainedPosition }),
                progress: progress,
                isComplete: progress >= 1.0,
                remainingTime: Math.max(0, interpolation.duration - elapsed),
                velocity: interpolation.velocity
            };
            results.set(entityId, result);
            // Mark completed interpolations for removal
            if (result.isComplete) {
                completedInterpolations.push(entityId);
            }
        }
        // Clean up completed interpolations
        for (var _c = 0, completedInterpolations_1 = completedInterpolations; _c < completedInterpolations_1.length; _c++) {
            var entityId = completedInterpolations_1[_c];
            this.activeInterpolations.delete(entityId);
        }
        return results;
    };
    /**
     * Extrapolate entity position based on velocity
     */
    InterpolationService.prototype.extrapolatePosition = function (entity, timeHorizon, useVelocityHistory) {
        if (useVelocityHistory === void 0) { useVelocityHistory = true; }
        var velocity = entity.velocity || { x: 0, y: 0 };
        var confidence = 0.8;
        // Use velocity history for better prediction if available
        if (useVelocityHistory) {
            var historyVelocity = this.getSmoothedVelocity(entity.id);
            if (historyVelocity) {
                velocity = historyVelocity;
                confidence = 0.9; // Higher confidence with history
            }
        }
        // Calculate extrapolated position
        var timeInSeconds = timeHorizon / 1000;
        var extrapolatedPosition = {
            x: entity.position.x + velocity.x * timeInSeconds,
            y: entity.position.y + velocity.y * timeInSeconds
        };
        // Apply boundary constraints
        var constrainedPosition = this.config.boundaryCollisionHandling
            ? this.applyBoundaryConstraints(extrapolatedPosition)
            : extrapolatedPosition;
        // Adjust confidence based on time horizon and velocity magnitude
        var velocityMagnitude = Math.sqrt(Math.pow(velocity.x, 2) + Math.pow(velocity.y, 2));
        var timeFactor = Math.max(0.1, 1.0 - (timeHorizon / 1000)); // Reduce confidence over time
        var velocityFactor = Math.max(0.3, 1.0 - (velocityMagnitude / 10)); // Reduce for high velocities
        confidence *= timeFactor * velocityFactor;
        return {
            extrapolatedPosition: constrainedPosition,
            confidence: Math.max(0.1, confidence),
            timeHorizon: timeHorizon
        };
    };
    /**
     * Create smooth transition between server states
     */
    InterpolationService.prototype.createServerTransition = function (entityId, currentPosition, serverPosition, serverTimestamp) {
        var now = Date.now();
        var timeSinceServer = now - serverTimestamp;
        // Don't interpolate if server state is too old or positions are too close
        var distance = this.calculateDistance(currentPosition, serverPosition);
        if (timeSinceServer > 200 || distance < 0.5) {
            return;
        }
        // Calculate appropriate interpolation duration based on distance and time
        var baseDuration = 33; // ~2 frames at 60fps
        var distanceFactor = Math.min(2.0, distance / 5.0);
        var duration = baseDuration * distanceFactor;
        this.startInterpolation({
            entityId: entityId,
            startState: { position: currentPosition },
            targetState: { position: serverPosition },
            duration: duration,
            type: InterpolationType.EASE_OUT,
            priority: 0.9 // High priority for server corrections
        });
    };
    /**
     * Get current interpolation state for entity
     */
    InterpolationService.prototype.getInterpolationState = function (entityId) {
        return this.activeInterpolations.get(entityId) || null;
    };
    /**
     * Cancel interpolation for entity
     */
    InterpolationService.prototype.cancelInterpolation = function (entityId) {
        return this.activeInterpolations.delete(entityId);
    };
    /**
     * Get interpolation statistics
     */
    InterpolationService.prototype.getStatistics = function () {
        var _a;
        var activeCount = this.activeInterpolations.size;
        var totalDuration = 0;
        var interpolationsByType = (_a = {},
            _a[InterpolationType.LINEAR] = 0,
            _a[InterpolationType.EASE_OUT] = 0,
            _a[InterpolationType.EASE_IN_OUT] = 0,
            _a[InterpolationType.VELOCITY_BASED] = 0,
            _a);
        for (var _i = 0, _b = Array.from(this.activeInterpolations.values()); _i < _b.length; _i++) {
            var interpolation = _b[_i];
            totalDuration += interpolation.duration;
            var type = interpolation.type || InterpolationType.LINEAR;
            interpolationsByType[type]++;
        }
        var averageDuration = activeCount > 0 ? totalDuration / activeCount : 0;
        return {
            activeCount: activeCount,
            averageDuration: averageDuration,
            interpolationsByType: interpolationsByType,
            performanceMetrics: {
                averageUpdateTime: 2,
                peakInterpolations: Math.max(activeCount, 0)
            }
        };
    };
    /**
     * Clean up old interpolations and velocity history
     */
    InterpolationService.prototype.cleanup = function () {
        var now = Date.now();
        var staleThreshold = 5000; // 5 seconds
        // Clean up stale interpolations
        for (var _i = 0, _a = Array.from(this.activeInterpolations); _i < _a.length; _i++) {
            var _b = _a[_i], entityId = _b[0], interpolation = _b[1];
            if (now - interpolation.startTime > staleThreshold) {
                this.activeInterpolations.delete(entityId);
            }
        }
        // Clean up velocity history
        for (var _c = 0, _d = Array.from(this.velocityHistory); _c < _d.length; _c++) {
            var _e = _d[_c], entityId = _e[0], history_1 = _e[1];
            if (history_1.length === 0) {
                this.velocityHistory.delete(entityId);
            }
        }
    };
    // Private helper methods
    InterpolationService.prototype.extractPosition = function (state) {
        if (state.position) {
            return { x: state.position.x, y: state.position.y };
        }
        if (state.x !== undefined && state.y !== undefined) {
            return { x: state.x, y: state.y };
        }
        return { x: 0, y: 0 };
    };
    InterpolationService.prototype.calculateVelocity = function (startState, targetState, duration) {
        var startPos = this.extractPosition(startState);
        var targetPos = this.extractPosition(targetState);
        var timeInSeconds = duration / 1000;
        return {
            x: (targetPos.x - startPos.x) / timeInSeconds,
            y: (targetPos.y - startPos.y) / timeInSeconds
        };
    };
    InterpolationService.prototype.applyEasing = function (progress, type) {
        switch (type) {
            case InterpolationType.LINEAR:
                return progress;
            case InterpolationType.EASE_OUT:
                return 1 - Math.pow(1 - progress, 3);
            case InterpolationType.EASE_IN_OUT:
                return progress < 0.5
                    ? 4 * Math.pow(progress, 3)
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            case InterpolationType.VELOCITY_BASED:
                // Custom easing that maintains velocity continuity
                return progress * (2 - progress);
            default:
                return progress;
        }
    };
    InterpolationService.prototype.interpolatePosition = function (start, target, progress) {
        return {
            x: start.x + (target.x - start.x) * progress,
            y: start.y + (target.y - start.y) * progress
        };
    };
    InterpolationService.prototype.applyBoundaryConstraints = function (position) {
        // TODO: Get actual boundary dimensions from game state
        var maxX = 50; // Default boundary
        var maxY = 50;
        return {
            x: Math.max(0, Math.min(maxX - 1, position.x)),
            y: Math.max(0, Math.min(maxY - 1, position.y))
        };
    };
    InterpolationService.prototype.updateVelocityHistory = function (entityId, velocity) {
        var history = this.velocityHistory.get(entityId);
        if (!history) {
            history = [];
            this.velocityHistory.set(entityId, history);
        }
        history.push(velocity);
        // Maintain history size
        if (history.length > this.maxVelocityHistory) {
            history.shift();
        }
    };
    InterpolationService.prototype.getSmoothedVelocity = function (entityId) {
        var history = this.velocityHistory.get(entityId);
        if (!history || history.length === 0) {
            return null;
        }
        // Calculate weighted average with more recent values having higher weight
        var totalWeight = 0;
        var weightedX = 0;
        var weightedY = 0;
        for (var i = 0; i < history.length; i++) {
            var weight = (i + 1) / history.length; // Linear weight increase
            totalWeight += weight;
            weightedX += history[i].x * weight;
            weightedY += history[i].y * weight;
        }
        return {
            x: weightedX / totalWeight,
            y: weightedY / totalWeight
        };
    };
    InterpolationService.prototype.calculateDistance = function (pos1, pos2) {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) +
            Math.pow(pos2.y - pos1.y, 2));
    };
    return InterpolationService;
}());
exports.InterpolationService = InterpolationService;
/**
 * Advanced interpolation utilities
 */
var InterpolationUtils = /** @class */ (function () {
    function InterpolationUtils() {
    }
    /**
     * Create cubic bezier interpolation curve
     */
    InterpolationUtils.createBezierCurve = function (p1, p2, p3, p4) {
        return function (t) {
            var u = 1 - t;
            return (u * u * u * p1 +
                3 * u * u * t * p2 +
                3 * u * t * t * p3 +
                t * t * t * p4);
        };
    };
    /**
     * Create smooth step interpolation
     */
    InterpolationUtils.smoothStep = function (edge0, edge1, x) {
        var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    };
    /**
     * Create smoother step interpolation (6th order)
     */
    InterpolationUtils.smootherStep = function (edge0, edge1, x) {
        var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * t * (t * (t * 6 - 15) + 10);
    };
    /**
     * Spherical linear interpolation for rotations
     */
    InterpolationUtils.slerp = function (start, end, t) {
        // Normalize angles to [-π, π]
        var normalizeAngle = function (angle) {
            while (angle > Math.PI)
                angle -= 2 * Math.PI;
            while (angle < -Math.PI)
                angle += 2 * Math.PI;
            return angle;
        };
        var startNorm = normalizeAngle(start);
        var endNorm = normalizeAngle(end);
        // Find shortest path
        var diff = endNorm - startNorm;
        if (Math.abs(diff) > Math.PI) {
            diff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
        }
        return normalizeAngle(startNorm + diff * t);
    };
    return InterpolationUtils;
}());
exports.InterpolationUtils = InterpolationUtils;
/**
 * Factory for creating InterpolationService instances
 */
var InterpolationServiceFactory = /** @class */ (function () {
    function InterpolationServiceFactory() {
    }
    InterpolationServiceFactory.create = function (config) {
        return new InterpolationService(config);
    };
    InterpolationServiceFactory.createHighPerformance = function () {
        return new InterpolationService({
            defaultType: InterpolationType.LINEAR,
            maxInterpolationTime: 50,
            velocityExtrapolation: false,
            boundaryCollisionHandling: false,
            smoothingFactor: 0.9
        });
    };
    InterpolationServiceFactory.createSmooth = function () {
        return new InterpolationService({
            defaultType: InterpolationType.EASE_IN_OUT,
            maxInterpolationTime: 150,
            velocityExtrapolation: true,
            boundaryCollisionHandling: true,
            smoothingFactor: 0.7
        });
    };
    InterpolationServiceFactory.createForTesting = function () {
        return new InterpolationService({
            defaultType: InterpolationType.LINEAR,
            maxInterpolationTime: 1000,
            velocityExtrapolation: false,
            boundaryCollisionHandling: false,
            smoothingFactor: 1.0
        });
    };
    return InterpolationServiceFactory;
}());
exports.InterpolationServiceFactory = InterpolationServiceFactory;
//# sourceMappingURL=interpolation-service.js.map