"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCodeDisplay = void 0;
var qr_code_styling_1 = require("qr-code-styling");
var QrCodeDisplay = /** @class */ (function () {
    function QrCodeDisplay() {
        this.url = "";
        this.url = window.location.toString().replace("server", "player");
    }
    QrCodeDisplay.prototype.getQrCodeDiv = function () {
        var _a;
        if (!this._qrCodeDiv) {
            this._qrCodeDiv = (_a = window.document.body.querySelector(".qr-code")) !== null && _a !== void 0 ? _a : undefined;
            this.qrCode = new qr_code_styling_1.default({
                width: 200,
                height: 200,
                type: "svg",
                data: this.url,
                dotsOptions: {
                    color: "#ffffff",
                    type: "rounded"
                },
                backgroundOptions: {
                    color: "#000000",
                },
                image: "./img/onepoint.png",
                imageOptions: {
                    crossOrigin: "anonymous",
                    imageSize: 0.5,
                    margin: 0
                }
            });
        }
        return this._qrCodeDiv;
    };
    QrCodeDisplay.prototype.init = function () {
        var _this = this;
        var div = this.getQrCodeDiv();
        if (div) {
            div.innerHTML = "";
            this.qrCode.append(div);
        }
        else {
            setTimeout(function () {
                _this.init();
            }, 100);
        }
    };
    return QrCodeDisplay;
}());
exports.QrCodeDisplay = QrCodeDisplay;
//# sourceMappingURL=qrcode.display.js.map