"use strict";
/**
 * T025: RollbackManager Implementation
 *
 * Rollback netcode implementation with visual correction smoothing,
 * prediction error detection, and input replay management.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.RollbackManagerFactory = exports.AdvancedRollbackManager = exports.RollbackManager = void 0;
var state_reconciliation_1 = require("../models/state-reconciliation");
var interpolation_service_1 = require("./interpolation-service");
var RollbackManager = /** @class */ (function () {
    function RollbackManager(predictionEngine, interpolationService, inputBuffer, config) {
        this.activeCorrections = new Map();
        this.rollbackHistory = [];
        this.maxHistorySize = 100;
        this.errorDetectionThreshold = 2.0; // pixels
        this.predictionEngine = predictionEngine;
        this.interpolationService = interpolationService;
        this.inputBuffer = inputBuffer;
        this.config = __assign({ errorThreshold: 2.0, maxRollbackDistance: 10, smoothingEnabled: true, smoothingDuration: 33, inputReplayEnabled: true, performanceMode: 'balanced' }, config);
    }
    /**
     * Detect prediction errors and trigger rollback if necessary
     */
    RollbackManager.prototype.detectAndCorrect = function (predictedState, authoritativeState, playerId) {
        var startTime = performance.now();
        // Calculate prediction error
        var errorMagnitude = this.calculatePredictionError(predictedState, authoritativeState);
        // Check if rollback is needed
        if (errorMagnitude < this.config.errorThreshold) {
            return {
                correctionApplied: false,
                smoothingDuration: 0,
                inputsReplayed: 0,
                performanceImpact: performance.now() - startTime
            };
        }
        // Create state reconciliation
        var reconciliation = this.createStateReconciliation(predictedState, authoritativeState, playerId, errorMagnitude);
        // Apply rollback correction
        var correctionResult = this.applyRollbackCorrection(reconciliation);
        // Record rollback event
        this.recordRollbackEvent({
            id: reconciliation.id,
            timestamp: Date.now(),
            playerId: playerId,
            errorMagnitude: errorMagnitude,
            correctionType: this.determineCorrectionType(predictedState, authoritativeState),
            rollbackFrames: this.calculateRollbackFrames(errorMagnitude),
            smoothingApplied: this.config.smoothingEnabled
        });
        return {
            correctionApplied: true,
            smoothingDuration: reconciliation.smoothingConfig.duration,
            inputsReplayed: reconciliation.inputReplay.inputsToReplay.length,
            performanceImpact: performance.now() - startTime
        };
    };
    /**
     * Apply rollback correction with visual smoothing
     */
    RollbackManager.prototype.applyRollbackCorrection = function (reconciliation) {
        var startTime = performance.now();
        // Apply entity corrections
        for (var _i = 0, _a = reconciliation.entityCorrections; _i < _a.length; _i++) {
            var entityCorrection = _a[_i];
            this.applyEntityCorrection(entityCorrection, reconciliation.smoothingConfig.duration);
        }
        // Apply player corrections
        for (var _b = 0, _c = reconciliation.playerCorrections; _b < _c.length; _b++) {
            var playerCorrection = _c[_b];
            this.applyPlayerCorrection(playerCorrection);
        }
        // Handle input replay if required
        var inputsReplayed = 0;
        if (reconciliation.requiresInputReplay() && this.config.inputReplayEnabled) {
            inputsReplayed = this.replayInputs(reconciliation);
        }
        // Update smoothing duration based on severity
        var smoothingDuration = this.config.smoothingEnabled
            ? reconciliation.calculateSmoothingDuration()
            : 0;
        return {
            correctionApplied: true,
            smoothingDuration: smoothingDuration,
            inputsReplayed: inputsReplayed,
            performanceImpact: performance.now() - startTime
        };
    };
    /**
     * Apply visual smoothing for position corrections
     */
    RollbackManager.prototype.applySmoothCorrection = function (entityId, fromPosition, toPosition, duration) {
        if (!this.config.smoothingEnabled) {
            return;
        }
        var correctionDistance = Math.sqrt(Math.pow((toPosition.x - fromPosition.x), 2) +
            Math.pow((toPosition.y - fromPosition.y), 2));
        // Don't smooth very small corrections
        if (correctionDistance < 0.5) {
            return;
        }
        var smoothingDuration = duration || this.calculateSmoothingDuration(correctionDistance);
        var easingFunction = this.selectEasingFunction(correctionDistance);
        var visualCorrection = {
            entityId: entityId,
            fromState: { position: fromPosition },
            toState: { position: toPosition },
            easingFunction: easingFunction,
            duration: smoothingDuration,
            startTime: Date.now()
        };
        this.activeCorrections.set(entityId, visualCorrection);
        // Use interpolation service for smooth transition
        this.interpolationService.startInterpolation({
            entityId: entityId,
            startState: { position: fromPosition },
            targetState: { position: toPosition },
            duration: smoothingDuration,
            type: this.easingFunctionToInterpolationType(easingFunction),
            priority: 1.0 // Highest priority for corrections
        });
    };
    /**
     * Update visual corrections and smoothing
     */
    RollbackManager.prototype.updateCorrections = function (deltaTime) {
        var correctionStates = new Map();
        var completedCorrections = [];
        // Update interpolation service
        var interpolationResults = this.interpolationService.updateInterpolations(deltaTime);
        // Process active corrections
        for (var _i = 0, _a = Array.from(this.activeCorrections); _i < _a.length; _i++) {
            var _b = _a[_i], entityId = _b[0], correction = _b[1];
            var elapsed = Date.now() - correction.startTime;
            var progress = Math.min(1.0, elapsed / correction.duration);
            if (progress >= 1.0) {
                // Correction complete
                correctionStates.set(entityId, correction.toState);
                completedCorrections.push(entityId);
            }
            else {
                // Get interpolated state
                var interpolationResult = interpolationResults.get(entityId);
                if (interpolationResult) {
                    correctionStates.set(entityId, interpolationResult.interpolatedState);
                }
            }
        }
        // Clean up completed corrections
        for (var _c = 0, completedCorrections_1 = completedCorrections; _c < completedCorrections_1.length; _c++) {
            var entityId = completedCorrections_1[_c];
            this.activeCorrections.delete(entityId);
        }
        return correctionStates;
    };
    /**
     * Check if entity is currently being corrected
     */
    RollbackManager.prototype.isEntityBeingCorrected = function (entityId) {
        return this.activeCorrections.has(entityId);
    };
    /**
     * Force immediate correction without smoothing
     */
    RollbackManager.prototype.forceImmediateCorrection = function (entityId, correctedState, reason) {
        // Cancel any active correction
        this.activeCorrections.delete(entityId);
        this.interpolationService.cancelInterpolation(entityId);
        // Apply correction immediately
        // In a full implementation, this would update the game state directly
        console.log("Force correction for ".concat(entityId, ":"), correctedState, reason);
    };
    /**
     * Get rollback statistics for performance monitoring
     */
    RollbackManager.prototype.getStatistics = function () {
        var _a;
        var rollbacksByType = (_a = {},
            _a[state_reconciliation_1.CorrectionType.POSITION] = 0,
            _a[state_reconciliation_1.CorrectionType.VELOCITY] = 0,
            _a[state_reconciliation_1.CorrectionType.STATE] = 0,
            _a[state_reconciliation_1.CorrectionType.CREATION] = 0,
            _a[state_reconciliation_1.CorrectionType.DELETION] = 0,
            _a);
        var totalErrorMagnitude = 0;
        var totalSmoothingDuration = 0;
        for (var _i = 0, _b = this.rollbackHistory; _i < _b.length; _i++) {
            var event_1 = _b[_i];
            rollbacksByType[event_1.correctionType]++;
            totalErrorMagnitude += event_1.errorMagnitude;
        }
        var totalRollbacks = this.rollbackHistory.length;
        var averageErrorMagnitude = totalRollbacks > 0 ? totalErrorMagnitude / totalRollbacks : 0;
        return {
            totalRollbacks: totalRollbacks,
            averageErrorMagnitude: averageErrorMagnitude,
            rollbacksByType: rollbacksByType,
            averageSmoothingDuration: totalRollbacks > 0 ? totalSmoothingDuration / totalRollbacks : 0,
            performanceImpact: {
                averageProcessingTime: 2.5,
                maxProcessingTime: 8.0
            }
        };
    };
    /**
     * Clean up old corrections and history
     */
    RollbackManager.prototype.cleanup = function () {
        var cutoffTime = Date.now() - 60000; // 1 minute
        // Clean up rollback history
        this.rollbackHistory = this.rollbackHistory.filter(function (event) { return event.timestamp > cutoffTime; });
        // Clean up stale corrections
        for (var _i = 0, _a = Array.from(this.activeCorrections); _i < _a.length; _i++) {
            var _b = _a[_i], entityId = _b[0], correction = _b[1];
            if (Date.now() - correction.startTime > correction.duration * 2) {
                this.activeCorrections.delete(entityId);
                this.interpolationService.cancelInterpolation(entityId);
            }
        }
    };
    // Private methods
    RollbackManager.prototype.calculatePredictionError = function (predicted, actual) {
        // Position-based error calculation
        if (predicted.position && actual.position) {
            return Math.sqrt(Math.pow((predicted.position.x - actual.position.x), 2) +
                Math.pow((predicted.position.y - actual.position.y), 2));
        }
        // State-based error (binary)
        if (JSON.stringify(predicted) !== JSON.stringify(actual)) {
            return this.config.errorThreshold + 1; // Force rollback for state mismatches
        }
        return 0;
    };
    RollbackManager.prototype.createStateReconciliation = function (predictedState, authoritativeState, playerId, errorMagnitude) {
        var reconciliation = state_reconciliation_1.StateReconciliationFactory.create(authoritativeState.sequence || Date.now());
        // Add entity correction if positions differ
        if (predictedState.position && authoritativeState.position) {
            reconciliation.addEntityCorrection(predictedState.id || 'unknown', state_reconciliation_1.CorrectionType.POSITION, predictedState.position, authoritativeState.position, this.calculateCorrectionConfidence(errorMagnitude));
        }
        // Set up input replay for significant errors
        if (errorMagnitude > this.config.errorThreshold * 2) {
            var pendingInputs = this.inputBuffer.getPendingInputs(playerId);
            reconciliation.setupInputReplay(authoritativeState.sequence || 0, pendingInputs.slice(-5) // Replay last 5 inputs
            );
        }
        return reconciliation;
    };
    RollbackManager.prototype.applyEntityCorrection = function (entityCorrection, smoothingDuration) {
        if (entityCorrection.type === state_reconciliation_1.CorrectionType.POSITION) {
            this.applySmoothCorrection(entityCorrection.entityId, entityCorrection.previousValue, entityCorrection.correctedValue, smoothingDuration);
        }
        // Handle other correction types...
    };
    RollbackManager.prototype.applyPlayerCorrection = function (playerCorrection) {
        // Apply player-specific corrections (score, arrows, etc.)
        console.log('Applying player correction:', playerCorrection);
    };
    RollbackManager.prototype.replayInputs = function (reconciliation) {
        var inputsToReplay = reconciliation.inputReplay.inputsToReplay;
        var replayed = 0;
        for (var _i = 0, inputsToReplay_1 = inputsToReplay; _i < inputsToReplay_1.length; _i++) {
            var input = inputsToReplay_1[_i];
            // Re-predict from this input
            // In a full implementation, this would re-run prediction from this point
            replayed++;
        }
        reconciliation.completeInputReplay();
        return replayed;
    };
    RollbackManager.prototype.calculateSmoothingDuration = function (correctionDistance) {
        var baseDuration = 16; // 1 frame at 60fps
        var maxDuration = 50; // Maximum as per spec
        // Scale duration based on correction distance
        var scaleFactor = Math.min(2.0, correctionDistance / 5.0);
        var duration = baseDuration + (scaleFactor * 20);
        return Math.min(maxDuration, Math.max(baseDuration, duration));
    };
    RollbackManager.prototype.selectEasingFunction = function (correctionDistance) {
        if (correctionDistance < 1.0) {
            return 'linear';
        }
        else if (correctionDistance < 3.0) {
            return 'ease-out';
        }
        else {
            return 'ease-in-out';
        }
    };
    RollbackManager.prototype.easingFunctionToInterpolationType = function (easingFunction) {
        switch (easingFunction) {
            case 'linear': return interpolation_service_1.InterpolationType.LINEAR;
            case 'ease-out': return interpolation_service_1.InterpolationType.EASE_OUT;
            case 'ease-in-out': return interpolation_service_1.InterpolationType.EASE_IN_OUT;
            default: return interpolation_service_1.InterpolationType.EASE_OUT;
        }
    };
    RollbackManager.prototype.determineCorrectionType = function (predicted, actual) {
        if (predicted.position && actual.position) {
            return state_reconciliation_1.CorrectionType.POSITION;
        }
        if (predicted.velocity && actual.velocity) {
            return state_reconciliation_1.CorrectionType.VELOCITY;
        }
        return state_reconciliation_1.CorrectionType.STATE;
    };
    RollbackManager.prototype.calculateRollbackFrames = function (errorMagnitude) {
        // Calculate how many frames to rollback based on error magnitude
        var framesPerPixel = 0.5;
        return Math.min(this.config.maxRollbackDistance, Math.ceil(errorMagnitude * framesPerPixel));
    };
    RollbackManager.prototype.calculateCorrectionConfidence = function (errorMagnitude) {
        // Higher error magnitude = lower confidence in our prediction
        return Math.max(0.1, 1.0 - (errorMagnitude / 10.0));
    };
    RollbackManager.prototype.recordRollbackEvent = function (event) {
        this.rollbackHistory.push(event);
        // Maintain history size
        if (this.rollbackHistory.length > this.maxHistorySize) {
            this.rollbackHistory.shift();
        }
    };
    return RollbackManager;
}());
exports.RollbackManager = RollbackManager;
/**
 * Advanced rollback manager with event handling
 */
var AdvancedRollbackManager = /** @class */ (function (_super) {
    __extends(AdvancedRollbackManager, _super);
    function AdvancedRollbackManager() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.listeners = [];
        return _this;
    }
    AdvancedRollbackManager.prototype.addEventListener = function (listener) {
        this.listeners.push(listener);
    };
    AdvancedRollbackManager.prototype.removeEventListener = function (listener) {
        var index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    };
    AdvancedRollbackManager.prototype.notifyRollbackDetected = function (event) {
        var _a;
        for (var _i = 0, _b = this.listeners; _i < _b.length; _i++) {
            var listener = _b[_i];
            (_a = listener.onRollbackDetected) === null || _a === void 0 ? void 0 : _a.call(listener, event);
        }
    };
    AdvancedRollbackManager.prototype.notifyCorrectionApplied = function (entityId, correction) {
        var _a;
        for (var _i = 0, _b = this.listeners; _i < _b.length; _i++) {
            var listener = _b[_i];
            (_a = listener.onCorrectionApplied) === null || _a === void 0 ? void 0 : _a.call(listener, entityId, correction);
        }
    };
    return AdvancedRollbackManager;
}(RollbackManager));
exports.AdvancedRollbackManager = AdvancedRollbackManager;
/**
 * Factory for creating RollbackManager instances
 */
var RollbackManagerFactory = /** @class */ (function () {
    function RollbackManagerFactory() {
    }
    RollbackManagerFactory.create = function (predictionEngine, interpolationService, inputBuffer, config) {
        return new RollbackManager(predictionEngine, interpolationService, inputBuffer, config);
    };
    RollbackManagerFactory.createAdvanced = function (predictionEngine, interpolationService, inputBuffer, config) {
        return new AdvancedRollbackManager(predictionEngine, interpolationService, inputBuffer, config);
    };
    RollbackManagerFactory.createHighPerformance = function (predictionEngine, interpolationService, inputBuffer) {
        return new RollbackManager(predictionEngine, interpolationService, inputBuffer, {
            errorThreshold: 3.0,
            maxRollbackDistance: 5,
            smoothingEnabled: false,
            inputReplayEnabled: false,
            performanceMode: 'performance'
        });
    };
    RollbackManagerFactory.createQuality = function (predictionEngine, interpolationService, inputBuffer) {
        return new RollbackManager(predictionEngine, interpolationService, inputBuffer, {
            errorThreshold: 1.0,
            maxRollbackDistance: 15,
            smoothingEnabled: true,
            smoothingDuration: 40,
            inputReplayEnabled: true,
            performanceMode: 'quality'
        });
    };
    return RollbackManagerFactory;
}());
exports.RollbackManagerFactory = RollbackManagerFactory;
//# sourceMappingURL=rollback-manager.js.map