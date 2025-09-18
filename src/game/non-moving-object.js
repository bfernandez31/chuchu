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
exports.NonMovingObject = void 0;
var moving_object_1 = require("./moving-object");
var NonMovingObject = /** @class */ (function (_super) {
    __extends(NonMovingObject, _super);
    function NonMovingObject(position, direction) {
        return _super.call(this, position.map(function (p) { return Math.round(p); }), direction) || this;
    }
    NonMovingObject.prototype.move = function (walls, arrows, speed) {
    };
    return NonMovingObject;
}(moving_object_1.MovingObject));
exports.NonMovingObject = NonMovingObject;
//# sourceMappingURL=non-moving-object.js.map