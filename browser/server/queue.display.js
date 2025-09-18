"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var colors_1 = require("../../src/colors");
var QueueDisplay = /** @class */ (function () {
    function QueueDisplay() {
    }
    QueueDisplay.prototype.getQueueDiv = function () {
        var _a;
        if (!this._queueDiv) {
            this._queueDiv = (_a = window.document.body.querySelector(".queue-content")) !== null && _a !== void 0 ? _a : undefined;
        }
        return this._queueDiv;
    };
    QueueDisplay.prototype.getTimeDiv = function () {
        var _a;
        if (!this._timeDiv) {
            this._timeDiv = (_a = window.document.body.querySelector(".queue-time")) !== null && _a !== void 0 ? _a : undefined;
        }
        return this._timeDiv;
    };
    QueueDisplay.prototype.update = function (payload) {
        var _this = this;
        var _a, _b;
        this.getQueueDiv().innerHTML = '';
        ((_b = (_a = payload.state) === null || _a === void 0 ? void 0 : _a.players) !== null && _b !== void 0 ? _b : []).forEach(function (player) {
            _this.addChild(player);
        });
        this.updateTime(payload);
    };
    QueueDisplay.prototype.addChild = function (player) {
        var _a;
        var node = document.createElement('p');
        node.innerText = player.name;
        node.style.backgroundColor = colors_1.colors[player.colorIndex];
        (_a = this.getQueueDiv()) === null || _a === void 0 ? void 0 : _a.appendChild(node);
    };
    QueueDisplay.prototype.updateTime = function (payload) {
        var _this = this;
        if (payload.state) {
            var toGo = this.secondsToGo(payload);
            this.getTimeDiv().innerText = toGo.text;
            if (toGo.continue) {
                setTimeout(function () {
                    _this.updateTime(payload);
                }, 1000);
            }
        }
    };
    QueueDisplay.prototype.secondsToGo = function (payload) {
        var toGo = Math.round((new Date(payload.state.startDate).getTime() - new Date().getTime()) / 1000);
        if (isNaN(toGo) && payload.state.ready && !payload.state.started) {
            return { text: "Partie en cours...", continue: false };
        }
        if (isNaN(toGo) || payload.state.finished) {
            return { text: "File d'attente ouverte...", continue: false };
        }
        return toGo > 0 ? { text: "Entrez dans le jeu pendant encore ".concat(toGo, "s ..."), continue: true } : { text: "C'est parti !", continue: false };
    };
    return QueueDisplay;
}());
exports.default = QueueDisplay;
//# sourceMappingURL=queue.display.js.map