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
exports.Arrow = void 0;
var non_moving_object_1 = require("./non-moving-object");
var Arrow = /** @class */ (function (_super) {
    __extends(Arrow, _super);
    function Arrow(position, direction, player) {
        var _this = _super.call(this, position, direction) || this;
        _this.player = player;
        _this.norm = _this.norm / 2;
        return _this;
    }
    Arrow.prototype.state = function () {
        return {
            position: this.position,
            direction: this.direction,
            color: this.player.color // color
        };
    };
    return Arrow;
}(non_moving_object_1.NonMovingObject));
exports.Arrow = Arrow;
//# sourceMappingURL=arrow.js.map