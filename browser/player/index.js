"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var name_component_1 = require("./name.component");
var input_component_1 = require("./input.component");
var uuid_1 = require("uuid");
var queue_component_1 = require("./queue.component");
var ws_1 = require("../common/ws");
var score_component_1 = require("./score.component");
var config_1 = require("../common/config");
var wait_component_1 = require("./wait.component");
var id_component_1 = require("./id.component");
var reload_component_1 = require("./reload.component");
var STORAGE_KEY = 'chuchu-key';
var key = localStorage.getItem(STORAGE_KEY) || (0, uuid_1.v4)();
localStorage.setItem(STORAGE_KEY, key);
var auth = false;
var ws;
var isInGame = false;
var nameComponent = new name_component_1.NameComponent();
var inputComponent = new input_component_1.InputComponent();
var queueComponent = new queue_component_1.QueueComponent();
var scoreComponent = new score_component_1.ScoreComponent();
var waitComponent = new wait_component_1.WaitComponent();
var idComponent = new id_component_1.IdComponent();
var reloadComponent = new reload_component_1.ReloadComponent();
var autoReconnect = true;
var propagateAuth = function () {
    var name = nameComponent.value();
    ws.send(JSON.stringify({ type: 'joined', key: key, name: name }));
    auth = true;
    nameComponent.hide();
    scoreComponent.hide();
    queueComponent.show();
    waitComponent.hide();
    idComponent.init();
    reloadComponent.init();
};
var connect = function () {
    ws = (0, ws_1.createWs)();
    nameComponent.init(propagateAuth, function () { return refreshTimeout(); });
    inputComponent.init(ws, key, function () { return refreshTimeout(); });
    queueComponent.init(ws, key);
    scoreComponent.init();
    waitComponent.init();
    idComponent.init();
    ws.addEventListener('open', function () {
        console.log("connected.");
        waitComponent.hide();
    });
    ws.addEventListener('error', function (ev) {
        console.log("WS error:", ev);
    });
    ws.addEventListener('close', function (event) {
        if (autoReconnect) {
            setTimeout(function () { return connect(); }, config_1.CONFIG['AUTO_RECONNECT_DELAY']);
        }
    });
    ws.addEventListener("message", function (event) {
        var payload = JSON.parse(event.data.toString());
        switch (payload.type) {
            case 'queued':
                queueComponent.hide();
                inputComponent.show(payload.color, nameComponent.value());
                waitComponent.show();
                isInGame = true;
                refreshTimeout();
                break;
            case 'can-queue':
                queueComponent.show();
                inputComponent.hide();
                waitComponent.hide();
                isInGame = false;
                refreshTimeout();
                break;
            case 'wait-over':
                waitComponent.hide();
                refreshTimeout();
                break;
            case 'score':
                scoreComponent.display(payload.score);
                waitComponent.hide();
                refreshTimeout();
                break;
        }
    });
    if (auth) {
        propagateAuth();
    }
};
var timeout;
var refreshTimeout = function () {
    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(function () {
        autoReconnect = false;
        ws.close();
        console.log("disconnect after ".concat(config_1.CONFIG['ACTIVITY_TIMEOUT'], "ms inactivity"));
        nameComponent.hide();
        inputComponent.hide();
        scoreComponent.hide();
        queueComponent.hide();
        waitComponent.hide();
        reloadComponent.show();
    }, config_1.CONFIG['ACTIVITY_TIMEOUT']);
};
fetch('/config.json').then(function (config) {
    config.json().then(function (json) {
        // @ts-ignore
        Object.keys(json).forEach(function (key) { return config_1.CONFIG[key] = json[key]; });
        console.log(JSON.stringify(config_1.CONFIG), 4);
        connect();
        refreshTimeout();
    });
});
//# sourceMappingURL=index.js.map