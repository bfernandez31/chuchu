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
exports.Queue = void 0;
var player_1 = require("./player");
var game_1 = require("./game");
var fs = require("fs");
var config_1 = require("../browser/common/config");
var bot_1 = require("./bot");
var messages_pb_1 = require("./messages_pb");
/**
 * Enhanced WebSocket batcher with delta compression, adaptive batching, and priority-based message handling
 * Supports hybrid predictive rendering with delta compression and rollback correction distribution
 */
// Helper function to convert number to Long
function toLong(value) {
    return {
        low: value & 0xFFFFFFFF,
        high: Math.floor(value / 0x100000000),
        unsigned: false
    };
}
var WebSocketBatcher = /** @class */ (function () {
    function WebSocketBatcher(queue) {
        this.pendingUpdates = new Set();
        this.priorityQueue = [];
        this.batchTimer = null;
        this.adaptiveBatchDelay = 5; // ms - adaptive delay based on load
        this.compressionRatios = [];
        this.queue = queue;
    }
    /**
     * Schedule update for batched sending with adaptive delay
     */
    WebSocketBatcher.prototype.scheduleUpdate = function (updateType) {
        var _this = this;
        this.pendingUpdates.add(updateType);
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(function () {
                _this.flushUpdates();
            }, this.adaptiveBatchDelay);
        }
    };
    /**
     * Send immediate update for critical messages
     */
    WebSocketBatcher.prototype.sendImmediate = function (updateType) {
        this.pendingUpdates.add(updateType);
        this.flushUpdates();
    };
    /**
     * Add priority message to queue
     */
    WebSocketBatcher.prototype.addPriorityMessage = function (message, priority) {
        if (priority === void 0) { priority = 'medium'; }
        this.priorityQueue.push({ message: message, priority: priority });
        if (priority === 'high') {
            this.flushPriorityMessages();
        }
    };
    /**
     * Handle new predictiveInput message type
     */
    WebSocketBatcher.prototype.handlePredictiveInput = function (playerId, input, prediction) {
        var message = {
            type: 'input-acknowledgment',
            playerId: playerId,
            acknowledgedSequence: input.sequence,
            processingTime: Date.now() - input.timestamp
        };
        this.addPriorityMessage(message, 'high');
    };
    /**
     * Handle rollback correction distribution
     */
    WebSocketBatcher.prototype.distributeRollbackCorrection = function (correction) {
        var message = {
            type: 'rollback-correction',
            correction: correction
        };
        this.addPriorityMessage(message, 'high');
    };
    /**
     * Process and send all pending updates
     */
    WebSocketBatcher.prototype.flushUpdates = function () {
        // Process priority messages first
        this.flushPriorityMessages();
        // Process standard updates
        if (this.pendingUpdates.has('game')) {
            this.queue.sendGameToServerInternal();
        }
        if (this.pendingUpdates.has('delta')) {
            this.queue.sendDeltaGameStateInternal();
        }
        if (this.pendingUpdates.has('queue')) {
            this.queue.sendQueueUpdateInternal();
        }
        if (this.pendingUpdates.has('highscore')) {
            this.queue.sendHighScoreToServerInternal();
        }
        this.pendingUpdates.clear();
        this.batchTimer = null;
        // Adapt batch delay based on current load
        this.adaptBatchDelay();
    };
    /**
     * Flush priority messages immediately
     */
    WebSocketBatcher.prototype.flushPriorityMessages = function () {
        var _this = this;
        // Sort by priority: high > medium > low
        this.priorityQueue.sort(function (a, b) {
            var priorities = { high: 3, medium: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority];
        });
        // Send priority messages
        this.priorityQueue.forEach(function (_a) {
            var message = _a.message;
            _this.queue.sendPriorityMessage(message);
        });
        this.priorityQueue = [];
    };
    /**
     * Adapt batch delay based on compression ratios and load
     */
    WebSocketBatcher.prototype.adaptBatchDelay = function () {
        var avgCompressionRatio = this.compressionRatios.length > 0
            ? this.compressionRatios.reduce(function (a, b) { return a + b; }) / this.compressionRatios.length
            : 0.5;
        // Lower compression ratio = more changes = longer delay to batch more
        // Higher compression ratio = fewer changes = shorter delay for responsiveness
        this.adaptiveBatchDelay = Math.max(3, Math.min(15, 5 + (1 - avgCompressionRatio) * 10));
        // Keep only recent compression ratios
        if (this.compressionRatios.length > 10) {
            this.compressionRatios = this.compressionRatios.slice(-10);
        }
    };
    /**
     * Track compression ratio for adaptive optimization
     */
    WebSocketBatcher.prototype.trackCompressionRatio = function (ratio) {
        this.compressionRatios.push(ratio);
    };
    /**
     * Force sending of all pending updates (for cleanup)
     */
    WebSocketBatcher.prototype.flush = function () {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.flushUpdates();
        }
    };
    /**
     * Get current performance metrics
     */
    WebSocketBatcher.prototype.getMetrics = function () {
        return {
            adaptiveBatchDelay: this.adaptiveBatchDelay,
            averageCompressionRatio: this.compressionRatios.length > 0
                ? this.compressionRatios.reduce(function (a, b) { return a + b; }) / this.compressionRatios.length
                : 0,
            pendingUpdatesCount: this.pendingUpdates.size,
            priorityQueueSize: this.priorityQueue.length
        };
    };
    return WebSocketBatcher;
}());
/**
 * Gestionnaire de fréquence adaptative pour optimiser les performances
 * selon le nombre de joueurs et d'entités dans le jeu
 */
var AdaptiveGameLoop = /** @class */ (function () {
    function AdaptiveGameLoop() {
        this.currentFrequency = config_1.CONFIG.GAME_LOOP_MS;
    }
    /**
     * Calcule la fréquence optimale basée sur la charge du jeu
     */
    AdaptiveGameLoop.prototype.calculateOptimalFrequency = function (playerCount, entityCount) {
        if (!config_1.CONFIG.ADAPTIVE_FREQUENCY) {
            return config_1.CONFIG.GAME_LOOP_MS;
        }
        // Formule adaptative : plus de joueurs/entités = fréquence plus lente
        var baseFrequency = config_1.CONFIG.GAME_LOOP_MIN_MS;
        // Facteur basé sur le nombre de joueurs (moins critique)
        var playerFactor = Math.floor(playerCount / 8) * 5;
        // Facteur basé sur le nombre d'entités (plus critique)
        var entityFactor = Math.floor(entityCount / 50) * 3;
        // Calcul de la fréquence avec contraintes min/max
        var calculatedFrequency = baseFrequency + playerFactor + entityFactor;
        this.currentFrequency = Math.max(config_1.CONFIG.GAME_LOOP_MIN_MS, Math.min(config_1.CONFIG.GAME_LOOP_MAX_MS, calculatedFrequency));
        return this.currentFrequency;
    };
    /**
     * Retourne la fréquence actuelle
     */
    AdaptiveGameLoop.prototype.getCurrentFrequency = function () {
        return this.currentFrequency;
    };
    /**
     * Log des informations de performance (pour debug)
     */
    AdaptiveGameLoop.prototype.logPerformanceInfo = function (playerCount, entityCount) {
        if (config_1.CONFIG.ADAPTIVE_FREQUENCY) {
            console.log("[AdaptiveLoop] Players: ".concat(playerCount, ", Entities: ").concat(entityCount, ", Frequency: ").concat(this.currentFrequency, "ms (").concat(Math.round(1000 / this.currentFrequency), " FPS)"));
        }
    };
    return AdaptiveGameLoop;
}());
var Queue = /** @class */ (function () {
    function Queue(path) {
        var _this = this;
        this.players = [];
        this.servers = [];
        this.lastSave = '[]';
        this.savePlanned = false;
        this.previousGameState = null;
        this.path = path;
        this.adaptiveLoop = new AdaptiveGameLoop();
        this.batcher = new WebSocketBatcher(this);
        fs.readFile(this.path, 'utf8', function (err, data) {
            if (err) {
                console.error('Cannont initialize', err);
            }
            else {
                _this.players = JSON.parse(data).map(function (playerObj) { return player_1.Player.from(playerObj); });
            }
        });
        this.currentGame = new game_1.Game(this);
    }
    Queue.prototype.processMsg = function (payload, ws) {
        var _a;
        switch (payload.type) {
            case 'joined':
                var previous = this.players.find(function (player) { return payload.key === player.key; });
                if (!previous) {
                    var player_2;
                    if (payload.bot) {
                        // Si c'est un bot, on va chercher l'instance déjà créée dans le jeu
                        player_2 = this.currentGame.players.find(function (p) { return p.key === payload.key; });
                        if (!player_2) {
                            player_2 = new bot_1.Bot(this.currentGame, payload.name);
                        }
                    }
                    else {
                        player_2 = new player_1.Player(payload.name, payload.key);
                    }
                    this.players.push(player_2);
                    ws === null || ws === void 0 ? void 0 : ws.send(JSON.stringify({
                        type: 'key',
                        payload: {
                            key: player_2.key
                        }
                    }));
                    player_2.connect(ws);
                    console.log("New ".concat(payload.bot ? 'bot' : 'player', " ").concat(player_2.name, " joined"));
                    player_2.updateRatio();
                }
                else {
                    console.log("Previous player ".concat(previous.name, " > ").concat(payload.name, " joined"));
                    previous.name = payload.name;
                    previous.connect(ws);
                    previous.updateRatio();
                }
                this.sendHighScoreToServer();
                this.currentGame.size();
                break;
            case 'queue':
                var player = this.players.find(function (player) { return payload.key === player.key; });
                var playerInCurrentGame = (_a = this.currentGame) === null || _a === void 0 ? void 0 : _a.players.find(function (player) { return payload.key === player.key; });
                if (!playerInCurrentGame && !!player) {
                    console.log("Adding Player ".concat(player.name));
                    this.currentGame.apply(player);
                    this.sendQueueUpdate();
                }
                if (!!player && playerInCurrentGame) {
                    //already in game
                    player.queued();
                    player.stopWait();
                }
                break;
            case 'quit':
                var playerQuitting = this.players.find(function (player) { return payload.key === player.key; });
                if (playerQuitting) {
                    this.currentGame.unapply(playerQuitting);
                    console.log("Player ".concat(playerQuitting === null || playerQuitting === void 0 ? void 0 : playerQuitting.name, " quitting"));
                    this.currentGame.size();
                }
                break;
            case 'input':
                var playerInput = this.players.find(function (player) { return payload.key === player.key; });
                if (!!playerInput) {
                    playerInput.move(payload);
                }
                break;
            case 'arrow':
                var playerArrow = this.players.find(function (player) { return payload.key === player.key; });
                if (!!playerArrow) {
                    playerArrow.arrow(payload, playerArrow.position, __spreadArray(__spreadArray([], this.players.map(function (player) { return player.arrows; }).flat(), true), this.currentGame.currentStrategy.goals, true));
                }
                break;
            case 'predictive-input':
                this.handlePredictiveInput(payload, ws);
                break;
            case 'performance-report':
                this.handlePerformanceReport(payload, ws);
                break;
            case 'request-state-sync':
                this.handleStateSyncRequest(payload, ws);
                break;
            case 'server':
                this.servers.push(ws);
                // Send immediate state to newly connected server
                this.sendGameTo(ws);
                this.batcher.sendImmediate('queue');
                this.batcher.sendImmediate('highscore');
                break;
        }
    };
    /**
     * Handle predictive input messages with acknowledgment
     */
    Queue.prototype.handlePredictiveInput = function (payload, ws) {
        var player = this.players.find(function (p) { return p.key === payload.playerId; });
        if (!player) {
            this.sendError('INVALID_PLAYER_ID', 'Player not found', ws);
            return;
        }
        // Process the input immediately
        if (payload.input.inputType === 'ARROW_PLACE') {
            player.arrow(payload.input.data, player.position, __spreadArray(__spreadArray([], this.players.map(function (p) { return p.arrows; }).flat(), true), this.currentGame.currentStrategy.goals, true));
        }
        else if (payload.input.inputType === 'MOVE') {
            player.move(payload.input.data);
        }
        // Send acknowledgment through batcher
        this.batcher.handlePredictiveInput(payload.playerId, payload.input, payload.prediction);
    };
    /**
     * Handle performance report from client
     */
    Queue.prototype.handlePerformanceReport = function (payload, ws) {
        var player = this.players.find(function (p) { return p.key === payload.playerId; });
        if (player) {
            // Store performance metrics for monitoring
            // TODO: Implement updatePerformanceMetrics method on Player class
            // player.updatePerformanceMetrics?.(payload.metrics);
        }
    };
    /**
     * Handle state synchronization request
     */
    Queue.prototype.handleStateSyncRequest = function (payload, ws) {
        if (!ws)
            return;
        var fullGameState = this.currentGame.state();
        var msg = {
            type: 'SYNC_',
            game: __assign({}, fullGameState)
        };
        var buffer = (0, messages_pb_1.encodeServerMessage)(msg);
        ws.send(buffer);
    };
    /**
     * Send error message to client
     */
    Queue.prototype.sendError = function (errorCode, message, ws) {
        if (!ws)
            return;
        var errorMessage = {
            type: 'error',
            error: {
                code: errorCode,
                message: message,
                timestamp: Date.now()
            }
        };
        ws.send(JSON.stringify(errorMessage));
    };
    Queue.prototype.executeGame = function () {
        var _this = this;
        var _a, _b;
        this.currentGame.started = this.currentGame.players.length >= config_1.CONFIG.MIN_PLAYERS;
        this.currentGame.execute(function () {
            _this.sendHighScoreToServer();
            _this.sendGameToServer();
            _this.sendQueueUpdate();
            _this.asyncSave();
        });
        this.sendGameToServer();
        if (this.currentGame.started) {
            // Calcul de la fréquence adaptative
            var playerCount = this.currentGame.players.filter(function (p) { return p.connected; }).length;
            var strategy = this.currentGame.currentStrategy;
            var entityCount = (((_a = strategy === null || strategy === void 0 ? void 0 : strategy.mouses) === null || _a === void 0 ? void 0 : _a.length) || 0) + (((_b = strategy === null || strategy === void 0 ? void 0 : strategy.cats) === null || _b === void 0 ? void 0 : _b.length) || 0);
            var optimalFrequency = this.adaptiveLoop.calculateOptimalFrequency(playerCount, entityCount);
            // Log pour debug (seulement si la fréquence change)
            if (optimalFrequency !== this.adaptiveLoop.getCurrentFrequency()) {
                this.adaptiveLoop.logPerformanceInfo(playerCount, entityCount);
            }
            setTimeout(function () { return _this.executeGame(); }, optimalFrequency);
        }
        else {
            this.currentGame.clear();
            this.sendGameToServer();
        }
    };
    Queue.prototype.disconnect = function (ws) {
        var _a;
        (_a = this.players.find(function (player) { return player.ws === ws; })) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.servers = this.servers.filter(function (server) { return server !== ws; });
        // Flush pending updates before disconnect
        this.batcher.flush();
    };
    Queue.prototype.sendGameToServer = function () {
        this.batcher.scheduleUpdate('game');
    };
    Queue.prototype.sendGameToServerInternal = function () {
        var _a;
        var currentState = (_a = this.currentGame) === null || _a === void 0 ? void 0 : _a.state();
        var diff = {};
        if (this.previousGameState) {
            for (var key in currentState) {
                // @ts-ignore
                if (JSON.stringify(currentState[key]) !== JSON.stringify(this.previousGameState[key])) {
                    // @ts-ignore
                    diff[key] = currentState[key];
                }
            }
        }
        else {
            diff = currentState;
        }
        this.previousGameState = currentState;
        if (Object.keys(diff).length > 0) {
            var msg = {
                type: 'GAME_',
                game: diff
            };
            var buffer_1 = (0, messages_pb_1.encodeServerMessage)(msg);
            this.servers.forEach(function (ws) { return ws === null || ws === void 0 ? void 0 : ws.send(buffer_1); });
        }
    };
    Queue.prototype.sendGameTo = function (ws) {
        if (!this.currentGame)
            return;
        var gameState = this.currentGame.state();
        var msg = {
            type: 'GAME_',
            game: gameState
        };
        var buffer = (0, messages_pb_1.encodeServerMessage)(msg);
        ws.send(buffer);
    };
    Queue.prototype.sendQueueUpdate = function () {
        this.batcher.scheduleUpdate('queue');
    };
    Queue.prototype.sendQueueUpdateInternal = function () {
        if (!this.currentGame)
            return;
        var gameState = this.currentGame.state();
        var msg = {
            type: 'QU_',
            queue: { state: gameState }
        };
        var buffer = (0, messages_pb_1.encodeServerMessage)(msg);
        this.servers.forEach(function (ws) { return ws === null || ws === void 0 ? void 0 : ws.send(buffer); });
    };
    Queue.prototype.sendHighScoreToServer = function () {
        this.batcher.scheduleUpdate('highscore');
    };
    Queue.prototype.sendHighScoreToServerInternal = function () {
        var scoreState = this.state();
        var msg = {
            type: 'SC_',
            score: { players: scoreState.players }
        };
        var buffer = (0, messages_pb_1.encodeServerMessage)(msg);
        this.servers.forEach(function (ws) { return ws === null || ws === void 0 ? void 0 : ws.send(buffer); });
    };
    /**
     * Send delta compressed game state
     */
    Queue.prototype.sendDeltaGameStateInternal = function () {
        if (!this.currentGame)
            return;
        var currentState = this.currentGame.state();
        if (!this.previousGameState) {
            // First state, send full state
            this.sendGameToServerInternal();
            return;
        }
        // Calculate delta using simple diff
        var delta = this.calculateStateDelta(this.previousGameState, currentState);
        if (delta.hasChanges) {
            var compressionRatio = this.calculateCompressionRatio(delta, currentState);
            this.batcher.trackCompressionRatio(compressionRatio);
            var msg = {
                type: 'DELTA_',
                deltaGame: {
                    baseSequence: toLong(delta.baseSequence),
                    deltaSequence: toLong(delta.deltaSequence),
                    timestamp: toLong(Date.now()),
                    changedPlayers: delta.changedPlayers,
                    changedEntities: delta.changedEntities,
                    compressionRatio: compressionRatio
                }
            };
            var buffer_2 = (0, messages_pb_1.encodeServerMessage)(msg);
            this.servers.forEach(function (ws) { return ws === null || ws === void 0 ? void 0 : ws.send(buffer_2); });
        }
        this.previousGameState = currentState;
    };
    /**
     * Send priority message immediately
     */
    Queue.prototype.sendPriorityMessage = function (message) {
        var buffer = Buffer.from(JSON.stringify(message));
        this.servers.forEach(function (ws) { return ws === null || ws === void 0 ? void 0 : ws.send(buffer); });
    };
    /**
     * Calculate simple delta between two game states
     */
    Queue.prototype.calculateStateDelta = function (oldState, newState) {
        var delta = {
            baseSequence: oldState.sequence || 0,
            deltaSequence: (oldState.sequence || 0) + 1,
            hasChanges: false,
            changedPlayers: [],
            changedEntities: [],
            newArrows: [],
            removedEntityIds: []
        };
        // Compare players
        if (newState.players && oldState.players) {
            for (var i = 0; i < Math.max(newState.players.length, oldState.players.length); i++) {
                var newPlayer = newState.players[i];
                var oldPlayer = oldState.players[i];
                if (!oldPlayer && newPlayer) {
                    // New player
                    delta.changedPlayers.push(newPlayer);
                    delta.hasChanges = true;
                }
                else if (oldPlayer && newPlayer && JSON.stringify(oldPlayer) !== JSON.stringify(newPlayer)) {
                    // Changed player
                    delta.changedPlayers.push(newPlayer);
                    delta.hasChanges = true;
                }
            }
        }
        // Compare arrows (simplified)
        if (newState.arrows && oldState.arrows) {
            var newArrows = newState.arrows.filter(function (arrow) {
                return !oldState.arrows.some(function (oldArrow) { return oldArrow.id === arrow.id; });
            });
            if (newArrows.length > 0) {
                delta.newArrows = newArrows;
                delta.hasChanges = true;
            }
        }
        return delta;
    };
    /**
     * Calculate compression ratio
     */
    Queue.prototype.calculateCompressionRatio = function (delta, fullState) {
        var deltaSize = JSON.stringify(delta).length;
        var fullSize = JSON.stringify(fullState).length;
        return fullSize > 0 ? 1 - (deltaSize / fullSize) : 0;
    };
    Queue.prototype.state = function () {
        var list = __spreadArray([], this.players.map(function (player) { return player.state(); }), true);
        list.sort(function (p1, p2) { return p2.totalPoints - p1.totalPoints; });
        return { players: list.slice(0, 10) };
    };
    Queue.prototype.asyncSave = function () {
        var _this = this;
        this.lastSave = JSON.stringify(this.players.map(function (player) { return player.serializable(); }));
        if (!this.savePlanned) {
            this.savePlanned = true;
            setTimeout(function () {
                fs.writeFile(_this.path, _this.lastSave, 'utf8', function (err) {
                    _this.savePlanned = false;
                    if (!!err) {
                        console.log('Cannot save state', err);
                    }
                });
            }, 1000);
        }
    };
    Queue.prototype.doneWaiting = function () {
        this.players.forEach(function (pl) { return pl.stopWait(); });
    };
    return Queue;
}());
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map