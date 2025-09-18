"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
var ws_1 = require("ws");
var queue_1 = require("./queue");
var config_1 = require("../browser/common/config");
var wss = function () {
    var wss = new ws_1.WebSocket.Server({ port: config_1.CONFIG.WSS_PORT });
    var queue = new queue_1.Queue(config_1.CONFIG.PATH);
    wss.on('connection', function (ws) {
        console.log('New client');
        ws.on('message', function (data) {
            // console.log('WSS received: %s', data);
            var payload = JSON.parse(data.toString());
            queue.processMsg(payload, ws);
        });
        ws.on('close', function () {
            queue.disconnect(ws);
        });
    });
    console.log("WSS server listening on port http://0.0.0.0:".concat(config_1.CONFIG.WSS_PORT));
    return wss;
};
exports.wss = wss;
//# sourceMappingURL=wss.js.map