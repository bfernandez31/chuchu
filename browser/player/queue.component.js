"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueComponent = void 0;
var QueueComponent = /** @class */ (function () {
    function QueueComponent() {
    }
    QueueComponent.prototype.init = function (ws, key) {
        var _this = this;
        this.queueBtn = document.getElementById('queue');
        this.panel = document.getElementById('panel-queue');
        if (this.queueBtn && this.panel) {
            this.queueBtn.addEventListener('click', function () {
                ws.send(JSON.stringify({ type: 'queue', key: key }));
            });
        }
        else {
            setTimeout(function () { return _this.init(ws, key); }, 100);
        }
    };
    QueueComponent.prototype.show = function () {
        this.panel.style.display = "block";
    };
    QueueComponent.prototype.hide = function () {
        this.panel.style.display = "none";
    };
    return QueueComponent;
}());
exports.QueueComponent = QueueComponent;
//# sourceMappingURL=queue.component.js.map