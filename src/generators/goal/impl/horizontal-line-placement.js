"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HorizontalLinePlacement = void 0;
var goal_1 = require("../../../game/impl/goal");
var config_1 = require("../../../../browser/common/config");
var goal_factory_1 = require("../goal-factory");
var HorizontalLinePlacement = /** @class */ (function () {
    function HorizontalLinePlacement() {
    }
    HorizontalLinePlacement.implement = function (players) {
        var cellsInSplit = Math.floor(config_1.CONFIG.COLUMNS / players.length);
        return players.map(function (player, index) { return new goal_1.Goal(goal_factory_1.GoalFactory.cellNumToPosition([cellsInSplit / 2 + index * cellsInSplit, (config_1.CONFIG.ROWS / 2)]), 'U', player); });
    };
    return HorizontalLinePlacement;
}());
exports.HorizontalLinePlacement = HorizontalLinePlacement;
//# sourceMappingURL=horizontal-line-placement.js.map