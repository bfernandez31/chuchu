"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NameComponent = void 0;
var STORAGE_KEY = 'chuchu-name';
var NameComponent = /** @class */ (function () {
    function NameComponent() {
    }
    NameComponent.prototype.init = function (propagateAuth, activity) {
        var _this = this;
        var _a;
        this.nameBtn = document.getElementById('btn-name');
        this.panel = document.getElementById('panel-name');
        this.input = document.getElementById('input-name');
        if (this.nameBtn && this.panel && this.input) {
            this.nameBtn.addEventListener('click', propagateAuth);
            this.panel.style.display = "flex";
            this.input.value = (_a = localStorage.getItem(STORAGE_KEY)) !== null && _a !== void 0 ? _a : '';
            activity();
        }
        else {
            setTimeout(function () { return _this.init(propagateAuth, activity); }, 100);
        }
    };
    NameComponent.prototype.hide = function () {
        this.panel.style.display = "none";
    };
    NameComponent.prototype.value = function () {
        localStorage.setItem(STORAGE_KEY, this.input.value);
        return this.input.value;
    };
    return NameComponent;
}());
exports.NameComponent = NameComponent;
//# sourceMappingURL=name.component.js.map