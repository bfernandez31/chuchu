"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
var uuid_1 = require("uuid");
var colors_1 = require("./colors");
var arrow_1 = require("./game/arrow");
var cat_1 = require("./game/cat");
var mouse_1 = require("./game/mouse");
var config_1 = require("../browser/common/config");
var Player = /** @class */ (function () {
    function Player(name, key) {
        this.connected = true;
        this.color = '#000000';
        this.name = 'Player';
        this.time = 0;
        this.position = [0, 0];
        this.arrows = [];
        this.totalPoints = 0;
        this.ratio = 0;
        this.name = name;
        this.key = key !== null && key !== void 0 ? key : (0, uuid_1.v4)();
    }
    Player.prototype.connect = function (ws) {
        this.connected = true;
        this.ws = ws;
    };
    Player.prototype.init = function (idx) {
        this.color = colors_1.colors[idx];
        this.updateRatio();
    };
    Player.prototype.disconnect = function () {
        this.connected = false;
        this.ws = undefined;
    };
    Player.prototype.move = function (payload) {
        this.position = [Math.round(payload.x * config_1.CONFIG.GLOBAL_WIDTH), Math.round(payload.y * config_1.CONFIG.GLOBAL_HEIGHT)];
    };
    Player.prototype.state = function () {
        return {
            colorIndex: colors_1.colors.indexOf(this.color),
            name: this.name,
            position: this.position,
            totalPoints: this.totalPoints,
            arrows: this.arrows.map(function (a) { return a.state(); })
        };
    };
    Player.prototype.reward = function (time) {
        var _a;
        this.time += time;
        this.updateRatio();
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: 'score', score: this.totalPoints }));
    };
    Player.prototype.queued = function () {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: 'queued', color: this.color }));
    };
    Player.prototype.stopWait = function () {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: 'wait-over', color: this.color }));
    };
    Player.prototype.canQueue = function () {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: 'can-queue' }));
    };
    Player.from = function (playerObj) {
        var player = new Player(playerObj.name, playerObj.key);
        player.totalPoints = playerObj.totalPoints;
        player.time = playerObj.time;
        player.connected = false;
        return player;
    };
    Player.prototype.serializable = function () {
        return {
            totalPoints: this.totalPoints,
            time: this.time,
            name: this.name,
            key: this.key,
        };
    };
    Player.prototype.updateRatio = function () {
        this.ratio = (this.totalPoints) / (this.time + 1000);
    };
    Player.prototype.absorb = function (absorbedObject) {
        if (absorbedObject instanceof cat_1.Cat) {
            this.totalPoints = Math.round(this.totalPoints * config_1.CONFIG.PLAYER_ABSORB_CAT_RATIO);
        }
        if (absorbedObject instanceof mouse_1.Mouse) {
            this.totalPoints += config_1.CONFIG.PLAYER_ABSORB_MOUSE_POINTS;
        }
    };
    Player.prototype.arrow = function (payload, position, forbiddenPlaces) {
        if (this.arrows.length > 2) {
            this.arrows.shift();
        }
        var cellWidth = config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.COLUMNS;
        var cellHeight = config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.ROWS;
        // Centrer l'input sur la case la plus proche
        var gridAligned = [
            Math.floor((position[0]) / cellWidth) * cellWidth,
            Math.floor((position[1]) / cellHeight) * cellHeight
        ];
        // Vérification : ne pas placer de flèche sur un wall ou un goal
        var isOnForbiddenPlace = forbiddenPlaces.some(function (obj) { return obj.collides({ position: position }, obj.norm * 2); });
        if (isOnForbiddenPlace) {
            return;
        }
        this.arrows.push(new arrow_1.Arrow(gridAligned, payload.direction, this));
    };
    return Player;
}());
exports.Player = Player;
//# sourceMappingURL=player.js.map