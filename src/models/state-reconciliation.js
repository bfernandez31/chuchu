"use strict";
/**
 * T021: StateReconciliation Model
 *
 * Rollback correction structure with severity classification,
 * smoothing duration calculation, and input replay management.
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
exports.StateReconciliationFactory = exports.ReconciliationManager = exports.StateReconciliationImpl = exports.CorrectionType = exports.CorrectionSeverity = void 0;
var CorrectionSeverity;
(function (CorrectionSeverity) {
    CorrectionSeverity["MINOR"] = "MINOR";
    CorrectionSeverity["MODERATE"] = "MODERATE";
    CorrectionSeverity["MAJOR"] = "MAJOR"; // >5 pixel difference
})(CorrectionSeverity || (exports.CorrectionSeverity = CorrectionSeverity = {}));
var CorrectionType;
(function (CorrectionType) {
    CorrectionType["POSITION"] = "POSITION";
    CorrectionType["VELOCITY"] = "VELOCITY";
    CorrectionType["STATE"] = "STATE";
    CorrectionType["CREATION"] = "CREATION";
    CorrectionType["DELETION"] = "DELETION";
})(CorrectionType || (exports.CorrectionType = CorrectionType = {}));
var StateReconciliationImpl = /** @class */ (function () {
    function StateReconciliationImpl(data) {
        this.id = data.id || this.generateReconciliationId();
        this.timestamp = data.timestamp || Date.now();
        this.gameStateSequence = data.gameStateSequence;
        this.entityCorrections = data.entityCorrections || [];
        this.playerCorrections = data.playerCorrections || [];
        this.causedByInput = data.causedByInput;
        // Calculate severity based on corrections
        this.severity = data.severity || this.calculateSeverity();
        // Configure smoothing based on severity
        this.smoothingConfig = data.smoothingConfig || this.createSmoothingConfig();
        // Initialize input replay
        this.inputReplay = data.inputReplay || {
            startFromSequence: 0,
            inputsToReplay: [],
            replayTimestamp: 0,
            completed: false
        };
        // Initialize metrics
        this.metrics = data.metrics || {
            correctionCount: this.entityCorrections.length + this.playerCorrections.length,
            averageCorrectionTime: 0,
            totalRollbackDistance: 0,
            performanceImpact: 0
        };
    }
    /**
     * Validate reconciliation data and constraints
     */
    StateReconciliationImpl.prototype.isValid = function () {
        try {
            // Basic validation
            if (!this.id || this.timestamp <= 0 || this.gameStateSequence < 0)
                return false;
            // Severity validation
            if (!Object.values(CorrectionSeverity).includes(this.severity))
                return false;
            // Smoothing duration validation (16-50ms as per spec)
            var duration = this.smoothingConfig.duration;
            if (duration < 16 || duration > 50)
                return false;
            // Entity corrections validation
            for (var _i = 0, _a = this.entityCorrections; _i < _a.length; _i++) {
                var correction = _a[_i];
                if (!this.isValidEntityCorrection(correction))
                    return false;
            }
            // Player corrections validation
            for (var _b = 0, _c = this.playerCorrections; _b < _c.length; _b++) {
                var correction = _c[_b];
                if (!this.isValidPlayerCorrection(correction))
                    return false;
            }
            // Input replay validation
            if (!this.isValidInputReplay())
                return false;
            return true;
        }
        catch (error) {
            console.error('Reconciliation validation error:', error);
            return false;
        }
    };
    /**
     * Calculate optimal smoothing duration based on severity and corrections
     */
    StateReconciliationImpl.prototype.calculateSmoothingDuration = function () {
        var baseDuration = 16; // Minimum 16ms (1 frame at 60fps)
        var maxDuration = 50; // Maximum 50ms as per spec
        var duration = baseDuration;
        // Adjust based on severity
        switch (this.severity) {
            case CorrectionSeverity.MINOR:
                duration = 16; // Single frame for minor corrections
                break;
            case CorrectionSeverity.MODERATE:
                duration = 33; // ~2 frames for moderate corrections
                break;
            case CorrectionSeverity.MAJOR:
                duration = 50; // Maximum smoothing for major corrections
                break;
        }
        // Adjust based on correction count
        var correctionCount = this.entityCorrections.length + this.playerCorrections.length;
        if (correctionCount > 5) {
            duration = Math.min(maxDuration, duration + 10);
        }
        // Adjust based on position difference for position corrections
        var maxPositionDiff = this.getMaxPositionDifference();
        if (maxPositionDiff > 3) {
            duration = Math.min(maxDuration, duration + Math.floor(maxPositionDiff * 2));
        }
        return Math.max(baseDuration, Math.min(maxDuration, duration));
    };
    /**
     * Check if input replay is required
     */
    StateReconciliationImpl.prototype.requiresInputReplay = function () {
        // Input replay is required for MAJOR corrections or when specific conditions are met
        return this.severity === CorrectionSeverity.MAJOR ||
            this.entityCorrections.some(function (c) { return c.type === CorrectionType.CREATION || c.type === CorrectionType.DELETION; }) ||
            this.playerCorrections.length > 0;
    };
    /**
     * Add entity correction
     */
    StateReconciliationImpl.prototype.addEntityCorrection = function (entityId, type, previousValue, correctedValue, confidence) {
        if (confidence === void 0) { confidence = 1.0; }
        var correction = {
            entityId: entityId,
            type: type,
            previousValue: previousValue,
            correctedValue: correctedValue,
            confidence: Math.max(0.0, Math.min(1.0, confidence))
        };
        this.entityCorrections.push(correction);
        this.updateSeverity();
        this.updateSmoothingConfig();
        this.updateMetrics();
    };
    /**
     * Add player correction
     */
    StateReconciliationImpl.prototype.addPlayerCorrection = function (playerId, previousScore, correctedScore, previousArrowCount, correctedArrowCount) {
        var correction = {
            playerId: playerId,
            previousScore: previousScore,
            correctedScore: correctedScore,
            previousArrowCount: previousArrowCount,
            correctedArrowCount: correctedArrowCount
        };
        this.playerCorrections.push(correction);
        this.updateSeverity();
        this.updateSmoothingConfig();
        this.updateMetrics();
    };
    /**
     * Setup input replay from specific sequence
     */
    StateReconciliationImpl.prototype.setupInputReplay = function (startSequence, inputs) {
        this.inputReplay = {
            startFromSequence: startSequence,
            inputsToReplay: __spreadArray([], inputs, true),
            replayTimestamp: Date.now(),
            completed: false
        };
    };
    /**
     * Mark input replay as completed
     */
    StateReconciliationImpl.prototype.completeInputReplay = function () {
        this.inputReplay.completed = true;
        this.updateMetrics();
    };
    /**
     * Get visual smoothing parameters for specific entity
     */
    StateReconciliationImpl.prototype.getSmoothingParameters = function (entityId) {
        var hasEntityCorrection = this.entityCorrections.some(function (c) { return c.entityId === entityId; });
        if (!hasEntityCorrection)
            return null;
        return __assign({}, this.smoothingConfig);
    };
    /**
     * Calculate performance impact of this reconciliation
     */
    StateReconciliationImpl.prototype.calculatePerformanceImpact = function () {
        var baseImpact = 5; // Base 5ms overhead
        var correctionImpact = (this.entityCorrections.length + this.playerCorrections.length) * 2;
        var replayImpact = this.inputReplay.inputsToReplay.length * 1;
        var smoothingImpact = this.smoothingConfig.enabled ? 3 : 0;
        return baseImpact + correctionImpact + replayImpact + smoothingImpact;
    };
    // Private methods
    StateReconciliationImpl.prototype.calculateSeverity = function () {
        var maxPositionDiff = 0;
        var hasStateChanges = false;
        var hasCreationDeletion = false;
        for (var _i = 0, _a = this.entityCorrections; _i < _a.length; _i++) {
            var correction = _a[_i];
            if (correction.type === CorrectionType.POSITION) {
                var diff = this.calculatePositionDifference(correction.previousValue, correction.correctedValue);
                maxPositionDiff = Math.max(maxPositionDiff, diff);
            }
            else if (correction.type === CorrectionType.STATE) {
                hasStateChanges = true;
            }
            else if (correction.type === CorrectionType.CREATION || correction.type === CorrectionType.DELETION) {
                hasCreationDeletion = true;
            }
        }
        // Player corrections are always significant
        if (this.playerCorrections.length > 0) {
            return CorrectionSeverity.MAJOR;
        }
        // Entity creation/deletion is major
        if (hasCreationDeletion) {
            return CorrectionSeverity.MAJOR;
        }
        // State changes are moderate
        if (hasStateChanges) {
            return CorrectionSeverity.MODERATE;
        }
        // Position-based severity
        if (maxPositionDiff > 5) {
            return CorrectionSeverity.MAJOR;
        }
        else if (maxPositionDiff > 1) {
            return CorrectionSeverity.MODERATE;
        }
        else {
            return CorrectionSeverity.MINOR;
        }
    };
    StateReconciliationImpl.prototype.createSmoothingConfig = function () {
        var duration = this.calculateSmoothingDuration();
        var easingFunction = 'ease-out'; // Default
        switch (this.severity) {
            case CorrectionSeverity.MINOR:
                easingFunction = 'linear';
                break;
            case CorrectionSeverity.MODERATE:
                easingFunction = 'ease-out';
                break;
            case CorrectionSeverity.MAJOR:
                easingFunction = 'ease-in-out';
                break;
        }
        return {
            duration: duration,
            easingFunction: easingFunction,
            enabled: true
        };
    };
    StateReconciliationImpl.prototype.isValidEntityCorrection = function (correction) {
        return correction.entityId.length > 0 &&
            Object.values(CorrectionType).includes(correction.type) &&
            correction.confidence >= 0.0 && correction.confidence <= 1.0 &&
            correction.previousValue !== undefined &&
            correction.correctedValue !== undefined;
    };
    StateReconciliationImpl.prototype.isValidPlayerCorrection = function (correction) {
        return correction.playerId.length > 0 &&
            correction.previousScore >= 0 &&
            correction.correctedScore >= 0 &&
            correction.previousArrowCount >= 0 &&
            correction.correctedArrowCount >= 0;
    };
    StateReconciliationImpl.prototype.isValidInputReplay = function () {
        return this.inputReplay.startFromSequence >= 0 &&
            Array.isArray(this.inputReplay.inputsToReplay) &&
            this.inputReplay.replayTimestamp >= 0;
    };
    StateReconciliationImpl.prototype.calculatePositionDifference = function (pos1, pos2) {
        if (!pos1 || !pos2)
            return 0;
        return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    };
    StateReconciliationImpl.prototype.getMaxPositionDifference = function () {
        var maxDiff = 0;
        for (var _i = 0, _a = this.entityCorrections; _i < _a.length; _i++) {
            var correction = _a[_i];
            if (correction.type === CorrectionType.POSITION) {
                var diff = this.calculatePositionDifference(correction.previousValue, correction.correctedValue);
                maxDiff = Math.max(maxDiff, diff);
            }
        }
        return maxDiff;
    };
    StateReconciliationImpl.prototype.updateSeverity = function () {
        this.severity = this.calculateSeverity();
    };
    StateReconciliationImpl.prototype.updateSmoothingConfig = function () {
        this.smoothingConfig = this.createSmoothingConfig();
    };
    StateReconciliationImpl.prototype.updateMetrics = function () {
        this.metrics.correctionCount = this.entityCorrections.length + this.playerCorrections.length;
        this.metrics.performanceImpact = this.calculatePerformanceImpact();
    };
    StateReconciliationImpl.prototype.generateReconciliationId = function () {
        return "reconcile_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    return StateReconciliationImpl;
}());
exports.StateReconciliationImpl = StateReconciliationImpl;
/**
 * Reconciliation manager for handling multiple corrections
 */
var ReconciliationManager = /** @class */ (function () {
    function ReconciliationManager() {
        this.activeReconciliations = new Map();
        this.reconciliationHistory = [];
        this.maxHistorySize = 100;
    }
    /**
     * Create new reconciliation
     */
    ReconciliationManager.prototype.createReconciliation = function (gameStateSequence, causedByInput) {
        var reconciliation = new StateReconciliationImpl({
            gameStateSequence: gameStateSequence,
            causedByInput: causedByInput
        });
        this.activeReconciliations.set(reconciliation.id, reconciliation);
        return reconciliation;
    };
    /**
     * Complete reconciliation and move to history
     */
    ReconciliationManager.prototype.completeReconciliation = function (reconciliationId) {
        var reconciliation = this.activeReconciliations.get(reconciliationId);
        if (!reconciliation)
            return false;
        // Mark input replay as completed if it was started
        if (reconciliation.requiresInputReplay() && !reconciliation.inputReplay.completed) {
            reconciliation.completeInputReplay();
        }
        // Move to history
        this.addToHistory(reconciliation);
        this.activeReconciliations.delete(reconciliationId);
        return true;
    };
    /**
     * Get active reconciliation by ID
     */
    ReconciliationManager.prototype.getReconciliation = function (reconciliationId) {
        return this.activeReconciliations.get(reconciliationId) || null;
    };
    /**
     * Get all active reconciliations
     */
    ReconciliationManager.prototype.getActiveReconciliations = function () {
        return Array.from(this.activeReconciliations.values());
    };
    /**
     * Get reconciliation statistics
     */
    ReconciliationManager.prototype.getStatistics = function () {
        var _a;
        var allReconciliations = __spreadArray(__spreadArray([], Array.from(this.activeReconciliations.values()), true), this.reconciliationHistory, true);
        var severityDistribution = (_a = {},
            _a[CorrectionSeverity.MINOR] = 0,
            _a[CorrectionSeverity.MODERATE] = 0,
            _a[CorrectionSeverity.MAJOR] = 0,
            _a);
        var totalSmoothingDuration = 0;
        for (var _i = 0, allReconciliations_1 = allReconciliations; _i < allReconciliations_1.length; _i++) {
            var reconciliation = allReconciliations_1[_i];
            severityDistribution[reconciliation.severity]++;
            totalSmoothingDuration += reconciliation.smoothingConfig.duration;
        }
        return {
            activeCount: this.activeReconciliations.size,
            totalProcessed: allReconciliations.length,
            averageSmoothingDuration: allReconciliations.length > 0 ? totalSmoothingDuration / allReconciliations.length : 0,
            severityDistribution: severityDistribution
        };
    };
    /**
     * Cleanup old reconciliations
     */
    ReconciliationManager.prototype.cleanup = function () {
        var cutoffTime = Date.now() - 300000; // 5 minutes
        // Remove old active reconciliations (they should be completed by now)
        for (var _i = 0, _a = Array.from(this.activeReconciliations); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], reconciliation = _b[1];
            if (reconciliation.timestamp < cutoffTime) {
                this.addToHistory(reconciliation);
                this.activeReconciliations.delete(id);
            }
        }
        // Maintain history size
        if (this.reconciliationHistory.length > this.maxHistorySize) {
            this.reconciliationHistory = this.reconciliationHistory.slice(-this.maxHistorySize);
        }
    };
    ReconciliationManager.prototype.addToHistory = function (reconciliation) {
        this.reconciliationHistory.push(reconciliation);
        // Maintain history size
        if (this.reconciliationHistory.length > this.maxHistorySize) {
            this.reconciliationHistory.shift();
        }
    };
    return ReconciliationManager;
}());
exports.ReconciliationManager = ReconciliationManager;
/**
 * Factory for creating StateReconciliation instances
 */
var StateReconciliationFactory = /** @class */ (function () {
    function StateReconciliationFactory() {
    }
    StateReconciliationFactory.create = function (gameStateSequence, causedByInput) {
        return new StateReconciliationImpl({
            gameStateSequence: gameStateSequence,
            causedByInput: causedByInput
        });
    };
    StateReconciliationFactory.createWithCorrections = function (gameStateSequence, entityCorrections, playerCorrections) {
        if (playerCorrections === void 0) { playerCorrections = []; }
        return new StateReconciliationImpl({
            gameStateSequence: gameStateSequence,
            entityCorrections: entityCorrections,
            playerCorrections: playerCorrections
        });
    };
    StateReconciliationFactory.createMinorCorrection = function (gameStateSequence, entityId, previousPosition, correctedPosition) {
        var reconciliation = new StateReconciliationImpl({ gameStateSequence: gameStateSequence });
        reconciliation.addEntityCorrection(entityId, CorrectionType.POSITION, previousPosition, correctedPosition, 0.95);
        return reconciliation;
    };
    return StateReconciliationFactory;
}());
exports.StateReconciliationFactory = StateReconciliationFactory;
//# sourceMappingURL=state-reconciliation.js.map