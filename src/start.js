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
exports.Start = void 0;
var non_moving_object_1 = require("./game/non-moving-object");
var uuid_1 = require("uuid");
var Start = /** @class */ (function (_super) {
    __extends(Start, _super);
    function Start(position, direction) {
        var _this = _super.call(this, position.map(function (p) { return Math.round(p); }), direction) || this;
        _this.startId = (0, uuid_1.v4)();
        return _this;
    }
    return Start;
}(non_moving_object_1.NonMovingObject));
exports.Start = Start;
//# sourceMappingURL=start.js.map