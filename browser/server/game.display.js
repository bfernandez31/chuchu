"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameDisplay = void 0;
var config_1 = require("../common/config");
var colors_1 = require("../../src/colors");
var images_1 = require("./images");
var GameDisplay = /** @class */ (function () {
    function GameDisplay() {
        var _this = this;
        this.size = 10;
        this.goalImg = {};
        this.cursorImg = {};
        this.arrowImg = {};
        this.ready = false;
        this.cellSize = [0, 0];
        this.useAlt = false;
        // Enhanced multi-layer rendering system
        this.layers = new Map();
        this.layerContexts = new Map();
        this.layerDirty = new Map();
        this.renderLayers = ['background', 'walls', 'entities', 'players', 'ui', 'predictive'];
        this.gridCached = false;
        this.lastUseAltUpdate = 0;
        this.currentGridSize = [0, 0];
        // 60 FPS performance optimization
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fpsHistory = [];
        this.targetFPS = 60;
        this.frameTimeThreshold = 16.67; // 60 FPS = 16.67ms per frame
        this.previousPayload = { state: { players: [] } };
        this.mouseImg = new Image();
        this.mouseImg.src = "/img/mouse.svg";
        this.mouseImg2 = new Image();
        this.mouseImg2.src = "/img/mouse2.svg";
        this.catImg = new Image();
        this.catImg.src = "/img/cat.svg";
        this.catImg2 = new Image();
        this.catImg2.src = "/img/cat2.svg";
        this.wallImg = new Image();
        this.wallImg.src = "/img/wall.svg";
        colors_1.colors.forEach(function (color) {
            _this.initImagesForColor(color);
        });
        setTimeout(function () { return _this.init(); }, 100);
    }
    GameDisplay.prototype.initImagesForColor = function (color) {
        this.goalImg[color] = (0, images_1.goalImg)(color);
        this.cursorImg[color] = (0, images_1.cursorImg)(color);
        this.arrowImg[color] = (0, images_1.arrowImg)(color);
    };
    GameDisplay.prototype.resize = function (cols, rows) {
        var oldRows = config_1.CONFIG.ROWS;
        var oldCols = config_1.CONFIG.COLUMNS;
        config_1.CONFIG.ROWS = rows !== null && rows !== void 0 ? rows : config_1.CONFIG.ROWS;
        config_1.CONFIG.COLUMNS = cols !== null && cols !== void 0 ? cols : config_1.CONFIG.COLUMNS;
        this.cellSize = [config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.ROWS, config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.COLUMNS];
        // Invalidate grid cache if size changed
        if (oldRows !== config_1.CONFIG.ROWS || oldCols !== config_1.CONFIG.COLUMNS) {
            this.gridCached = false;
        }
    };
    GameDisplay.prototype.init = function () {
        this.canvas = window.document.body.querySelector(".game-canvas");
        this.drawElement = window.document.body.querySelector("div.draw");
        this.context = this.canvas.getContext('2d');
        this.size = Math.min(this.drawElement.getBoundingClientRect().width, this.drawElement.getBoundingClientRect().height);
        this.canvas.width = config_1.CONFIG.GLOBAL_WIDTH;
        this.canvas.height = config_1.CONFIG.GLOBAL_HEIGHT;
        this.canvas.style.width = "".concat(this.size, "px");
        this.canvas.style.height = "".concat(this.size, "px");
        this.debug = window.document.body.querySelector(".debug-game-state");
        this.cellSize = [config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.ROWS, config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.COLUMNS];
        // Initialize grid cache canvas
        this.initGridCache();
        // Initialize multi-layer rendering system
        this.initLayers();
        this.ready = true;
    };
    /**
     * Initialize multi-layer rendering system for performance optimization
     */
    GameDisplay.prototype.initLayers = function () {
        var _this = this;
        this.renderLayers.forEach(function (layerName) {
            var canvas = document.createElement('canvas');
            canvas.width = config_1.CONFIG.GLOBAL_WIDTH;
            canvas.height = config_1.CONFIG.GLOBAL_HEIGHT;
            var context = canvas.getContext('2d');
            _this.layers.set(layerName, canvas);
            _this.layerContexts.set(layerName, context);
            _this.layerDirty.set(layerName, true);
        });
    };
    /**
     * Mark a specific layer as dirty for re-rendering
     */
    GameDisplay.prototype.markLayerDirty = function (layerName) {
        this.layerDirty.set(layerName, true);
    };
    /**
     * Mark all layers as dirty
     */
    GameDisplay.prototype.markAllLayersDirty = function () {
        var _this = this;
        this.renderLayers.forEach(function (layer) { return _this.markLayerDirty(layer); });
    };
    GameDisplay.prototype.display = function (newPayload) {
        var _this = this;
        var frameStartTime = performance.now();
        // Skip frame if we're exceeding target frame time
        if (frameStartTime - this.lastFrameTime < this.frameTimeThreshold) {
            return;
        }
        var payload = __assign(__assign(__assign({}, this.previousPayload), newPayload), { state: __assign(__assign({}, this.previousPayload.state), newPayload.state) });
        this.resize(payload.state.cols, payload.state.rows);
        if (this.ready) {
            // Clear main canvas
            if (this.context) {
                this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            // Optimize useAlt calculation - only update every 500ms
            this.updateUseAlt();
            // Determine which layers need updating
            this.determineLayerUpdates(payload);
            // Render layers that need updating
            this.renderLayers.forEach(function (layerName) {
                if (_this.layerDirty.get(layerName)) {
                    _this.renderLayer(layerName, payload);
                    _this.layerDirty.set(layerName, false);
                }
            });
            // Composite all layers onto main canvas
            this.compositeLayers();
            // Track performance
            this.trackFramePerformance(frameStartTime);
        }
        this.previousPayload = payload;
    };
    /**
     * Determine which layers need updating based on payload changes
     */
    GameDisplay.prototype.determineLayerUpdates = function (payload) {
        var _a, _b, _c, _d, _e, _f;
        // Always update entities and players layers for animation
        this.markLayerDirty('entities');
        this.markLayerDirty('players');
        // Check for structural changes
        if (!this.previousPayload.state ||
            payload.state.cols !== this.previousPayload.state.cols ||
            payload.state.rows !== this.previousPayload.state.rows) {
            this.markAllLayersDirty();
            return;
        }
        // Check for strategy changes (affects walls and background)
        if (((_a = payload.state.strategy) === null || _a === void 0 ? void 0 : _a.name) !== ((_c = (_b = this.previousPayload.state) === null || _b === void 0 ? void 0 : _b.strategy) === null || _c === void 0 ? void 0 : _c.name)) {
            this.markLayerDirty('background');
            this.markLayerDirty('walls');
            this.markLayerDirty('ui');
        }
        // Check for wall changes
        if (JSON.stringify((_d = payload.state.strategy) === null || _d === void 0 ? void 0 : _d.walls) !== JSON.stringify((_f = (_e = this.previousPayload.state) === null || _e === void 0 ? void 0 : _e.strategy) === null || _f === void 0 ? void 0 : _f.walls)) {
            this.markLayerDirty('walls');
        }
    };
    /**
     * Render a specific layer
     */
    GameDisplay.prototype.renderLayer = function (layerName, payload) {
        var context = this.layerContexts.get(layerName);
        if (!context)
            return;
        // Clear layer
        context.clearRect(0, 0, config_1.CONFIG.GLOBAL_WIDTH, config_1.CONFIG.GLOBAL_HEIGHT);
        if (!payload.state || !payload.state.strategy)
            return;
        switch (layerName) {
            case 'background':
                this.renderBackgroundLayer(context, payload.state);
                break;
            case 'walls':
                this.renderWallsLayer(context, payload.state);
                break;
            case 'entities':
                this.renderEntitiesLayer(context, payload.state);
                break;
            case 'players':
                this.renderPlayersLayer(context, payload.state);
                break;
            case 'ui':
                this.renderUILayer(context, payload.state);
                break;
            case 'predictive':
                this.renderPredictiveLayer(context, payload.state);
                break;
        }
    };
    /**
     * Composite all layers onto the main canvas
     */
    GameDisplay.prototype.compositeLayers = function () {
        var _this = this;
        this.renderLayers.forEach(function (layerName) {
            var canvas = _this.layers.get(layerName);
            if (canvas) {
                _this.context.drawImage(canvas, 0, 0);
            }
        });
    };
    /**
     * Track frame performance and FPS
     */
    GameDisplay.prototype.trackFramePerformance = function (frameStartTime) {
        var frameEndTime = performance.now();
        var frameTime = frameEndTime - frameStartTime;
        var fps = 1000 / (frameEndTime - this.lastFrameTime);
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 60) { // Keep last 60 samples
            this.fpsHistory.shift();
        }
        this.lastFrameTime = frameEndTime;
        this.frameCount++;
        // Log performance warnings if FPS drops below target
        if (fps < this.targetFPS * 0.8 && this.frameCount % 60 === 0) {
            console.warn("Low FPS detected: ".concat(fps.toFixed(1), " FPS (frame time: ").concat(frameTime.toFixed(2), "ms)"));
        }
    };
    /**
     * Render background layer (grid and strategy name)
     */
    GameDisplay.prototype.renderBackgroundLayer = function (context, state) {
        // Draw grid
        var originalContext = this.context;
        this.context = context;
        this.drawCachedGrid();
        this.context = originalContext;
    };
    /**
     * Render walls layer
     */
    GameDisplay.prototype.renderWallsLayer = function (context, state) {
        var _this = this;
        state.strategy.walls.forEach(function (wall) {
            context.drawImage(_this.wallImg, wall.position[0], wall.position[1], _this.cellSize[0], _this.cellSize[1]);
        });
    };
    /**
     * Render entities layer (mice and cats)
     */
    GameDisplay.prototype.renderEntitiesLayer = function (context, state) {
        var _this = this;
        var _a, _b;
        var originalContext = this.context;
        this.context = context;
        // Draw mice
        var mouseImg = this.useAlt ? this.mouseImg2 : this.mouseImg;
        ((_a = state.strategy.mouses) !== null && _a !== void 0 ? _a : []).forEach(function (mouse) {
            _this.drawRotated(mouseImg, mouse.position[0], mouse.position[1], _this.angleFor(mouse.direction, 'mouse'));
        });
        // Draw cats
        var catImg = this.useAlt ? this.catImg : this.catImg2;
        ((_b = state.strategy.cats) !== null && _b !== void 0 ? _b : []).forEach(function (cat) {
            _this.drawRotated(catImg, cat.position[0], cat.position[1], _this.angleFor(cat.direction, 'cat'));
        });
        this.context = originalContext;
    };
    /**
     * Render players layer (goals, cursors, arrows)
     */
    GameDisplay.prototype.renderPlayersLayer = function (context, state) {
        var _this = this;
        var originalContext = this.context;
        this.context = context;
        // Draw goals
        state.strategy.goals.forEach(function (goal) {
            context.drawImage(_this.goalImg[goal.color], goal.position[0], goal.position[1], _this.cellSize[0], _this.cellSize[1]);
        });
        // Draw players
        state.players.forEach(function (player) {
            // Player position
            context.fillStyle = "#FFFFFF";
            context.beginPath();
            context.arc(player.position[0], player.position[1], 3, 0, 2 * Math.PI, true);
            context.fill();
            // Player cursor
            if (_this.cursorImg[colors_1.colors[player.colorIndex]] === undefined) {
                console.warn("Cursor image for color ".concat(colors_1.colors[player.colorIndex], " not found."));
                _this.initImagesForColor(colors_1.colors[player.colorIndex]);
            }
            context.drawImage(_this.cursorImg[colors_1.colors[player.colorIndex]], player.position[0], player.position[1], _this.cellSize[0], _this.cellSize[1]);
            // Player arrows
            (player.arrows || []).forEach(function (arrow) {
                _this.drawRotated(_this.arrowImg[colors_1.colors[player.colorIndex]], arrow.position[0], arrow.position[1], _this.angleFor(arrow.direction, 'arrow'));
            });
        });
        this.context = originalContext;
    };
    /**
     * Render UI layer (strategy name, debug info)
     */
    GameDisplay.prototype.renderUILayer = function (context, state) {
        // Strategy name
        context.fillStyle = "#a0ffff";
        context.font = "50px Arial";
        context.textAlign = "center";
        context.fillText(state.strategy.name, config_1.CONFIG.GLOBAL_HEIGHT / 2, 100);
        // FPS counter (if enabled)
        if (this.fpsHistory.length > 0) {
            var avgFPS = this.fpsHistory.reduce(function (sum, fps) { return sum + fps; }, 0) / this.fpsHistory.length;
            context.fillStyle = "#00ff00";
            context.font = "20px Arial";
            context.textAlign = "left";
            context.fillText("FPS: ".concat(avgFPS.toFixed(1)), 10, 30);
        }
    };
    /**
     * Render predictive layer (client-side predictions)
     */
    GameDisplay.prototype.renderPredictiveLayer = function (context, state) {
        // This layer will be used by the PredictiveRenderer
        // For now, it's empty but ready for integration
    };
    /**
     * Get current FPS statistics
     */
    GameDisplay.prototype.getPerformanceStats = function () {
        var currentFPS = this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0;
        var averageFPS = this.fpsHistory.length > 0
            ? this.fpsHistory.reduce(function (sum, fps) { return sum + fps; }, 0) / this.fpsHistory.length
            : 0;
        return {
            currentFPS: currentFPS,
            averageFPS: averageFPS,
            frameCount: this.frameCount,
            layerStats: new Map(this.layerDirty)
        };
    };
    /**
     * Enable or disable predictive layer rendering
     */
    GameDisplay.prototype.setPredictiveLayerEnabled = function (enabled) {
        if (enabled) {
            this.markLayerDirty('predictive');
        }
        else {
            var predictiveContext = this.layerContexts.get('predictive');
            if (predictiveContext) {
                predictiveContext.clearRect(0, 0, config_1.CONFIG.GLOBAL_WIDTH, config_1.CONFIG.GLOBAL_HEIGHT);
            }
        }
    };
    GameDisplay.prototype.drawMouses = function (state) {
        var _this = this;
        var _a;
        var img = this.useAlt ? this.mouseImg2 : this.mouseImg;
        ((_a = state.strategy.mouses) !== null && _a !== void 0 ? _a : []).forEach(function (mouse) {
            _this.drawRotated(img, mouse.position[0], mouse.position[1], _this.angleFor(mouse.direction, 'mouse'));
        });
    };
    GameDisplay.prototype.drawCats = function (state) {
        var _this = this;
        var _a;
        var img = this.useAlt ? this.catImg : this.catImg2;
        ((_a = state.strategy.cats) !== null && _a !== void 0 ? _a : []).forEach(function (cat) {
            _this.drawRotated(img, cat.position[0], cat.position[1], _this.angleFor(cat.direction, 'cat'));
        });
    };
    GameDisplay.prototype.drawPlayers = function (state) {
        var _this = this;
        // player goal
        state.strategy.goals.forEach(function (goal) {
            _this.context.drawImage(_this.goalImg[goal.color], goal.position[0], goal.position[1], _this.cellSize[0], _this.cellSize[1]);
        });
        //player
        state.players.forEach(function (player) {
            // player position
            _this.context.fillStyle = "#FFFFFF";
            _this.context.beginPath();
            _this.context.arc(player.position[0], player.position[1], 3, 0, 2 * Math.PI, true);
            _this.context.fill();
            if (_this.cursorImg[colors_1.colors[player.colorIndex]] === undefined) {
                console.warn("Cursor image for color ".concat(colors_1.colors[player.colorIndex], " not found."));
                _this.initImagesForColor(colors_1.colors[player.colorIndex]);
            }
            _this.context.drawImage(_this.cursorImg[colors_1.colors[player.colorIndex]], player.position[0], player.position[1], _this.cellSize[0], _this.cellSize[1]);
            //player arrows
            (player.arrows || []).forEach(function (arrow) {
                _this.drawRotated(_this.arrowImg[colors_1.colors[player.colorIndex]], arrow.position[0], arrow.position[1], _this.angleFor(arrow.direction, 'arrow'));
            });
        });
    };
    GameDisplay.prototype.drawWalls = function (state) {
        var _this = this;
        state.strategy.walls.forEach(function (wall) {
            _this.context.drawImage(_this.wallImg, wall.position[0], wall.position[1], _this.cellSize[0], _this.cellSize[1]);
        });
    };
    GameDisplay.prototype.drawGrid = function () {
        this.context.lineWidth = 1;
        this.context.strokeStyle = 'white';
        for (var i = 0; i < config_1.CONFIG.COLUMNS + 1; i++) {
            this.context.beginPath();
            this.context.moveTo((config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.COLUMNS) * i, 0);
            this.context.lineTo((config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.COLUMNS) * i, this.canvas.height);
            this.context.stroke();
        }
        for (var i = 0; i < config_1.CONFIG.ROWS + 1; i++) {
            this.context.beginPath();
            this.context.moveTo(0, (config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.ROWS) * i);
            this.context.lineTo(this.canvas.width, (config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.ROWS) * i);
            this.context.stroke();
        }
    };
    GameDisplay.prototype.drawRotated = function (image, positionX, positionY, angle) {
        var x = this.cellSize[0] / 2;
        var y = this.cellSize[1] / 2;
        this.context.save();
        this.context.translate(positionX + x, positionY + y);
        this.context.rotate(angle);
        this.context.translate(-x, -y);
        this.context.drawImage(image, 0, 0, this.cellSize[0], this.cellSize[1]);
        this.context.restore();
    };
    GameDisplay.prototype.angleFor = function (direction, type) {
        if (type === 'mouse') {
            switch (direction) {
                case 'U':
                    return Math.PI / 2;
                case 'D':
                    return -Math.PI / 2;
                case 'L':
                    return 0;
                case 'R':
                    return Math.PI;
            }
        }
        else if (type === 'cat') {
            return this.angleFor(direction, 'mouse') + Math.PI;
        }
        switch (direction) {
            case 'U':
                return 0;
            case 'D':
                return Math.PI;
            case 'L':
                return -Math.PI / 2;
            case 'R':
                return Math.PI / 2;
        }
    };
    GameDisplay.prototype.drawStrategyName = function (state) {
        this.context.fillStyle = "#a0ffff";
        this.context.font = "50px Arial";
        this.context.textAlign = "center";
        this.context.fillText(state.strategy.name, config_1.CONFIG.GLOBAL_HEIGHT / 2, 100);
    };
    // Performance optimization methods
    GameDisplay.prototype.initGridCache = function () {
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = config_1.CONFIG.GLOBAL_WIDTH;
        this.gridCanvas.height = config_1.CONFIG.GLOBAL_HEIGHT;
        this.gridContext = this.gridCanvas.getContext('2d');
        this.gridCached = false;
        this.currentGridSize = [config_1.CONFIG.ROWS, config_1.CONFIG.COLUMNS];
    };
    GameDisplay.prototype.updateUseAlt = function () {
        var now = Date.now();
        var currentPeriod = Math.floor(now / 500);
        var lastPeriod = Math.floor(this.lastUseAltUpdate / 500);
        if (currentPeriod !== lastPeriod) {
            this.useAlt = currentPeriod % 2 === 1;
            this.lastUseAltUpdate = now;
        }
    };
    GameDisplay.prototype.drawCachedGrid = function () {
        // Check if grid needs to be redrawn (size changed)
        if (!this.gridCached ||
            this.currentGridSize[0] !== config_1.CONFIG.ROWS ||
            this.currentGridSize[1] !== config_1.CONFIG.COLUMNS) {
            this.redrawGridCache();
        }
        // Draw the cached grid onto the main canvas
        this.context.drawImage(this.gridCanvas, 0, 0);
    };
    GameDisplay.prototype.redrawGridCache = function () {
        // Clear the grid cache
        this.gridContext.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        // Draw the grid on the cache canvas
        this.gridContext.lineWidth = 1;
        this.gridContext.strokeStyle = 'white';
        for (var i = 0; i < config_1.CONFIG.COLUMNS + 1; i++) {
            this.gridContext.beginPath();
            this.gridContext.moveTo((config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.COLUMNS) * i, 0);
            this.gridContext.lineTo((config_1.CONFIG.GLOBAL_WIDTH / config_1.CONFIG.COLUMNS) * i, this.gridCanvas.height);
            this.gridContext.stroke();
        }
        for (var i = 0; i < config_1.CONFIG.ROWS + 1; i++) {
            this.gridContext.beginPath();
            this.gridContext.moveTo(0, (config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.ROWS) * i);
            this.gridContext.lineTo(this.gridCanvas.width, (config_1.CONFIG.GLOBAL_HEIGHT / config_1.CONFIG.ROWS) * i);
            this.gridContext.stroke();
        }
        this.gridCached = true;
        this.currentGridSize = [config_1.CONFIG.ROWS, config_1.CONFIG.COLUMNS];
    };
    return GameDisplay;
}());
exports.GameDisplay = GameDisplay;
//# sourceMappingURL=game.display.js.map