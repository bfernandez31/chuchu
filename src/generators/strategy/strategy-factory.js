"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyFactory = void 0;
var base_strategy_1 = require("./impl/base-strategy");
var mouse_mania_1 = require("./impl/mouse-mania");
var cat_mania_1 = require("./impl/cat-mania");
var starting_strategy_1 = require("./impl/starting-strategy");
var hurry_1 = require("./impl/hurry");
var many_wall_1 = require("./impl/many-wall");
var StrategyFactory = /** @class */ (function () {
    function StrategyFactory() {
    }
    StrategyFactory.next = function (previous, players) {
        var strategy = null;
        switch (true) {
            case previous instanceof starting_strategy_1.StartingStrategy:
            case !(previous instanceof base_strategy_1.BaseStrategy):
                strategy = new StrategyFactory.baseStrategy(players);
                break;
            default:
                strategy = new StrategyFactory.otherStrategies[Math.floor(Math.random() * 13982845) % StrategyFactory.otherStrategies.length](players);
        }
        strategy.applySpeedCorrection();
        console.log("New Strategy: ".concat(strategy.name, " (").concat(strategy.constructor.name, ") at ").concat(new Date().toLocaleTimeString()));
        return strategy;
    };
    StrategyFactory.baseStrategy = base_strategy_1.BaseStrategy;
    StrategyFactory.otherStrategies = [mouse_mania_1.MouseMania, cat_mania_1.CatMania, hurry_1.Hurry, many_wall_1.ManyWalls];
    return StrategyFactory;
}());
exports.StrategyFactory = StrategyFactory;
//# sourceMappingURL=strategy-factory.js.map