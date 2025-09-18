"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomSymetric4 = void 0;
var wall_1 = require("../../../wall");
var geometry_1 = require("../../../geometry");
var config_1 = require("../../../../browser/common/config");
var RandomSymetric4 = /** @class */ (function () {
    function RandomSymetric4() {
    }
    RandomSymetric4.implement = function (howMany, forbiddenPlaces) {
        var walls = [];
        for (var i = 0; i < howMany; i++) {
            var random = geometry_1.Geometry.randomCell();
            walls.push(new wall_1.Wall([random[0] / config_1.CONFIG.COLUMNS * config_1.CONFIG.GLOBAL_WIDTH, random[1] / config_1.CONFIG.ROWS * config_1.CONFIG.GLOBAL_HEIGHT], 'U'));
            walls.push(new wall_1.Wall([config_1.CONFIG.GLOBAL_WIDTH - ((random[0] + 1) / config_1.CONFIG.COLUMNS * config_1.CONFIG.GLOBAL_WIDTH), random[1] / config_1.CONFIG.ROWS * config_1.CONFIG.GLOBAL_HEIGHT], 'U'));
            walls.push(new wall_1.Wall([config_1.CONFIG.GLOBAL_WIDTH - ((random[0] + 1) / config_1.CONFIG.COLUMNS * config_1.CONFIG.GLOBAL_WIDTH), config_1.CONFIG.GLOBAL_HEIGHT - ((random[1] + 1) / config_1.CONFIG.ROWS * config_1.CONFIG.GLOBAL_HEIGHT)], 'U'));
            walls.push(new wall_1.Wall([random[0] / config_1.CONFIG.COLUMNS * config_1.CONFIG.GLOBAL_WIDTH, config_1.CONFIG.GLOBAL_HEIGHT - ((random[1] + 1) / config_1.CONFIG.ROWS * config_1.CONFIG.GLOBAL_HEIGHT)], 'U'));
        }
        return walls
            .filter(function (w) { return !forbiddenPlaces.some(function (g) { return w.collides(g); }); });
    };
    return RandomSymetric4;
}());
exports.RandomSymetric4 = RandomSymetric4;
//# sourceMappingURL=random-symetric4.js.map