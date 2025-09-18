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
var queue_display_1 = require("./queue.display");
var score_display_1 = require("./score.display");
var game_display_1 = require("./game.display");
var qrcode_display_1 = require("./qrcode.display");
var ws_1 = require("../common/ws");
var config_1 = require("../common/config");
var messages_pb_1 = require("../../src/messages_pb");
/**
 * Optimiseur de rendu avec requestAnimationFrame pour synchroniser
 * le rendu avec le refresh rate de l'écran et éviter les redraw inutiles
 */
var OptimizedRenderer = /** @class */ (function () {
    function OptimizedRenderer(gameDisplay) {
        this.needsRedraw = false;
        this.isRendering = false;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.pendingGameState = null;
        this.gameDisplay = gameDisplay;
        this.startRenderLoop();
    }
    OptimizedRenderer.prototype.startRenderLoop = function () {
        var _this = this;
        var renderFrame = function (currentTime) {
            if (currentTime - _this.lastFrameTime >= _this.frameInterval) {
                if (_this.needsRedraw && !_this.isRendering && _this.pendingGameState) {
                    _this.isRendering = true;
                    _this.gameDisplay.display(_this.pendingGameState);
                    _this.needsRedraw = false;
                    _this.isRendering = false;
                    _this.lastFrameTime = currentTime;
                }
            }
            requestAnimationFrame(renderFrame);
        };
        requestAnimationFrame(renderFrame);
    };
    // Appelé par les WebSocket messages
    OptimizedRenderer.prototype.markForRedraw = function (gameState) {
        this.pendingGameState = gameState;
        this.needsRedraw = true;
    };
    // FPS adaptatif selon la charge (nombre d'entités)
    OptimizedRenderer.prototype.setTargetFPS = function (fps) {
        this.targetFPS = Math.max(15, Math.min(60, fps));
        this.frameInterval = 1000 / this.targetFPS;
    };
    // Adaptation automatique du FPS selon le contenu
    OptimizedRenderer.prototype.adaptFPSBasedOnGameState = function (gameState) {
        var _a, _b, _c, _d;
        if (!((_a = gameState === null || gameState === void 0 ? void 0 : gameState.state) === null || _a === void 0 ? void 0 : _a.strategy))
            return;
        var entityCount = (((_b = gameState.state.strategy.mouses) === null || _b === void 0 ? void 0 : _b.length) || 0) +
            (((_c = gameState.state.strategy.cats) === null || _c === void 0 ? void 0 : _c.length) || 0) +
            (((_d = gameState.state.players) === null || _d === void 0 ? void 0 : _d.length) || 0);
        // Plus d'entités = FPS plus bas pour maintenir les performances
        var adaptedFPS = 60;
        if (entityCount > 100) {
            adaptedFPS = 30;
        }
        else if (entityCount > 50) {
            adaptedFPS = 45;
        }
        this.setTargetFPS(adaptedFPS);
    };
    return OptimizedRenderer;
}());
var queue = new queue_display_1.default();
var score = new score_display_1.ScoreDisplay();
var game = new game_display_1.GameDisplay();
var qrcode = new qrcode_display_1.QrCodeDisplay();
var optimizedRenderer = new OptimizedRenderer(game);
var ws;
var lastGameState = null;
fetch('/config.json').then(function (config) {
    config.json().then(function (json) {
        // @ts-ignore
        Object.keys(json).forEach(function (key) { return config_1.CONFIG[key] = json[key]; });
        console.log(JSON.stringify(config_1.CONFIG), 4);
        var connect = function () {
            ws = (0, ws_1.createWs)();
            ws.addEventListener('open', function () {
                ws.send(JSON.stringify({ type: 'server' }));
                qrcode.init();
            });
            ws.addEventListener("message", function (event) {
                var handlePayload = function (payload) {
                    switch (payload.type) {
                        case 'GAME_':
                            lastGameState = __assign(__assign({}, lastGameState), payload.game);
                            var gameState = { state: lastGameState };
                            // Adaptation automatique du FPS selon la charge
                            optimizedRenderer.adaptFPSBasedOnGameState(gameState);
                            // Demander un redraw avec le nouveau système optimisé
                            optimizedRenderer.markForRedraw(gameState);
                            break;
                        case 'QU_':
                            queue.update(payload.queue);
                            break;
                        case 'SC_':
                            score.updateHighScore(payload.score);
                            break;
                    }
                };
                if (event.data instanceof Blob) {
                    var reader_1 = new FileReader();
                    reader_1.onload = function () {
                        var arrayBuffer = reader_1.result;
                        var data = new Uint8Array(arrayBuffer);
                        var payload = (0, messages_pb_1.decodeServerMessage)(data);
                        handlePayload(payload);
                    };
                    reader_1.readAsArrayBuffer(event.data);
                }
                else if (event.data instanceof ArrayBuffer) {
                    var data = new Uint8Array(event.data);
                    var payload = (0, messages_pb_1.decodeServerMessage)(data);
                    handlePayload(payload);
                }
                else if (event.data instanceof Uint8Array) {
                    var payload = (0, messages_pb_1.decodeServerMessage)(event.data);
                    handlePayload(payload);
                }
                else if (event.data.buffer instanceof ArrayBuffer) {
                    var data = new Uint8Array(event.data.buffer);
                    var payload = (0, messages_pb_1.decodeServerMessage)(data);
                    handlePayload(payload);
                }
                else {
                    // fallback JSON si besoin (pour compatibilité)
                    try {
                        var payload = JSON.parse(event.data.toString());
                        handlePayload(payload);
                    }
                    catch (e) {
                        console.error('Impossible de décoder le message WebSocket', e);
                    }
                }
            });
            ws.addEventListener('close', function (event) {
                setTimeout(function () { return connect(); }, 1000);
            });
        };
        connect();
    });
});
//# sourceMappingURL=index.js.map