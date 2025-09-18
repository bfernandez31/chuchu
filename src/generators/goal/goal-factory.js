"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalFactory = void 0;
var vertical_line_placement_1 = require("./impl/vertical-line-placement");
var config_1 = require("../../../browser/common/config");
var horizontal_line_placement_1 = require("./impl/horizontal-line-placement");
var random_placement_1 = require("./impl/random-placement");
var GoalFactory = /** @class */ (function () {
    function GoalFactory() {
    }
    GoalFactory.create = function (players) {
        var shuffledPlayers = players.map(function (value) { return ({ value: value, sort: Math.random() }); })
            .sort(function (a, b) { return a.sort - b.sort; })
            .map(function (_a) {
            var value = _a.value;
            return value;
        });
        return GoalFactory.strategies[Math.floor(Math.random() * 13982845) % GoalFactory.strategies.length].implement(shuffledPlayers);
    };
    GoalFactory.cellNumToPosition = function (cellNums) {
        return [Math.floor(cellNums[0]) / config_1.CONFIG.COLUMNS * config_1.CONFIG.GLOBAL_WIDTH, Math.floor(cellNums[1]) / config_1.CONFIG.ROWS * config_1.CONFIG.GLOBAL_HEIGHT];
    };
    GoalFactory.strategies = [vertical_line_placement_1.VerticalLinePlacement, horizontal_line_placement_1.HorizontalLinePlacement, random_placement_1.RandomPlacement];
    return GoalFactory;
}());
exports.GoalFactory = GoalFactory;
//# sourceMappingURL=goal-factory.js.map