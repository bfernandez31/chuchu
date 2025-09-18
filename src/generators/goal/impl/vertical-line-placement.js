"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerticalLinePlacement = void 0;
var goal_1 = require("../../../game/impl/goal");
var config_1 = require("../../../../browser/common/config");
var goal_factory_1 = require("../goal-factory");
var VerticalLinePlacement = /** @class */ (function () {
    function VerticalLinePlacement() {
    }
    VerticalLinePlacement.implement = function (players) {
        if (Math.random() > 0.5) {
            var cellsInSplit_1 = Math.floor(config_1.CONFIG.COLUMNS / players.length);
            return players.map(function (player, index) { return new goal_1.Goal(goal_factory_1.GoalFactory.cellNumToPosition([cellsInSplit_1 / 2 + index * cellsInSplit_1, (config_1.CONFIG.ROWS / 2)]), 'U', player); });
        }
        else {
            var cellsInSplit_2 = Math.floor(config_1.CONFIG.ROWS / players.length);
            return players.map(function (player, index) { return new goal_1.Goal(goal_factory_1.GoalFactory.cellNumToPosition([(config_1.CONFIG.COLUMNS / 2), cellsInSplit_2 / 2 + index * cellsInSplit_2]), 'U', player); });
        }
    };
    return VerticalLinePlacement;
}());
exports.VerticalLinePlacement = VerticalLinePlacement;
//# sourceMappingURL=vertical-line-placement.js.map