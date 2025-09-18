"use strict";
/**
 * T019: PredictiveGameState Model
 *
 * Client-side predicted state structure with confidence calculation,
 * interpolation management, and input buffer handling.
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
exports.PredictiveGameStateFactory = exports.PredictiveGameStateImpl = exports.PredictionType = void 0;
var PredictionType;
(function (PredictionType) {
    PredictionType["MOVEMENT"] = "MOVEMENT";
    PredictionType["ARROW_PLACEMENT"] = "ARROW_PLACEMENT";
    PredictionType["COLLISION"] = "COLLISION";
    PredictionType["SCORE_UPDATE"] = "SCORE_UPDATE";
})(PredictionType || (exports.PredictionType = PredictionType = {}));
var PredictiveGameStateImpl = /** @class */ (function () {
    function PredictiveGameStateImpl(authoritativeState) {
        this.authoritative = authoritativeState;
        this.predictions = new Map();
        this.confidence = 1.0;
        this.lastServerUpdate = Date.now();
        this.interpolations = new Map();
        this.smoothingEnabled = true;
        this.inputBuffer = [];
        this.maxBufferSize = 10;
        this.lastInputSequence = 0;
        this.clientMetrics = {
            frameRate: 60,
            renderTime: 16,
            predictionAccuracy: 1.0,
            rollbackCount: 0,
            interpolationErrors: 0
        };
    }
    /**
     * Validate predictive state consistency
     */
    PredictiveGameStateImpl.prototype.isValid = function () {
        try {
            // Confidence must be in valid range
            if (this.confidence < 0.0 || this.confidence > 1.0)
                return false;
            // Input buffer size constraint
            if (this.inputBuffer.length > this.maxBufferSize)
                return false;
            // Predictions must have valid confidence
            for (var _i = 0, _a = Array.from(this.predictions); _i < _a.length; _i++) {
                var _b = _a[_i], id = _b[0], prediction = _b[1];
                if (prediction.confidence < 0.0 || prediction.confidence > 1.0)
                    return false;
                if (prediction.timestamp <= 0)
                    return false;
            }
            // Interpolations must have valid progress
            for (var _c = 0, _d = Array.from(this.interpolations); _c < _d.length; _c++) {
                var _e = _d[_c], id = _e[0], interpolation = _e[1];
                if (interpolation.progress < 0.0 || interpolation.progress > 1.0)
                    return false;
                if (interpolation.duration <= 0)
                    return false;
            }
            // Input buffer entries must be ordered by timestamp
            for (var i = 1; i < this.inputBuffer.length; i++) {
                if (this.inputBuffer[i].timestamp < this.inputBuffer[i - 1].timestamp) {
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            console.error('Predictive state validation error:', error);
            return false;
        }
    };
    /**
     * Check if predicted state has diverged significantly from server
     */
    PredictiveGameStateImpl.prototype.isDivergent = function () {
        var divergenceThreshold = 0.7; // Below this confidence indicates divergence
        var timeThreshold = 500; // 500ms without server update indicates potential divergence
        var timeSinceUpdate = Date.now() - this.lastServerUpdate;
        return this.confidence < divergenceThreshold || timeSinceUpdate > timeThreshold;
    };
    /**
     * Add prediction for future state
     */
    PredictiveGameStateImpl.prototype.addPrediction = function (type, data, confidence) {
        if (confidence === void 0) { confidence = 0.8; }
        var predictionId = this.generatePredictionId();
        var prediction = {
            id: predictionId,
            type: type,
            timestamp: Date.now(),
            confidence: Math.max(0.0, Math.min(1.0, confidence)),
            data: data,
            validated: false
        };
        this.predictions.set(predictionId, prediction);
        this.updateOverallConfidence();
        return predictionId;
    };
    /**
     * Validate prediction against server state
     */
    PredictiveGameStateImpl.prototype.validatePrediction = function (predictionId, serverData) {
        var prediction = this.predictions.get(predictionId);
        if (!prediction)
            return false;
        prediction.validated = true;
        // Calculate prediction accuracy
        var accuracy = this.calculatePredictionAccuracy(prediction.data, serverData);
        if (accuracy < 0.9) {
            // Prediction was incorrect, store correction
            prediction.correction = serverData;
            this.clientMetrics.rollbackCount++;
        }
        // Update prediction accuracy metric
        this.updatePredictionAccuracy(accuracy);
        this.updateOverallConfidence();
        return accuracy >= 0.9;
    };
    /**
     * Start interpolation for smooth movement
     */
    PredictiveGameStateImpl.prototype.startInterpolation = function (entityId, startPos, targetPos, duration) {
        var velocity = {
            x: (targetPos.x - startPos.x) / duration,
            y: (targetPos.y - startPos.y) / duration
        };
        var interpolation = {
            startPosition: __assign({}, startPos),
            targetPosition: __assign({}, targetPos),
            startTime: Date.now(),
            duration: Math.max(16, duration),
            progress: 0.0,
            velocity: velocity
        };
        this.interpolations.set(entityId, interpolation);
    };
    /**
     * Update interpolation progress
     */
    PredictiveGameStateImpl.prototype.updateInterpolations = function (deltaTime) {
        for (var _i = 0, _a = Array.from(this.interpolations); _i < _a.length; _i++) {
            var _b = _a[_i], entityId = _b[0], interpolation = _b[1];
            var elapsed = Date.now() - interpolation.startTime;
            interpolation.progress = Math.min(1.0, elapsed / interpolation.duration);
            if (interpolation.progress >= 1.0) {
                // Interpolation complete
                this.interpolations.delete(entityId);
            }
        }
    };
    /**
     * Add input to buffer with prediction
     */
    PredictiveGameStateImpl.prototype.addInput = function (inputType, data, predict) {
        if (predict === void 0) { predict = true; }
        // Maintain buffer size limit
        if (this.inputBuffer.length >= this.maxBufferSize) {
            this.inputBuffer.shift(); // Remove oldest
        }
        var inputEntry = {
            timestamp: Date.now(),
            inputType: inputType,
            data: data,
            sequence: ++this.lastInputSequence,
            acknowledged: false,
            predicted: predict
        };
        this.inputBuffer.push(inputEntry);
        // If prediction enabled, create immediate prediction
        if (predict) {
            this.createInputPrediction(inputEntry);
        }
    };
    /**
     * Acknowledge input from server
     */
    PredictiveGameStateImpl.prototype.acknowledgeInput = function (sequence, serverData) {
        var input = this.inputBuffer.find(function (entry) { return entry.sequence === sequence; });
        if (!input)
            return false;
        input.acknowledged = true;
        // If server data differs from prediction, handle rollback
        if (serverData && input.predicted) {
            var accuracy = this.calculatePredictionAccuracy(input.data, serverData);
            if (accuracy < 0.9) {
                this.handleInputRollback(input, serverData);
            }
        }
        return true;
    };
    /**
     * Clear acknowledged inputs from buffer
     */
    PredictiveGameStateImpl.prototype.cleanupBuffer = function () {
        var cutoffTime = Date.now() - 5000; // Keep last 5 seconds
        this.inputBuffer = this.inputBuffer.filter(function (entry) {
            return !entry.acknowledged || entry.timestamp > cutoffTime;
        });
    };
    /**
     * Get interpolated position for entity
     */
    PredictiveGameStateImpl.prototype.getInterpolatedPosition = function (entityId) {
        var interpolation = this.interpolations.get(entityId);
        if (!interpolation)
            return null;
        var t = interpolation.progress;
        // Use easing for smoother interpolation
        var easedT = this.easeOutCubic(t);
        return {
            x: interpolation.startPosition.x + (interpolation.targetPosition.x - interpolation.startPosition.x) * easedT,
            y: interpolation.startPosition.y + (interpolation.targetPosition.y - interpolation.startPosition.y) * easedT
        };
    };
    /**
     * Update with new authoritative state from server
     */
    PredictiveGameStateImpl.prototype.updateFromServer = function (authoritativeState) {
        this.authoritative = authoritativeState;
        this.lastServerUpdate = Date.now();
        // Validate existing predictions against server state
        this.validateExistingPredictions();
        // Update client metrics
        this.updateClientMetrics();
    };
    // Private methods
    PredictiveGameStateImpl.prototype.createInputPrediction = function (input) {
        var confidence = 0.9; // High confidence for input predictions
        switch (input.inputType) {
            case 'ARROW_PLACE':
                confidence = 0.95; // Very high confidence for arrow placement
                break;
            case 'MOVE':
                confidence = 0.85; // Lower confidence for movement due to collision possibilities
                break;
            case 'ACTION':
                confidence = 0.8; // Medium confidence for general actions
                break;
        }
        this.addPrediction(PredictionType.MOVEMENT, input.data, confidence);
    };
    PredictiveGameStateImpl.prototype.calculatePredictionAccuracy = function (predicted, actual) {
        if (!predicted || !actual)
            return 0.0;
        // For position-based predictions
        if (predicted.x !== undefined && predicted.y !== undefined &&
            actual.x !== undefined && actual.y !== undefined) {
            var distance = Math.sqrt(Math.pow(predicted.x - actual.x, 2) +
                Math.pow(predicted.y - actual.y, 2));
            // Convert distance to accuracy (0-1), where 0 distance = 1.0 accuracy
            return Math.max(0.0, 1.0 - (distance / 10.0)); // 10 units = 0 accuracy
        }
        // For other data types, use simple equality
        return JSON.stringify(predicted) === JSON.stringify(actual) ? 1.0 : 0.0;
    };
    PredictiveGameStateImpl.prototype.updatePredictionAccuracy = function (newAccuracy) {
        var alpha = 0.1; // Smoothing factor
        this.clientMetrics.predictionAccuracy =
            this.clientMetrics.predictionAccuracy * (1 - alpha) + newAccuracy * alpha;
    };
    PredictiveGameStateImpl.prototype.updateOverallConfidence = function () {
        if (this.predictions.size === 0) {
            this.confidence = 1.0;
            return;
        }
        var totalConfidence = 0;
        var recentPredictions = 0;
        var recentThreshold = Date.now() - 1000; // Last 1 second
        for (var _i = 0, _a = Array.from(this.predictions); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], prediction = _b[1];
            if (prediction.timestamp >= recentThreshold) {
                totalConfidence += prediction.confidence;
                recentPredictions++;
            }
        }
        if (recentPredictions > 0) {
            this.confidence = totalConfidence / recentPredictions;
        }
    };
    PredictiveGameStateImpl.prototype.validateExistingPredictions = function () {
        // Clean up old predictions
        var cutoffTime = Date.now() - 2000; // 2 seconds
        for (var _i = 0, _a = Array.from(this.predictions); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], prediction = _b[1];
            if (prediction.timestamp < cutoffTime) {
                this.predictions.delete(id);
            }
        }
    };
    PredictiveGameStateImpl.prototype.handleInputRollback = function (input, serverData) {
        this.clientMetrics.rollbackCount++;
        // In a full implementation, this would trigger visual rollback
        console.log('Input rollback required', {
            sequence: input.sequence,
            predicted: input.data,
            actual: serverData
        });
    };
    PredictiveGameStateImpl.prototype.updateClientMetrics = function () {
        this.clientMetrics.renderTime = performance.now() % 100; // Simplified
        // Update frame rate based on recent performance
        if (this.clientMetrics.renderTime > 20) {
            this.clientMetrics.frameRate = Math.max(30, this.clientMetrics.frameRate - 1);
        }
        else if (this.clientMetrics.renderTime < 14) {
            this.clientMetrics.frameRate = Math.min(60, this.clientMetrics.frameRate + 1);
        }
    };
    PredictiveGameStateImpl.prototype.easeOutCubic = function (t) {
        return 1 - Math.pow(1 - t, 3);
    };
    PredictiveGameStateImpl.prototype.generatePredictionId = function () {
        return "pred_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    return PredictiveGameStateImpl;
}());
exports.PredictiveGameStateImpl = PredictiveGameStateImpl;
/**
 * Factory for creating PredictiveGameState instances
 */
var PredictiveGameStateFactory = /** @class */ (function () {
    function PredictiveGameStateFactory() {
    }
    PredictiveGameStateFactory.create = function (authoritativeState) {
        return new PredictiveGameStateImpl(authoritativeState);
    };
    PredictiveGameStateFactory.createWithConfig = function (authoritativeState, config) {
        var state = new PredictiveGameStateImpl(authoritativeState);
        if (config.maxBufferSize !== undefined) {
            state.maxBufferSize = Math.max(1, Math.min(10, config.maxBufferSize));
        }
        if (config.smoothingEnabled !== undefined) {
            state.smoothingEnabled = config.smoothingEnabled;
        }
        if (config.initialConfidence !== undefined) {
            state.confidence = Math.max(0.0, Math.min(1.0, config.initialConfidence));
        }
        return state;
    };
    return PredictiveGameStateFactory;
}());
exports.PredictiveGameStateFactory = PredictiveGameStateFactory;
//# sourceMappingURL=predictive-game-state.js.map