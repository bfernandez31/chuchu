"use strict";
/**
 * T018: AuthoritativeGameState Model
 *
 * Server-authoritative game state implementation with validation,
 * state transitions, and performance metrics integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthoritativeGameStateFactory = exports.AuthoritativeGameStateImpl = exports.EntityType = exports.GamePhase = void 0;
var GamePhase;
(function (GamePhase) {
    GamePhase["WAITING"] = "WAITING";
    GamePhase["ACTIVE"] = "ACTIVE";
    GamePhase["ENDING"] = "ENDING";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var EntityType;
(function (EntityType) {
    EntityType["MOUSE"] = "MOUSE";
    EntityType["CAT"] = "CAT";
    EntityType["WALL"] = "WALL";
    EntityType["GOAL"] = "GOAL";
    EntityType["ARROW"] = "ARROW";
})(EntityType || (exports.EntityType = EntityType = {}));
var AuthoritativeGameStateImpl = /** @class */ (function () {
    function AuthoritativeGameStateImpl(data) {
        if (data === void 0) { data = {}; }
        this.gameId = data.gameId || this.generateGameId();
        this.timestamp = data.timestamp || Date.now();
        this.sequence = data.sequence || 0;
        this.phase = data.phase || GamePhase.WAITING;
        this.startTime = data.startTime || Date.now();
        this.roundDuration = data.roundDuration || 300000; // 5 minutes default
        this.board = data.board || {
            width: 15,
            height: 15,
            entities: new Map(),
            goals: [],
            walls: [],
            arrows: []
        };
        this.players = data.players || new Map();
        this.performance = data.performance || {
            timestamp: this.timestamp,
            tickRate: 60,
            playerCount: this.players.size,
            entityCount: this.board.entities.size,
            messagesSent: 0,
            messagesReceived: 0,
            averageLatency: 0,
            memoryUsage: 0
        };
        this.checksum = this.calculateChecksum();
    }
    /**
     * Validate game state consistency and constraints
     */
    AuthoritativeGameStateImpl.prototype.isValid = function () {
        try {
            // Timestamp validation - must be monotonic
            if (this.timestamp <= 0)
                return false;
            // Sequence validation - must increment
            if (this.sequence < 0)
                return false;
            // Phase transition validation
            if (!this.isValidPhaseTransition())
                return false;
            // Board validation
            if (!this.isBoardValid())
                return false;
            // Player validation
            if (!this.arePlayersValid())
                return false;
            // Performance validation
            if (!this.isPerformanceValid())
                return false;
            return true;
        }
        catch (error) {
            console.error('State validation error:', error);
            return false;
        }
    };
    /**
     * Transition to next game phase with validation
     */
    AuthoritativeGameStateImpl.prototype.transitionPhase = function (newPhase) {
        var _a;
        var validTransitions = (_a = {},
            _a[GamePhase.WAITING] = [GamePhase.ACTIVE],
            _a[GamePhase.ACTIVE] = [GamePhase.ENDING],
            _a[GamePhase.ENDING] = [GamePhase.WAITING],
            _a);
        if (!validTransitions[this.phase].includes(newPhase)) {
            return false;
        }
        this.phase = newPhase;
        this.timestamp = Date.now();
        this.sequence++;
        // Handle phase-specific logic
        switch (newPhase) {
            case GamePhase.ACTIVE:
                this.startTime = this.timestamp;
                break;
            case GamePhase.ENDING:
                this.endTime = this.timestamp;
                break;
            case GamePhase.WAITING:
                this.endTime = undefined;
                break;
        }
        this.updateChecksum();
        return true;
    };
    /**
     * Update game state with new data
     */
    AuthoritativeGameStateImpl.prototype.update = function (deltaTime) {
        this.timestamp = Date.now();
        this.sequence++;
        // Update performance metrics
        this.performance.timestamp = this.timestamp;
        this.performance.playerCount = this.players.size;
        this.performance.entityCount = this.board.entities.size;
        // Update entity positions based on velocity
        this.updateEntityPositions(deltaTime);
        // Recalculate checksum
        this.updateChecksum();
    };
    /**
     * Add or update player
     */
    AuthoritativeGameStateImpl.prototype.addPlayer = function (player) {
        if (!this.isValidPlayer(player))
            return false;
        this.players.set(player.id, player);
        this.sequence++;
        this.updateChecksum();
        return true;
    };
    /**
     * Remove player
     */
    AuthoritativeGameStateImpl.prototype.removePlayer = function (playerId) {
        if (!this.players.has(playerId))
            return false;
        this.players.delete(playerId);
        this.sequence++;
        this.updateChecksum();
        return true;
    };
    /**
     * Add entity to game board
     */
    AuthoritativeGameStateImpl.prototype.addEntity = function (entity) {
        if (!this.isValidEntity(entity))
            return false;
        this.board.entities.set(entity.id, entity);
        // Add to type-specific collections
        switch (entity.type) {
            case EntityType.GOAL:
                this.board.goals.push(entity);
                break;
            case EntityType.WALL:
                this.board.walls.push(entity);
                break;
            case EntityType.ARROW:
                this.board.arrows.push(entity);
                break;
        }
        this.sequence++;
        this.updateChecksum();
        return true;
    };
    /**
     * Remove entity from game board
     */
    AuthoritativeGameStateImpl.prototype.removeEntity = function (entityId) {
        var entity = this.board.entities.get(entityId);
        if (!entity)
            return false;
        this.board.entities.delete(entityId);
        // Remove from type-specific collections
        switch (entity.type) {
            case EntityType.GOAL:
                this.board.goals = this.board.goals.filter(function (e) { return e.id !== entityId; });
                break;
            case EntityType.WALL:
                this.board.walls = this.board.walls.filter(function (e) { return e.id !== entityId; });
                break;
            case EntityType.ARROW:
                this.board.arrows = this.board.arrows.filter(function (e) { return e.id !== entityId; });
                break;
        }
        this.sequence++;
        this.updateChecksum();
        return true;
    };
    // Private validation methods
    AuthoritativeGameStateImpl.prototype.isValidPhaseTransition = function () {
        switch (this.phase) {
            case GamePhase.WAITING:
                return true; // Can transition to ACTIVE
            case GamePhase.ACTIVE:
                return this.startTime > 0; // Must have valid start time
            case GamePhase.ENDING:
                return this.endTime !== undefined; // Must have end time
            default:
                return false;
        }
    };
    AuthoritativeGameStateImpl.prototype.isBoardValid = function () {
        if (this.board.width < 10 || this.board.width > 50)
            return false;
        if (this.board.height < 10 || this.board.height > 50)
            return false;
        // Validate entity positions are within bounds
        for (var _i = 0, _a = Array.from(this.board.entities); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], entity = _b[1];
            if (!this.isPositionValid(entity.position))
                return false;
        }
        return true;
    };
    AuthoritativeGameStateImpl.prototype.arePlayersValid = function () {
        for (var _i = 0, _a = Array.from(this.players); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], player = _b[1];
            if (!this.isValidPlayer(player))
                return false;
        }
        return true;
    };
    AuthoritativeGameStateImpl.prototype.isPerformanceValid = function () {
        var p = this.performance;
        return p.tickRate >= 1 && p.tickRate <= 120 &&
            p.playerCount >= 0 && p.playerCount <= 32 &&
            p.entityCount >= 0 &&
            p.averageLatency >= 0 && p.averageLatency <= 10000 &&
            p.memoryUsage >= 0;
    };
    AuthoritativeGameStateImpl.prototype.isValidPlayer = function (player) {
        return player.id.length > 0 &&
            player.name.length > 0 &&
            player.score >= 0 &&
            player.arrowCount >= 0 &&
            player.maxArrows > 0 &&
            player.lastInput >= 0;
    };
    AuthoritativeGameStateImpl.prototype.isValidEntity = function (entity) {
        return entity.id.length > 0 &&
            Object.values(EntityType).includes(entity.type) &&
            this.isPositionValid(entity.position) &&
            entity.createdAt > 0 &&
            entity.lastUpdate >= entity.createdAt;
    };
    AuthoritativeGameStateImpl.prototype.isPositionValid = function (position) {
        return position.x >= 0 && position.x < this.board.width &&
            position.y >= 0 && position.y < this.board.height;
    };
    AuthoritativeGameStateImpl.prototype.updateEntityPositions = function (deltaTime) {
        for (var _i = 0, _a = Array.from(this.board.entities); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], entity = _b[1];
            if (entity.velocity) {
                entity.position.x += entity.velocity.x * deltaTime;
                entity.position.y += entity.velocity.y * deltaTime;
                entity.lastUpdate = this.timestamp;
            }
        }
    };
    AuthoritativeGameStateImpl.prototype.generateGameId = function () {
        return "game_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    AuthoritativeGameStateImpl.prototype.calculateChecksum = function () {
        var data = {
            sequence: this.sequence,
            phase: this.phase,
            playerCount: this.players.size,
            entityCount: this.board.entities.size,
            timestamp: this.timestamp
        };
        // Simple checksum - in production would use crypto hash
        return btoa(JSON.stringify(data)).substr(0, 16);
    };
    AuthoritativeGameStateImpl.prototype.updateChecksum = function () {
        this.checksum = this.calculateChecksum();
    };
    return AuthoritativeGameStateImpl;
}());
exports.AuthoritativeGameStateImpl = AuthoritativeGameStateImpl;
/**
 * Factory for creating AuthoritativeGameState instances
 */
var AuthoritativeGameStateFactory = /** @class */ (function () {
    function AuthoritativeGameStateFactory() {
    }
    AuthoritativeGameStateFactory.create = function (config) {
        return new AuthoritativeGameStateImpl(config);
    };
    AuthoritativeGameStateFactory.createDefault = function () {
        return new AuthoritativeGameStateImpl({
            phase: GamePhase.WAITING,
            roundDuration: 300000,
            board: {
                width: 15,
                height: 15,
                entities: new Map(),
                goals: [],
                walls: [],
                arrows: []
            }
        });
    };
    AuthoritativeGameStateFactory.fromSnapshot = function (data) {
        var state = new AuthoritativeGameStateImpl();
        // Restore basic properties
        state.gameId = data.gameId;
        state.timestamp = data.timestamp;
        state.sequence = data.sequence;
        state.phase = data.phase;
        state.startTime = data.startTime;
        state.endTime = data.endTime;
        state.roundDuration = data.roundDuration;
        // Restore board state
        state.board = {
            width: data.board.width,
            height: data.board.height,
            entities: new Map(data.board.entities),
            goals: data.board.goals || [],
            walls: data.board.walls || [],
            arrows: data.board.arrows || []
        };
        // Restore players
        state.players = new Map(data.players);
        // Restore performance
        state.performance = data.performance;
        // Recalculate checksum
        state.checksum = state.calculateChecksum();
        return state;
    };
    return AuthoritativeGameStateFactory;
}());
exports.AuthoritativeGameStateFactory = AuthoritativeGameStateFactory;
//# sourceMappingURL=authoritative-game-state.js.map