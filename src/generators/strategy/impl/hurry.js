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
exports.Hurry = void 0;
var config_1 = require("../../../../browser/common/config");
var game_strategy_1 = require("../game-strategy");
var Hurry = /** @class */ (function (_super) {
    __extends(Hurry, _super);
    function Hurry(players) {
        var _this = _super.call(this, players) || this;
        _this.name = 'Hurry Up';
        _this.mouseSpeed = 3;
        _this.catSpeed = 2;
        return _this;
    }
    Hurry.prototype._step = function (index) {
        if (index % config_1.CONFIG.CLASSIC_STEP_GENERATION === 0) {
            this.generateMouses();
        }
        if (index % Math.round(config_1.CONFIG.CLASSIC_STEP_GENERATION * 20) === 0) {
            this.generateCats();
        }
    };
    return Hurry;
}(game_strategy_1.GameStrategy));
exports.Hurry = Hurry;
//# sourceMappingURL=hurry.js.map