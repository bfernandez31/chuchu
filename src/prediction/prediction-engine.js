"use strict";
/**
 * T023: PredictionEngine Implementation
 *
 * Client-side state prediction algorithms with linear interpolation,
 * velocity prediction, confidence scoring, and input buffer integration.
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
exports.PredictionEngineFactory = exports.PredictionEngine = void 0;
var player_input_1 = require("../models/player-input");
var PredictionEngine = /** @class */ (function () {
    function PredictionEngine(config) {
        this.predictionHistory = new Map();
        this.velocityHistory = new Map();
        this.maxHistorySize = 50;
        this.maxPredictionDistance = 10.0; // Max pixels to predict ahead
        this.config = __assign({ maxPredictionTime: 200, confidenceThreshold: 0.7, velocitySmoothing: 0.8, collisionPrediction: true, boundaryHandling: true }, config);
    }
    /**
     * Predict future state based on current input and game state
     */
    PredictionEngine.prototype.predictFromInput = function (input, currentState, predictiveState) {
        var predictionId = this.generatePredictionId();
        var timestamp = Date.now();
        var predictedState;
        var confidence;
        switch (input.type) {
            case player_input_1.InputType.ARROW_PLACE:
                var arrowPrediction = this.predictArrowPlacement(input, currentState);
                predictedState = arrowPrediction.state;
                confidence = arrowPrediction.confidence;
                break;
            case player_input_1.InputType.MOVE:
                var movePrediction = this.predictMovement(input, currentState);
                predictedState = movePrediction.state;
                confidence = movePrediction.confidence;
                break;
            case player_input_1.InputType.ACTION:
                var actionPrediction = this.predictAction(input, currentState);
                predictedState = actionPrediction.state;
                confidence = actionPrediction.confidence;
                break;
            default:
                throw new Error("Unsupported input type: ".concat(input.type));
        }
        var result = {
            predictedState: predictedState,
            confidence: confidence,
            timestamp: timestamp,
            predictionId: predictionId
        };
        this.storePredictionResult(input.playerId, result);
        return result;
    };
    /**
     * Predict entity position based on velocity and time
     */
    PredictionEngine.prototype.predictEntityPosition = function (entity, deltaTime, gameState) {
        if (!entity.velocity) {
            return {
                predicted: __assign({}, entity.position),
                confidence: 1.0,
                factors: { momentum: 0, acceleration: 0, external: 0 }
            };
        }
        var velocity = __assign({}, entity.velocity);
        var predicted = __assign({}, entity.position);
        // Apply momentum-based prediction
        var momentumFactor = this.calculateMomentumFactor(entity);
        predicted.x += velocity.x * deltaTime * momentumFactor;
        predicted.y += velocity.y * deltaTime * momentumFactor;
        // Apply boundary constraints
        var boundaryConstraints = this.applyBoundaryConstraints(predicted, gameState);
        predicted.x = boundaryConstraints.x;
        predicted.y = boundaryConstraints.y;
        // Calculate external forces (walls, collisions)
        var externalForces = this.calculateExternalForces(entity, predicted, gameState);
        predicted.x += externalForces.x;
        predicted.y += externalForces.y;
        // Calculate prediction confidence
        var confidence = this.calculatePositionConfidence(entity, deltaTime);
        return {
            predicted: predicted,
            confidence: confidence,
            factors: {
                momentum: momentumFactor,
                acceleration: 0,
                external: Math.sqrt(Math.pow(externalForces.x, 2) + Math.pow(externalForces.y, 2))
            }
        };
    };
    /**
     * Predict collision between entities
     */
    PredictionEngine.prototype.predictCollision = function (entity1, entity2, timeHorizon) {
        if (timeHorizon === void 0) { timeHorizon = 100; }
        if (!entity1.velocity || !entity2.velocity) {
            return {
                willCollide: false,
                collisionTime: Infinity,
                collisionPoint: { x: 0, y: 0 },
                entityIds: [entity1.id, entity2.id]
            };
        }
        var relativeVelocity = {
            x: entity1.velocity.x - entity2.velocity.x,
            y: entity1.velocity.y - entity2.velocity.y
        };
        var relativePosition = {
            x: entity1.position.x - entity2.position.x,
            y: entity1.position.y - entity2.position.y
        };
        // Calculate collision time using relative motion
        var a = Math.pow(relativeVelocity.x, 2) + Math.pow(relativeVelocity.y, 2);
        var b = 2 * (relativePosition.x * relativeVelocity.x + relativePosition.y * relativeVelocity.y);
        var c = Math.pow(relativePosition.x, 2) + Math.pow(relativePosition.y, 2) - 1; // Assuming 1 unit collision radius
        var discriminant = Math.pow(b, 2) - 4 * a * c;
        if (discriminant < 0 || a === 0) {
            return {
                willCollide: false,
                collisionTime: Infinity,
                collisionPoint: { x: 0, y: 0 },
                entityIds: [entity1.id, entity2.id]
            };
        }
        var t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        var t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        var collisionTime = Math.min(t1, t2);
        if (collisionTime < 0 || collisionTime > timeHorizon) {
            return {
                willCollide: false,
                collisionTime: Infinity,
                collisionPoint: { x: 0, y: 0 },
                entityIds: [entity1.id, entity2.id]
            };
        }
        var collisionPoint = {
            x: entity1.position.x + entity1.velocity.x * collisionTime,
            y: entity1.position.y + entity1.velocity.y * collisionTime
        };
        return {
            willCollide: true,
            collisionTime: collisionTime,
            collisionPoint: collisionPoint,
            entityIds: [entity1.id, entity2.id]
        };
    };
    /**
     * Validate prediction against actual server result
     */
    PredictionEngine.prototype.validatePrediction = function (predictionId, actualState, playerId) {
        var predictionResult = null;
        if (playerId) {
            var history_1 = this.predictionHistory.get(playerId);
            if (history_1) {
                predictionResult = history_1.find(function (p) { return p.predictionId === predictionId; }) || null;
            }
        }
        else {
            // Search all player histories
            for (var _i = 0, _a = Array.from(this.predictionHistory.values()); _i < _a.length; _i++) {
                var history_2 = _a[_i];
                var found = history_2.find(function (p) { return p.predictionId === predictionId; });
                if (found) {
                    predictionResult = found;
                    break;
                }
            }
        }
        if (!predictionResult) {
            return { accuracy: 0, error: Infinity };
        }
        var error = this.calculatePredictionError(predictionResult.predictedState, actualState);
        var accuracy = Math.max(0, 1.0 - (error / this.maxPredictionDistance));
        return { accuracy: accuracy, error: error };
    };
    /**
     * Get prediction statistics for performance monitoring
     */
    PredictionEngine.prototype.getStatistics = function () {
        var totalPredictions = 0;
        var totalAccuracy = 0;
        var predictionsByType = {};
        var confidenceDistribution = { low: 0, medium: 0, high: 0 };
        for (var _i = 0, _a = Array.from(this.predictionHistory.values()); _i < _a.length; _i++) {
            var history_4 = _a[_i];
            for (var _b = 0, history_3 = history_4; _b < history_3.length; _b++) {
                var prediction = history_3[_b];
                totalPredictions++;
                // Confidence distribution
                if (prediction.confidence < 0.5)
                    confidenceDistribution.low++;
                else if (prediction.confidence < 0.8)
                    confidenceDistribution.medium++;
                else
                    confidenceDistribution.high++;
            }
        }
        var averageAccuracy = totalPredictions > 0 ? totalAccuracy / totalPredictions : 0;
        return {
            totalPredictions: totalPredictions,
            averageAccuracy: averageAccuracy,
            predictionsByType: predictionsByType,
            confidenceDistribution: confidenceDistribution
        };
    };
    /**
     * Clean up old predictions
     */
    PredictionEngine.prototype.cleanup = function () {
        var cutoffTime = Date.now() - 30000; // 30 seconds
        for (var _i = 0, _a = Array.from(this.predictionHistory); _i < _a.length; _i++) {
            var _b = _a[_i], playerId = _b[0], history_5 = _b[1];
            var filteredHistory = history_5.filter(function (p) { return p.timestamp > cutoffTime; });
            if (filteredHistory.length === 0) {
                this.predictionHistory.delete(playerId);
                this.velocityHistory.delete(playerId);
            }
            else {
                this.predictionHistory.set(playerId, filteredHistory);
            }
        }
    };
    // Private prediction methods
    PredictionEngine.prototype.predictArrowPlacement = function (input, gameState) {
        if (!input.data.position || !input.data.direction) {
            throw new Error('Arrow placement input missing position or direction');
        }
        var position = input.data.position;
        var direction = input.data.direction;
        // Check if position is valid
        if (!this.isValidPosition(position, gameState)) {
            return {
                state: { success: false, reason: 'Invalid position' },
                confidence: 0.0
            };
        }
        // Check for existing arrows at position
        var existingArrow = this.findEntityAtPosition(position, gameState);
        if (existingArrow && existingArrow.type === 'ARROW') {
            return {
                state: { success: false, reason: 'Position occupied' },
                confidence: 0.1
            };
        }
        // High confidence for arrow placement if position is valid
        var confidence = 0.95;
        return {
            state: {
                success: true,
                arrow: {
                    id: this.generateEntityId(),
                    position: position,
                    direction: direction,
                    playerId: input.playerId,
                    timestamp: Date.now()
                }
            },
            confidence: confidence
        };
    };
    PredictionEngine.prototype.predictMovement = function (input, gameState) {
        if (!input.data.targetPosition) {
            throw new Error('Movement input missing target position');
        }
        var targetPosition = input.data.targetPosition;
        var player = gameState.players.get(input.playerId);
        if (!player) {
            return {
                state: { success: false, reason: 'Player not found' },
                confidence: 0.0
            };
        }
        // Calculate movement distance and validate
        var currentPos = { x: 0, y: 0 }; // TODO: Get actual player position
        var distance = Math.sqrt(Math.pow((targetPosition.x - currentPos.x), 2) +
            Math.pow((targetPosition.y - currentPos.y), 2));
        // Movement predictions have medium confidence due to collision possibilities
        var confidence = 0.8;
        // Reduce confidence based on distance and obstacles
        if (distance > 3)
            confidence *= 0.8;
        if (this.hasObstaclesInPath(currentPos, targetPosition, gameState)) {
            confidence *= 0.6;
        }
        return {
            state: {
                success: true,
                newPosition: targetPosition,
                movementDistance: distance
            },
            confidence: confidence
        };
    };
    PredictionEngine.prototype.predictAction = function (input, gameState) {
        if (!input.data.action) {
            throw new Error('Action input missing action type');
        }
        var action = input.data.action;
        var confidence = 0.7; // Default confidence for actions
        switch (action) {
            case 'JOIN_GAME':
                confidence = gameState.phase === 'WAITING' ? 0.9 : 0.3;
                break;
            case 'READY':
                confidence = 0.95;
                break;
            case 'PAUSE':
            case 'RESUME':
                confidence = 0.8;
                break;
            default:
                confidence = 0.5;
        }
        return {
            state: {
                success: true,
                action: action,
                processed: true
            },
            confidence: confidence
        };
    };
    PredictionEngine.prototype.calculateMomentumFactor = function (entity) {
        if (!entity.velocity)
            return 0;
        var speed = Math.sqrt(Math.pow(entity.velocity.x, 2) + Math.pow(entity.velocity.y, 2));
        var maxSpeed = 5.0; // Maximum entity speed
        // Higher speed = higher momentum factor (up to 1.0)
        return Math.min(1.0, speed / maxSpeed);
    };
    PredictionEngine.prototype.applyBoundaryConstraints = function (position, gameState) {
        var constrained = __assign({}, position);
        // Clamp to board boundaries
        constrained.x = Math.max(0, Math.min(gameState.board.width - 1, position.x));
        constrained.y = Math.max(0, Math.min(gameState.board.height - 1, position.y));
        return constrained;
    };
    PredictionEngine.prototype.calculateExternalForces = function (entity, predictedPosition, gameState) {
        var forces = { x: 0, y: 0 };
        if (!this.config.collisionPrediction)
            return forces;
        // Check for wall collisions
        for (var _i = 0, _a = gameState.board.walls; _i < _a.length; _i++) {
            var wall = _a[_i];
            var distance = Math.sqrt(Math.pow((predictedPosition.x - wall.position.x), 2) +
                Math.pow((predictedPosition.y - wall.position.y), 2));
            if (distance < 1.5) { // Wall repulsion radius
                var repulsionStrength = (1.5 - distance) / 1.5;
                var direction = {
                    x: predictedPosition.x - wall.position.x,
                    y: predictedPosition.y - wall.position.y
                };
                var length_1 = Math.sqrt(Math.pow(direction.x, 2) + Math.pow(direction.y, 2));
                if (length_1 > 0) {
                    forces.x += (direction.x / length_1) * repulsionStrength * 0.5;
                    forces.y += (direction.y / length_1) * repulsionStrength * 0.5;
                }
            }
        }
        return forces;
    };
    PredictionEngine.prototype.calculatePositionConfidence = function (entity, deltaTime) {
        var confidence = 0.9; // Base confidence
        // Reduce confidence for longer prediction times
        var timeFactor = Math.max(0.1, 1.0 - (deltaTime / this.config.maxPredictionTime));
        confidence *= timeFactor;
        // Reduce confidence for fast-moving entities
        if (entity.velocity) {
            var speed = Math.sqrt(Math.pow(entity.velocity.x, 2) + Math.pow(entity.velocity.y, 2));
            var speedFactor = Math.max(0.3, 1.0 - (speed / 10.0));
            confidence *= speedFactor;
        }
        return Math.max(0.1, confidence);
    };
    PredictionEngine.prototype.calculatePredictionError = function (predicted, actual) {
        // Handle different prediction types
        if (predicted.position && actual.position) {
            return Math.sqrt(Math.pow((predicted.position.x - actual.position.x), 2) +
                Math.pow((predicted.position.y - actual.position.y), 2));
        }
        if (predicted.success !== actual.success) {
            return this.maxPredictionDistance; // Maximum error for wrong success prediction
        }
        return 0; // No error for matching non-positional predictions
    };
    PredictionEngine.prototype.isValidPosition = function (position, gameState) {
        return position.x >= 0 && position.x < gameState.board.width &&
            position.y >= 0 && position.y < gameState.board.height;
    };
    PredictionEngine.prototype.findEntityAtPosition = function (position, gameState) {
        for (var _i = 0, _a = Array.from(gameState.board.entities); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], entity = _b[1];
            if (Math.abs(entity.position.x - position.x) < 0.5 &&
                Math.abs(entity.position.y - position.y) < 0.5) {
                return entity;
            }
        }
        return null;
    };
    PredictionEngine.prototype.hasObstaclesInPath = function (start, end, gameState) {
        // Simple line-of-sight check for obstacles
        var steps = Math.ceil(Math.sqrt(Math.pow((end.x - start.x), 2) + Math.pow((end.y - start.y), 2)));
        for (var i = 1; i <= steps; i++) {
            var t = i / steps;
            var checkPos = {
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t
            };
            if (this.findEntityAtPosition(checkPos, gameState)) {
                return true;
            }
        }
        return false;
    };
    PredictionEngine.prototype.storePredictionResult = function (playerId, result) {
        var history = this.predictionHistory.get(playerId);
        if (!history) {
            history = [];
            this.predictionHistory.set(playerId, history);
        }
        history.push(result);
        // Maintain history size
        if (history.length > this.maxHistorySize) {
            history.shift();
        }
    };
    PredictionEngine.prototype.generatePredictionId = function () {
        return "pred_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    PredictionEngine.prototype.generateEntityId = function () {
        return "entity_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    return PredictionEngine;
}());
exports.PredictionEngine = PredictionEngine;
/**
 * Factory for creating PredictionEngine instances
 */
var PredictionEngineFactory = /** @class */ (function () {
    function PredictionEngineFactory() {
    }
    PredictionEngineFactory.create = function (config) {
        return new PredictionEngine(config);
    };
    PredictionEngineFactory.createForTesting = function () {
        return new PredictionEngine({
            maxPredictionTime: 100,
            confidenceThreshold: 0.5,
            velocitySmoothing: 0.9,
            collisionPrediction: false,
            boundaryHandling: true
        });
    };
    PredictionEngineFactory.createHighPerformance = function () {
        return new PredictionEngine({
            maxPredictionTime: 150,
            confidenceThreshold: 0.8,
            velocitySmoothing: 0.7,
            collisionPrediction: true,
            boundaryHandling: true
        });
    };
    return PredictionEngineFactory;
}());
exports.PredictionEngineFactory = PredictionEngineFactory;
//# sourceMappingURL=prediction-engine.js.map