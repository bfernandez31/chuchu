"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdComponent = void 0;
var IdComponent = /** @class */ (function () {
    function IdComponent() {
    }
    IdComponent.prototype.init = function () {
        var _this = this;
        this.panel = document.getElementsByClassName('id')[0];
        if (this.panel) {
            this.panel.innerText = "".concat(localStorage.getItem("chuchu-name"), " - ").concat(localStorage.getItem("chuchu-key"));
        }
        else {
            setTimeout(function () { return _this.init(); }, 100);
        }
    };
    IdComponent.prototype.show = function () {
        this.panel.style.display = "block";
    };
    return IdComponent;
}());
exports.IdComponent = IdComponent;
//# sourceMappingURL=id.component.js.map