"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AwardDisplay = /** @class */ (function () {
    function AwardDisplay() {
        this.translation = {
            mostPlayed: "Le plus actif",
            mostEfficient: "Le plus efficace",
            leastEfficient: "Le moins efficace"
        };
        this.colors = {
            mostPlayed: "#09ff00",
            mostEfficient: "#0534ff",
            leastEfficient: "#f16e6e"
        };
    }
    AwardDisplay.prototype.getAwardDiv = function () {
        var _a;
        if (!this._awardDiv) {
            this._awardDiv = (_a = window.document.body.querySelector(".awards")) !== null && _a !== void 0 ? _a : undefined;
        }
        return this._awardDiv;
    };
    AwardDisplay.prototype.update = function (payload) {
        var _this = this;
        if (payload !== null) {
            this.getAwardDiv().innerHTML = Object.keys(payload.awards).map(function (key) { return "<span class=\"remarkable-text\">".concat(_this.translation[key], ": </span><span class=\"remarkable\" style=\"background-color: ").concat(_this.colors[key], "\">").concat(payload.awards[key].name, "</span>"); }).join('\t\t');
        }
    };
    return AwardDisplay;
}());
exports.default = AwardDisplay;
//# sourceMappingURL=award.display.js.map