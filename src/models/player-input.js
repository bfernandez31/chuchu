"use strict";
/**
 * T020: PlayerInput Model
 *
 * Timestamped input structure with validation, rate limiting,
 * and acknowledgment tracking for hybrid predictive rendering.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerInputFactory = exports.InputBuffer = exports.InputRateLimiter = exports.PlayerInputImpl = exports.InputStatus = exports.InputType = void 0;
var InputType;
(function (InputType) {
    InputType["ARROW_PLACE"] = "ARROW_PLACE";
    InputType["MOVE"] = "MOVE";
    InputType["ACTION"] = "ACTION";
})(InputType || (exports.InputType = InputType = {}));
var InputStatus;
(function (InputStatus) {
    InputStatus["PENDING"] = "PENDING";
    InputStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    InputStatus["REJECTED"] = "REJECTED";
    InputStatus["TIMEOUT"] = "TIMEOUT";
})(InputStatus || (exports.InputStatus = InputStatus = {}));
var PlayerInputImpl = /** @class */ (function () {
    function PlayerInputImpl(data) {
        this.id = data.id || this.generateInputId();
        this.playerId = data.playerId;
        this.sequence = data.sequence || 0;
        this.type = data.type;
        this.timestamp = data.timestamp || Date.now();
        this.data = data.data;
        this.status = data.status || InputStatus.PENDING;
        this.acknowledgment = data.acknowledgment;
        this.rateLimitInfo = data.rateLimitInfo || {
            windowStart: this.timestamp,
            inputCount: 1,
            burstCount: 1,
            lastInput: this.timestamp
        };
    }
    /**
     * Validate input structure and constraints
     */
    PlayerInputImpl.prototype.isValid = function () {
        try {
            // Basic validation
            if (!this.id || !this.playerId)
                return false;
            if (this.sequence < 0)
                return false;
            if (this.timestamp <= 0)
                return false;
            if (!Object.values(InputType).includes(this.type))
                return false;
            // Type-specific validation
            switch (this.type) {
                case InputType.ARROW_PLACE:
                    return this.validateArrowPlacement();
                case InputType.MOVE:
                    return this.validateMovement();
                case InputType.ACTION:
                    return this.validateAction();
                default:
                    return false;
            }
        }
        catch (error) {
            console.error('Input validation error:', error);
            return false;
        }
    };
    /**
     * Check if input is within rate limits (60 inputs/second, burst 10)
     */
    PlayerInputImpl.prototype.isWithinRateLimit = function () {
        var now = Date.now();
        var windowDuration = 1000; // 1 second window
        var maxInputsPerSecond = 60;
        var maxBurstInputs = 10;
        var burstWindow = 100; // 100ms burst window
        // Check 1-second window rate limit
        if (now - this.rateLimitInfo.windowStart >= windowDuration) {
            // Reset window
            this.rateLimitInfo.windowStart = now;
            this.rateLimitInfo.inputCount = 1;
        }
        else {
            this.rateLimitInfo.inputCount++;
            if (this.rateLimitInfo.inputCount > maxInputsPerSecond) {
                return false;
            }
        }
        // Check burst rate limit
        if (now - this.rateLimitInfo.lastInput < burstWindow) {
            this.rateLimitInfo.burstCount++;
            if (this.rateLimitInfo.burstCount > maxBurstInputs) {
                return false;
            }
        }
        else {
            this.rateLimitInfo.burstCount = 1;
        }
        this.rateLimitInfo.lastInput = now;
        return true;
    };
    /**
     * Calculate input age in milliseconds
     */
    PlayerInputImpl.prototype.calculateAge = function () {
        return Date.now() - this.timestamp;
    };
    /**
     * Update input status with acknowledgment
     */
    PlayerInputImpl.prototype.acknowledge = function (serverTimestamp, processingTime) {
        this.status = InputStatus.ACKNOWLEDGED;
        this.acknowledgment = {
            serverTimestamp: serverTimestamp,
            processingTime: processingTime,
            acknowledged: true
        };
    };
    /**
     * Reject input with reason
     */
    PlayerInputImpl.prototype.reject = function (reason) {
        this.status = InputStatus.REJECTED;
        this.acknowledgment = {
            serverTimestamp: Date.now(),
            processingTime: this.calculateAge(),
            acknowledged: false,
            rejectionReason: reason
        };
    };
    /**
     * Mark input as timed out
     */
    PlayerInputImpl.prototype.timeout = function () {
        this.status = InputStatus.TIMEOUT;
        this.acknowledgment = {
            serverTimestamp: Date.now(),
            processingTime: this.calculateAge(),
            acknowledged: false,
            rejectionReason: 'Request timeout'
        };
    };
    /**
     * Check if input requires acknowledgment within timeout
     */
    PlayerInputImpl.prototype.isAckRequired = function () {
        var ackTimeout = 5000; // 5 seconds
        return this.status === InputStatus.PENDING && this.calculateAge() < ackTimeout;
    };
    /**
     * Check if input has expired
     */
    PlayerInputImpl.prototype.isExpired = function () {
        var expirationTime = 10000; // 10 seconds
        return this.calculateAge() > expirationTime;
    };
    // Private validation methods
    PlayerInputImpl.prototype.validateArrowPlacement = function () {
        if (!this.data.position)
            return false;
        if (!this.data.direction)
            return false;
        var pos = this.data.position;
        var validDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        return pos.x >= 0 && pos.x < 50 && // Max board size
            pos.y >= 0 && pos.y < 50 &&
            validDirections.includes(this.data.direction);
    };
    PlayerInputImpl.prototype.validateMovement = function () {
        if (!this.data.targetPosition)
            return false;
        var pos = this.data.targetPosition;
        var isValidPosition = pos.x >= 0 && pos.x < 50 && pos.y >= 0 && pos.y < 50;
        if (!isValidPosition)
            return false;
        // Validate velocity if provided
        if (this.data.velocity) {
            var vel = this.data.velocity;
            var maxVelocity = 10.0; // Max velocity units per second
            return Math.abs(vel.x) <= maxVelocity && Math.abs(vel.y) <= maxVelocity;
        }
        return true;
    };
    PlayerInputImpl.prototype.validateAction = function () {
        if (!this.data.action)
            return false;
        var validActions = [
            'JOIN_GAME',
            'LEAVE_GAME',
            'READY',
            'CHAT',
            'PAUSE',
            'RESUME'
        ];
        return validActions.includes(this.data.action);
    };
    PlayerInputImpl.prototype.generateInputId = function () {
        return "input_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    return PlayerInputImpl;
}());
exports.PlayerInputImpl = PlayerInputImpl;
/**
 * Rate limiting manager for player inputs
 */
var InputRateLimiter = /** @class */ (function () {
    function InputRateLimiter() {
        var _this = this;
        this.playerLimits = new Map();
        this.maxInputsPerSecond = 60;
        this.maxBurstInputs = 10;
        this.burstWindow = 100; // ms
        this.cleanupInterval = 60000; // 1 minute
        // Periodic cleanup of old rate limit data
        setInterval(function () { return _this.cleanup(); }, this.cleanupInterval);
    }
    /**
     * Check if player can send input within rate limits
     */
    InputRateLimiter.prototype.canSendInput = function (playerId) {
        var now = Date.now();
        var limitInfo = this.playerLimits.get(playerId);
        if (!limitInfo) {
            limitInfo = {
                windowStart: now,
                inputCount: 0,
                burstCount: 0,
                lastInput: 0
            };
            this.playerLimits.set(playerId, limitInfo);
        }
        // Check 1-second window
        if (now - limitInfo.windowStart >= 1000) {
            limitInfo.windowStart = now;
            limitInfo.inputCount = 0;
        }
        if (limitInfo.inputCount >= this.maxInputsPerSecond) {
            return false;
        }
        // Check burst window
        if (now - limitInfo.lastInput < this.burstWindow) {
            if (limitInfo.burstCount >= this.maxBurstInputs) {
                return false;
            }
        }
        else {
            limitInfo.burstCount = 0;
        }
        return true;
    };
    /**
     * Record input for rate limiting
     */
    InputRateLimiter.prototype.recordInput = function (playerId) {
        var now = Date.now();
        var limitInfo = this.playerLimits.get(playerId);
        if (!limitInfo) {
            limitInfo = {
                windowStart: now,
                inputCount: 1,
                burstCount: 1,
                lastInput: now
            };
            this.playerLimits.set(playerId, limitInfo);
            return;
        }
        limitInfo.inputCount++;
        limitInfo.burstCount++;
        limitInfo.lastInput = now;
    };
    /**
     * Get rate limit status for player
     */
    InputRateLimiter.prototype.getRateLimitStatus = function (playerId) {
        return this.playerLimits.get(playerId) || null;
    };
    /**
     * Clean up old rate limit data
     */
    InputRateLimiter.prototype.cleanup = function () {
        var now = Date.now();
        var cleanupThreshold = 300000; // 5 minutes
        for (var _i = 0, _a = Array.from(this.playerLimits); _i < _a.length; _i++) {
            var _b = _a[_i], playerId = _b[0], limitInfo = _b[1];
            if (now - limitInfo.lastInput > cleanupThreshold) {
                this.playerLimits.delete(playerId);
            }
        }
    };
    return InputRateLimiter;
}());
exports.InputRateLimiter = InputRateLimiter;
/**
 * Input buffer manager for tracking acknowledgments
 */
var InputBuffer = /** @class */ (function () {
    function InputBuffer() {
        this.inputs = new Map();
        this.maxBufferSize = 1000;
        this.ackTimeout = 5000; // 5 seconds
    }
    /**
     * Add input to buffer for tracking
     */
    InputBuffer.prototype.addInput = function (input) {
        // Maintain buffer size
        if (this.inputs.size >= this.maxBufferSize) {
            this.cleanupOldInputs();
        }
        this.inputs.set(input.id, input);
    };
    /**
     * Get input by ID
     */
    InputBuffer.prototype.getInput = function (inputId) {
        return this.inputs.get(inputId) || null;
    };
    /**
     * Acknowledge input
     */
    InputBuffer.prototype.acknowledgeInput = function (inputId, serverTimestamp, processingTime) {
        var input = this.inputs.get(inputId);
        if (!input)
            return false;
        input.acknowledge(serverTimestamp, processingTime);
        return true;
    };
    /**
     * Get pending inputs for player
     */
    InputBuffer.prototype.getPendingInputs = function (playerId) {
        return Array.from(this.inputs.values())
            .filter(function (input) { return input.playerId === playerId && input.status === InputStatus.PENDING; });
    };
    /**
     * Get inputs requiring acknowledgment
     */
    InputBuffer.prototype.getInputsRequiringAck = function () {
        return Array.from(this.inputs.values())
            .filter(function (input) { return input.isAckRequired(); });
    };
    /**
     * Process timeouts for pending inputs
     */
    InputBuffer.prototype.processTimeouts = function () {
        var timedOutInputs = [];
        for (var _i = 0, _a = Array.from(this.inputs); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], input = _b[1];
            if (input.status === InputStatus.PENDING && input.calculateAge() > this.ackTimeout) {
                input.timeout();
                timedOutInputs.push(input);
            }
        }
        return timedOutInputs;
    };
    /**
     * Clean up old and processed inputs
     */
    InputBuffer.prototype.cleanup = function () {
        this.cleanupOldInputs();
    };
    InputBuffer.prototype.cleanupOldInputs = function () {
        var cutoffTime = Date.now() - 60000; // Keep last minute
        for (var _i = 0, _a = Array.from(this.inputs); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], input = _b[1];
            if (input.timestamp < cutoffTime ||
                (input.status !== InputStatus.PENDING && input.calculateAge() > 10000)) {
                this.inputs.delete(id);
            }
        }
    };
    return InputBuffer;
}());
exports.InputBuffer = InputBuffer;
/**
 * Factory for creating PlayerInput instances
 */
var PlayerInputFactory = /** @class */ (function () {
    function PlayerInputFactory() {
    }
    PlayerInputFactory.createArrowPlacement = function (playerId, position, direction, sequence) {
        if (sequence === void 0) { sequence = 0; }
        return new PlayerInputImpl({
            playerId: playerId,
            type: InputType.ARROW_PLACE,
            sequence: sequence,
            data: {
                position: position,
                direction: direction
            }
        });
    };
    PlayerInputFactory.createMovement = function (playerId, targetPosition, velocity, sequence) {
        if (sequence === void 0) { sequence = 0; }
        return new PlayerInputImpl({
            playerId: playerId,
            type: InputType.MOVE,
            sequence: sequence,
            data: {
                targetPosition: targetPosition,
                velocity: velocity
            }
        });
    };
    PlayerInputFactory.createAction = function (playerId, action, parameters, sequence) {
        if (sequence === void 0) { sequence = 0; }
        return new PlayerInputImpl({
            playerId: playerId,
            type: InputType.ACTION,
            sequence: sequence,
            data: {
                action: action,
                parameters: parameters
            }
        });
    };
    PlayerInputFactory.fromJSON = function (json) {
        return new PlayerInputImpl({
            id: json.id,
            playerId: json.playerId,
            sequence: json.sequence,
            type: json.type,
            timestamp: json.timestamp,
            data: json.data,
            status: json.status,
            acknowledgment: json.acknowledgment,
            rateLimitInfo: json.rateLimitInfo
        });
    };
    return PlayerInputFactory;
}());
exports.PlayerInputFactory = PlayerInputFactory;
//# sourceMappingURL=player-input.js.map