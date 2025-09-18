"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectionUtils = void 0;
var DirectionUtils = /** @class */ (function () {
    function DirectionUtils() {
    }
    DirectionUtils.list = function () {
        return ['U', 'D', 'L', 'R'];
    };
    DirectionUtils.next = function (direction) {
        switch (direction) {
            case 'U':
                return 'R';
            case 'R':
                return 'D';
            case 'D':
                return 'L';
            case 'L':
                return 'U';
        }
    };
    DirectionUtils.vector = function (direction) {
        switch (direction) {
            case 'U':
                return [0, -1];
            case 'D':
                return [0, 1];
            case 'L':
                return [-1, 0];
            case 'R':
                return [1, 0];
        }
    };
    return DirectionUtils;
}());
exports.DirectionUtils = DirectionUtils;
//# sourceMappingURL=direction.js.map