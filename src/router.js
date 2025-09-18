"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
var fs = require("fs");
var http = require("http");
var config_1 = require("../browser/common/config");
function getContentType(file) {
    if (file.endsWith('.html')) {
        return 'text/html';
    }
    if (file.endsWith('.js')) {
        return 'text/javascript';
    }
    if (file.endsWith('.json')) {
        return 'application/json';
    }
    if (file.endsWith('.png')) {
        return 'image/png';
    }
    if (file.endsWith('.svg')) {
        return 'image/svg+xml';
    }
    return 'text/plain';
}
var start = function () {
    var router = require('find-my-way')({
        defaultRoute: function (req, res) {
            console.log('url', req.url);
            var fileOpts = ['./static' + req.url, './static' + req.url + '.html'];
            var found = false;
            fileOpts.forEach(function (file) {
                try {
                    var contentType = getContentType(file);
                    var data = fs.readFileSync(file, contentType.startsWith('image') ? {} : { encoding: 'utf8' });
                    res.statusCode = 200;
                    res.setHeader('Content-Type', contentType);
                    res.end(data);
                    found = true;
                    console.log('Serving', file);
                }
                catch (err) {
                    //console.log(err);
                }
            });
            if (!found) {
                console.error('not found', fileOpts);
                res.statusCode = 400;
                res.end();
            }
        },
        onBadUrl: function (path, req, res) {
            res.statusCode = 400;
            res.end("Bad path: ".concat(path));
        },
        ignoreTrailingSlash: true
    });
    var makeResponseOk = function (res, toBeSent, code) {
        var sendCode = !!code ? code : 200;
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Authorization, File-Content-Type');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.writeHead(sendCode);
        return res.end(JSON.stringify(toBeSent));
    };
    router.on(['OPTIONS', 'GET'], '/version', function (req, res, params) {
        var _a;
        makeResponseOk(res, ((_a = JSON.parse(fs.readFileSync('.package.json', 'utf8'))) !== null && _a !== void 0 ? _a : { version: "???" }).version);
    });
    var server = http.createServer(function (req, res) {
        router.lookup(req, res);
    });
    server.listen(config_1.CONFIG.SERVER_PORT, '0.0.0.0', undefined, function () {
        console.log("Server is running on http://...:".concat(config_1.CONFIG.SERVER_PORT));
    });
    return { server: server, router: router };
};
exports.start = start;
//# sourceMappingURL=router.js.map