"use strict";
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
exports.InputComponent = void 0;
var analog_stick_component_1 = require("./analog-stick.component");
var InputComponent = /** @class */ (function () {
    function InputComponent() {
        var _this = this;
        this.lastArrowTime = 0;
        this.stickActive = false;
        // Enhanced input system
        this.inputSequence = 0;
        this.inputBuffer = [];
        this.pendingAcknowledgments = new Map(); // sequence -> timestamp
        // Rate limiting
        this.inputRateLimit = 60; // inputs per second
        this.inputTimes = [];
        // Visual feedback
        this.feedbackElements = new Map();
        this.lastFeedbackTime = 0;
        this.analogStick = new analog_stick_component_1.AnalogStickComponent();
        this.inputMetrics = {
            totalInputs: 0,
            averageLatency: 0,
            acknowledgedInputs: 0,
            droppedInputs: 0,
            lastInputTime: 0
        };
        this.predictiveOptions = {
            enablePrediction: true,
            immediateVisualFeedback: true,
            inputBuffering: true,
            maxBufferSize: 10,
            acknowledgmentTimeout: 1000
        };
        // Start cleanup interval
        setInterval(function () { return _this.cleanupPendingAcknowledgments(); }, 1000);
        // Initialize visual feedback styles
        this.initVisualFeedbackStyles();
    }
    /**
     * Create timestamped input with prediction metadata
     */
    InputComponent.prototype.createTimestampedInput = function (playerId, inputType, data) {
        var now = Date.now();
        this.inputSequence++;
        var input = {
            playerId: playerId,
            timestamp: now,
            sequence: this.inputSequence,
            inputType: inputType,
            data: data,
            rateLimitingInfo: {
                windowStart: now - 1000,
                windowEnd: now,
                inputCount: this.getRecentInputCount(),
                allowedCount: this.inputRateLimit
            },
            acknowledged: false,
            acknowledgmentTimeout: this.predictiveOptions.acknowledgmentTimeout
        };
        return input;
    };
    /**
     * Send predictive input with immediate feedback
     */
    InputComponent.prototype.sendPredictiveInput = function (ws, playerId, inputType, data, activity) {
        // Check rate limiting
        if (!this.checkRateLimit()) {
            console.warn('Input rate limit exceeded');
            return;
        }
        var input = this.createTimestampedInput(playerId, inputType, data);
        // Add to buffer if enabled
        if (this.predictiveOptions.inputBuffering) {
            this.inputBuffer.push(input);
            // Maintain buffer size
            if (this.inputBuffer.length > this.predictiveOptions.maxBufferSize) {
                this.inputBuffer.shift();
            }
        }
        // Track pending acknowledgment
        this.pendingAcknowledgments.set(input.sequence, input.timestamp);
        // Apply immediate visual feedback
        if (this.predictiveOptions.immediateVisualFeedback) {
            this.applyImmediateVisualFeedback(input);
        }
        // Send predictive input message
        var predictiveMessage = {
            type: 'predictive-input',
            playerId: input.playerId,
            input: {
                timestamp: input.timestamp,
                sequence: input.sequence,
                inputType: input.inputType,
                data: input.data
            },
            prediction: {
                predictionId: "pred_".concat(input.sequence, "_").concat(Date.now()),
                expectedOutcome: this.generateExpectedOutcome(input),
                confidence: this.calculatePredictionConfidence(input)
            }
        };
        ws.send(JSON.stringify(predictiveMessage));
        // Update metrics
        this.updateInputMetrics(input);
        activity();
    };
    /**
     * Apply immediate visual feedback for input
     */
    InputComponent.prototype.applyImmediateVisualFeedback = function (input) {
        var now = Date.now();
        // Skip if too frequent (maintain 60 FPS)
        if (now - this.lastFeedbackTime < 16.67) {
            return;
        }
        switch (input.inputType) {
            case 'ARROW_PLACE':
                this.showArrowPlacementFeedback(input.data.direction);
                break;
            case 'MOVE':
                this.showMovementFeedback(input.data.direction);
                break;
            case 'ACTION':
                this.showActionFeedback(input.data.action);
                break;
        }
        this.lastFeedbackTime = now;
    };
    /**
     * Show arrow placement feedback
     */
    InputComponent.prototype.showArrowPlacementFeedback = function (direction) {
        var arrowButton = this.getArrowButton(direction);
        if (arrowButton) {
            arrowButton.classList.add('input-feedback');
            setTimeout(function () {
                arrowButton.classList.remove('input-feedback');
            }, 150);
        }
    };
    /**
     * Show movement feedback
     */
    InputComponent.prototype.showMovementFeedback = function (direction) {
        // Create visual indicator for movement prediction
        var indicator = document.createElement('div');
        indicator.className = 'movement-prediction';
        indicator.style.cssText = "\n      position: absolute;\n      width: 20px;\n      height: 20px;\n      background: rgba(0, 255, 0, 0.5);\n      border-radius: 50%;\n      pointer-events: none;\n      z-index: 1000;\n      transition: all 0.3s ease;\n    ";
        // Position based on analog stick position
        var stickTrack = document.getElementById('analog-stick-track');
        if (stickTrack) {
            var rect = stickTrack.getBoundingClientRect();
            indicator.style.left = "".concat(rect.left + rect.width / 2, "px");
            indicator.style.top = "".concat(rect.top + rect.height / 2, "px");
            document.body.appendChild(indicator);
            // Animate and remove
            setTimeout(function () {
                indicator.style.opacity = '0';
                indicator.style.transform = 'scale(2)';
            }, 10);
            setTimeout(function () {
                document.body.removeChild(indicator);
            }, 300);
        }
    };
    /**
     * Show action feedback
     */
    InputComponent.prototype.showActionFeedback = function (action) {
        // Visual feedback for action inputs
        var feedbackText = document.createElement('div');
        feedbackText.textContent = action.toUpperCase();
        feedbackText.className = 'action-feedback';
        feedbackText.style.cssText = "\n      position: fixed;\n      top: 50%;\n      left: 50%;\n      transform: translate(-50%, -50%);\n      color: #00ff00;\n      font-size: 24px;\n      font-weight: bold;\n      pointer-events: none;\n      z-index: 1000;\n      opacity: 0;\n      transition: all 0.5s ease;\n    ";
        document.body.appendChild(feedbackText);
        setTimeout(function () {
            feedbackText.style.opacity = '1';
            feedbackText.style.transform = 'translate(-50%, -60%)';
        }, 10);
        setTimeout(function () {
            feedbackText.style.opacity = '0';
        }, 400);
        setTimeout(function () {
            document.body.removeChild(feedbackText);
        }, 500);
    };
    /**
     * Handle input acknowledgment from server
     */
    InputComponent.prototype.handleInputAcknowledgment = function (acknowledgment) {
        var sentTime = this.pendingAcknowledgments.get(acknowledgment.acknowledgedSequence);
        if (sentTime) {
            var latency = Date.now() - sentTime;
            this.updateLatencyMetrics(latency);
            this.pendingAcknowledgments.delete(acknowledgment.acknowledgedSequence);
            // Mark input as acknowledged in buffer
            var input = this.inputBuffer.find(function (i) { return i.sequence === acknowledgment.acknowledgedSequence; });
            if (input) {
                input.acknowledged = true;
            }
            this.inputMetrics.acknowledgedInputs++;
        }
    };
    /**
     * Check if rate limit allows new input
     */
    InputComponent.prototype.checkRateLimit = function () {
        var now = Date.now();
        var windowStart = now - 1000; // 1 second window
        // Clean old entries
        this.inputTimes = this.inputTimes.filter(function (time) { return time > windowStart; });
        // Check if under limit
        if (this.inputTimes.length < this.inputRateLimit) {
            this.inputTimes.push(now);
            return true;
        }
        return false;
    };
    /**
     * Generate expected outcome for prediction
     */
    InputComponent.prototype.generateExpectedOutcome = function (input) {
        switch (input.inputType) {
            case 'ARROW_PLACE':
                return "arrow_placed_".concat(input.data.direction);
            case 'MOVE':
                return "player_moved_".concat(input.data.x, "_").concat(input.data.y);
            case 'ACTION':
                return "action_executed_".concat(input.data.action);
            default:
                return 'unknown_outcome';
        }
    };
    /**
     * Calculate prediction confidence based on current conditions
     */
    InputComponent.prototype.calculatePredictionConfidence = function (input) {
        var confidence = 1.0;
        // Reduce confidence based on pending acknowledgments
        var pendingCount = this.pendingAcknowledgments.size;
        confidence *= Math.max(0.5, 1 - (pendingCount * 0.1));
        // Reduce confidence based on recent dropped inputs
        var dropRate = this.inputMetrics.totalInputs > 0 ?
            this.inputMetrics.droppedInputs / this.inputMetrics.totalInputs : 0;
        confidence *= Math.max(0.3, 1 - dropRate);
        // Reduce confidence based on latency
        if (this.inputMetrics.averageLatency > 200) {
            confidence *= 0.8;
        }
        return Math.max(0.1, Math.min(1.0, confidence));
    };
    /**
     * Get recent input count for rate limiting
     */
    InputComponent.prototype.getRecentInputCount = function () {
        var now = Date.now();
        var windowStart = now - 1000;
        return this.inputTimes.filter(function (time) { return time > windowStart; }).length;
    };
    /**
     * Update input metrics
     */
    InputComponent.prototype.updateInputMetrics = function (input) {
        this.inputMetrics.totalInputs++;
        this.inputMetrics.lastInputTime = input.timestamp;
    };
    /**
     * Update latency metrics
     */
    InputComponent.prototype.updateLatencyMetrics = function (latency) {
        var currentAvg = this.inputMetrics.averageLatency;
        var count = this.inputMetrics.acknowledgedInputs;
        this.inputMetrics.averageLatency = (currentAvg * count + latency) / (count + 1);
    };
    /**
     * Cleanup pending acknowledgments that have timed out
     */
    InputComponent.prototype.cleanupPendingAcknowledgments = function () {
        var now = Date.now();
        var timeout = this.predictiveOptions.acknowledgmentTimeout;
        for (var _i = 0, _a = this.pendingAcknowledgments.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], sequence = _b[0], timestamp = _b[1];
            if (now - timestamp > timeout) {
                this.pendingAcknowledgments.delete(sequence);
                this.inputMetrics.droppedInputs++;
            }
        }
    };
    /**
     * Get arrow button by direction
     */
    InputComponent.prototype.getArrowButton = function (direction) {
        switch (direction) {
            case 'U': return this.up;
            case 'D': return this.down;
            case 'L': return this.left;
            case 'R': return this.right;
            default: return undefined;
        }
    };
    InputComponent.prototype.detectArrowFromSecondTouch = function (touch, ws, key, activity) {
        var x = touch.clientX;
        var y = touch.clientY;
        // Vérifie quel bouton est sous cette coordonnée
        var element = document.elementFromPoint(x, y);
        // Fonction pour trouver le bouton parent
        var findArrowButton = function (el) {
            if (!el)
                return null;
            // Vérification directe
            if (el.id === 'arrow-up')
                return 'U';
            if (el.id === 'arrow-down')
                return 'D';
            if (el.id === 'arrow-left')
                return 'L';
            if (el.id === 'arrow-right')
                return 'R';
            // Vérification du parent (pour les enfants comme le texte)
            if (el.parentElement) {
                return findArrowButton(el.parentElement);
            }
            return null;
        };
        var direction = findArrowButton(element);
        if (direction) {
            var now = Date.now();
            // Évite les déclenchements multiples (debouncing 150ms)
            if (now - this.lastArrowTime > 150) {
                ws.send(JSON.stringify({ type: 'arrow', direction: direction, key: key }));
                activity();
                this.lastArrowTime = now;
            }
        }
    };
    InputComponent.prototype.init = function (ws, key, activity) {
        var _this = this;
        this.panel = document.getElementById('panel-input');
        this.label = document.getElementById('player-label');
        this.up = document.getElementById('arrow-up');
        this.down = document.getElementById('arrow-down');
        this.left = document.getElementById('arrow-left');
        this.right = document.getElementById('arrow-right');
        this.quit = document.getElementById('quit');
        if (this.label && this.panel) {
            this.hide();
            // Initialisation du stick analogique with predictive input
            this.analogStick.init(function (x, y) {
                if (_this.predictiveOptions.enablePrediction) {
                    _this.sendPredictiveInput(ws, key, 'MOVE', { x: x, y: y }, activity);
                }
                else {
                    ws.send(JSON.stringify({ type: 'input', key: key, x: x, y: y }));
                    activity();
                }
            });
            // Gestion multi-touch pour les flèches (conservé de l'ancien système)
            document.addEventListener("touchstart", function (event) {
                if (event.touches.length >= 2) {
                    // Trouve la touche qui n'est pas sur le stick
                    for (var i = 0; i < event.touches.length; i++) {
                        var touch = event.touches[i];
                        var element = document.elementFromPoint(touch.clientX, touch.clientY);
                        var stickTrack = document.getElementById('analog-stick-track');
                        if (element && stickTrack && !stickTrack.contains(element)) {
                            _this.detectArrowFromSecondTouch(touch, ws, key, activity);
                            break;
                        }
                    }
                }
            }, { passive: false });
            this.up.addEventListener("click", function () {
                if (_this.predictiveOptions.enablePrediction) {
                    _this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'U' }, activity);
                }
                else {
                    ws.send(JSON.stringify({ type: 'arrow', direction: 'U', key: key }));
                    activity();
                }
            }, false);
            this.down.addEventListener("click", function () {
                if (_this.predictiveOptions.enablePrediction) {
                    _this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'D' }, activity);
                }
                else {
                    ws.send(JSON.stringify({ type: 'arrow', direction: 'D', key: key }));
                    activity();
                }
            }, false);
            this.left.addEventListener("click", function () {
                if (_this.predictiveOptions.enablePrediction) {
                    _this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'L' }, activity);
                }
                else {
                    ws.send(JSON.stringify({ type: 'arrow', direction: 'L', key: key }));
                    activity();
                }
            }, false);
            this.right.addEventListener("click", function () {
                if (_this.predictiveOptions.enablePrediction) {
                    _this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'R' }, activity);
                }
                else {
                    ws.send(JSON.stringify({ type: 'arrow', direction: 'R', key: key }));
                    activity();
                }
            }, false);
            this.quit.addEventListener("click", function () {
                ws.send(JSON.stringify({ type: 'quit', key: key }));
                activity();
            }, false);
        }
        else {
            setTimeout(function () { return _this.init(ws, key, activity); }, 100);
        }
    };
    InputComponent.prototype.show = function (color, name) {
        this.panel.style.display = "flex";
        this.label.style.color = color;
        this.label.innerText = name;
    };
    InputComponent.prototype.hide = function () {
        this.panel.style.display = "none";
    };
    /**
     * Get current input metrics
     */
    InputComponent.prototype.getInputMetrics = function () {
        return __assign({}, this.inputMetrics);
    };
    /**
     * Get input buffer status
     */
    InputComponent.prototype.getInputBufferStatus = function () {
        var acknowledgedCount = this.inputBuffer.filter(function (input) { return input.acknowledged; }).length;
        var pendingCount = this.pendingAcknowledgments.size;
        return {
            bufferedInputs: this.inputBuffer.length,
            acknowledgedInputs: acknowledgedCount,
            pendingInputs: pendingCount,
            averageLatency: this.inputMetrics.averageLatency
        };
    };
    /**
     * Update predictive input options
     */
    InputComponent.prototype.updatePredictiveOptions = function (options) {
        this.predictiveOptions = __assign(__assign({}, this.predictiveOptions), options);
    };
    /**
     * Enable or disable prediction mode
     */
    InputComponent.prototype.setPredictionEnabled = function (enabled) {
        this.predictiveOptions.enablePrediction = enabled;
        if (!enabled) {
            // Clear pending acknowledgments when disabling prediction
            this.pendingAcknowledgments.clear();
            this.inputBuffer.length = 0;
        }
    };
    /**
     * Set input rate limit
     */
    InputComponent.prototype.setRateLimit = function (inputsPerSecond) {
        this.inputRateLimit = Math.max(1, Math.min(120, inputsPerSecond));
    };
    /**
     * Get prediction performance stats
     */
    InputComponent.prototype.getPredictionStats = function () {
        var _this = this;
        var totalInputs = this.inputMetrics.totalInputs;
        var acknowledgedInputs = this.inputMetrics.acknowledgedInputs;
        var predictionAccuracy = totalInputs > 0 ?
            (acknowledgedInputs / totalInputs) * 100 : 100;
        // Calculate average confidence from recent inputs
        var recentInputs = this.inputBuffer.slice(-10);
        var averageConfidence = recentInputs.length > 0 ?
            recentInputs.reduce(function (sum, input) {
                return sum + _this.calculatePredictionConfidence(input);
            }, 0) / recentInputs.length : 1.0;
        return {
            predictionAccuracy: predictionAccuracy,
            averageConfidence: averageConfidence,
            rollbackFrequency: 0,
            inputResponseTime: this.inputMetrics.averageLatency
        };
    };
    /**
     * Clear input buffer and reset metrics
     */
    InputComponent.prototype.reset = function () {
        this.inputBuffer.length = 0;
        this.pendingAcknowledgments.clear();
        this.inputTimes.length = 0;
        this.inputSequence = 0;
        this.inputMetrics = {
            totalInputs: 0,
            averageLatency: 0,
            acknowledgedInputs: 0,
            droppedInputs: 0,
            lastInputTime: 0
        };
    };
    /**
     * Add CSS for visual feedback
     */
    InputComponent.prototype.initVisualFeedbackStyles = function () {
        if (document.getElementById('input-feedback-styles'))
            return;
        var style = document.createElement('style');
        style.id = 'input-feedback-styles';
        style.textContent = "\n      .input-feedback {\n        background-color: rgba(0, 255, 0, 0.3) !important;\n        transform: scale(1.1);\n        transition: all 0.15s ease;\n      }\n\n      .movement-prediction {\n        box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);\n      }\n\n      .action-feedback {\n        text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);\n      }\n    ";
        document.head.appendChild(style);
    };
    return InputComponent;
}());
exports.InputComponent = InputComponent;
//# sourceMappingURL=input.component.js.map