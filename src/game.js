"use strict";
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
exports.Game = void 0;
var config_1 = require("../browser/common/config");
var starting_strategy_1 = require("./generators/strategy/impl/starting-strategy");
var strategy_factory_1 = require("./generators/strategy/strategy-factory");
var bot_1 = require("./bot");
var performance_monitor_1 = require("./performance/performance-monitor");
var Game = /** @class */ (function () {
    function Game(queue) {
        var _this = this;
        this.players = [];
        this.started = false;
        this.ready = false;
        this.phases = 1;
        this.bots = [];
        this.lastBotActionTime = 0;
        this.lastPerformanceLog = 0;
        this.queue = queue;
        this.currentStrategy = new starting_strategy_1.StartingStrategy();
        this.performanceMonitor = new performance_monitor_1.PerformanceMonitor();
        setTimeout(function () { return _this.createBots(); }, 100);
    }
    Game.prototype.createBots = function () {
        // Création automatique des bots selon CONFIG.BOTS
        for (var i = 0; i < config_1.CONFIG.BOTS; i++) {
            var botName = "Bot ".concat(i + 1);
            var bot = new bot_1.Bot(this, botName);
            // Message 'joined'
            this.queue.processMsg({
                type: 'joined',
                name: botName,
                key: bot.key,
                bot: true
            });
            // Message 'queue'
            this.queue.processMsg({
                type: 'queue',
                key: bot.key
            });
            console.log("Bot ".concat(i + 1, " joined and queued."));
            this.bots.push(bot);
        }
    };
    Game.prototype.apply = function (player) {
        if (!this.players.filter(function (player) { return player.connected; }).find(function (playerInGame) { return playerInGame.key === player.key; })) {
            if (this.players.length <= config_1.CONFIG.MAX_PLAYERS) {
                this.players.push(player);
                player.init(this.players.length - 1);
                player.queued();
                if (this.players.length > config_1.CONFIG.MIN_PLAYERS) {
                    console.log('starting game execution...');
                    this.currentStrategy = strategy_factory_1.StrategyFactory.next(this.currentStrategy, this.players);
                    this.currentStrategy.applySpeedCorrection();
                    this.queue.doneWaiting();
                    this.queue.executeGame();
                    this.queue.sendQueueUpdate();
                }
                this.size();
                this.queue.sendGameToServer();
            }
            else {
                console.log('Game full');
                player.canQueue();
            }
        }
    };
    Game.prototype.unapply = function (player) {
        if (this.players.find(function (playerInGame) { return playerInGame.key === player.key; })) {
            this.players = this.players.filter(function (playerInGame) { return playerInGame.key !== player.key; });
            this.currentStrategy.unapply(player);
            player.canQueue();
            if (this.players.length === 0) {
                this.started = false;
                console.log('Game stopped');
            }
            this.size();
            this.queue.sendGameToServer();
            this.queue.sendQueueUpdate();
        }
    };
    Game.prototype.state = function () {
        return {
            players: this.players.map(function (player) { return player.state(); }).sort(function (p1, p2) { return p1.totalPoints - p2.totalPoints; }),
            strategy: this.currentStrategy.state(),
            width: config_1.CONFIG.GLOBAL_WIDTH,
            height: config_1.CONFIG.GLOBAL_HEIGHT,
            started: this.started,
            ready: this.ready,
            cols: config_1.CONFIG.COLUMNS,
            rows: config_1.CONFIG.ROWS
        };
    };
    Game.prototype.size = function () {
        var size = 15;
        if (this.players.length > 25) {
            size = 45;
        }
        else if (this.players.length > 20) {
            size = 41;
        }
        else if (this.players.length > 15) {
            size = 35;
        }
        else if (this.players.length > 10) {
            size = 31;
        }
        else if (this.players.length > 6) {
            size = 25;
        }
        else if (this.players.length > 3) {
            size = 21;
        }
        else {
            size = 15;
        }
        config_1.CONFIG.ROWS = size;
        config_1.CONFIG.COLUMNS = size;
    };
    Game.prototype.execute = function (changeScoreListener) {
        var _this = this;
        var sendUpdate = false;
        // Limite globale d'action des bots
        var now = Date.now();
        var botCooldown = config_1.CONFIG.BOT_LIMIT_ACTIONS_MS || 1000;
        var canBotsAct = false;
        if (now - this.lastBotActionTime >= botCooldown) {
            canBotsAct = true;
            this.lastBotActionTime = now;
        }
        if (canBotsAct) {
            this.bots.forEach(function (bot) {
                bot.play();
            });
        }
        this.currentStrategy.mouses.forEach(function (mouse) { return mouse.move(_this.currentStrategy.walls, _this.players.map(function (player) { return player.arrows; }).flat(), _this.currentStrategy.mouseSpeed); });
        this.currentStrategy.cats.forEach(function (cat) { return cat.move(_this.currentStrategy.walls, _this.players.map(function (player) { return player.arrows; }).flat(), _this.currentStrategy.catSpeed); });
        this.currentStrategy.goals.map(function (goal) {
            var absorbed = goal.absorbing(__spreadArray(__spreadArray([], _this.currentStrategy.mouses, true), _this.currentStrategy.cats, true));
            if (absorbed && absorbed.length > 0) {
                absorbed.forEach(function (absorbedObject) { return goal.player.absorb(absorbedObject); });
                _this.currentStrategy.remove(absorbed);
                sendUpdate = true;
            }
        });
        // Optimized collision detection using spatial partitioning
        var collisionStartTime = performance.now();
        var collisions = this.currentStrategy.findCollisions();
        var collisionDuration = performance.now() - collisionStartTime;
        if (collisions.length > 0) {
            var mousesToRemove = collisions.map(function (_a) {
                var mouse = _a[0], cat = _a[1];
                return mouse;
            });
            this.currentStrategy.remove(mousesToRemove);
        }
        // Phase Management
        this.currentStrategy.step();
        if (this.currentStrategy.hasEnded()) {
            this.currentStrategy.reward(this.players);
            this.currentStrategy = strategy_factory_1.StrategyFactory.next(this.currentStrategy, this.players);
            this.currentStrategy.applySpeedCorrection();
            this.players.forEach(function (player) { return player.arrows = []; });
            this.phases++;
            sendUpdate = true;
        }
        if (sendUpdate) {
            changeScoreListener();
        }
        // Log performance statistics every 30 seconds
        var currentTime = Date.now();
        if (currentTime - this.lastPerformanceLog >= 30000) {
            this.lastPerformanceLog = currentTime;
            var spatialStats = this.currentStrategy.getSpatialGridStats();
            console.log("\uD83D\uDDFA\uFE0F Spatial Grid Stats - Objects: ".concat(spatialStats.totalObjects, ", Cells: ").concat(spatialStats.occupiedCells, "/").concat(spatialStats.totalCells, ", Avg/Cell: ").concat(spatialStats.averageObjectsPerCell.toFixed(1)));
            // Update server metrics with collision performance
            this.performanceMonitor.updateServerMetrics({
                timestamp: currentTime,
                messagesSent: 0 // TODO: Implement message counting
            });
            console.log("\u26A1 Collision Detection Duration: ".concat(collisionDuration.toFixed(3), "ms"));
        }
    };
    Game.prototype.clear = function () {
        this.currentStrategy = new starting_strategy_1.StartingStrategy();
    };
    return Game;
}());
exports.Game = Game;
//# sourceMappingURL=game.js.map