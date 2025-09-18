"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWs = void 0;
/**
 * TODO Handle both local and deployed case
 * (unsecure ws and wss)
 */
var config_1 = require("./config");
var createWs = function () {
    return new WebSocket(config_1.CONFIG.WSS_EXTERNAL_URL);
};
exports.createWs = createWs;
//# sourceMappingURL=ws.js.map