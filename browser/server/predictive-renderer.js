"use strict";
/**
 * T032: PredictiveRenderer Implementation
 *
 * Client-side prediction rendering with smooth interpolation display,
 * local input immediate feedback, and rollback visual correction.
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
exports.PredictiveRenderer = void 0;
var prediction_engine_1 = require("../../src/prediction/prediction-engine");
var rollback_manager_1 = require("../../src/prediction/rollback-manager");
var PredictiveRenderer = /** @class */ (function () {
    function PredictiveRenderer(gameDisplay) {
        this.pendingInputs = [];
        this.interpolationStartTime = 0;
        this.interpolationStartState = null;
        this.interpolationTargetState = null;
        this.rollbackStartTime = 0;
        this.rollbackStartPositions = new Map();
        this.rollbackTargetPositions = new Map();
        // Performance tracking
        this.predictionFrameTime = 0;
        this.interpolationFrameTime = 0;
        this.rollbackCorrectionCount = 0;
        this.gameDisplay = gameDisplay;
        this.predictionEngine = new prediction_engine_1.PredictionEngine();
        this.rollbackManager = new rollback_manager_1.RollbackManager();
        this.renderingState = {
            authoritative: null,
            predicted: null,
            interpolated: null,
            rollbackActive: false,
            predictionConfidence: 1.0
        };
        this.interpolationOptions = {
            method: 'smooth',
            duration: 100,
            velocityPrediction: true,
            boundaryHandling: true
        };
        this.rollbackOptions = {
            smoothingDuration: 50,
            easingFunction: 'easeOut',
            maxCorrectionDistance: 100,
            imperceptibilityThreshold: 2 // 2 pixels imperceptibility threshold
        };
        // Enable predictive layer in GameDisplay
        this.gameDisplay.setPredictiveLayerEnabled(true);
    }
    /**
     * Process new authoritative state from server
     */
    PredictiveRenderer.prototype.processAuthoritativeState = function (newState) {
        var previousState = this.renderingState.authoritative;
        this.renderingState.authoritative = newState;
        // Check if rollback is needed
        if (this.renderingState.predicted && this.needsRollback(newState)) {
            this.performRollbackCorrection(newState);
        }
        else {
            // Start smooth interpolation to new state
            this.startInterpolation(this.renderingState.interpolated || previousState, newState);
        }
        // Update prediction engine with new authoritative state
        this.predictionEngine.updateAuthoritativeState(newState);
    };
    /**
     * Add local input for immediate prediction
     */
    PredictiveRenderer.prototype.addLocalInput = function (input) {
        var startTime = performance.now();
        // Add to pending inputs
        this.pendingInputs.push(input);
        // Generate immediate prediction
        var predictedState = this.predictionEngine.predictFromInput(input, this.renderingState.authoritative || this.createDefaultState(), this.pendingInputs);
        this.renderingState.predicted = predictedState;
        this.renderingState.predictionConfidence = predictedState.confidence;
        // Apply immediate visual feedback
        this.applyImmediateFeedback(input, predictedState);
        this.predictionFrameTime = performance.now() - startTime;
    };
    /**
     * Update rendering state and display
     */
    PredictiveRenderer.prototype.update = function () {
        var currentTime = performance.now();
        // Update interpolation
        if (this.isInterpolating()) {
            this.updateInterpolation(currentTime);
        }
        // Update rollback visual correction
        if (this.renderingState.rollbackActive) {
            this.updateRollbackCorrection(currentTime);
        }
        // Clean up old pending inputs
        this.cleanupPendingInputs();
        // Render current state
        this.render();
    };
    /**
     * Render current predictive state
     */
    PredictiveRenderer.prototype.render = function () {
        var _a;
        var stateToRender = this.renderingState.interpolated ||
            ((_a = this.renderingState.predicted) === null || _a === void 0 ? void 0 : _a.state) ||
            this.renderingState.authoritative;
        if (stateToRender) {
            // Render prediction confidence indicator
            this.renderPredictionConfidence();
            // Render predictive elements on the predictive layer
            this.renderPredictiveElements(stateToRender);
            // Update main display
            this.gameDisplay.display({ state: stateToRender });
        }
    };
    /**
     * Check if rollback correction is needed
     */
    PredictiveRenderer.prototype.needsRollback = function (authoritativeState) {
        if (!this.renderingState.predicted)
            return false;
        return this.rollbackManager.detectPredictionError(this.renderingState.predicted, authoritativeState, 2 // 2 pixel threshold
        );
    };
    /**
     * Perform rollback visual correction
     */
    PredictiveRenderer.prototype.performRollbackCorrection = function (authoritativeState) {
        this.rollbackCorrectionCount++;
        var corrections = this.rollbackManager.calculateCorrections(this.renderingState.predicted, authoritativeState);
        // Check if corrections are imperceptible
        var maxCorrection = Math.max.apply(Math, corrections.map(function (c) {
            return Math.sqrt(Math.pow(c.positionDelta.x, 2) + Math.pow(c.positionDelta.y, 2));
        }));
        if (maxCorrection <= this.rollbackOptions.imperceptibilityThreshold) {
            // Imperceptible correction - apply immediately
            this.renderingState.interpolated = authoritativeState;
            this.renderingState.rollbackActive = false;
            return;
        }
        // Start smooth rollback correction
        this.startRollbackCorrection(corrections, authoritativeState);
    };
    /**
     * Start smooth rollback correction
     */
    PredictiveRenderer.prototype.startRollbackCorrection = function (corrections, targetState) {
        var _this = this;
        this.renderingState.rollbackActive = true;
        this.rollbackStartTime = performance.now();
        // Store start and target positions for smooth correction
        corrections.forEach(function (correction) {
            var startPos = _this.getEntityPosition(correction.entityId, _this.renderingState.interpolated);
            var targetPos = _this.getEntityPosition(correction.entityId, targetState);
            if (startPos && targetPos) {
                _this.rollbackStartPositions.set(correction.entityId, startPos);
                _this.rollbackTargetPositions.set(correction.entityId, targetPos);
            }
        });
        // Replay inputs after rollback
        this.replayInputsAfterRollback(targetState);
    };
    /**
     * Update rollback visual correction
     */
    PredictiveRenderer.prototype.updateRollbackCorrection = function (currentTime) {
        var elapsed = currentTime - this.rollbackStartTime;
        var progress = Math.min(1, elapsed / this.rollbackOptions.smoothingDuration);
        if (progress >= 1) {
            // Rollback correction complete
            this.renderingState.rollbackActive = false;
            this.rollbackStartPositions.clear();
            this.rollbackTargetPositions.clear();
            return;
        }
        // Apply easing function
        var easedProgress = this.applyEasing(progress, this.rollbackOptions.easingFunction);
        // Interpolate positions
        var correctedState = this.createCorrectedState(easedProgress);
        this.renderingState.interpolated = correctedState;
    };
    /**
     * Start smooth interpolation between states
     */
    PredictiveRenderer.prototype.startInterpolation = function (fromState, toState) {
        if (!fromState || !toState) {
            this.renderingState.interpolated = toState;
            return;
        }
        this.interpolationStartTime = performance.now();
        this.interpolationStartState = fromState;
        this.interpolationTargetState = toState;
    };
    /**
     * Update interpolation state
     */
    PredictiveRenderer.prototype.updateInterpolation = function (currentTime) {
        var startTime = performance.now();
        var elapsed = currentTime - this.interpolationStartTime;
        var progress = Math.min(1, elapsed / this.interpolationOptions.duration);
        if (progress >= 1) {
            this.renderingState.interpolated = this.interpolationTargetState;
            this.interpolationStartState = null;
            this.interpolationTargetState = null;
            return;
        }
        // Perform interpolation based on method
        this.renderingState.interpolated = this.interpolateStates(this.interpolationStartState, this.interpolationTargetState, progress);
        this.interpolationFrameTime = performance.now() - startTime;
    };
    /**
     * Interpolate between two game states
     */
    PredictiveRenderer.prototype.interpolateStates = function (fromState, toState, progress) {
        var _this = this;
        var _a, _b, _c, _d;
        var result = JSON.parse(JSON.stringify(toState)); // Deep copy
        // Interpolate player positions
        if (fromState.players && toState.players) {
            result.players = toState.players.map(function (toPlayer) {
                var fromPlayer = fromState.players.find(function (p) { return p.id === toPlayer.id; });
                if (!fromPlayer)
                    return toPlayer;
                return __assign(__assign({}, toPlayer), { position: _this.interpolatePosition(fromPlayer.position, toPlayer.position, progress) });
            });
        }
        // Interpolate entity positions
        if (((_a = fromState.strategy) === null || _a === void 0 ? void 0 : _a.mouses) && ((_b = toState.strategy) === null || _b === void 0 ? void 0 : _b.mouses)) {
            result.strategy.mouses = toState.strategy.mouses.map(function (toMouse) {
                var fromMouse = fromState.strategy.mouses.find(function (m) { return m.id === toMouse.id; });
                if (!fromMouse)
                    return toMouse;
                var interpolatedPosition = _this.interpolatePosition(fromMouse.position, toMouse.position, progress);
                // Add velocity prediction if enabled
                if (_this.interpolationOptions.velocityPrediction) {
                    var velocity = _this.calculateVelocity(fromMouse.position, toMouse.position);
                    return __assign(__assign({}, toMouse), { position: _this.extrapolatePosition(interpolatedPosition, velocity, progress) });
                }
                return __assign(__assign({}, toMouse), { position: interpolatedPosition });
            });
        }
        // Similar interpolation for cats
        if (((_c = fromState.strategy) === null || _c === void 0 ? void 0 : _c.cats) && ((_d = toState.strategy) === null || _d === void 0 ? void 0 : _d.cats)) {
            result.strategy.cats = toState.strategy.cats.map(function (toCat) {
                var fromCat = fromState.strategy.cats.find(function (c) { return c.id === toCat.id; });
                if (!fromCat)
                    return toCat;
                return __assign(__assign({}, toCat), { position: _this.interpolatePosition(fromCat.position, toCat.position, progress) });
            });
        }
        return result;
    };
    /**
     * Interpolate position between two points
     */
    PredictiveRenderer.prototype.interpolatePosition = function (from, to, progress) {
        switch (this.interpolationOptions.method) {
            case 'linear':
                return [
                    from[0] + (to[0] - from[0]) * progress,
                    from[1] + (to[1] - from[1]) * progress
                ];
            case 'smooth':
                var smoothProgress = this.smoothStep(progress);
                return [
                    from[0] + (to[0] - from[0]) * smoothProgress,
                    from[1] + (to[1] - from[1]) * smoothProgress
                ];
            case 'cubic':
                var cubicProgress = progress * progress * (3 - 2 * progress);
                return [
                    from[0] + (to[0] - from[0]) * cubicProgress,
                    from[1] + (to[1] - from[1]) * cubicProgress
                ];
            default:
                return to;
        }
    };
    /**
     * Apply immediate visual feedback for local input
     */
    PredictiveRenderer.prototype.applyImmediateFeedback = function (input, predictedState) {
        var _a;
        // Update the current interpolated state with immediate feedback
        if (this.renderingState.interpolated) {
            // Find the player and update their predicted position
            var player = (_a = this.renderingState.interpolated.players) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.id === input.playerId; });
            if (player && predictedState.predictedEntities.has(input.playerId)) {
                var prediction = predictedState.predictedEntities.get(input.playerId);
                if (prediction) {
                    player.position = prediction.position;
                }
            }
        }
    };
    /**
     * Render prediction confidence indicator
     */
    PredictiveRenderer.prototype.renderPredictionConfidence = function () {
        // This would render a confidence indicator on the UI layer
        // For now, we'll just log it in development mode
        if (this.renderingState.predictionConfidence < 0.8) {
            console.debug("Low prediction confidence: ".concat(this.renderingState.predictionConfidence.toFixed(2)));
        }
    };
    /**
     * Render predictive elements on the predictive layer
     */
    PredictiveRenderer.prototype.renderPredictiveElements = function (state) {
        // This method would be called by GameDisplay's renderPredictiveLayer
        // Add visual indicators for predictions, rollbacks, etc.
    };
    /**
     * Helper methods
     */
    PredictiveRenderer.prototype.isInterpolating = function () {
        return this.interpolationStartState !== null && this.interpolationTargetState !== null;
    };
    PredictiveRenderer.prototype.smoothStep = function (t) {
        return t * t * (3 - 2 * t);
    };
    PredictiveRenderer.prototype.applyEasing = function (t, easingFunction) {
        switch (easingFunction) {
            case 'easeOut':
                return 1 - Math.pow(1 - t, 2);
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            default:
                return t;
        }
    };
    PredictiveRenderer.prototype.calculateVelocity = function (from, to) {
        return {
            x: to[0] - from[0],
            y: to[1] - from[1]
        };
    };
    PredictiveRenderer.prototype.extrapolatePosition = function (position, velocity, factor) {
        return [
            position[0] + velocity.x * factor * 0.1,
            position[1] + velocity.y * factor * 0.1
        ];
    };
    PredictiveRenderer.prototype.getEntityPosition = function (entityId, state) {
        var _a, _b, _c, _d, _e;
        // Find entity position in state
        var player = (_a = state === null || state === void 0 ? void 0 : state.players) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.id === entityId; });
        if (player) {
            return { x: player.position[0], y: player.position[1] };
        }
        var mouse = (_c = (_b = state === null || state === void 0 ? void 0 : state.strategy) === null || _b === void 0 ? void 0 : _b.mouses) === null || _c === void 0 ? void 0 : _c.find(function (m) { return m.id === entityId; });
        if (mouse) {
            return { x: mouse.position[0], y: mouse.position[1] };
        }
        var cat = (_e = (_d = state === null || state === void 0 ? void 0 : state.strategy) === null || _d === void 0 ? void 0 : _d.cats) === null || _e === void 0 ? void 0 : _e.find(function (c) { return c.id === entityId; });
        if (cat) {
            return { x: cat.position[0], y: cat.position[1] };
        }
        return null;
    };
    PredictiveRenderer.prototype.createCorrectedState = function (progress) {
        var _this = this;
        var state = JSON.parse(JSON.stringify(this.renderingState.authoritative));
        // Apply position corrections
        this.rollbackStartPositions.forEach(function (startPos, entityId) {
            var targetPos = _this.rollbackTargetPositions.get(entityId);
            if (targetPos) {
                var correctedPos = {
                    x: startPos.x + (targetPos.x - startPos.x) * progress,
                    y: startPos.y + (targetPos.y - startPos.y) * progress
                };
                // Update entity position in state
                _this.updateEntityPosition(state, entityId, correctedPos);
            }
        });
        return state;
    };
    PredictiveRenderer.prototype.updateEntityPosition = function (state, entityId, position) {
        var _a, _b, _c, _d, _e;
        // Update player position
        var player = (_a = state === null || state === void 0 ? void 0 : state.players) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.id === entityId; });
        if (player) {
            player.position = [position.x, position.y];
            return;
        }
        // Update mouse position
        var mouse = (_c = (_b = state === null || state === void 0 ? void 0 : state.strategy) === null || _b === void 0 ? void 0 : _b.mouses) === null || _c === void 0 ? void 0 : _c.find(function (m) { return m.id === entityId; });
        if (mouse) {
            mouse.position = [position.x, position.y];
            return;
        }
        // Update cat position
        var cat = (_e = (_d = state === null || state === void 0 ? void 0 : state.strategy) === null || _d === void 0 ? void 0 : _d.cats) === null || _e === void 0 ? void 0 : _e.find(function (c) { return c.id === entityId; });
        if (cat) {
            cat.position = [position.x, position.y];
        }
    };
    PredictiveRenderer.prototype.replayInputsAfterRollback = function (authoritativeState) {
        // Re-predict from remaining pending inputs
        if (this.pendingInputs.length > 0) {
            var newPrediction = this.predictionEngine.predictFromInputs(this.pendingInputs, authoritativeState);
            this.renderingState.predicted = newPrediction;
        }
    };
    PredictiveRenderer.prototype.cleanupPendingInputs = function () {
        // Remove inputs that are older than 1 second
        var cutoffTime = Date.now() - 1000;
        this.pendingInputs = this.pendingInputs.filter(function (input) { return input.timestamp > cutoffTime; });
    };
    PredictiveRenderer.prototype.createDefaultState = function () {
        return {
            sequence: 0,
            timestamp: Date.now(),
            phase: 'WAITING',
            players: [],
            entities: [],
            arrows: [],
            gameTime: 0,
            validationRules: {
                timestampMonotonic: true,
                sequenceIncrement: true,
                maxTimeDelta: 5000,
                maxSequenceGap: 10
            }
        };
    };
    /**
     * Get performance statistics
     */
    PredictiveRenderer.prototype.getPerformanceStats = function () {
        return {
            predictionFrameTime: this.predictionFrameTime,
            interpolationFrameTime: this.interpolationFrameTime,
            rollbackCorrectionCount: this.rollbackCorrectionCount,
            predictionConfidence: this.renderingState.predictionConfidence,
            pendingInputsCount: this.pendingInputs.length,
            rollbackActive: this.renderingState.rollbackActive
        };
    };
    /**
     * Update configuration options
     */
    PredictiveRenderer.prototype.updateInterpolationOptions = function (options) {
        this.interpolationOptions = __assign(__assign({}, this.interpolationOptions), options);
    };
    PredictiveRenderer.prototype.updateRollbackOptions = function (options) {
        this.rollbackOptions = __assign(__assign({}, this.rollbackOptions), options);
    };
    /**
     * Reset prediction state
     */
    PredictiveRenderer.prototype.reset = function () {
        this.renderingState = {
            authoritative: null,
            predicted: null,
            interpolated: null,
            rollbackActive: false,
            predictionConfidence: 1.0
        };
        this.pendingInputs = [];
        this.rollbackStartPositions.clear();
        this.rollbackTargetPositions.clear();
        this.rollbackCorrectionCount = 0;
    };
    return PredictiveRenderer;
}());
exports.PredictiveRenderer = PredictiveRenderer;
//# sourceMappingURL=predictive-renderer.js.map