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
exports.Goal = void 0;
var non_moving_object_1 = require("../non-moving-object");
var geometry_1 = require("../../geometry");
var Goal = /** @class */ (function (_super) {
    __extends(Goal, _super);
    function Goal(position, direction, player) {
        var _this = _super.call(this, position, direction) || this;
        _this.norm = geometry_1.Geometry.vectorNorm(_this.size) / 2;
        _this.player = player;
        return _this;
    }
    Goal.prototype.absorbing = function (objects) {
        var _this = this;
        return objects.filter(function (obj) { return geometry_1.Geometry.segmentNorm([_this.position, obj.position]) < _this.norm; });
    };
    Goal.prototype.state = function () {
        return {
            position: this.position,
            direction: this.direction,
            color: this.player.color // color
        };
    };
    return Goal;
}(non_moving_object_1.NonMovingObject));
exports.Goal = Goal;
//# sourceMappingURL=goal.js.map