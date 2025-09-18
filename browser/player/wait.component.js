"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitComponent = void 0;
var WaitComponent = /** @class */ (function () {
    function WaitComponent() {
    }
    WaitComponent.prototype.init = function () {
        this.panel = document.getElementsByClassName('wait')[0];
    };
    WaitComponent.prototype.hide = function () {
        this.panel.style.display = "none";
    };
    WaitComponent.prototype.show = function () {
        this.panel.style.display = "flex";
    };
    return WaitComponent;
}());
exports.WaitComponent = WaitComponent;
//# sourceMappingURL=wait.component.js.map