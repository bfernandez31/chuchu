"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReloadComponent = void 0;
var ReloadComponent = /** @class */ (function () {
    function ReloadComponent() {
    }
    ReloadComponent.prototype.init = function () {
        var _this = this;
        this.panel = document.getElementsByClassName('reload')[0];
        this.reloadBtn = document.getElementsByClassName('btn-reload')[0];
        if (this.reloadBtn) {
            this.reloadBtn.addEventListener('click', function () {
                window.location.reload();
            });
        }
        else {
            setTimeout(function () { return _this.init(); }, 100);
        }
    };
    ReloadComponent.prototype.show = function () {
        this.panel.style.display = "block";
    };
    return ReloadComponent;
}());
exports.ReloadComponent = ReloadComponent;
//# sourceMappingURL=reload.component.js.map