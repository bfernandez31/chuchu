"use strict";
// Bot pour jouer automatiquement à Chuchu
// Place les flèches pour envoyer les souris dans ses goals et les chats dans les goals adverses
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bot = void 0;
var player_1 = require("./player");
var config_1 = require("../browser/common/config");
var direction_1 = require("./direction");
var Bot = /** @class */ (function (_super) {
    __extends(Bot, _super);
    function Bot(game, name) {
        if (name === void 0) { name = 'Bot'; }
        var _this = _super.call(this, name, name) || this;
        _this.pendingArrowDirection = null;
        _this.game = game;
        return _this;
    }
    // Nouvelle méthode principale pour placer une flèche optimisée
    Bot.prototype.play = function () {
        var _this = this;
        var mice = this.game.currentStrategy.mouses;
        var cats = this.game.currentStrategy.cats;
        var myGoal = this.game.currentStrategy.goals.find(function (g) { return g.player.key === _this.key; });
        if (!myGoal)
            return;
        var best = this.findBestArrowPlacement(myGoal, mice, cats);
        if (!best) {
            // Si aucune case n'améliore l'espérance, essayer d'envoyer un chat vers un goal adverse
            var bestCatScore = -Infinity;
            var bestCatArrow = null;
            // On cible les chats proches de notre goal
            for (var _i = 0, cats_1 = cats; _i < cats_1.length; _i++) {
                var cat = cats_1[_i];
                // Pour chaque goal adverse
                for (var _a = 0, _b = this.game.currentStrategy.goals; _a < _b.length; _a++) {
                    var goal = _b[_a];
                    if (goal.player.key === this.key)
                        continue;
                    // Calculer la direction vers le goal adverse
                    var dx = goal.position[0] - cat.position[0];
                    var dy = goal.position[1] - cat.position[1];
                    var dir = void 0;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        dir = dx > 0 ? 'R' : 'L';
                    }
                    else {
                        dir = dy > 0 ? 'D' : 'U';
                    }
                    // Placer une flèche sur la case devant le chat
                    var gridSize = 15;
                    var cellSizeX = config_1.CONFIG.GLOBAL_WIDTH / gridSize;
                    var cellSizeY = config_1.CONFIG.GLOBAL_HEIGHT / gridSize;
                    var col = Math.round(cat.position[0] / cellSizeX);
                    var row = Math.round(cat.position[1] / cellSizeY);
                    if (dir === 'L')
                        col--;
                    if (dir === 'R')
                        col++;
                    if (dir === 'U')
                        row--;
                    if (dir === 'D')
                        row++;
                    if (col < 0 || col >= gridSize || row < 0 || row >= gridSize)
                        continue;
                    var x = (col + 0.5) * cellSizeX;
                    var y = (row + 0.5) * cellSizeY;
                    // Vérifier qu'il n'y a pas déjà une flèche ou un goal
                    var blocked = false;
                    for (var _c = 0, _d = this.game.currentStrategy.goals; _c < _d.length; _c++) {
                        var g = _d[_c];
                        if (typeof g.collides === 'function' && g.collides({
                            position: [x, y],
                            size: [cellSizeX, cellSizeY]
                        }))
                            blocked = true;
                    }
                    for (var _e = 0, _f = this.game.players; _e < _f.length; _e++) {
                        var player = _f[_e];
                        for (var _g = 0, _h = player.arrows; _g < _h.length; _g++) {
                            var arrow = _h[_g];
                            if (Math.abs(x - arrow.position[0]) < cellSizeX / 2 && Math.abs(y - arrow.position[1]) < cellSizeY / 2)
                                blocked = true;
                        }
                    }
                    if (blocked)
                        continue;
                    // Score : plus le chat est proche du goal adverse, mieux c'est
                    var dist = Math.abs(goal.position[0] - cat.position[0]) + Math.abs(goal.position[1] - cat.position[1]);
                    var score = -dist;
                    if (score > bestCatScore) {
                        bestCatScore = score;
                        bestCatArrow = { x: x / config_1.CONFIG.GLOBAL_WIDTH, y: y / config_1.CONFIG.GLOBAL_HEIGHT, direction: dir };
                    }
                }
            }
            if (bestCatArrow) {
                best = bestCatArrow;
            }
        }
        if (best) {
            // 1. Envoie un message input pour placer la flèche (position en % de la taille de la grille)
            this.game.queue.processMsg({
                type: "input",
                x: best.x,
                y: best.y,
                key: this.key
            });
            // 2. Stocke la direction à utiliser au tick suivant
            this.pendingArrowDirection = best.direction;
        }
        // Si une direction est en attente, envoie le message arrow ce tick-ci
        if (this.pendingArrowDirection) {
            this.game.queue.processMsg({
                type: "arrow",
                direction: this.pendingArrowDirection,
                key: this.key
            });
            this.pendingArrowDirection = null;
        }
    };
    // Nouvelle méthode pour trouver la meilleure case autour du goal
    Bot.prototype.findBestArrowPlacement = function (goal, mice, cats) {
        // On ne regarde que les cases autour du goal à un rayon de 1 à 5 cases
        var gridSize = 15;
        var cellSizeX = config_1.CONFIG.GLOBAL_WIDTH / gridSize;
        var cellSizeY = config_1.CONFIG.GLOBAL_HEIGHT / gridSize;
        var best = null;
        var bestScore = -Infinity;
        var bestDir = 'U';
        for (var radius = 1; radius <= 7; radius++) {
            for (var _i = 0, _a = direction_1.DirectionUtils.list(); _i < _a.length; _i++) {
                var dir = _a[_i];
                var _b = direction_1.DirectionUtils.vector(dir), dx = _b[0], dy = _b[1];
                // Calcul de la position cible en indices de grille
                var col = Math.round((goal.position[0] + dx * radius * cellSizeX) / cellSizeX);
                var row = Math.round((goal.position[1] + dy * radius * cellSizeY) / cellSizeY);
                // On s'assure que la case est dans la grille
                if (col < 0 || col >= gridSize || row < 0 || row >= gridSize)
                    continue;
                // Position centrale de la case
                var x = (col + 0.5) * cellSizeX;
                var y = (row + 0.5) * cellSizeY;
                // Ne pas placer sur un goal (aucun goal, pas seulement le sien)
                var isOnGoal = false;
                for (var _c = 0, _d = this.game.currentStrategy.goals; _c < _d.length; _c++) {
                    var g = _d[_c];
                    if (typeof g.collides === 'function' && g.collides({ position: [x, y], size: [cellSizeX, cellSizeY] })) {
                        isOnGoal = true;
                        break;
                    }
                }
                if (isOnGoal)
                    continue;
                // Ne pas placer sur une flèche déjà présente
                var isOnArrow = false;
                for (var _e = 0, _f = this.game.players; _e < _f.length; _e++) {
                    var player = _f[_e];
                    for (var _g = 0, _h = player.arrows; _g < _h.length; _g++) {
                        var arrow = _h[_g];
                        if (Math.abs(x - arrow.position[0]) < cellSizeX / 2 && Math.abs(y - arrow.position[1]) < cellSizeY / 2) {
                            isOnArrow = true;
                            break;
                        }
                    }
                    if (isOnArrow)
                        break;
                }
                if (isOnArrow)
                    continue;
                // Pour cette case, compter les souris qui vont passer dessus et leur direction
                var miceOnCell = 0;
                var miceNotToGoal = 0;
                var catsToGoal = 0;
                var dirCount = { U: 0, D: 0, L: 0, R: 0 };
                // Liste des souris déjà dans le goal (à ne pas compter dans les calculs de placement)
                var miceAlreadyInGoal = mice.filter(function (mouse) { return typeof goal.collides === 'function' && goal.collides(mouse); });
                for (var _j = 0, mice_1 = mice; _j < mice_1.length; _j++) {
                    var mouse = mice_1[_j];
                    // Si la souris est déjà dans le goal du joueur, on l'ignore pour le placement de flèche
                    if (miceAlreadyInGoal.includes(mouse))
                        continue;
                    // Si la souris passe sur la case et va vers le goal, elle sera détournée
                    if (typeof mouse.collides === 'function' && mouse.collides({ position: [x, y], size: [cellSizeX, cellSizeY] })) {
                        miceOnCell++;
                        if (mouse.direction && dirCount[mouse.direction] !== undefined)
                            dirCount[mouse.direction]++;
                        // Est-ce que la souris va vers le goal ?
                        var _k = direction_1.DirectionUtils.vector(mouse.direction), mdx = _k[0], mdy = _k[1];
                        var toGoal = [goal.position[0] - mouse.position[0], goal.position[1] - mouse.position[1]];
                        var dot = mdx * toGoal[0] + mdy * toGoal[1];
                        if (dot < 0)
                            miceNotToGoal++;
                    }
                }
                // Pour cette case, compter les chats qui vont passer dessus et qui vont vers le goal
                for (var _l = 0, cats_2 = cats; _l < cats_2.length; _l++) {
                    var cat = cats_2[_l];
                    if (typeof cat.collides === 'function' && cat.collides({ position: [x, y], size: [cellSizeX, cellSizeY] })) {
                        var _m = direction_1.DirectionUtils.vector(cat.direction), cdx = _m[0], cdy = _m[1];
                        var toGoal = [goal.position[0] - cat.position[0], goal.position[1] - cat.position[1]];
                        var dot = cdx * toGoal[0] + cdy * toGoal[1];
                        if (dot > 0)
                            catsToGoal++;
                    }
                }
                if (miceOnCell === 0 && catsToGoal === 0)
                    continue;
                // Calcul de l'espérance de points si on détourne les souris/chats passant sur cette case
                var miceExpected = 0;
                var catsExpected = 0;
                var penalty = 0;
                for (var _o = 0, mice_2 = mice; _o < mice_2.length; _o++) {
                    var mouse = mice_2[_o];
                    // Si la souris est déjà dans le goal du joueur, on ne la compte pas ici
                    if (miceAlreadyInGoal.includes(mouse))
                        continue;
                    // Si la souris passe sur la case et va vers le goal, elle sera détournée
                    if (typeof mouse.collides === 'function' && mouse.collides({ position: [x, y], size: [cellSizeX, cellSizeY] })) {
                        var _p = direction_1.DirectionUtils.vector(mouse.direction), mdx_1 = _p[0], mdy_1 = _p[1];
                        var toGoal_1 = [goal.position[0] - mouse.position[0], goal.position[1] - mouse.position[1]];
                        var dot_1 = mdx_1 * toGoal_1[0] + mdy_1 * toGoal_1[1];
                        if (dot_1 > 0)
                            continue; // détournée, ne va plus au goal
                    }
                    // Sinon, on regarde si elle va vers le goal
                    var _q = direction_1.DirectionUtils.vector(mouse.direction), mdx = _q[0], mdy = _q[1];
                    var toGoal = [goal.position[0] - mouse.position[0], goal.position[1] - mouse.position[1]];
                    var dot = mdx * toGoal[0] + mdy * toGoal[1];
                    if (dot > 0) {
                        // Vérifier si la souris passe sur un goal adverse ou rencontre un mur avant d'atteindre le goal du bot
                        var crossesAdverseGoal = false;
                        var blockedByWall = false;
                        for (var t = 1; t <= 20; t++) {
                            var px = mouse.position[0] + mdx * t * (toGoal[0] / 20);
                            var py = mouse.position[1] + mdy * t * (toGoal[1] / 20);
                            // Vérifie les goals adverses
                            for (var _r = 0, _s = this.game.currentStrategy.goals; _r < _s.length; _r++) {
                                var otherGoal = _s[_r];
                                if (otherGoal.player.key !== this.key && typeof otherGoal.collides === 'function' && otherGoal.collides({
                                    position: [px, py],
                                    size: [cellSizeX, cellSizeY]
                                })) {
                                    crossesAdverseGoal = true;
                                }
                            }
                            // Vérifie les murs
                            for (var _t = 0, _u = this.game.currentStrategy.walls || []; _t < _u.length; _t++) {
                                var wall = _u[_t];
                                if (typeof wall.collides === 'function' && wall.collides({
                                    position: [px, py],
                                    size: [cellSizeX, cellSizeY]
                                })) {
                                    blockedByWall = true;
                                }
                            }
                            if (crossesAdverseGoal || blockedByWall)
                                break;
                        }
                        if (blockedByWall) {
                            // La souris ne peut pas atteindre le goal, on ne compte pas de point
                            continue;
                        }
                        else if (crossesAdverseGoal) {
                            penalty -= 2; // Pénalité forte
                        }
                        else {
                            miceExpected++;
                        }
                    }
                }
                for (var _v = 0, cats_3 = cats; _v < cats_3.length; _v++) {
                    var cat = cats_3[_v];
                    // Si le chat passe sur la case et va vers le goal, il sera détourné
                    if (typeof cat.collides === 'function' && cat.collides({ position: [x, y], size: [cellSizeX, cellSizeY] })) {
                        var _w = direction_1.DirectionUtils.vector(cat.direction), cdx_1 = _w[0], cdy_1 = _w[1];
                        var toGoal_2 = [goal.position[0] - cat.position[0], goal.position[1] - cat.position[1]];
                        var dot_2 = cdx_1 * toGoal_2[0] + cdy_1 * toGoal_2[1];
                        if (dot_2 > 0)
                            continue; // détourné, ne va plus au goal
                    }
                    // Sinon, on regarde si il va vers le goal
                    var _x = direction_1.DirectionUtils.vector(cat.direction), cdx = _x[0], cdy = _x[1];
                    var toGoal = [goal.position[0] - cat.position[0], goal.position[1] - cat.position[1]];
                    var dot = cdx * toGoal[0] + cdy * toGoal[1];
                    if (dot > 0)
                        catsExpected++;
                }
                // Espérance de points : +1 par souris, divisé par 2 par chat, pénalité si souris passe sur goal adverse avant le sien
                var expectedScore = (miceExpected + penalty) / Math.pow(2, catsExpected);
                if (expectedScore > bestScore) {
                    bestScore = expectedScore;
                    best = { x: x / config_1.CONFIG.GLOBAL_WIDTH, y: y / config_1.CONFIG.GLOBAL_HEIGHT, direction: 'U' };
                    // On choisit la direction qui rapproche le plus du goal
                    var minDist = Infinity;
                    for (var _y = 0, _z = direction_1.DirectionUtils.list(); _y < _z.length; _y++) {
                        var d = _z[_y];
                        var _0 = direction_1.DirectionUtils.vector(d), ddx = _0[0], ddy = _0[1];
                        var nx = x + ddx * cellSizeX;
                        var ny = y + ddy * cellSizeY;
                        var dist = Math.sqrt(Math.pow((goal.position[0] - nx), 2) + Math.pow((goal.position[1] - ny), 2));
                        if (dist < minDist) {
                            minDist = dist;
                            bestDir = d;
                        }
                    }
                }
            }
        }
        if (best)
            best.direction = bestDir;
        return best;
    };
    // Détermine si un objet passera près de la case (x, y) en suivant sa direction
    Bot.prototype.isOnPath = function (obj, x, y) {
        var objX = obj.position[0];
        var objY = obj.position[1];
        // Utilise DirectionUtils.vector pour obtenir le vecteur de direction
        var _a = direction_1.DirectionUtils.vector(obj.direction), objDx = _a[0], objDy = _a[1];
        // On simule le mouvement de l'objet sur quelques pas
        for (var t = 0; t < 10; t++) {
            var px = objX + objDx * t * 6; // 6px par pas
            var py = objY + objDy * t * 6;
            if (Math.abs(px - x) < 12 && Math.abs(py - y) < 12)
                return true;
        }
        return false;
    };
    return Bot;
}(player_1.Player));
exports.Bot = Bot;
//# sourceMappingURL=bot.js.map