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
exports.StartingStrategy = void 0;
var game_strategy_1 = require("../game-strategy");
var StartingStrategy = /** @class */ (function (_super) {
    __extends(StartingStrategy, _super);
    function StartingStrategy() {
        var _this = _super.call(this, []) || this;
        _this.name = 'Starting';
        return _this;
    }
    StartingStrategy.prototype._step = function (index) {
    };
    StartingStrategy.prototype.hasEnded = function () {
        return true;
    };
    return StartingStrategy;
}(game_strategy_1.GameStrategy));
exports.StartingStrategy = StartingStrategy;
//# sourceMappingURL=starting-strategy.js.map