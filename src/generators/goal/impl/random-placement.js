"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomPlacement = void 0;
var goal_1 = require("../../../game/impl/goal");
var geometry_1 = require("../../../geometry");
var config_1 = require("../../../../browser/common/config");
var RandomPlacement = /** @class */ (function () {
    function RandomPlacement() {
    }
    RandomPlacement.implement = function (players) {
        return players.map(function (player) {
            var cell = geometry_1.Geometry.randomCell();
            var cellPosition = [(cell[0] / config_1.CONFIG.COLUMNS) * config_1.CONFIG.GLOBAL_WIDTH, (cell[1] / config_1.CONFIG.ROWS) * config_1.CONFIG.GLOBAL_HEIGHT];
            return new goal_1.Goal(cellPosition, 'U', player);
        });
    };
    return RandomPlacement;
}());
exports.RandomPlacement = RandomPlacement;
//# sourceMappingURL=random-placement.js.map