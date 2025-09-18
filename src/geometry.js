"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Geometry = void 0;
var config_1 = require("../browser/common/config");
var Geometry = /** @class */ (function () {
    function Geometry() {
    }
    Geometry.moving = function (position, direction, speed) {
        // align on grid on position with no speed
        switch (direction) {
            case 'U':
            case 'D':
                position[0] = Math.round(position[0] / config_1.CONFIG.GLOBAL_WIDTH * config_1.CONFIG.COLUMNS) * config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.COLUMNS;
                break;
            case 'L':
            case 'R':
                position[1] = Math.round(position[1] / config_1.CONFIG.GLOBAL_HEIGHT * config_1.CONFIG.ROWS) * config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.ROWS;
                break;
        }
        switch (direction) {
            case 'U':
                return [position[0], position[1] - speed];
            case 'D':
                return [position[0], position[1] + speed];
            case 'L':
                return [position[0] - speed, position[1]];
            case 'R':
                return [position[0] + speed, position[1]];
            default:
                return [position[0], position[1] - speed];
        }
    };
    Geometry.vectorNorm = function (v) {
        return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
    };
    Geometry.segmentNorm = function (s) {
        var v = [s[1][0] - s[0][0], s[1][1] - s[0][1]];
        return Geometry.vectorNorm(v);
    };
    Geometry.randomCell = function () {
        var x = Math.floor(Math.random() * 1000 % (config_1.CONFIG.COLUMNS));
        var y = Math.floor(Math.random() * 1000 % (config_1.CONFIG.ROWS));
        return [x, y];
    };
    Geometry.randomDirection = function () {
        var directions = ['U', 'D', 'L', 'R'];
        return directions[Math.floor(Math.random() * 1000 % 4)];
    };
    return Geometry;
}());
exports.Geometry = Geometry;
//# sourceMappingURL=geometry.js.map