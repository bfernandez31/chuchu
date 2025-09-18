"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStrategy = void 0;
var config_1 = require("../../../../browser/common/config");
var game_strategy_1 = require("../game-strategy");
var BaseStrategy = /** @class */ (function (_super) {
    __extends(BaseStrategy, _super);
    function BaseStrategy(players) {
        var _this = _super.call(this, players) || this;
        _this.name = 'Classic';
        return _this;
    }
    BaseStrategy.prototype._step = function (index) {
        if (index % config_1.CONFIG.CLASSIC_STEP_GENERATION === 0) {
            this.generateMouses();
        }
        if (index % Math.round(config_1.CONFIG.CLASSIC_STEP_GENERATION * 20) === 0) {
            this.generateCats();
        }
    };
    return BaseStrategy;
}(game_strategy_1.GameStrategy));
exports.BaseStrategy = BaseStrategy;
//# sourceMappingURL=base-strategy.js.map