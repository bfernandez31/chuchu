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
exports.GameStrategy = void 0;
var mouse_1 = require("../../game/mouse");
var cat_1 = require("../../game/cat");
var goal_factory_1 = require("../goal/goal-factory");
var config_1 = require("../../../browser/common/config");
var wall_factory_1 = require("../wall/wall-factory");
var geometry_1 = require("../../geometry");
var start_1 = require("../../start");
var spatial_grid_1 = require("../../performance/spatial-grid");
var GameStrategy = /** @class */ (function () {
    function GameStrategy(players) {
        this.mouses = [];
        this.cats = [];
        this.goals = [];
        this.walls = [];
        this.mouseSpeed = 1;
        this.catSpeed = 1;
        this.elapsedSteps = 0;
        this.name = '---';
        this.mouseStarts = [];
        this.catStarts = [];
        this.speedAdjusted = false;
        this.goals = goal_factory_1.GoalFactory.create(players);
        this.mouseStarts = new Array(Math.round((Math.random() * 1000 % 4) + 2)).fill(1).map(function () { return new start_1.Start(geometry_1.Geometry.randomCell(), geometry_1.Geometry.randomDirection()); });
        this.catStarts = new Array(Math.round((Math.random() * 1000 % 2) + 1)).fill(1).map(function () { return new start_1.Start(geometry_1.Geometry.randomCell(), geometry_1.Geometry.randomDirection()); });
        this.walls = wall_factory_1.WallFactory.create(__spreadArray(__spreadArray(__spreadArray([], this.goals, true), this.mouseStarts, true), this.catStarts, true));
        this.startDate = Date.now();
        this.spatialGrid = new spatial_grid_1.SpatialGrid();
    }
    /**
     * Corrige la vitesse des objets selon la taille des cases du plateau.
     * La vitesse de base de la stratégie (this.mouseSpeed/catSpeed) est ajustée dynamiquement.
     */
    GameStrategy.prototype.applySpeedCorrection = function () {
        if (this.speedAdjusted) {
            return;
        }
        this.speedAdjusted = true;
        // On part de la vitesse souhaitée par la stratégie (valeur courante)
        var baseMouseSpeed = this.mouseSpeed;
        var baseCatSpeed = this.catSpeed;
        // Formule linéaire :
        // Calcul dynamique de a et b pour la formule linéaire
        // Pour 15 cases : vitesse = 2
        // Pour 45 cases : vitesse = 0.15
        var x1 = 15, y1 = 2;
        var x2 = 45, y2 = 0.2;
        var a = (y2 - y1) / (x2 - x1); // pente
        var b = y1 - a * x1; // ordonnée à l'origine
        var speedFactor = a * config_1.CONFIG.ROWS + b;
        this.mouseSpeed = baseMouseSpeed * speedFactor;
        this.catSpeed = baseCatSpeed * speedFactor;
    };
    GameStrategy.prototype.step = function () {
        this.elapsedSteps++;
        this._step(this.elapsedSteps);
    };
    ;
    GameStrategy.prototype.state = function () {
        return {
            mouses: this.mouses.map(function (m) { return m.state(); }),
            cats: this.cats.map(function (c) { return c.state(); }),
            goals: this.goals.map(function (g) { return g.state(); }),
            walls: this.walls.map(function (w) { return w.state(); }),
            name: this.name // name
        };
    };
    GameStrategy.prototype.remove = function (absorbed) {
        this.mouses = this.mouses.filter(function (mouse) { return !absorbed.includes(mouse); });
        this.cats = this.cats.filter(function (cat) { return !absorbed.includes(cat); });
    };
    GameStrategy.prototype.hasEnded = function () {
        var _a;
        // Arrête la stratégie si la durée dépasse STEP_DURATION (en ms)
        return (Date.now() - ((_a = this.startDate) !== null && _a !== void 0 ? _a : 0)) >= config_1.CONFIG.STEP_DURATION;
    };
    GameStrategy.prototype.generateMouses = function () {
        var _this = this;
        if (this.mouses.length < config_1.CONFIG.MAX_MOUSES) {
            this.mouseStarts.forEach(function (start) {
                _this.mouses.push(new mouse_1.Mouse([start.position[0] / config_1.CONFIG.COLUMNS * config_1.CONFIG.GLOBAL_WIDTH, start.position[1] / config_1.CONFIG.ROWS * config_1.CONFIG.GLOBAL_HEIGHT], start.direction));
            });
        }
    };
    GameStrategy.prototype.generateCats = function () {
        var _this = this;
        if (this.cats.length < config_1.CONFIG.MAX_CATS) {
            this.catStarts.forEach(function (start) {
                _this.cats.push(new cat_1.Cat([start.position[0] / config_1.CONFIG.COLUMNS * config_1.CONFIG.GLOBAL_WIDTH, start.position[1] / config_1.CONFIG.ROWS * config_1.CONFIG.GLOBAL_HEIGHT], start.direction));
            });
        }
    };
    GameStrategy.prototype.reward = function (players) {
        var _a;
        var elapsed = Math.round(new Date().getTime() - ((_a = this.startDate) !== null && _a !== void 0 ? _a : 0)) / 1000;
        players.forEach(function (player) { return player.reward(elapsed); });
    };
    GameStrategy.prototype.unapply = function (player) {
        this.goals = this.goals.filter(function (goal) { return goal.player.key !== player.key; });
        this.reward([player]);
    };
    /**
     * Optimized collision detection using spatial partitioning.
     * Returns pairs of [mouse, cat] that are colliding.
     */
    GameStrategy.prototype.findCollisions = function () {
        var _this = this;
        var collisions = [];
        // Clear and populate spatial grid
        this.spatialGrid.clear();
        this.spatialGrid.optimizeCellSize(this.mouses.length + this.cats.length);
        // Insert all moving objects into spatial grid
        __spreadArray(__spreadArray([], this.mouses, true), this.cats, true).forEach(function (obj) {
            _this.spatialGrid.insert(obj);
        });
        // Check collisions only between nearby objects
        this.mouses.forEach(function (mouse) {
            var nearbyObjects = _this.spatialGrid.getNearbyObjects(mouse);
            nearbyObjects.forEach(function (obj) {
                if (obj instanceof cat_1.Cat && mouse.collides(obj)) {
                    collisions.push([mouse, obj]);
                }
            });
        });
        return collisions;
    };
    /**
     * Gets spatial grid statistics for performance monitoring
     */
    GameStrategy.prototype.getSpatialGridStats = function () {
        return this.spatialGrid.getStats();
    };
    return GameStrategy;
}());
exports.GameStrategy = GameStrategy;
//# sourceMappingURL=game-strategy.js.map