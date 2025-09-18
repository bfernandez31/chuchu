"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreComponent = void 0;
var ScoreComponent = /** @class */ (function () {
    function ScoreComponent() {
    }
    ScoreComponent.prototype.init = function () {
        var _this = this;
        this.panel = document.getElementById('panel-score');
        if (this.panel) {
            this.panel.style.display = "flex";
        }
        else {
            setTimeout(function () { return _this.init(); }, 100);
        }
    };
    ScoreComponent.prototype.hide = function () {
        this.panel.style.display = "none";
    };
    ScoreComponent.prototype.display = function (score) {
        this.panel.style.display = "flex";
        this.panel.innerText = "".concat(score, " points");
    };
    return ScoreComponent;
}());
exports.ScoreComponent = ScoreComponent;
//# sourceMappingURL=score.component.js.map