"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var router_1 = require("./router");
var wss_1 = require("./wss");
var config_1 = require("../browser/common/config");
var fs = require("fs");
try {
    var config_2 = JSON.parse(fs.readFileSync('./static/config.json', { encoding: 'utf8', flag: 'r' }));
    console.log('loaded config', config_2);
    // Fusionne les valeurs de chaque clé de config dans CONFIG
    Object.keys(config_2).forEach(function (key) {
        if (typeof config_1.CONFIG[key] === 'object' && typeof config_2[key] === 'object' && config_1.CONFIG[key] !== null && config_2[key] !== null) {
            config_1.CONFIG[key] = __assign(__assign({}, config_1.CONFIG[key]), config_2[key]);
        }
        else {
            config_1.CONFIG[key] = config_2[key];
        }
    });
    console.log('final config: ', JSON.stringify(config_1.CONFIG));
    var _a = (0, router_1.start)(), server = _a.server, router = _a.router;
    console.log("** Router: ".concat(router.report));
    console.log("** Server address: ".concat(server.address()));
    console.log("** Wss address: ".concat((0, wss_1.wss)().address()));
}
catch (e) {
    console.error('Wrong start', e);
}
//# sourceMappingURL=index.js.map