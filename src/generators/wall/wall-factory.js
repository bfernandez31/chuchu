"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallFactory = void 0;
var random_symetric4_1 = require("./impl/random-symetric4");
var config_1 = require("../../../browser/common/config");
var WallFactory = /** @class */ (function () {
    function WallFactory() {
    }
    WallFactory.create = function (goals) {
        return WallFactory.strategies[Math.floor(Math.random() * 13982845) % WallFactory.strategies.length].implement(Math.ceil(Math.random() * 1000 % Math.floor(config_1.CONFIG.ROWS / 3)), goals);
    };
    WallFactory.strategies = [random_symetric4_1.RandomSymetric4];
    return WallFactory;
}());
exports.WallFactory = WallFactory;
//# sourceMappingURL=wall-factory.js.map