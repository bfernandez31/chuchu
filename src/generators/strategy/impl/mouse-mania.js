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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MouseMania = void 0;
var config_1 = require("../../../../browser/common/config");
var game_strategy_1 = require("../game-strategy");
var wall_factory_1 = require("../../wall/wall-factory");
var MouseMania = /** @class */ (function (_super) {
    __extends(MouseMania, _super);
    function MouseMania(players) {
        var _this = _super.call(this, players) || this;
        _this.name = 'Mouse Mania';
        _this.mouseSpeed = 2;
        _this.catStarts = [];
        _this.walls = wall_factory_1.WallFactory.create(__spreadArray(__spreadArray(__spreadArray([], _this.goals, true), _this.mouseStarts, true), _this.catStarts, true));
        return _this;
    }
    MouseMania.prototype._step = function (index) {
        if (index % Math.round(config_1.CONFIG.CLASSIC_STEP_GENERATION / 2) === 0) {
            this.generateMouses();
        }
    };
    return MouseMania;
}(game_strategy_1.GameStrategy));
exports.MouseMania = MouseMania;
//# sourceMappingURL=mouse-mania.js.map