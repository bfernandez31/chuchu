"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovingObject = void 0;
var config_1 = require("../../browser/common/config");
var geometry_1 = require("../geometry");
var direction_1 = require("../direction");
var MovingObject = /** @class */ (function () {
    function MovingObject(position, direction) {
        this.lastCollide = '----';
        this.position = position;
        this.direction = direction;
        this.size = [config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.ROWS, config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.COLUMNS];
        this.norm = geometry_1.Geometry.vectorNorm(this.size) / 2;
    }
    MovingObject.prototype.move = function (walls, arrows, speed) {
        var _this = this;
        walls
            .filter(function (w) { return w.wallId !== _this.lastCollide; })
            .forEach(function (wall) {
            if (_this.collides(wall)) {
                _this.direction = direction_1.DirectionUtils.next(_this.direction);
                _this.position = geometry_1.Geometry.moving(_this.position, _this.direction, -speed);
                _this.lastCollide = wall.wallId;
            }
        });
        arrows.forEach(function (arrow) {
            if (arrow.collides(_this)) {
                _this.direction = arrow.direction;
                _this.lastCollide = "-----";
            }
        });
        this.position = geometry_1.Geometry.moving(this.position, this.direction, speed);
        if (this.position[0] < 0) {
            this.position[0] = 0;
            this.direction = direction_1.DirectionUtils.next(this.direction);
            this.lastCollide = "-----";
        }
        else if (this.position[0] > config_1.CONFIG.GLOBAL_WIDTH - this.size[0] + 3) {
            this.position[0] = Math.round(config_1.CONFIG.GLOBAL_WIDTH - this.size[0]);
            this.direction = direction_1.DirectionUtils.next(this.direction);
            this.lastCollide = "-----";
        }
        else if (this.position[1] < 0) {
            this.position[1] = 0;
            this.direction = direction_1.DirectionUtils.next(this.direction);
            this.lastCollide = "-----";
        }
        else if (this.position[1] > config_1.CONFIG.GLOBAL_HEIGHT - this.size[1] + 3) {
            this.position[1] = Math.round(config_1.CONFIG.GLOBAL_HEIGHT - this.size[1]);
            this.direction = direction_1.DirectionUtils.next(this.direction);
            this.lastCollide = "-----";
        }
    };
    MovingObject.prototype.collides = function (obj, tolerance) {
        if (tolerance === void 0) { tolerance = 0; }
        return geometry_1.Geometry.segmentNorm([this.position, obj.position]) < this.norm + tolerance;
    };
    MovingObject.prototype.state = function () {
        return {
            position: this.position,
            direction: this.direction // direction
        };
    };
    return MovingObject;
}());
exports.MovingObject = MovingObject;
//# sourceMappingURL=moving-object.js.map