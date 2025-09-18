"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreDisplay = void 0;
var ScoreDisplay = /** @class */ (function () {
    function ScoreDisplay() {
    }
    ScoreDisplay.prototype.getHighscoreDiv = function () {
        var _a;
        if (!this._highscoreDiv) {
            this._highscoreDiv = (_a = window.document.body.querySelector(".highscore-content")) !== null && _a !== void 0 ? _a : undefined;
        }
        return this._highscoreDiv;
    };
    ScoreDisplay.prototype.updateHighScore = function (payload) {
        var _this = this;
        var _a;
        this.getHighscoreDiv().innerHTML = "";
        ((_a = payload.players) !== null && _a !== void 0 ? _a : []).forEach(function (player) {
            _this.addScore(player, _this.getHighscoreDiv(), 'totalPoints');
        });
    };
    ScoreDisplay.prototype.addScore = function (player, to, type) {
        var node = document.createElement('div');
        node.classList.add('score-item');
        var playerName = document.createElement('p');
        playerName.innerText = player.name;
        var playerValue = document.createElement('p');
        playerValue.innerText = player[type];
        node.appendChild(playerName);
        node.appendChild(playerValue);
        to === null || to === void 0 ? void 0 : to.appendChild(node);
    };
    return ScoreDisplay;
}());
exports.ScoreDisplay = ScoreDisplay;
//# sourceMappingURL=score.display.js.map