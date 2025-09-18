"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialGrid = void 0;
var config_1 = require("../../browser/common/config");
/**
 * Spatial partitioning system for optimizing collision detection.
 * Divides the game area into a grid and only checks collisions between
 * objects in the same or adjacent cells.
 *
 * Performance improvement: O(n²) → O(n)
 */
var SpatialGrid = /** @class */ (function () {
    function SpatialGrid(cellSize) {
        if (cellSize === void 0) { cellSize = 50; }
        this.grid = new Map();
        this.cellSize = cellSize;
        this.width = config_1.CONFIG.GLOBAL_WIDTH;
        this.height = config_1.CONFIG.GLOBAL_HEIGHT;
    }
    /**
     * Generates a unique key for a grid cell based on coordinates
     */
    SpatialGrid.prototype.getCellKey = function (x, y) {
        var cellX = Math.floor(x / this.cellSize);
        var cellY = Math.floor(y / this.cellSize);
        return "".concat(cellX, ",").concat(cellY);
    };
    /**
     * Clears the grid for the next frame
     */
    SpatialGrid.prototype.clear = function () {
        this.grid.clear();
    };
    /**
     * Inserts a moving object into the appropriate grid cell
     */
    SpatialGrid.prototype.insert = function (object) {
        var key = this.getCellKey(object.position[0], object.position[1]);
        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }
        this.grid.get(key).add(object);
    };
    /**
     * Gets all objects in the same cell and adjacent cells
     */
    SpatialGrid.prototype.getNearbyObjects = function (object) {
        var objects = [];
        var x = object.position[0];
        var y = object.position[1];
        // Check the object's cell and all 8 adjacent cells
        var cellX = Math.floor(x / this.cellSize);
        var cellY = Math.floor(y / this.cellSize);
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                var neighborKey = "".concat(cellX + dx, ",").concat(cellY + dy);
                var cell = this.grid.get(neighborKey);
                if (cell) {
                    objects.push.apply(objects, Array.from(cell));
                }
            }
        }
        // Remove the object itself from the list
        return objects.filter(function (obj) { return obj !== object; });
    };
    /**
     * Gets all objects in a specific area (useful for debugging/visualization)
     */
    SpatialGrid.prototype.getObjectsInArea = function (x, y, width, height) {
        var objects = [];
        var startCellX = Math.floor(x / this.cellSize);
        var endCellX = Math.floor((x + width) / this.cellSize);
        var startCellY = Math.floor(y / this.cellSize);
        var endCellY = Math.floor((y + height) / this.cellSize);
        for (var cellX = startCellX; cellX <= endCellX; cellX++) {
            for (var cellY = startCellY; cellY <= endCellY; cellY++) {
                var key = "".concat(cellX, ",").concat(cellY);
                var cell = this.grid.get(key);
                if (cell) {
                    objects.push.apply(objects, Array.from(cell));
                }
            }
        }
        return objects;
    };
    /**
     * Returns statistics about the grid for performance monitoring
     */
    SpatialGrid.prototype.getStats = function () {
        var occupiedCells = this.grid.size;
        var totalObjects = 0;
        for (var _i = 0, _a = this.grid.values(); _i < _a.length; _i++) {
            var cell = _a[_i];
            totalObjects += cell.size;
        }
        var maxCells = Math.ceil(this.width / this.cellSize) * Math.ceil(this.height / this.cellSize);
        return {
            totalCells: maxCells,
            occupiedCells: occupiedCells,
            totalObjects: totalObjects,
            averageObjectsPerCell: occupiedCells > 0 ? totalObjects / occupiedCells : 0
        };
    };
    /**
     * Optimizes cell size based on object density
     */
    SpatialGrid.prototype.optimizeCellSize = function (objectCount) {
        // Dynamic cell size based on object density
        // More objects = smaller cells for better distribution
        // Fewer objects = larger cells for fewer checks
        if (objectCount > 150) {
            this.cellSize = 40;
        }
        else if (objectCount > 100) {
            this.cellSize = 50;
        }
        else if (objectCount > 50) {
            this.cellSize = 70;
        }
        else {
            this.cellSize = 100;
        }
    };
    return SpatialGrid;
}());
exports.SpatialGrid = SpatialGrid;
//# sourceMappingURL=spatial-grid.js.map